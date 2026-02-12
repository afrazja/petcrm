-- Add default_duration to service_presets (in minutes)
alter table public.service_presets
  add column default_duration integer not null default 60;

-- Add duration to appointments (in minutes)
alter table public.appointments
  add column duration integer default 60;
