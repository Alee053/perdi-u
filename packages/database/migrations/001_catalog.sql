CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 100),
  photo_url text
);

CREATE TABLE profile_contacts (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id),
  email text
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL CHECK (type IN ('lost', 'found')),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'resolved')),
  category text NOT NULL CHECK (category IN ('pet', 'object', 'document')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 5000),
  city text NOT NULL CHECK (length(trim(city)) BETWEEN 1 AND 100),
  zone text NOT NULL CHECK (length(trim(zone)) BETWEEN 1 AND 200),
  incident_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_catalog_order ON reports (created_at DESC, id ASC) WHERE state = 'active';

CREATE TABLE report_contacts (
  report_id uuid PRIMARY KEY REFERENCES reports(id),
  phone text
);

CREATE TABLE report_images (
  report_id uuid NOT NULL REFERENCES reports(id),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 2),
  public_url text NOT NULL,
  storage_key text,
  PRIMARY KEY (report_id, position)
);
