import { endpoint, method, json } from '../../server/http.js';
import { account } from '../../server/auth.js';
import { ready } from '../../server/db.js';

export default endpoint(async request => {
  method(request, ['GET']);
  const userId = await account(request, false);
  const sql = await ready();
  const rows = await sql`SELECT p.id, p.public_profile, (p.photo_base64 IS NOT NULL) AS has_photo,
    (SELECT count(*)::integer FROM kairos_profile_likes l WHERE l.profile_id = p.id) AS likes_count,
    EXISTS(SELECT 1 FROM kairos_profile_likes l WHERE l.profile_id = p.id AND l.clerk_user_id = ${userId || ''}) AS liked_by_me
    FROM kairos_profiles p WHERE p.published = true AND p.public_consent = true ORDER BY p.created_at DESC LIMIT 100`;
  return json({ profiles: rows.map(row => ({ id: row.id, published: true, publicConsent: true,
    publicProfile: { ...row.public_profile, photoUrl: row.has_photo ? new URL(`/api/profile-photo?id=${row.id}`, request.url).href : '' },
    likesCount: row.likes_count, likedByMe: row.liked_by_me, canLike: Boolean(userId) })) });
});
