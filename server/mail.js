import { randomUUID } from 'node:crypto';

// A stored registration remains valid even if the email provider is unavailable.
export async function notify(sql, profileId, email) {
  const apiKey = process.env.RESEND_API_KEY || process.env.Resend_api_key;
  if (!apiKey) return 'not_configured';
  const mode = process.env.RESEND_MODE === 'live' ? 'live' : 'test';
  const from = mode === 'test' ? 'Kairos <onboarding@resend.dev>' : process.env.RESEND_FROM;
  const to = mode === 'test' ? process.env.RESEND_TEST_TO : email;
  if (!to || !from || (mode === 'live' && /@resend\.dev\b/i.test(from))) return 'not_configured';
  const payload = { from, to: [to], subject: mode === 'test' ? 'Kairos — une préinscription a été enregistrée (test)' : 'Votre préinscription Kairos est reçue',
    text: mode === 'test'
      ? `Une fiche a été enregistrée dans la liste d’attente Kairos. Référence : ${profileId}.\n\nCet e-mail de test est destiné au propriétaire du compte Resend. Aucun e-mail n’a été envoyé à la personne préinscrite.`
      : 'Votre fiche de préinscription a bien été enregistrée sur Kairos. Vous rejoignez notre liste d’attente. Aucun paiement n’a été déclenché et votre profil n’est pas publié automatiquement.\n\nPour modifier votre fiche, reconnectez-vous sur le site. Pour demander sa suppression : kairos.contact01@gmail.com\n\nL’équipe Kairos' };
  await sql`INSERT INTO kairos_mail_outbox (id, profile_id, payload, mode) VALUES (${randomUUID()}, ${profileId}, ${JSON.stringify(payload)}::jsonb, ${mode}) ON CONFLICT (profile_id, mode) DO NOTHING`;
  const claimed = await sql`UPDATE kairos_mail_outbox SET state = 'sending', locked_until = now() + interval '1 minute', attempts = attempts + 1
    WHERE profile_id = ${profileId} AND mode = ${mode} AND state IN ('pending', 'sending')
      AND (locked_until IS NULL OR locked_until < now())
      AND (attempts = 0 OR created_at > now() - interval '23 hours')
    RETURNING id, payload`;
  if (!claimed.length) {
    const rows = await sql`SELECT state FROM kairos_mail_outbox WHERE profile_id = ${profileId} AND mode = ${mode}`;
    return rows[0]?.state === 'sent' ? (mode === 'test' ? 'test_sent' : 'sent') : 'pending';
  }
  const job = claimed[0];
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `kairos-waitlist/${job.id}` },
      body: JSON.stringify(job.payload)
    });
    const result = await response.json();
    if (!response.ok || typeof result.id !== 'string') throw new Error('Mail not confirmed');
    await sql`UPDATE kairos_mail_outbox SET state = 'sent', sent_at = now(), provider_id = ${result.id}, locked_until = NULL WHERE id = ${job.id}`;
    return mode === 'test' ? 'test_sent' : 'sent';
  } catch {
    // Frozen payload + stable idempotency key make retries safe within Resend's 24h window.
    await sql`UPDATE kairos_mail_outbox SET state = 'pending', locked_until = NULL WHERE id = ${job.id}`;
    return 'pending';
  }
}
