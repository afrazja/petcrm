-- Add health_map JSONB column to pets table
-- Stores an array of markers: [{ id, x, y, note, created_at }]
-- x and y are fractions (0.0–1.0) representing position on the dog SVG

ALTER TABLE public.pets
ADD COLUMN health_map jsonb DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.pets.health_map IS 'Array of health map markers [{id, x, y, note, created_at}]. Coordinates are 0.0-1.0 fractions.';
