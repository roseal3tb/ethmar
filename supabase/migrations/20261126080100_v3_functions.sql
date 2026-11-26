-- Portal v3 — rules and actions for projects, comments, files, extra hours, achievements,
-- certificates, surveys, hour imports, semesters, capabilities and deactivation.

-- ================================================================== helpers

create or replace function public.has_cap(p_cap text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin or role in ('president', 'vice_president') or p_cap = any (capabilities)
                   from members where user_id = auth.uid() and active), false)
$$;

create or replace function public.is_project_member(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members pm join members me on me.id = pm.member_id
    where pm.project_id = p_project and me.user_id = auth.uid() and me.active
  )
$$;

-- Leadership, the «projects» capability, the projects committee's heads, and the project's own leads.
create or replace function public.can_manage_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select me.is_admin or me.role in ('president', 'vice_president')
      or 'projects' = any (me.capabilities)
      or (me.role in ('committee_lead', 'committee_deputy') and me.committee_id = 'projects')
      or exists (select 1 from project_members pm
                 where pm.project_id = p_project and pm.member_id = me.id and pm.is_lead)
    from members me where me.user_id = auth.uid() and me.active
  ), false)
$$;

-- Above the project leads: may create projects and choose their leads.
create or replace function public.can_run_projects() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select me.is_admin or me.role in ('president', 'vice_president')
      or 'projects' = any (me.capabilities)
      or (me.role in ('committee_lead', 'committee_deputy') and me.committee_id = 'projects')
    from members me where me.user_id = auth.uid() and me.active
  ), false)
$$;

-- ================================================================== tasks (project audience)

alter table public.tasks drop constraint if exists audience_shape;
alter table public.tasks add constraint audience_shape check (
  (audience = 'committee' and committee_id is not null and team_id is null) or
  (audience = 'team' and committee_id is not null and team_id is not null) or
  (audience = 'people' and committee_id is not null and team_id is null) or
  (audience = 'leaders' and committee_id is null and team_id is null) or
  (audience = 'project' and project_id is not null and committee_id is null and team_id is null)
);

create or replace function public.can_view_task(p_task uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from members me, tasks t
    where me.user_id = auth.uid() and me.active and t.id = p_task and (
      me.is_admin or me.role in ('president', 'vice_president')
      or t.created_by = me.id
      or exists (select 1 from task_assignments a where a.task_id = t.id and a.member_id = me.id)
      or (t.audience = 'committee' and t.committee_id = me.committee_id)
      or (t.audience = 'team' and t.committee_id = me.committee_id
          and (t.team_id = me.team_id or me.role in ('committee_lead', 'committee_deputy')))
      or (t.audience = 'people' and t.committee_id = me.committee_id
          and (me.role in ('committee_lead', 'committee_deputy')
               or (me.role in ('team_lead', 'team_deputy', 'team_supervisor') and exists (
                     select 1 from task_assignments a join members x on x.id = a.member_id
                     where a.task_id = t.id and x.team_id = me.team_id))))
      or (t.audience = 'leaders' and t.mode = 'open' and me.role in ('committee_lead', 'committee_deputy'))
      or (t.audience = 'project' and (
            exists (select 1 from project_members pm where pm.project_id = t.project_id and pm.member_id = me.id)
            or public.can_manage_project(t.project_id)))
    )
  )
$$;

create or replace function public.can_review(p_task uuid, p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from members me, tasks t, members x
    where me.user_id = auth.uid() and me.active and t.id = p_task and x.id = p_member
      and me.id <> x.id and (
        (t.audience = 'leaders' and (me.is_admin or me.role in ('president', 'vice_president')))
        or (t.audience = 'project' and public.can_manage_project(t.project_id))
        or (t.audience not in ('leaders', 'project') and (
          me.is_admin
          or (me.role in ('committee_lead', 'committee_deputy') and me.committee_id = t.committee_id)
          or (me.role in ('team_lead', 'team_deputy', 'team_supervisor')
              and me.team_id is not null and me.team_id = x.team_id and me.committee_id = t.committee_id)
        ))
      )
  )
$$;

drop function if exists public.create_task(text, text, public.task_audience, text, text, public.task_mode, int, numeric, date, uuid[]);
create function public.create_task(
  p_title text, p_description text, p_audience public.task_audience, p_committee text,
  p_team text, p_mode public.task_mode, p_seats int, p_hours numeric, p_due date,
  p_targets uuid[] default '{}', p_project uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me members;
  v_id uuid;
  bad int;
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null then raise exception 'not_a_member'; end if;
  if p_due < current_date then raise exception 'due_in_past'; end if;
  p_targets := coalesce(p_targets, '{}');
  if p_project is not null and not exists (select 1 from projects where id = p_project) then
    raise exception 'invalid_project';
  end if;

  if p_audience = 'leaders' then
    if not (me.is_admin or me.role in ('president', 'vice_president')) then raise exception 'forbidden'; end if;
    p_committee := null; p_team := null;
  elsif p_audience = 'project' then
    if p_project is null then raise exception 'invalid_project'; end if;
    if not public.can_manage_project(p_project) then raise exception 'forbidden'; end if;
    p_committee := null; p_team := null;
  else
    if p_committee is null then raise exception 'committee_required'; end if;
    if not (me.is_admin or (me.role in ('committee_lead', 'committee_deputy') and me.committee_id = p_committee)) then
      raise exception 'forbidden';
    end if;
    if p_audience = 'team' then
      if p_team is null or not exists (select 1 from teams where id = p_team and committee_id = p_committee) then
        raise exception 'invalid_team';
      end if;
    else
      p_team := null;
    end if;
    if p_audience = 'people' then p_mode := 'assigned'; end if;
  end if;

  if p_mode = 'assigned' then
    if cardinality(p_targets) = 0 then raise exception 'invalid_targets'; end if;
    select count(*) into bad
    from unnest(p_targets) tid left join members x on x.id = tid
    where x.id is null or not x.active or x.id = me.id
       or (p_audience = 'leaders' and x.role not in ('committee_lead', 'committee_deputy'))
       or (p_audience = 'project' and not exists (
             select 1 from project_members pm where pm.project_id = p_project and pm.member_id = x.id))
       or (p_audience not in ('leaders', 'project') and x.committee_id is distinct from p_committee)
       or (p_audience = 'team' and x.team_id is distinct from p_team);
    if bad > 0 then raise exception 'invalid_targets'; end if;
    p_seats := null;
  else
    if p_seats is null or p_seats < 1 then raise exception 'invalid_seats'; end if;
    p_targets := '{}';
  end if;

  insert into tasks (title, description, audience, committee_id, team_id, mode, seats, hours, due_date, created_by, project_id)
  values (trim(p_title), coalesce(trim(p_description), ''), p_audience, p_committee, p_team, p_mode, p_seats,
          p_hours, p_due, me.id, p_project)
  returning id into v_id;

  insert into task_assignments (task_id, member_id, assigned_by)
  select v_id, tid, me.id from unnest(p_targets) tid;

  insert into notifications (member_id, title, body, link)
  select x.id, case when p_mode = 'assigned' then 'أُسندت لك مهمة جديدة' else 'مهمة جديدة متاحة' end,
         trim(p_title), '/portal/tasks?task=' || v_id
  from members x
  where x.active and x.id <> me.id and (
    (p_mode = 'assigned' and x.id = any (p_targets))
    or (p_mode = 'open' and (
      (p_audience = 'committee' and x.committee_id = p_committee)
      or (p_audience = 'team' and x.team_id = p_team)
      or (p_audience = 'leaders' and x.role in ('committee_lead', 'committee_deputy'))
      or (p_audience = 'project' and exists (
            select 1 from project_members pm where pm.project_id = p_project and pm.member_id = x.id))
    ))
  );
  return v_id;
end $$;

create or replace function public.claim_task(p_task uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
  taken int;
begin
  select * into me from members where user_id = auth.uid() and active;
  select * into t from tasks where id = p_task for update;
  if me.id is null or t.id is null or not public.can_view_task(p_task) then raise exception 'not_found'; end if;
  if t.mode <> 'open' then raise exception 'not_open'; end if;
  if t.status <> 'active' or t.due_date < current_date then raise exception 'task_closed'; end if;
  if t.created_by = me.id then raise exception 'own_task'; end if;
  if not ((t.audience = 'committee' and me.committee_id = t.committee_id)
       or (t.audience = 'team' and me.team_id = t.team_id)
       or (t.audience = 'leaders' and me.role in ('committee_lead', 'committee_deputy'))
       or (t.audience = 'project' and exists (
             select 1 from project_members pm where pm.project_id = t.project_id and pm.member_id = me.id))) then
    raise exception 'forbidden';
  end if;
  if exists (select 1 from task_assignments where task_id = p_task and member_id = me.id) then
    raise exception 'already_claimed';
  end if;
  select count(*) into taken from task_assignments where task_id = p_task;
  if taken >= t.seats then raise exception 'no_seats'; end if;
  insert into task_assignments (task_id, member_id) values (p_task, me.id);
end $$;

drop function if exists public.submit_task(uuid, text, text);
create function public.submit_task(
  p_task uuid, p_note text, p_link text,
  p_files jsonb default '[]', p_extra numeric default null, p_extra_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
  f jsonb;
begin
  select * into me from members where user_id = auth.uid() and active;
  select * into t from tasks where id = p_task;
  if me.id is null or t.id is null then raise exception 'not_found'; end if;
  if t.status = 'cancelled' then raise exception 'task_closed'; end if;
  if nullif(trim(p_link), '') is not null and trim(p_link) !~* '^https?://' then raise exception 'invalid_link'; end if;
  p_files := coalesce(p_files, '[]');
  if jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) > 5 then raise exception 'invalid_files'; end if;
  for f in select * from jsonb_array_elements(p_files) loop
    if coalesce(f ->> 'path', '') not like p_task::text || '/' || me.id::text || '/%' then
      raise exception 'invalid_files';
    end if;
  end loop;
  if p_extra is not null and (p_extra <= 0 or p_extra > 50 or coalesce(trim(p_extra_reason), '') = '') then
    raise exception 'invalid_extra';
  end if;

  update task_assignments
  set status = 'submitted', note = nullif(trim(p_note), ''), link = nullif(trim(p_link), ''),
      files = p_files, submitted_at = now(), review_note = null,
      extra_hours = p_extra, extra_reason = case when p_extra is null then null else trim(p_extra_reason) end,
      extra_status = case when p_extra is null then null else 'pending' end
  where task_id = p_task and member_id = me.id and status in ('claimed', 'returned');
  if not found then raise exception 'cannot_submit'; end if;

  insert into notifications (member_id, title, body, link)
  select r.id, 'تسليم بانتظار اعتمادك', me.full_name || ' · ' || t.title, '/portal/tasks?task=' || t.id
  from members r
  where r.active and r.id <> me.id and (
    (t.audience = 'leaders' and r.role in ('president', 'vice_president'))
    or (t.audience = 'project' and (
          exists (select 1 from project_members pm where pm.project_id = t.project_id and pm.member_id = r.id and pm.is_lead)
          or (r.role in ('committee_lead', 'committee_deputy') and r.committee_id = 'projects')))
    or (t.audience not in ('leaders', 'project') and (
      (r.role in ('committee_lead', 'committee_deputy') and r.committee_id = t.committee_id)
      or (r.role in ('team_lead', 'team_deputy', 'team_supervisor') and me.team_id is not null and r.team_id = me.team_id)
    ))
  );
end $$;

drop function if exists public.review_task(uuid, uuid, boolean, text);
create function public.review_task(
  p_task uuid, p_member uuid, p_approve boolean, p_note text, p_extra_ok boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
  a task_assignments;
  v_hours numeric;
begin
  select * into me from members where user_id = auth.uid() and active;
  if not public.can_review(p_task, p_member) then raise exception 'forbidden'; end if;
  select * into t from tasks where id = p_task;
  select * into a from task_assignments where task_id = p_task and member_id = p_member for update;
  if a.task_id is null or a.status <> 'submitted' then raise exception 'not_submitted'; end if;

  if p_approve then
    v_hours := t.hours + case when a.extra_status = 'pending' and coalesce(p_extra_ok, false) then a.extra_hours else 0 end;
    update task_assignments
    set status = 'approved', review_note = nullif(trim(p_note), ''), reviewed_by = me.id, reviewed_at = now(),
        extra_status = case when a.extra_status = 'pending'
                            then case when coalesce(p_extra_ok, false) then 'approved' else 'declined' end
                            else a.extra_status end
    where task_id = p_task and member_id = p_member;
    insert into hour_entries (member_id, task_id, hours, earned_on, description, approved_by)
    values (p_member, p_task, v_hours, current_date, t.title, me.id)
    on conflict (member_id, task_id) do nothing;
    insert into notifications (member_id, title, body, link)
    values (p_member, 'اعتُمدت مهمتك', '+' || trim(to_char(v_hours, 'FM990.##')) || ' ساعات · ' || t.title,
            '/portal/tasks?task=' || t.id);
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'note_required'; end if;
    update task_assignments
    set status = 'returned', review_note = trim(p_note), reviewed_by = me.id, reviewed_at = now()
    where task_id = p_task and member_id = p_member;
    insert into notifications (member_id, title, body, link)
    values (p_member, 'رجعت لك مهمة للتعديل', t.title, '/portal/tasks?task=' || t.id);
  end if;
end $$;

create or replace function public.set_task_status(p_task uuid, p_status public.task_status) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
begin
  select * into me from members where user_id = auth.uid() and active;
  select * into t from tasks where id = p_task for update;
  if me.id is null or t.id is null then raise exception 'not_found'; end if;
  if not (me.is_admin or t.created_by = me.id
          or (t.audience = 'leaders' and me.role in ('president', 'vice_president'))
          or (t.audience = 'project' and public.can_manage_project(t.project_id))
          or (t.audience not in ('leaders', 'project') and me.role in ('committee_lead', 'committee_deputy')
              and me.committee_id = t.committee_id)) then
    raise exception 'forbidden';
  end if;
  update tasks set status = p_status, updated_at = now() where id = p_task;
end $$;

-- ================================================================== comments

create policy "read comments of visible tasks" on public.task_comments for select to authenticated
  using (public.can_view_task(task_id));
create policy "read reactions of visible comments" on public.comment_reactions for select to authenticated
  using (exists (select 1 from task_comments c where c.id = comment_id and public.can_view_task(c.task_id)));

create or replace function public.add_task_comment(p_task uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
  v_id uuid;
begin
  select * into me from members where user_id = auth.uid() and active;
  select * into t from tasks where id = p_task;
  if me.id is null or t.id is null or not public.can_view_task(p_task) then raise exception 'not_found'; end if;
  if coalesce(trim(p_body), '') = '' or length(trim(p_body)) > 1000 then raise exception 'invalid_comment'; end if;
  insert into task_comments (task_id, member_id, body) values (p_task, me.id, trim(p_body)) returning id into v_id;
  insert into notifications (member_id, title, body, link)
  select distinct x.id, 'تعليق جديد على مهمة', me.full_name || ': ' || left(trim(p_body), 90),
         '/portal/tasks?task=' || t.id
  from members x
  where x.active and x.id <> me.id and (
    x.id = t.created_by
    or exists (select 1 from task_assignments a where a.task_id = t.id and a.member_id = x.id)
    or exists (select 1 from task_comments c where c.task_id = t.id and c.member_id = x.id)
  );
  return v_id;
end $$;

create or replace function public.delete_task_comment(p_comment uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  c task_comments;
  t tasks;
begin
  select * into me from members where user_id = auth.uid() and active;
  select * into c from task_comments where id = p_comment;
  if me.id is null or c.id is null then raise exception 'not_found'; end if;
  select * into t from tasks where id = c.task_id;
  if not (c.member_id = me.id or t.created_by = me.id or public.is_leadership()) then raise exception 'forbidden'; end if;
  delete from task_comments where id = p_comment;
end $$;

create or replace function public.toggle_comment_reaction(p_comment uuid, p_emoji text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.me_id();
  v_task uuid;
begin
  select task_id into v_task from task_comments where id = p_comment;
  if v_me is null or v_task is null or not public.can_view_task(v_task) then raise exception 'not_found'; end if;
  if p_emoji not in ('👍', '❤️', '🔥', '👏', '🙏') then raise exception 'invalid_reaction'; end if;
  delete from comment_reactions where comment_id = p_comment and member_id = v_me and emoji = p_emoji;
  if found then return false; end if;
  insert into comment_reactions (comment_id, member_id, emoji) values (p_comment, v_me, p_emoji);
  return true;
end $$;

-- ================================================================== submission files (storage)

drop policy if exists "task files: upload own" on storage.objects;
drop policy if exists "task files: read" on storage.objects;
drop policy if exists "task files: delete own" on storage.objects;
create policy "task files: upload own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-files'
    and (storage.foldername(name))[2] = public.me_id()::text
    and public.can_view_task(((storage.foldername(name))[1])::uuid)
  );
create policy "task files: read" on storage.objects for select to authenticated
  using (
    bucket_id = 'task-files' and (
      (storage.foldername(name))[2] = public.me_id()::text
      or public.can_review(((storage.foldername(name))[1])::uuid, ((storage.foldername(name))[2])::uuid)
    )
  );
create policy "task files: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'task-files' and (storage.foldername(name))[2] = public.me_id()::text);

-- ================================================================== achievements

create or replace function public.my_achievements()
returns table (id text, unlocked boolean, unlocked_at timestamptz, progress numeric, goal numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  me members;
  v_hours numeric;
  v_done int;
  v_first_ok timestamptz;
  v_first_claim timestamptz;
  v_ontime int;
  v_star timestamptz;
  v_voice timestamptz;
  v_board text;
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null then return; end if;
  select coalesce(sum(h.hours), 0) into v_hours from hour_entries h where h.member_id = me.id;
  select count(*), min(a.reviewed_at) into v_done, v_first_ok
    from task_assignments a where a.member_id = me.id and a.status = 'approved';
  select min(a.claimed_at) into v_first_claim from task_assignments a where a.member_id = me.id;
  select count(*) into v_ontime from task_assignments a join tasks t on t.id = a.task_id
    where a.member_id = me.id and a.status = 'approved' and a.submitted_at::date <= t.due_date;
  v_board := public.board_of(me.role);
  if v_board is not null then
    with mh as (
      select h.member_id, date_trunc('month', h.earned_on) mo, sum(h.hours) s
      from hour_entries h join members m on m.id = h.member_id
      where m.active and public.board_of(m.role) = v_board and h.earned_on < date_trunc('month', current_date)
      group by 1, 2
    ), best as (select mo, max(s) mx from mh group by mo)
    select min(mh.mo + interval '1 month' - interval '1 day') into v_star
    from mh join best b on b.mo = mh.mo and mh.s = b.mx
    where mh.member_id = me.id and mh.s > 0;
  end if;
  select min(r.submitted_at) into v_voice from survey_responses r where r.member_id = me.id and r.submitted_at is not null;

  return query values
    ('seed', true, me.created_at, 1::numeric, 1::numeric),
    ('sprout', v_first_claim is not null, v_first_claim, (v_first_claim is not null)::int::numeric, 1::numeric),
    ('first_fruit', v_done >= 1, v_first_ok, least(v_done, 1)::numeric, 1::numeric),
    ('roots', v_hours >= 10, null::timestamptz, least(v_hours, 10), 10::numeric),
    ('basket', v_done >= 5, null::timestamptz, least(v_done, 5)::numeric, 5::numeric),
    ('on_time', v_ontime >= 5, null::timestamptz, least(v_ontime, 5)::numeric, 5::numeric),
    ('voice', v_voice is not null, v_voice, (v_voice is not null)::int::numeric, 1::numeric),
    ('trunk', v_hours >= 50, null::timestamptz, least(v_hours, 50), 50::numeric),
    ('star', v_star is not null, v_star, (v_star is not null)::int::numeric, 1::numeric),
    ('orchard', v_done >= 25, null::timestamptz, least(v_done, 25)::numeric, 25::numeric),
    ('tree', v_hours >= 100, null::timestamptz, least(v_hours, 100), 100::numeric),
    ('leader', me.role <> 'member', null::timestamptz, (me.role <> 'member')::int::numeric, 1::numeric);
end $$;

-- ================================================================== certificates

create policy "read own or overseen certificates" on public.certificates for select to authenticated
  using (public.can_view_member_hours(member_id));

create or replace function public.issue_certificate(p_semester int default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  me members;
  s semesters;
  v_from date;
  v_to date;
  v_label text;
  v_hours numeric;
  v_tasks int;
  v_code text;
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null then raise exception 'not_a_member'; end if;
  if p_semester is not null then
    select * into s from semesters where id = p_semester;
    if s.id is null then raise exception 'not_found'; end if;
    v_from := s.starts_on; v_to := s.ends_on; v_label := s.name;
  else
    v_from := '2000-01-01'; v_to := '2999-12-31'; v_label := 'منذ الانضمام';
  end if;
  select coalesce(sum(hours), 0) into v_hours from hour_entries
    where member_id = me.id and earned_on between v_from and v_to;
  if v_hours <= 0 then raise exception 'no_hours'; end if;
  select count(*) into v_tasks from task_assignments
    where member_id = me.id and status = 'approved' and reviewed_at::date between v_from and v_to;

  select code into v_code from certificates
    where member_id = me.id and semester_id is not distinct from p_semester and revoked_at is null and hours = v_hours
    order by issued_at desc limit 1;
  if v_code is not null then return v_code; end if;

  update certificates set revoked_at = now()
    where member_id = me.id and semester_id is not distinct from p_semester and revoked_at is null;
  insert into certificates (member_id, semester_id, period_label, hours, tasks)
  values (me.id, p_semester, v_label, v_hours, v_tasks)
  returning code into v_code;
  return v_code;
end $$;

-- Public: anyone holding a certificate's code can check it. Returns only what's printed on it.
create or replace function public.verify_certificate(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c certificates;
  m members;
  v_committee text;
  v_newer boolean;
begin
  select * into c from certificates where code = upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));
  if c.id is null then return jsonb_build_object('found', false); end if;
  select * into m from members where id = c.member_id;
  select title into v_committee from committees where id = m.committee_id;
  select exists (select 1 from certificates x where x.member_id = c.member_id
                 and x.semester_id is not distinct from c.semester_id and x.issued_at > c.issued_at) into v_newer;
  return jsonb_build_object(
    'found', true, 'valid', c.revoked_at is null, 'superseded', c.revoked_at is not null and v_newer,
    'code', c.code, 'name', m.full_name, 'committee', coalesce(v_committee, 'قيادة المبادرة'),
    'title', m.title, 'period', c.period_label, 'hours', c.hours, 'tasks', c.tasks, 'issued_at', c.issued_at
  );
end $$;

-- ================================================================== projects

create policy "members read projects" on public.projects for select to authenticated
  using ((select public.me_id()) is not null);
create policy "members read project teams" on public.project_members for select to authenticated
  using ((select public.me_id()) is not null);
create policy "members read project stages" on public.project_stage_log for select to authenticated
  using ((select public.me_id()) is not null);

create or replace function public.create_project(p_name text, p_tagline text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not public.can_run_projects() then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'invalid_name'; end if;
  insert into projects (slug, name, tagline, created_by, sort)
  values ('p-' || substr(md5(random()::text), 1, 8), trim(p_name), coalesce(trim(p_tagline), ''), public.me_id(),
          coalesce((select max(sort) + 1 from projects), 1))
  returning id into v_id;
  insert into project_stage_log (project_id, stage, changed_by) values (v_id, 'planning', public.me_id());
  return v_id;
end $$;

create or replace function public.update_project(p_project uuid, p_fields jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_project(p_project) then raise exception 'forbidden'; end if;
  update projects set
    name = coalesce(nullif(trim(p_fields ->> 'name'), ''), name),
    tagline = coalesce(trim(p_fields ->> 'tagline'), tagline),
    situation = coalesce(trim(p_fields ->> 'situation'), situation),
    problem = coalesce(trim(p_fields ->> 'problem'), problem),
    goal = coalesce(trim(p_fields ->> 'goal'), goal),
    success = coalesce(trim(p_fields ->> 'success'), success),
    location = coalesce(trim(p_fields ->> 'location'), location),
    starts_on = case when p_fields ? 'starts_on' then nullif(p_fields ->> 'starts_on', '')::date else starts_on end,
    ends_on = case when p_fields ? 'ends_on' then nullif(p_fields ->> 'ends_on', '')::date else ends_on end,
    updated_at = now()
  where id = p_project;
end $$;

create or replace function public.set_project_stage(p_project uuid, p_stage text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  p projects;
  v_label text;
begin
  if not public.can_manage_project(p_project) then raise exception 'forbidden'; end if;
  if p_stage not in ('planning', 'prep', 'execution', 'review', 'done') then raise exception 'invalid_stage'; end if;
  select * into p from projects where id = p_project for update;
  if p.stage = p_stage then return; end if;
  update projects set stage = p_stage, updated_at = now() where id = p_project;
  insert into project_stage_log (project_id, stage, note, changed_by)
  values (p_project, p_stage, nullif(trim(p_note), ''), public.me_id());
  v_label := case p_stage when 'planning' then 'التخطيط' when 'prep' then 'التحضير' when 'execution' then 'التنفيذ'
                          when 'review' then 'التقييم' else 'مكتمل' end;
  insert into notifications (member_id, title, body, link)
  select pm.member_id, p.name || ' انتقل لمرحلة ' || v_label, nullif(trim(p_note), ''), '/portal/projects/' || p.id
  from project_members pm join members x on x.id = pm.member_id
  where pm.project_id = p_project and x.active and x.id <> public.me_id();
end $$;

create or replace function public.set_project_team(p_project uuid, p_members uuid[], p_leads uuid[] default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  p projects;
  v_super boolean := public.can_run_projects();
  v_leads uuid[];
  bad int;
begin
  if not public.can_manage_project(p_project) then raise exception 'forbidden'; end if;
  select * into p from projects where id = p_project;
  p_members := coalesce(p_members, '{}');
  -- Only those above the project may change its leads; a lead edits the team around them.
  if v_super and p_leads is not null then
    v_leads := p_leads;
  else
    select coalesce(array_agg(member_id), '{}') into v_leads from project_members where project_id = p_project and is_lead;
  end if;
  p_members := array(select distinct unnest(p_members || v_leads));
  select count(*) into bad from unnest(p_members) mid left join members x on x.id = mid where x.id is null or not x.active;
  if bad > 0 or cardinality(p_members) > 120 then raise exception 'invalid_members'; end if;

  insert into notifications (member_id, title, body, link)
  select mid, 'انضميت لفريق مشروع', p.name, '/portal/projects/' || p.id
  from unnest(p_members) mid
  where mid <> coalesce(public.me_id(), '00000000-0000-0000-0000-000000000000')
    and not exists (select 1 from project_members pm where pm.project_id = p_project and pm.member_id = mid);

  delete from project_members where project_id = p_project and not (member_id = any (p_members));
  insert into project_members (project_id, member_id, is_lead)
  select p_project, mid, mid = any (v_leads) from unnest(p_members) mid
  on conflict (project_id, member_id) do update set is_lead = excluded.is_lead;
end $$;

-- ================================================================== surveys

create or replace function public.survey_audience_ids(p_survey uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.id from members m, surveys s
  where s.id = p_survey and m.active and (
    s.audience = 'all'
    or (s.audience = 'committee' and m.committee_id = s.committee_id)
    or (s.audience = 'leaders' and m.role <> 'member')
    or (s.audience = 'project' and exists (
          select 1 from project_members pm where pm.project_id = s.project_id and pm.member_id = m.id))
  )
$$;

create or replace function public.can_manage_survey(p_survey uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from surveys s where s.id = p_survey and s.created_by = public.me_id())
      or public.is_leadership()
$$;

create or replace function public.can_view_survey(p_survey uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.me_id() is not null and (
    public.can_manage_survey(p_survey)
    or public.me_id() in (select public.survey_audience_ids(p_survey))
  )
$$;

create policy "read visible surveys" on public.surveys for select to authenticated
  using (public.can_view_survey(id));
create policy "read own responses" on public.survey_responses for select to authenticated
  using (member_id = (select public.me_id()));

create or replace function public.create_survey(
  p_title text, p_description text, p_audience text, p_committee text, p_project uuid,
  p_questions jsonb, p_anonymous boolean default false, p_deadline timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me members;
  q jsonb;
  v_id uuid;
  v_ids text[] := '{}';
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null then raise exception 'not_a_member'; end if;
  if p_audience = 'committee' then
    if not (public.has_cap('surveys') or (me.role in ('committee_lead', 'committee_deputy') and me.committee_id = p_committee)) then
      raise exception 'forbidden';
    end if;
    p_project := null;
  elsif p_audience = 'project' then
    if p_project is null or not public.can_manage_project(p_project) then raise exception 'forbidden'; end if;
    p_committee := null;
  elsif p_audience in ('all', 'leaders') then
    if not public.has_cap('surveys') then raise exception 'forbidden'; end if;
    p_committee := null; p_project := null;
  else
    raise exception 'invalid_audience';
  end if;
  if p_deadline is not null and p_deadline < now() then raise exception 'due_in_past'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) not between 1 and 30 then
    raise exception 'invalid_questions';
  end if;
  for q in select * from jsonb_array_elements(p_questions) loop
    if coalesce(q ->> 'id', '') = '' or (q ->> 'id') = any (v_ids)
       or coalesce(trim(q ->> 'title'), '') = ''
       or coalesce(q ->> 'type', '') not in ('short', 'long', 'single', 'multi', 'rating')
       or ((q ->> 'type') in ('single', 'multi') and (jsonb_typeof(q -> 'options') <> 'array'
            or jsonb_array_length(q -> 'options') not between 2 and 12)) then
      raise exception 'invalid_questions';
    end if;
    v_ids := v_ids || (q ->> 'id');
  end loop;

  insert into surveys (title, description, audience, committee_id, project_id, questions, anonymous, deadline, created_by)
  values (trim(p_title), coalesce(trim(p_description), ''), p_audience, p_committee, p_project, p_questions,
          coalesce(p_anonymous, false), p_deadline, me.id)
  returning id into v_id;

  insert into notifications (member_id, title, body, link)
  select x, 'استبيان جديد', trim(p_title), '/portal/surveys/' || v_id
  from public.survey_audience_ids(v_id) x where x <> me.id;
  return v_id;
end $$;

create or replace function public.set_survey_status(p_survey uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_survey(p_survey) then raise exception 'forbidden'; end if;
  if p_status not in ('open', 'closed') then raise exception 'invalid_status'; end if;
  update surveys set status = p_status where id = p_survey;
end $$;

create or replace function public.delete_survey(p_survey uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_survey(p_survey) then raise exception 'forbidden'; end if;
  delete from surveys where id = p_survey;
end $$;

create or replace function public.save_survey_response(p_survey uuid, p_answers jsonb, p_submit boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.me_id();
  s surveys;
  q jsonb;
  v_answer jsonb;
  r survey_responses;
begin
  select * into s from surveys where id = p_survey;
  if v_me is null or s.id is null or not (v_me in (select public.survey_audience_ids(p_survey))) then
    raise exception 'not_found';
  end if;
  if s.status <> 'open' or (s.deadline is not null and s.deadline < now()) then raise exception 'survey_closed'; end if;
  select * into r from survey_responses where survey_id = p_survey and member_id = v_me;
  if r.submitted_at is not null then raise exception 'already_submitted'; end if;
  p_answers := coalesce(p_answers, '{}');
  if jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 20000 then raise exception 'invalid_answers'; end if;
  if p_submit then
    for q in select * from jsonb_array_elements(s.questions) loop
      v_answer := p_answers -> (q ->> 'id');
      if coalesce((q ->> 'required')::boolean, false) and (
           v_answer is null or v_answer = 'null'::jsonb or v_answer = '""'::jsonb or v_answer = '[]'::jsonb
           or (jsonb_typeof(v_answer) = 'string' and trim(v_answer #>> '{}') = '')) then
        raise exception 'answers_required';
      end if;
    end loop;
  end if;
  insert into survey_responses (survey_id, member_id, answers, submitted_at, updated_at)
  values (p_survey, v_me, p_answers, case when p_submit then now() end, now())
  on conflict (survey_id, member_id) do update
    set answers = excluded.answers, submitted_at = excluded.submitted_at, updated_at = now();
end $$;

create or replace function public.survey_overview()
returns table (survey_id uuid, submitted bigint, audience bigint, can_manage boolean)
language sql stable security definer set search_path = public as $$
  select s.id,
    case when public.can_manage_survey(s.id)
         then (select count(*) from survey_responses r where r.survey_id = s.id and r.submitted_at is not null) end,
    case when public.can_manage_survey(s.id) then (select count(*) from public.survey_audience_ids(s.id)) end,
    public.can_manage_survey(s.id)
  from surveys s
  where public.can_view_survey(s.id)
$$;

create or replace function public.survey_results(p_survey uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s surveys;
begin
  if not public.can_manage_survey(p_survey) then raise exception 'forbidden'; end if;
  select * into s from surveys where id = p_survey;
  return jsonb_build_object(
    'audience', (select count(*) from public.survey_audience_ids(p_survey)),
    'responses', coalesce((
      select jsonb_agg(x)
      from (
        select jsonb_build_object(
          'member_id', case when s.anonymous then null else r.member_id end,
          'name', case when s.anonymous then null else m.full_name end,
          'committee', case when s.anonymous then null else c.title end,
          'answers', r.answers,
          'submitted_at', case when s.anonymous then null else r.submitted_at end
        ) x
        from survey_responses r join members m on m.id = r.member_id left join committees c on c.id = m.committee_id
        where r.survey_id = p_survey and r.submitted_at is not null
        order by case when s.anonymous then md5(r.member_id::text || p_survey::text) else r.submitted_at::text end
      ) q
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.remind_survey(p_survey uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  s surveys;
  n int;
begin
  if not public.can_manage_survey(p_survey) then raise exception 'forbidden'; end if;
  select * into s from surveys where id = p_survey;
  insert into notifications (member_id, title, body, link)
  select x, 'تذكير: استبيان بانتظارك', s.title, '/portal/surveys/' || s.id
  from public.survey_audience_ids(p_survey) x
  where x <> public.me_id()
    and not exists (select 1 from survey_responses r where r.survey_id = p_survey and r.member_id = x and r.submitted_at is not null);
  get diagnostics n = row_count;
  return n;
end $$;

-- ================================================================== hours import, semesters

create policy "hours managers read imports" on public.hour_imports for select to authenticated
  using (public.has_cap('hours'));

create or replace function public.import_hours(p_label text, p_rows jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.me_id();
  v_id uuid;
  bad int;
  v_total numeric;
  v_rows int;
begin
  if not public.has_cap('hours') then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 3000 then
    raise exception 'invalid_rows';
  end if;
  select count(*) into bad
  from jsonb_to_recordset(p_rows) r(member_id uuid, hours numeric, earned_on date, description text)
  left join members m on m.id = r.member_id
  where m.id is null or not m.active or r.hours is null or r.hours <= 0 or r.hours > 500
     or r.earned_on is null or r.earned_on > current_date or length(coalesce(r.description, '')) > 200;
  if bad > 0 then raise exception 'invalid_rows'; end if;
  select count(*), sum(r.hours) into v_rows, v_total
    from jsonb_to_recordset(p_rows) r(member_id uuid, hours numeric, earned_on date, description text);

  insert into hour_imports (label, rows, total_hours, created_by)
  values (trim(p_label), v_rows, v_total, v_me) returning id into v_id;
  insert into hour_entries (member_id, task_id, hours, earned_on, description, approved_by, import_id)
  select r.member_id, null, r.hours, r.earned_on, coalesce(nullif(trim(r.description), ''), trim(p_label)), v_me, v_id
  from jsonb_to_recordset(p_rows) r(member_id uuid, hours numeric, earned_on date, description text);

  insert into notifications (member_id, title, body, link)
  select r.member_id, 'انضافت لك ساعات', '+' || trim(to_char(sum(r.hours), 'FM99990.##')) || ' · ' || trim(p_label), '/portal/hours'
  from jsonb_to_recordset(p_rows) r(member_id uuid, hours numeric, earned_on date, description text)
  group by r.member_id;
  return v_id;
end $$;

create or replace function public.undo_hour_import(p_import uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_cap('hours') then raise exception 'forbidden'; end if;
  delete from hour_entries where import_id = p_import;
  update hour_imports set undone_at = now() where id = p_import and undone_at is null;
end $$;

create or replace function public.save_semester(p_id int, p_name text, p_starts date, p_ends date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_id int;
begin
  if not public.has_cap('hours') then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_name, ''))) < 3 or p_ends <= p_starts then raise exception 'invalid_semester'; end if;
  if exists (select 1 from semesters where id is distinct from p_id and daterange(starts_on, ends_on, '[]') && daterange(p_starts, p_ends, '[]')) then
    raise exception 'semester_overlap';
  end if;
  if p_id is null then
    insert into semesters (name, starts_on, ends_on) values (trim(p_name), p_starts, p_ends) returning id into v_id;
  else
    update semesters set name = trim(p_name), starts_on = p_starts, ends_on = p_ends where id = p_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;
  return v_id;
end $$;

-- ================================================================== members admin

create or replace function public.set_member_active(p_member uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_leadership() then raise exception 'forbidden'; end if;
  if p_member = public.me_id() then raise exception 'forbidden'; end if;
  update members set active = p_active where id = p_member;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.set_member_capabilities(p_member uuid, p_caps text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_leadership() then raise exception 'forbidden'; end if;
  if not (coalesce(p_caps, '{}') <@ array['hours', 'surveys', 'projects', 'accounts']) then raise exception 'invalid_caps'; end if;
  update members set capabilities = array(select distinct unnest(coalesce(p_caps, '{}'))) where id = p_member;
  if not found then raise exception 'not_found'; end if;
end $$;

-- Inactive members (for the accounts page) — leadership only.
create or replace function public.inactive_members()
returns table (id uuid, full_name text, committee_id text, team_id text, role public.member_role, title text)
language sql stable security definer set search_path = public as $$
  select m.id, m.full_name, m.committee_id, m.team_id, m.role, m.title
  from members m where not m.active and public.is_leadership() order by m.full_name
$$;

-- The «accounts» capability may invite anyone.
create or replace function public.can_manage_account(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      public.has_cap('accounts')
      or (me.role in ('committee_lead', 'committee_deputy')
          and t.committee_id = me.committee_id
          and t.role not in ('president', 'vice_president') and not t.is_admin)
      or (me.role in ('team_lead', 'team_deputy', 'team_supervisor')
          and me.team_id is not null and t.team_id = me.team_id and t.role = 'member')
    from members me, members t
    where me.user_id = auth.uid() and me.active and t.id = p_member and t.active
  ), false)
$$;

-- ================================================================== grants

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'has_cap', 'is_project_member', 'can_manage_project', 'can_run_projects', 'can_view_task', 'can_review',
      'create_task', 'claim_task', 'submit_task', 'review_task', 'set_task_status',
      'add_task_comment', 'delete_task_comment', 'toggle_comment_reaction', 'my_achievements',
      'issue_certificate', 'verify_certificate', 'create_project', 'update_project', 'set_project_stage',
      'set_project_team', 'survey_audience_ids', 'can_manage_survey', 'can_view_survey', 'create_survey',
      'set_survey_status', 'delete_survey', 'save_survey_response', 'survey_overview', 'survey_results',
      'remind_survey', 'import_hours', 'undo_hour_import', 'save_semester', 'set_member_active',
      'set_member_capabilities', 'inactive_members', 'can_manage_account')
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
grant execute on function public.verify_certificate(text) to anon;
