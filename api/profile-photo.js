import { endpoint, method, HttpError, uuid } from '../server/http.js';
import { ready } from '../server/db.js';

export default endpoint(async request => {
  method(request, ['GET']);
  const id = new URL(request.url).searchParams.get('id');
  if (!uuid(id)) throw new HttpError(404, 'PHOTO_NOT_FOUND', 'Photo indisponible.');
  const sql = await ready();
  const rows = await sql`SELECT photo_base64, photo_type FROM kairos_profiles WHERE id = ${id} AND published = true AND public_consent = true LIMIT 1`;
  if (!rows[0]?.photo_base64) throw new HttpError(404, 'PHOTO_NOT_FOUND', 'Photo indisponible.');
  return new Response(Buffer.from(rows[0].photo_base64, 'base64'), { headers: {
    'Content-Type': rows[0].photo_type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; sandbox"
  } });
});
