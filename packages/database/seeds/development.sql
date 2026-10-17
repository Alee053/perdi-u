-- Fictional development data only. Existing records are never overwritten.
INSERT INTO profiles (id, display_name) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Santiago Demo'),
  ('10000000-0000-0000-0000-000000000002', 'Autora de prueba')
ON CONFLICT DO NOTHING;

INSERT INTO profile_contacts (profile_id, email) VALUES
  ('10000000-0000-0000-0000-000000000001', 'fictional@example.invalid')
ON CONFLICT DO NOTHING;

INSERT INTO reports (id, owner_id, type, state, category, title, description, city, zone, incident_date) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'found', 'active', 'object', 'Mochila azul encontrada', 'Reporte ficticio para probar el catálogo persistido.', 'La Paz', 'Miraflores', '2026-10-10'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'lost', 'active', 'pet', 'Gato de prueba perdido', 'Reporte ficticio de una mascota con collar azul.', 'Cochabamba', 'Cala Cala', '2026-10-09'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'found', 'resolved', 'document', 'Documento de prueba devuelto', 'Este reporte resuelto no debe aparecer en el catálogo.', 'La Paz', 'Centro', '2026-10-08')
ON CONFLICT DO NOTHING;

INSERT INTO report_contacts (report_id, phone) VALUES
  ('20000000-0000-0000-0000-000000000001', '59170000001')
ON CONFLICT DO NOTHING;

INSERT INTO report_images (report_id, position, public_url, storage_key) VALUES
  ('20000000-0000-0000-0000-000000000001', 0, '/images/object.svg', 'fixture-private-storage-key')
ON CONFLICT DO NOTHING;
