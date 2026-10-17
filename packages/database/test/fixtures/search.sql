-- Fictional reports shared by isolated HTTP and browser acceptance tests.
INSERT INTO reports (id, owner_id, type, state, category, title, description, city, zone, incident_date, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'lost', 'active', 'object', 'Cámara de prueba perdida', 'Cámara negra con correa.', 'La Paz', 'Centro', '2026-10-10', '2026-10-14T12:00:00.123900Z'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'found', 'active', 'pet', 'Perrita de prueba encontrada', 'Junto a una cámara de seguridad.', 'Cochabamba', 'Centro', '2026-10-10', '2026-10-14T12:00:00.123100Z'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'found', 'active', 'document', 'Carné de prueba encontrado', 'Documento de la asociación ficticia.', 'La Paz', 'Centro', '2026-10-10', '2026-10-13T12:00:00Z'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'found', 'active', 'object', 'Libro de prueba O''Reilly', 'Etiqueta literal: 100%_seguro.', 'La Paz', 'Centro', '2026-10-10', '2026-10-13T12:00:00Z'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'lost', 'resolved', 'object', 'Cámara de prueba devuelta', 'Este caso ya está resuelto.', 'La Paz', 'Centro', '2026-10-10', '2026-10-15T12:00:00Z');
