-- Older than the 50 newest reports in limit.sql, to prove that the API filters first.
INSERT INTO reports (id, owner_id, type, state, category, title, description, city, zone, incident_date, created_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'found', 'active', 'object', 'Llaves de prueba de Sucre', 'Registro ficticio por ciudad.', 'Sucre', 'San José', '2026-10-10', '2026-10-04T12:00:00Z'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'lost', 'active', 'document', 'Carné de prueba de Sucre', 'Registro ficticio por ciudad.', 'Sucre', 'Centro', '2026-10-11', '2026-10-04T12:00:00Z'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'found', 'active', 'object', 'Bolso de prueba de ciudad literal', 'Registro ficticio por ciudad.', 'Todas las ciudades', 'Centro', '2026-10-10', '2026-10-04T12:00:00Z');
