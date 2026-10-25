-- Run manually in the existing Neon SQL editor after reviewing the relevant profile.
-- New and edited profiles await moderation. Consent alone never publishes them.
SELECT id, public_profile, public_consent, published, created_at
FROM kairos_profiles ORDER BY created_at DESC LIMIT 100;

-- Replace the example UUID with the reviewed profile's real ID, then uncomment:
-- UPDATE kairos_profiles SET published = true
-- WHERE id = '00000000-0000-0000-0000-000000000000' AND public_consent = true;

-- Withdraw a profile: set published = false for its exact ID.
-- Erase a record on request: delete its row by exact ID. Related likes and
-- email jobs are removed automatically by the foreign keys.
