-- Add booking configuration to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT false;

-- Index for fast slug lookups from the public booking page
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_booking_slug
  ON public.profiles(booking_slug) WHERE booking_slug IS NOT NULL;
