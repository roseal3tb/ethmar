-- Ethmar members portal — core schema.
-- Structure (committees → teams → members), tasks with audiences, assignments,
-- the hours ledger and notifications. All writes go through SECURITY DEFINER
-- functions (see 20261125200100_portal_functions.sql); tables expose read-only
-- RLS policies.

create extension if not exists pgcrypto;

create type public.member_role as enum (
  'member',
  'team_lead', 'team_deputy', 'team_supervisor', -- run a team: approve its members' work
  'project_lead',                                 -- title only for now (no powers)
  'committee_lead', 'committee_deputy',           -- run a committee: create tasks, approve
  'vice_president', 'president'                   -- initiative leadership
);
create type public.task_audience as enum ('committee', 'team', 'people', 'leaders');
create type public.task_mode as enum ('open', 'assigned');
create type public.task_status as enum ('active', 'closed', 'cancelled');
create type public.assignment_status as enum ('claimed', 'submitted', 'returned', 'approved');

create table public.committees (
  id text primary key,
  name text not null,
  title text not null,
  description text,
  accent text not null default '#C8DED3',
  sort int not null default 0
);

create table public.teams (
  id text primary key,
  committee_id text not null references public.committees (id) on delete cascade,
  name text not null,
  head_title text not null default 'قيادة', -- «قيادة» or «إشراف»
  sort int not null default 0
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(full_name) between 2 and 80),
  committee_id text references public.committees (id),
  team_id text references public.teams (id),
  role public.member_role not null default 'member',
  title text,                                  -- e.g. «قائدة اللجنة»، «إشراف»
  extra_titles text[] not null default '{}',   -- secondary roles shown on the profile
  member_code text unique,
  user_id uuid unique references auth.users (id) on delete set null,
  is_admin boolean not null default false,     -- manages accounts (not a club role)
  must_change_password boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index members_committee_idx on public.members (committee_id);
create index members_team_idx on public.members (team_id);

-- A member's team must belong to their committee.
create function public.check_member_team() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.team_id is not null and not exists (
    select 1 from teams t where t.id = new.team_id and t.committee_id = new.committee_id
  ) then
    raise exception 'team % is not in committee %', new.team_id, new.committee_id;
  end if;
  return new;
end $$;
create trigger members_team_check before insert or update on public.members
for each row execute function public.check_member_team();

-- Emails are private: only the member, admins and the initiative leadership read them.
create table public.member_emails (
  member_id uuid primary key references public.members (id) on delete cascade,
  email text not null unique check (email = lower(email) and email like '%@%')
);

create table public.semesters (
  id serial primary key,
  name text not null,
  starts_on date not null,
  ends_on date not null check (ends_on > starts_on)
);

create table public.tiers (
  id text primary key,
  name text not null,
  min_hours numeric not null,
  sort int not null
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 140),
  description text not null default '' check (length(description) <= 4000),
  audience public.task_audience not null,
  committee_id text references public.committees (id),
  team_id text references public.teams (id),
  mode public.task_mode not null,
  seats int check (seats between 1 and 200),
  hours numeric(5, 2) not null check (hours > 0 and hours <= 100),
  due_date date not null,
  status public.task_status not null default 'active',
  created_by uuid not null references public.members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint audience_shape check (
    (audience = 'committee' and committee_id is not null and team_id is null) or
    (audience = 'team' and committee_id is not null and team_id is not null) or
    (audience = 'people' and committee_id is not null and team_id is null) or
    (audience = 'leaders' and committee_id is null and team_id is null)
  ),
  constraint mode_shape check (
    (mode = 'open' and seats is not null) or (mode = 'assigned' and seats is null)
  )
);
create index tasks_committee_idx on public.tasks (committee_id);
create index tasks_due_idx on public.tasks (due_date);

create table public.task_assignments (
  task_id uuid not null references public.tasks (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status public.assignment_status not null default 'claimed',
  assigned_by uuid references public.members (id), -- null when the member claimed a seat
  claimed_at timestamptz not null default now(),
  note text check (length(note) <= 2000),
  link text check (length(link) <= 500),
  submitted_at timestamptz,
  review_note text check (length(review_note) <= 1000),
  reviewed_by uuid references public.members (id),
  reviewed_at timestamptz,
  primary key (task_id, member_id)
);
create index task_assignments_member_idx on public.task_assignments (member_id);

-- The hours ledger. A row is written when a submission is approved.
create table public.hour_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  hours numeric(6, 2) not null check (hours > 0),
  earned_on date not null default current_date,
  description text,
  approved_by uuid references public.members (id),
  created_at timestamptz not null default now(),
  unique (member_id, task_id)
);
create index hour_entries_member_idx on public.hour_entries (member_id, earned_on);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_member_idx on public.notifications (member_id, created_at desc);

alter table public.committees enable row level security;
alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.member_emails enable row level security;
alter table public.semesters enable row level security;
alter table public.tiers enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.hour_entries enable row level security;
alter table public.notifications enable row level security;
