import { neon } from '@neondatabase/serverless';
import { HttpError } from './http.js';

let client, schema;
export function database() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'La base de données Kairos n’est pas connectée. L’équipe doit relier Neon au projet Vercel puis redéployer.');
  return client ||= neon(url);
}
export async function ready() {
  const sql = database();
  if (!schema) schema = sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS kairos_profiles (
      id uuid PRIMARY KEY, clerk_user_id text NOT NULL UNIQUE, email text NOT NULL,
      private_profile jsonb NOT NULL, public_profile jsonb NOT NULL,
      photo_base64 text, photo_type text,
      public_consent boolean NOT NULL DEFAULT false, published boolean NOT NULL DEFAULT false,
      consent_version text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`,
    sql`CREATE TABLE IF NOT EXISTS kairos_profile_likes (
      profile_id uuid NOT NULL REFERENCES kairos_profiles(id) ON DELETE CASCADE,
      clerk_user_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (profile_id, clerk_user_id)
    )`,
    sql`CREATE TABLE IF NOT EXISTS kairos_rate_limits (
      clerk_user_id text NOT NULL, action text NOT NULL, bucket timestamptz NOT NULL,
      hits integer NOT NULL DEFAULT 1, PRIMARY KEY(clerk_user_id, action, bucket)
    )`,
    sql`CREATE TABLE IF NOT EXISTS kairos_mail_outbox (
      id uuid PRIMARY KEY, profile_id uuid NOT NULL REFERENCES kairos_profiles(id) ON DELETE CASCADE,
      payload jsonb NOT NULL, mode text NOT NULL, state text NOT NULL DEFAULT 'pending',
      attempts integer NOT NULL DEFAULT 0, locked_until timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, provider_id text,
      UNIQUE (profile_id, mode)
    )`
  ]).catch(error => { schema = null; throw error; });
  await schema;
  return sql;
}
export async function rateLimit(sql, userId, action, limit) {
  const rows = await sql`INSERT INTO kairos_rate_limits (clerk_user_id, action, bucket) VALUES (${userId}, ${action}, date_trunc('hour', now()))
    ON CONFLICT (clerk_user_id, action, bucket) DO UPDATE SET hits = kairos_rate_limits.hits + 1
    RETURNING hits`;
  if (rows[0].hits > limit) throw new HttpError(429, 'RATE_LIMIT', 'Trop de demandes ont été envoyées. Réessayez dans une heure.');
}
