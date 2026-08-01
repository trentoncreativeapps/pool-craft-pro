-- Team accounts (Settings -> Team Management). Run this once in the app's
-- shared Supabase project's SQL editor, if you want real multi-login Team
-- access instead of just Team billing. Unlike pool_projects, these policies
-- are scoped to auth.uid() - team membership is more sensitive than a
-- design draft, so it's worth doing properly from the start.
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  seats int not null default 2,
  created_at timestamptz not null default now()
);
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique(team_id, email)
);
alter table teams enable row level security;
alter table team_members enable row level security;

create policy "owner manages own team" on teams
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "members can view their team" on teams
  for select using (exists (select 1 from team_members where team_members.team_id = teams.id and team_members.user_id = auth.uid()));

create policy "owner manages members" on team_members
  for all using (exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid()))
  with check (exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid()));

create policy "members can see their own membership row" on team_members
  for select using (user_id = auth.uid());

create policy "invited users can activate their own pending row" on team_members
  for update
  using (user_id is null and lower(email) = lower(auth.jwt() ->> 'email'))
  with check (user_id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'));
