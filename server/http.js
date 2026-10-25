export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
export function endpoint(handler) {
  return { async fetch(request) {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof HttpError) return json({ error: { code: error.code, message: error.message } }, error.status);
      // Never log form fields, tokens, database URLs or provider error bodies.
      console.error('Kairos request failed', { name: error?.name || 'Error' });
      return json({ error: { code: 'SERVER_ERROR', message: 'L’enregistrement est momentanément indisponible. Votre fiche n’a pas été confirmée. Réessayez plus tard.' } }, 503);
    }
  } };
}
export function method(request, allowed) {
  if (!allowed.includes(request.method)) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
}
export async function bodyJSON(request, max = 1500000) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON_REQUIRED', 'Le formulaire doit être envoyé en JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'INVALID_BODY', 'Le formulaire est vide.');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new HttpError(413, 'BODY_TOO_LARGE', 'La fiche est trop volumineuse. Choisissez une photo de 1 Mo maximum.'); }
      chunks.push(Buffer.from(value));
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error();
    return data;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'INVALID_BODY', 'Le formulaire n’a pas pu être lu.');
  }
}
export function uuid(value) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
