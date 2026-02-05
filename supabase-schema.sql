-- Supabase schema for Word Guess Who

create table if not exists public.game_configs (
  id text primary key,
  name text not null,
  config_json jsonb not null,
  owner_id uuid references auth.users(id),
  is_system_template boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_game_configs_updated_at
  on public.game_configs (updated_at desc);

create index if not exists idx_game_configs_owner_id
  on public.game_configs (owner_id);

alter table public.game_configs enable row level security;

create policy "Read public or owned configs"
  on public.game_configs
  for select
  using (is_public or is_system_template or auth.uid() = owner_id);

create policy "Owners can manage configs"
  on public.game_configs
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
