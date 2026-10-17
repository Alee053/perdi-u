-- More than 50 matching active reports, with equal timestamps to exercise the ID tie-break.
INSERT INTO reports (id, owner_id, type, state, category, title, description, city, zone, incident_date, created_at)
SELECT ('40000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '10000000-0000-0000-0000-000000000001', 'found', 'active', 'object',
  'Límite de prueba ' || n, 'Registro ficticio.', 'La Paz', 'Centro', '2026-10-10', '2026-10-15T12:00:00Z'
FROM generate_series(1, 60) n;
