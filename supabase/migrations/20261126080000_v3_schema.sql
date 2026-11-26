-- Portal v3 — schema: projects, comments, files & extra hours on submissions, achievements inputs,
-- certificates, surveys, hour imports, capabilities, password-help rate limiting.
-- (Functions that use the new 'project' audience live in the next migration: a new enum value
-- can't be used in the transaction that adds it.)

alter type public.task_audience add value if not exists 'project';

-- ------------------------------------------------------------------ capabilities
-- Specific powers granted to a member without making them leadership:
--   hours    → import past hours, manage semesters
--   surveys  → create surveys for everyone
--   projects → manage every project
--   accounts → invite anyone / send password links
alter table public.members add column if not exists capabilities text[] not null default '{}'
  check (capabilities <@ array['hours', 'surveys', 'projects', 'accounts']);

-- ------------------------------------------------------------------ committees
update public.committees set description = 'استقطاب الأعضاء ومتابعة مشاركتهم وتطويرهم'
  where id = 'hr' and description is null;
update public.committees set description = 'قياس جودة البرامج وتطوير أداء المبادرة باستمرار'
  where id = 'quality' and description is null;

-- ------------------------------------------------------------------ projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 2 and 80),
  tagline text not null default '' check (length(tagline) <= 160),
  situation text not null default '' check (length(situation) <= 3000),
  problem text not null default '' check (length(problem) <= 3000),
  goal text not null default '' check (length(goal) <= 3000),
  success text not null default '' check (length(success) <= 3000),
  location text not null default '' check (length(location) <= 160),
  stage text not null default 'planning' check (stage in ('planning', 'prep', 'execution', 'review', 'done')),
  starts_on date,
  ends_on date,
  sort int not null default 0,
  created_by uuid references public.members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  is_lead boolean not null default false,
  primary key (project_id, member_id)
);
create index project_members_member_idx on public.project_members (member_id);

create table public.project_stage_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage text not null,
  note text check (length(note) <= 600),
  changed_by uuid references public.members (id),
  changed_at timestamptz not null default now()
);

alter table public.tasks add column if not exists project_id uuid references public.projects (id) on delete set null;
create index if not exists tasks_project_idx on public.tasks (project_id);

insert into public.projects (slug, name, tagline, goal, location, sort) values
  ('ambassadors', 'سفراء إثمار', 'البرنامج التوعوي الرئيسي للمبادرة',
   'ربط المعرفة المالية بتخصصات الطلاب واهتماماتهم عبر أنشطة توعوية في كليات الجامعة',
   'خمس كليات ومعرض اليو ووك', 1),
  ('fintech', 'Road to FinTech', 'رحلة إلى منظومة التقنية المالية',
   'التعريف بمنظومة التقنية المالية وابتكاراتها والتحولات في القطاع والفرص المستقبلية', 'R House', 2),
  ('impact', 'Impact by Ethmar', 'المعرض الرئيسي للمبادرة',
   'جمع الطلاب بالتخصصات المالية والجهات المهنية والشركات، مع فرص وظيفية وتدريبية وورش عمل',
   'كافد المالية أو الكراج', 3),
  ('sessions', 'الجلسات الحوارية', 'لقاءات مع خبراء وقادة القطاع',
   'جلسات تفاعلية تجمع الطلاب بخبراء القطاع والقيادات المالية وصناع القرار', 'R House', 4),
  ('visits', 'الزيارات الإثرائية', 'زيارات ميدانية لبيئات العمل الحقيقية',
   'زيارات ميدانية للمؤسسات المالية والجهات التنظيمية والاستشارية', 'عدة جهات مالية وتنظيمية', 5)
on conflict (slug) do nothing;

-- ------------------------------------------------------------------ task comments
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);

create table public.comment_reactions (
  comment_id uuid not null references public.task_comments (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '🔥', '👏', '🙏')),
  primary key (comment_id, member_id, emoji)
);

-- ------------------------------------------------------------------ submissions: files + extra hours
alter table public.task_assignments
  add column if not exists files jsonb not null default '[]' check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 5),
  add column if not exists extra_hours numeric(5, 2) check (extra_hours > 0 and extra_hours <= 50),
  add column if not exists extra_reason text check (length(extra_reason) <= 500),
  add column if not exists extra_status text check (extra_status in ('pending', 'approved', 'declined'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-files', 'task-files', false, 10485760)
on conflict (id) do nothing;

-- ------------------------------------------------------------------ certificates
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10)),
  member_id uuid not null references public.members (id) on delete cascade,
  semester_id int references public.semesters (id) on delete set null,
  period_label text not null,
  hours numeric(7, 2) not null check (hours > 0),
  tasks int not null default 0,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index certificates_member_idx on public.certificates (member_id);

-- ------------------------------------------------------------------ surveys
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 140),
  description text not null default '' check (length(description) <= 2000),
  audience text not null check (audience in ('all', 'committee', 'leaders', 'project')),
  committee_id text references public.committees (id),
  project_id uuid references public.projects (id) on delete cascade,
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 30),
  anonymous boolean not null default false,
  deadline timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid not null references public.members (id),
  created_at timestamptz not null default now(),
  constraint survey_shape check (
    (audience = 'committee' and committee_id is not null) or
    (audience = 'project' and project_id is not null) or
    (audience in ('all', 'leaders'))
  )
);

create table public.survey_responses (
  survey_id uuid not null references public.surveys (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (survey_id, member_id)
);

-- ------------------------------------------------------------------ hour imports
create table public.hour_imports (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(label) between 2 and 120),
  rows int not null,
  total_hours numeric(9, 2) not null,
  created_by uuid not null references public.members (id),
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
alter table public.hour_entries add column if not exists import_id uuid references public.hour_imports (id) on delete cascade;
-- (member_id, task_id) stays unique; imported rows have no task.

-- ------------------------------------------------------------------ password help (edge function only)
create table public.password_requests (
  email text not null,
  requested_at timestamptz not null default now()
);
create index password_requests_email_idx on public.password_requests (email, requested_at desc);

-- ------------------------------------------------------------------ RLS on, reads come next migration
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_stage_log enable row level security;
alter table public.task_comments enable row level security;
alter table public.comment_reactions enable row level security;
alter table public.certificates enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;
alter table public.hour_imports enable row level security;
alter table public.password_requests enable row level security;

revoke all on public.projects, public.project_members, public.project_stage_log, public.task_comments,
  public.comment_reactions, public.certificates, public.surveys, public.survey_responses,
  public.hour_imports, public.password_requests from anon;
revoke insert, update, delete, truncate, references, trigger on public.projects, public.project_members,
  public.project_stage_log, public.task_comments, public.comment_reactions, public.certificates,
  public.surveys, public.survey_responses, public.hour_imports, public.password_requests from authenticated;
grant select on public.projects, public.project_members, public.project_stage_log, public.task_comments,
  public.comment_reactions, public.certificates, public.surveys, public.survey_responses,
  public.hour_imports to authenticated;
revoke all on public.password_requests from authenticated;
