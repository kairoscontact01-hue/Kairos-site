import { endpoint, method, json, uuid, HttpError } from '../../../server/http.js';
import { account } from '../../../server/auth.js';
import { ready } from '../../../server/db.js';
import { discoveryProfile } from '../../../server/discovery.js';

export default endpoint(async request => {
  method(request, ['GET']);
  const userId = await account(request, false);
  if (!userId) throw new HttpError(401, 'SIGN_IN_REQUIRED', 'Créez un compte gratuit ou connectez-vous pour consulter cette fiche.');
  const id = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
  if (!uuid(id)) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Cette fiche n’est plus disponible.');
  const sql = await ready();
  const rows = await sql`SELECT p.id, p.public_profile, (p.photo_base64 IS NOT NULL) AS has_photo,
    (SELECT count(*)::integer FROM kairos_profile_likes l WHERE l.profile_id = p.id) AS likes_count,
    EXISTS(SELECT 1 FROM kairos_profile_likes l WHERE l.profile_id = p.id AND l.clerk_user_id = ${userId}) AS liked_by_me
    FROM kairos_profiles p WHERE p.id = ${id} AND p.published = true AND p.public_consent = true LIMIT 1`;
  const row = rows[0];
  if (!row) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Cette fiche n’est plus disponible.');
  return json({ profile: { id: row.id, published: true, publicConsent: true, detailsAvailable: true,
    publicProfile: { ...discoveryProfile(row.public_profile, true), photoUrl: row.has_photo ? new URL(`/api/profile-photo?id=${row.id}`, request.url).href : '' },
    likesCount: row.likes_count, likedByMe: row.liked_by_me, canLike: true } });
});
