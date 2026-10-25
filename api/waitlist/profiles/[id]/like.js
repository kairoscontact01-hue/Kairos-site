import { endpoint, method, bodyJSON, json, HttpError, uuid } from '../../../../server/http.js';
import { account } from '../../../../server/auth.js';
import { ready, rateLimit } from '../../../../server/db.js';

export default endpoint(async request => {
  method(request, ['POST']);
  const userId = await account(request);
  const match = new URL(request.url).pathname.match(/\/profiles\/([^/]+)\/like\/?$/);
  const id = match?.[1];
  if (!uuid(id)) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Ce profil n’est plus disponible.');
  const data = await bodyJSON(request, 1024);
  if (typeof data.liked !== 'boolean') throw new HttpError(422, 'INVALID_LIKE', 'Le like doit être confirmé ou retiré.');
  const sql = await ready(); await rateLimit(sql, userId, 'like', 60);
  // Atomic desired state, rather than toggling: a retried request cannot undo a like.
  const result = await sql.transaction([
    sql`SELECT id FROM kairos_profiles WHERE id = ${id} AND published = true AND public_consent = true FOR UPDATE`,
    data.liked
      ? sql`INSERT INTO kairos_profile_likes (profile_id, clerk_user_id) SELECT id, ${userId} FROM kairos_profiles WHERE id = ${id} AND published = true AND public_consent = true ON CONFLICT DO NOTHING`
      : sql`DELETE FROM kairos_profile_likes WHERE profile_id = ${id} AND clerk_user_id = ${userId}`,
    sql`SELECT count(*)::integer AS count FROM kairos_profile_likes WHERE profile_id = ${id}`
  ]);
  if (!result[0].length) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Ce profil n’est plus disponible.');
  return json({ likesCount: result[2][0].count, liked: data.liked });
});
