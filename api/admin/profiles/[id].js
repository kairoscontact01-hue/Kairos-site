import { endpoint, method, json, uuid, HttpError } from '../../../server/http.js';
import { administrator } from '../../../server/auth.js';
import { ready } from '../../../server/db.js';

export default endpoint(async request => {
  method(request, ['GET']);
  await administrator(request);
  const id = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
  if (!uuid(id)) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Cette fiche n’est plus disponible.');
  const sql = await ready();
  const rows = await sql`SELECT id, private_profile, photo_base64, photo_type, published, created_at, updated_at
    FROM kairos_profiles WHERE id = ${id} LIMIT 1`;
  const row = rows[0];
  if (!row) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Cette fiche n’est plus disponible.');
  return json({ id: row.id, profile: { ...row.private_profile, photoUrl: row.photo_base64 ? `data:${row.photo_type};base64,${row.photo_base64}` : '' },
    published: row.published, createdAt: row.created_at, updatedAt: row.updated_at });
});
