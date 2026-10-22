CREATE TABLE report_media (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES profiles(id),
  storage_key text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'deleting')),
  report_id uuid REFERENCES reports(id),
  position smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (report_id IS NULL AND position IS NULL) OR
    (report_id IS NOT NULL AND position IS NOT NULL AND position BETWEEN 0 AND 2)
  ),
  UNIQUE (report_id, position)
);
CREATE INDEX report_media_owner_available
  ON report_media (owner_id, id) WHERE report_id IS NULL AND status = 'available';
CREATE INDEX report_media_attached
  ON report_media (report_id, position) WHERE report_id IS NOT NULL AND status = 'available';
