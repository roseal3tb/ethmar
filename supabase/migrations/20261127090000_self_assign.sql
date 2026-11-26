-- Self-assignment: whoever creates a task may put themselves on it (direct assignment) or take a
-- seat on their own open task. Approval still goes to someone else: can_review() excludes self.

create or replace function public.create_task(
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
    where x.id is null or not x.active
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

do $$
declare f text;
begin
  foreach f in array array[
    'public.create_task(text, text, public.task_audience, text, text, public.task_mode, int, numeric, date, uuid[], uuid)',
    'public.claim_task(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
