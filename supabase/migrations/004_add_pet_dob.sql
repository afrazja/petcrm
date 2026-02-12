-- Add date_of_birth column to pets table
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS date_of_birth date DEFAULT NULL;
