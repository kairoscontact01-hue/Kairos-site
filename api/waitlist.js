import { randomUUID } from 'node:crypto';
import { endpoint, method, bodyJSON, json } from '../server/http.js';
import { account, verifiedEmail } from '../server/auth.js';
import { ready, rateLimit } from '../server/db.js';
import { validateProfile, publicProfile } from '../server/validation.js';
import { notify } from '../server/mail.js';

export default endpoint(async request => {
  method(request, ['GET', 'POST']);
  const userId = await account(request);
  if (request.method === 'GET') {
    const sql = await ready();
    const rows = await sql`SELECT id, private_profile, photo_base64, photo_type, created_at, updated_at, published FROM kairos_profiles WHERE clerk_user_id = ${userId} LIMIT 1`;
    const row = rows[0];
    return json({ profile: row ? { ...row.private_profile, photoUrl: row.photo_base64 ? `data:${row.photo_type};base64,${row.photo_base64}` : '' } : null, id: row?.id || null, createdAt: row?.created_at || null, updatedAt: row?.updated_at || null, published: row?.published === true });
  }
  const { profile, photo } = validateProfile(await bodyJSON(request));
  profile.email = await verifiedEmail(userId, profile.email);
  const sql = await ready();
  await rateLimit(sql, userId, 'registration', 10);
  const rows = await sql`INSERT INTO kairos_profiles (id, clerk_user_id, email, private_profile, public_profile, photo_base64, photo_type, public_consent, consent_version)
    VALUES (${randomUUID()}, ${userId}, ${profile.email}, ${JSON.stringify(profile)}::jsonb, ${JSON.stringify(publicProfile(profile))}::jsonb, ${photo.base64}, ${photo.type}, ${profile.publicConsent}, 'waitlist-2026-10-25')
    ON CONFLICT (clerk_user_id) DO UPDATE SET email = EXCLUDED.email, private_profile = EXCLUDED.private_profile,
      public_profile = EXCLUDED.public_profile, photo_base64 = EXCLUDED.photo_base64, photo_type = EXCLUDED.photo_type,
      public_consent = EXCLUDED.public_consent, published = false,
      consent_version = EXCLUDED.consent_version, consent_at = now(), updated_at = now()
    RETURNING id, created_at, updated_at`;
  // A new or edited profile awaits moderation; consent alone never publishes it.
  let notification = 'pending';
  try { notification = await notify(sql, rows[0].id, profile.email); }
  catch { console.error('Kairos notification pending'); }
  return json({ registered: true, id: rows[0].id, notification, published: false, createdAt: rows[0].created_at, updatedAt: rows[0].updated_at });
});
