import { createClerkClient } from '@clerk/backend';
import { HttpError } from './http.js';

function origins() {
  const values = [process.env.APP_URL, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`, process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`, ...(process.env.KAIROS_ALLOWED_ORIGINS || '').split(',')];
  if (!process.env.VERCEL) values.push('http://localhost:3000', 'http://localhost:3001');
  return [...new Set(values.filter(Boolean).map(value => { try { return new URL(value.trim()).origin; } catch { return ''; } }).filter(Boolean))];
}
let client;
function clerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'La connexion au serveur n’est pas configurée. Kairos doit ajouter ses deux clés Clerk dans Vercel puis redéployer le site.');
  return client ||= createClerkClient({ secretKey, publishableKey });
}
export async function account(request, required = true) {
  const allowed = origins();
  if (!allowed.length) throw new HttpError(503, 'ORIGIN_NOT_CONFIGURED', 'L’adresse du site doit être configurée dans APP_URL sur Vercel.');
  const origin = request.headers.get('origin');
  if (request.method !== 'GET' && origin && !allowed.includes(origin)) throw new HttpError(403, 'ORIGIN_REJECTED', 'Cette adresse de site n’est pas autorisée à envoyer une fiche.');
  let state;
  try { state = await clerk().authenticateRequest(request, { authorizedParties: allowed, acceptsToken: 'session_token' }); }
  catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'SIGN_IN_REQUIRED', 'Reconnectez-vous à votre compte avant d’envoyer votre fiche.');
  }
  const auth = state.isAuthenticated ? state.toAuth() : null;
  if (!auth?.userId && required) throw new HttpError(401, 'SIGN_IN_REQUIRED', 'Créez votre compte ou connectez-vous avant d’envoyer votre fiche.');
  return auth?.userId || null;
}
export async function verifiedEmail(userId, requested) {
  const user = await clerk().users.getUser(userId);
  const email = user.emailAddresses.find(item => item.emailAddress.toLowerCase() === requested.toLowerCase() && item.verification?.status === 'verified');
  if (!email) throw new HttpError(422, 'EMAIL_NOT_VERIFIED', 'Utilisez une adresse e-mail vérifiée dans votre compte Clerk. Vous pouvez la vérifier dans les paramètres de votre compte.');
  return email.emailAddress.toLowerCase();
}
