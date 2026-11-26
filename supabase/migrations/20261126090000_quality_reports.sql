-- Quality reports.
--
-- Weekly: every committee's heads send the quality committee a report on their week (what got done,
-- what's next, challenges, support needed) together with a weekly evaluation of each of their
-- members. The quality committee reviews each report (score + note) or returns it for changes.
-- Monthly: the quality committee's heads write the month's report for the initiative leadership,
-- built on an automatic per-committee overview of the weekly reports, scores and hours.
--
-- Weeks run Sunday → Saturday (Riyadh). A weekly report is due by the end of its Saturday.

-- ================================================================== tables

create table public.committee_reports (
  id uuid primary key default gen_random_uuid(),
  committee_id text not null references public.committees (id) on delete cascade,
  week_start date not null check (extract(dow from week_start) = 0),
  author_id uuid not null references public.members (id),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed', 'returned')),
  done text not null default '',
  next_plan text not null default '',
  challenges text not null default '',
  support text not null default '',
  link text not null default '',
  self_score smallint check (self_score between 1 and 5),
  submitted_at timestamptz,
  reviewed_by uuid references public.members (id),
  reviewed_at timestamptz,
  quality_score smallint check (quality_score between 1 and 5),
  quality_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (committee_id, week_start)
);
create index committee_reports_week_idx on public.committee_reports (week_start desc);

create table public.member_evaluations (
  report_id uuid not null references public.committee_reports (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  score smallint check (score between 1 and 5),
  standout boolean not null default false,
  note text not null default '',
  primary key (report_id, member_id)
);
create index member_evaluations_member_idx on public.member_evaluations (member_id);

create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  month date not null unique check (extract(day from month) = 1),
  author_id uuid not null references public.members (id),
  status text not null default 'draft' check (status in ('draft', 'published')),
  summary text not null default '',
  highlights text not null default '',
  issues text not null default '',
  recommendations text not null default '',
  committee_notes jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.committee_reports enable row level security;
alter table public.member_evaluations enable row level security;
alter table public.monthly_reports enable row level security;
revoke all on public.committee_reports, public.member_evaluations, public.monthly_reports from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.committee_reports, public.member_evaluations, public.monthly_reports from authenticated;
grant select on public.committee_reports, public.member_evaluations, public.monthly_reports to authenticated;

-- ================================================================== who's who

/** The quality committee: every active member of it. */
create or replace function public.in_quality() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and active and committee_id = 'quality')
$$;

/** Heads of the quality committee (they write the monthly report). */
create or replace function public.heads_quality() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and active and committee_id = 'quality'
                 and role in ('committee_lead', 'committee_deputy'))
$$;

/** The caller heads this committee. */
create or replace function public.heads_committee(p_committee text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where user_id = auth.uid() and active and committee_id = p_committee
                 and role in ('committee_lead', 'committee_deputy'))
$$;

/** Weekly reports of a committee: its heads, the quality committee, leadership. */
create or replace function public.can_view_committee_reports(p_committee text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_leadership() or public.in_quality() or public.heads_committee(p_committee)
$$;

create or replace function public.can_review_reports() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_leadership() or public.in_quality()
$$;

/** Sunday of the week a day falls in. */
create or replace function public.week_of(p_day date) returns date
language sql immutable as $$
  select p_day - extract(dow from p_day)::int
$$;

create or replace function public.riyadh_today() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Riyadh')::date
$$;

create policy "read reports of my committee or as quality" on public.committee_reports
  for select to authenticated using (public.can_view_committee_reports(committee_id));
create policy "read evaluations with their report" on public.member_evaluations
  for select to authenticated using (exists (
    select 1 from public.committee_reports r
    where r.id = report_id and public.can_view_committee_reports(r.committee_id)));
create policy "monthly: quality reads all, leadership reads published" on public.monthly_reports
  for select to authenticated using (public.in_quality() or (public.is_leadership() and status = 'published'));

-- ================================================================== weekly

/**
 * Saves (and optionally sends) a committee's weekly report with its member evaluations.
 * p_fields: { done, next_plan, challenges, support, link, self_score }
 * p_evals:  [{ member_id, score (1-5 or null), standout, note }]
 * Open to the committee's heads, for this week or one of the last 8, while it's a draft or returned.
 */
create or replace function public.save_committee_report(
  p_committee text, p_week date, p_fields jsonb, p_evals jsonb, p_submit boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me members;
  r committee_reports;
  v_today date := public.riyadh_today();
  v_score int;
  e jsonb;
  v_member uuid;
  v_eval_score int;
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null or not public.heads_committee(p_committee) then raise exception 'forbidden'; end if;
  if p_week is null or extract(dow from p_week) <> 0 then raise exception 'invalid_week'; end if;
  if p_week > public.week_of(v_today) or p_week < public.week_of(v_today) - 56 then
    raise exception 'invalid_week';
  end if;
  if jsonb_typeof(coalesce(p_fields, '{}'::jsonb)) <> 'object' or jsonb_typeof(coalesce(p_evals, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_evals, '[]'::jsonb)) > 80 then
    raise exception 'invalid_report';
  end if;
  if length(coalesce(p_fields ->> 'done', '')) > 4000 or length(coalesce(p_fields ->> 'next_plan', '')) > 4000
     or length(coalesce(p_fields ->> 'challenges', '')) > 4000 or length(coalesce(p_fields ->> 'support', '')) > 4000
     or length(coalesce(p_fields ->> 'link', '')) > 500 then
    raise exception 'invalid_report';
  end if;
  if coalesce(p_fields ->> 'link', '') <> '' and p_fields ->> 'link' !~* '^https?://\S+$' then
    raise exception 'invalid_link';
  end if;
  v_score := nullif(p_fields ->> 'self_score', '')::int;
  if v_score is not null and v_score not between 1 and 5 then raise exception 'invalid_report'; end if;

  select * into r from committee_reports where committee_id = p_committee and week_start = p_week for update;
  if r.id is not null and r.status in ('submitted', 'reviewed') then raise exception 'already_submitted'; end if;
  if p_submit and length(trim(coalesce(p_fields ->> 'done', ''))) < 3 then raise exception 'report_required'; end if;

  if r.id is null then
    insert into committee_reports (committee_id, week_start, author_id)
    values (p_committee, p_week, me.id) returning * into r;
  end if;
  update committee_reports set
    author_id = me.id,
    done = trim(coalesce(p_fields ->> 'done', '')),
    next_plan = trim(coalesce(p_fields ->> 'next_plan', '')),
    challenges = trim(coalesce(p_fields ->> 'challenges', '')),
    support = trim(coalesce(p_fields ->> 'support', '')),
    link = trim(coalesce(p_fields ->> 'link', '')),
    self_score = v_score,
    status = case when p_submit then 'submitted' else status end,
    submitted_at = case when p_submit then now() else submitted_at end,
    updated_at = now()
  where id = r.id;

  -- Clear the previous evaluations (kept as rows so a report's history stays simple).
  update member_evaluations set score = null, standout = false, note = '' where report_id = r.id;
  for e in select * from jsonb_array_elements(coalesce(p_evals, '[]'::jsonb)) loop
    v_member := nullif(e ->> 'member_id', '')::uuid;
    v_eval_score := nullif(e ->> 'score', '')::int;
    if v_member is null or v_member = me.id
       or not exists (select 1 from members where id = v_member and active and committee_id = p_committee) then
      raise exception 'invalid_evaluation';
    end if;
    if v_eval_score is not null and v_eval_score not between 1 and 5 then raise exception 'invalid_evaluation'; end if;
    if length(coalesce(e ->> 'note', '')) > 500 then raise exception 'invalid_evaluation'; end if;
    insert into member_evaluations (report_id, member_id, score, standout, note)
    values (r.id, v_member, v_eval_score, coalesce((e ->> 'standout')::boolean, false), trim(coalesce(e ->> 'note', '')))
    on conflict (report_id, member_id) do update
      set score = excluded.score, standout = excluded.standout, note = excluded.note;
  end loop;

  if p_submit then
    insert into notifications (member_id, title, body, link)
    select q.id, 'تقرير أسبوعي جديد', c.title || ' · ' || me.full_name, '/portal/reports?week=' || p_week || '&c=' || p_committee
    from members q, committees c
    where c.id = p_committee and q.active and q.committee_id = 'quality'
      and q.role in ('committee_lead', 'committee_deputy') and q.id <> me.id;
  end if;
  return r.id;
end $$;

/** Quality (or leadership) reviews a sent report: 'review' with a score, or 'return' it with a note. */
create or replace function public.review_committee_report(
  p_report uuid, p_action text, p_score int, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  r committee_reports;
  c committees;
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null or not public.can_review_reports() then raise exception 'forbidden'; end if;
  select * into r from committee_reports where id = p_report for update;
  if r.id is null then raise exception 'not_found'; end if;
  -- Nobody grades their own committee's report (leadership may, for the quality committee's own).
  if r.author_id = me.id or (r.committee_id = me.committee_id and not public.is_leadership()) then
    raise exception 'forbidden';
  end if;
  if r.status not in ('submitted', 'reviewed') then raise exception 'not_submitted'; end if;
  if length(coalesce(p_note, '')) > 1500 then raise exception 'invalid_note'; end if;
  select * into c from committees where id = r.committee_id;

  if p_action = 'review' then
    if p_score is null or p_score not between 1 and 5 then raise exception 'invalid_score'; end if;
    update committee_reports set status = 'reviewed', quality_score = p_score, quality_note = trim(coalesce(p_note, '')),
      reviewed_by = me.id, reviewed_at = now(), updated_at = now() where id = r.id;
    insert into notifications (member_id, title, body, link)
    select h.id, 'راجعت لجنة الجودة تقريركم', c.title || ' · ' || p_score || ' من 5',
           '/portal/reports?week=' || r.week_start || '&c=' || r.committee_id
    from members h where h.active and h.committee_id = r.committee_id and h.role in ('committee_lead', 'committee_deputy');
  elsif p_action = 'return' then
    if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'note_required'; end if;
    update committee_reports set status = 'returned', quality_note = trim(p_note), quality_score = null,
      reviewed_by = me.id, reviewed_at = now(), updated_at = now() where id = r.id;
    insert into notifications (member_id, title, body, link)
    select h.id, 'رجع تقريركم الأسبوعي للتعديل', trim(p_note),
           '/portal/reports?week=' || r.week_start || '&c=' || r.committee_id
    from members h where h.active and h.committee_id = r.committee_id and h.role in ('committee_lead', 'committee_deputy');
  else
    raise exception 'invalid_action';
  end if;
end $$;

/** Reminds the heads of committees that haven't sent this week's report. Returns how many people. */
create or replace function public.remind_committee_reports(p_week date) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.can_review_reports() then raise exception 'forbidden'; end if;
  insert into notifications (member_id, title, body, link)
  select h.id, 'تذكير: التقرير الأسبوعي', 'لجنة الجودة بانتظار تقرير ' || c.title || ' لهذا الأسبوع',
         '/portal/reports?week=' || p_week || '&c=' || c.id
  from committees c
  join members h on h.committee_id = c.id and h.active and h.role in ('committee_lead', 'committee_deputy')
  where not exists (select 1 from committee_reports r where r.committee_id = c.id and r.week_start = p_week
                      and r.status in ('submitted', 'reviewed'));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ================================================================== monthly

/** Numbers behind the monthly report, per committee. Quality and leadership only. */
create or replace function public.monthly_overview(p_month date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_start date := date_trunc('month', p_month)::date;
  v_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_weeks int;
begin
  if not public.can_review_reports() then raise exception 'forbidden'; end if;
  -- Weeks whose Saturday falls inside the month (and has passed or is this week).
  select count(*) into v_weeks from generate_series(public.week_of(v_start), v_end - 1, interval '7 days') w
  where (w::date + 6) >= v_start and (w::date + 6) < v_end and w::date <= public.week_of(public.riyadh_today());
  return coalesce((
    select jsonb_agg(j order by sort)
    from (
      select c.sort, jsonb_build_object(
        'committee_id', c.id,
        'weeks', v_weeks,
        'sent', count(r.id) filter (where r.status in ('submitted', 'reviewed')),
        'on_time', count(r.id) filter (where r.status in ('submitted', 'reviewed')
                    and r.submitted_at <= ((r.week_start + 7)::timestamp at time zone 'Asia/Riyadh')),
        'quality_avg', round(avg(r.quality_score)::numeric, 2),
        'self_avg', round(avg(r.self_score)::numeric, 2),
        'members_avg', (select round(avg(e.score)::numeric, 2) from member_evaluations e
                         join committee_reports r2 on r2.id = e.report_id
                         where r2.committee_id = c.id and (r2.week_start + 6) >= v_start and (r2.week_start + 6) < v_end
                           and r2.status in ('submitted', 'reviewed')),
        'standouts', (select coalesce(jsonb_agg(distinct e.member_id), '[]'::jsonb) from member_evaluations e
                       join committee_reports r2 on r2.id = e.report_id
                       where r2.committee_id = c.id and e.standout and (r2.week_start + 6) >= v_start
                         and (r2.week_start + 6) < v_end and r2.status in ('submitted', 'reviewed')),
        'hours', (select coalesce(sum(h.hours), 0) from hour_entries h join members m on m.id = h.member_id
                  where m.committee_id = c.id and h.earned_on >= v_start and h.earned_on < v_end),
        'members', (select count(*) from members m where m.committee_id = c.id and m.active)
      ) as j
      from committees c
      left join committee_reports r on r.committee_id = c.id
        and (r.week_start + 6) >= v_start and (r.week_start + 6) < v_end
      group by c.id, c.sort
    ) t
  ), '[]'::jsonb);
end $$;

/** Quality heads write the month's report; publishing sends it to the initiative leadership. */
create or replace function public.save_monthly_report(p_month date, p_fields jsonb, p_publish boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me members;
  v_month date := date_trunc('month', p_month)::date;
  v_id uuid;
  v_status text;
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null or not public.heads_quality() then raise exception 'forbidden'; end if;
  if v_month > date_trunc('month', public.riyadh_today())::date
     or v_month < (date_trunc('month', public.riyadh_today()) - interval '12 months')::date then
    raise exception 'invalid_month';
  end if;
  if jsonb_typeof(coalesce(p_fields, '{}'::jsonb)) <> 'object'
     or length(coalesce(p_fields ->> 'summary', '')) > 6000 or length(coalesce(p_fields ->> 'highlights', '')) > 6000
     or length(coalesce(p_fields ->> 'issues', '')) > 6000 or length(coalesce(p_fields ->> 'recommendations', '')) > 6000
     or (p_fields ? 'committee_notes' and jsonb_typeof(p_fields -> 'committee_notes') <> 'object')
     or length(coalesce((p_fields -> 'committee_notes')::text, '')) > 20000 then
    raise exception 'invalid_report';
  end if;
  if p_publish and length(trim(coalesce(p_fields ->> 'summary', ''))) < 10 then raise exception 'report_required'; end if;

  select id, status into v_id, v_status from monthly_reports where month = v_month for update;
  if v_status = 'published' and not p_publish then raise exception 'already_published'; end if;
  insert into monthly_reports (month, author_id, summary, highlights, issues, recommendations, committee_notes,
                               status, published_at)
  values (v_month, me.id, trim(coalesce(p_fields ->> 'summary', '')), trim(coalesce(p_fields ->> 'highlights', '')),
          trim(coalesce(p_fields ->> 'issues', '')), trim(coalesce(p_fields ->> 'recommendations', '')),
          coalesce(p_fields -> 'committee_notes', '{}'::jsonb),
          case when p_publish then 'published' else 'draft' end, case when p_publish then now() end)
  on conflict (month) do update set
    author_id = excluded.author_id, summary = excluded.summary, highlights = excluded.highlights,
    issues = excluded.issues, recommendations = excluded.recommendations,
    committee_notes = excluded.committee_notes,
    status = case when monthly_reports.status = 'published' then 'published' else excluded.status end,
    published_at = coalesce(monthly_reports.published_at, excluded.published_at),
    updated_at = now()
  returning id into v_id;

  if p_publish and coalesce(v_status, 'draft') = 'draft' then
    insert into notifications (member_id, title, body, link)
    select l.id, 'تقرير الجودة الشهري', 'من لجنة الجودة والتطوير · ' || to_char(v_month, 'YYYY-MM'),
           '/portal/reports?tab=monthly&month=' || v_month
    from members l where l.active and (l.is_admin or l.role in ('president', 'vice_president')) and l.id <> me.id;
  end if;
  return v_id;
end $$;

-- ================================================================== grants

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'in_quality', 'heads_quality', 'heads_committee', 'can_view_committee_reports', 'can_review_reports',
      'week_of', 'riyadh_today', 'save_committee_report', 'review_committee_report',
      'remind_committee_reports', 'monthly_overview', 'save_monthly_report')
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
