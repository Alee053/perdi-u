ALTER TABLE reports ADD COLUMN pet_species text;
ALTER TABLE reports ADD CONSTRAINT reports_pet_species_valid CHECK (
  pet_species IS NULL OR (
    category = 'pet' AND length(trim(pet_species)) BETWEEN 1 AND 100
  )
);
