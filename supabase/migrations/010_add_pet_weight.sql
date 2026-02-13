-- Add weight column to pets table (stored in lbs)
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS weight numeric(6,2) DEFAULT NULL;
