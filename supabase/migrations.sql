-- Run this in your Supabase SQL editor (separate project from GAEDHD)
-- or in the GAEDHD project if you want to share the same DB.

create table if not exists wolf_potato_locations (
  id          bigserial primary key,
  dog         text not null check (dog in ('razzy', 'bucky')),
  room        text not null,
  entered_at  timestamptz not null default now(),
  exited_at   timestamptz,
  distance_m  float
);

create index if not exists wp_locations_dog_time
  on wolf_potato_locations (dog, entered_at desc);

-- Enable Realtime so the frontend gets live pushes
alter publication supabase_realtime add table wolf_potato_locations;

-- Row-level security: public read (no auth needed — it's a family toy)
alter table wolf_potato_locations enable row level security;

create policy "public read" on wolf_potato_locations
  for select using (true);

-- Bridge writes via service role key (bypasses RLS), no insert policy needed.
