-- Add status column to appointments
-- Values: 'scheduled', 'completed', 'no-show'
alter table appointments
  add column if not exists status text not null default 'completed';

-- Backfill: mark future appointments as 'scheduled'
update appointments
  set status = 'scheduled'
  where completed_at > now();
