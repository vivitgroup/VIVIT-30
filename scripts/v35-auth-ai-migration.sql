CREATE TABLE IF NOT EXISTS email_verification_codes (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  code_hash text NOT NULL,
  expires_at timestamp NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_codes(expires_at);

-- Preview only. User deletion is intentionally performed separately after confirmation.
SELECT id,name,email,role,is_active,approval_status
FROM users
ORDER BY CASE WHEN role='SUPER_ADMIN' THEN 0 ELSE 1 END, created_at;
