CREATE TABLE session_revocations (
  session_id uuid PRIMARY KEY,
  revoked_at timestamptz NOT NULL DEFAULT now()
);
