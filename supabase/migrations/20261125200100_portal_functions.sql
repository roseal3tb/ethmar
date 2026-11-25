-- Ethmar members portal — permissions and actions.
--
-- Who may do what (agreed with the initiative leadership, 2026-11-25):
-- * Committee lead/deputy create tasks for their committee: for the whole committee
--   («جماعية», every team sees it), for one team (other teams never see it), or for
--   named people. The initiative leadership (president + vice presidents) create
--   tasks for committee leads, and any of the three approves them.
-- * Approvals: a team's head (lead / deputy / supervisor «إشراف») approves work
--   submitted by members of their team — including on committee-wide tasks; the
--   committee lead/deputy may approve anything in their committee.
-- * Hours are private: a member sees only their own; committee lead/deputy see their
--   committee's members (not other leads like them); team heads see their team; the
--   initiative leadership sees everyone. Leaderboards show rank and tier only, plus
--   the viewer's own number.
-- * project_lead is a title for now: it carries no powers.

create function public.me_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where user_id = auth.uid() and active
$$;

create function public.is_leadership() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin or role in ('president', 'vice_president')
                   from members where user_id = auth.uid() and active), false)
$$;

create function public.can_view_task(p_task uuid) returns boolean
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
    )
  )
$$;

create function public.can_review(p_task uuid, p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from members me, tasks t, members x
    where me.user_id = auth.uid() and me.active and t.id = p_task and x.id = p_member
      and me.id <> x.id and (
        (t.audience = 'leaders' and (me.is_admin or me.role in ('president', 'vice_president')))
        or (t.audience <> 'leaders' and (
          me.is_admin
          or (me.role in ('committee_lead', 'committee_deputy') and me.committee_id = t.committee_id)
          or (me.role in ('team_lead', 'team_deputy', 'team_supervisor')
              and me.team_id is not null and me.team_id = x.team_id and me.committee_id = t.committee_id)
        ))
      )
  )
$$;

create function public.can_view_member_hours(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from members me, members x
    where me.user_id = auth.uid() and me.active and x.id = p_member and (
      me.id = x.id
      or me.is_admin or me.role in ('president', 'vice_president')
      or (me.role in ('committee_lead', 'committee_deputy') and x.committee_id = me.committee_id
          and x.role not in ('committee_lead', 'committee_deputy'))
      or (me.role in ('team_lead', 'team_deputy', 'team_supervisor') and x.team_id = me.team_id
          and x.role = 'member')
    )
  )
$$;

create function public.current_semester() returns public.semesters
language sql stable security definer set search_path = public as $$
  select * from semesters
  order by (current_date between starts_on and ends_on) desc, starts_on desc
  limit 1
$$;

create function public.tier_for(p_hours numeric) returns public.tiers
language sql stable security definer set search_path = public as $$
  select * from tiers where min_hours <= coalesce(p_hours, 0) order by min_hours desc limit 1
$$;

-- ---------------------------------------------------------------- RLS policies

create policy "read committees" on public.committees for select to authenticated using (true);
create policy "read teams" on public.teams for select to authenticated using (true);
create policy "read tiers" on public.tiers for select to authenticated using (true);
create policy "read semesters" on public.semesters for select to authenticated using (true);
create policy "read members" on public.members for select to authenticated using (true);
create policy "read own email or leadership" on public.member_emails for select to authenticated
  using (member_id = public.me_id() or public.is_leadership());
create policy "read visible tasks" on public.tasks for select to authenticated
  using (public.can_view_task(id));
create policy "read assignments of visible tasks" on public.task_assignments for select to authenticated
  using (public.can_view_task(task_id));
create policy "read permitted hours" on public.hour_entries for select to authenticated
  using (public.can_view_member_hours(member_id));
create policy "read own notifications" on public.notifications for select to authenticated
  using (member_id = public.me_id());

-- ---------------------------------------------------------------- actions

create function public.create_task(
  p_title text, p_description text, p_audience public.task_audience, p_committee text,
  p_team text, p_mode public.task_mode, p_seats int, p_hours numeric, p_due date,
  p_targets uuid[] default '{}'
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

  if p_audience = 'leaders' then
    if not (me.is_admin or me.role in ('president', 'vice_president')) then raise exception 'forbidden'; end if;
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
       or (p_audience <> 'leaders' and x.committee_id is distinct from p_committee)
       or (p_audience = 'team' and x.team_id is distinct from p_team);
    if bad > 0 then raise exception 'invalid_targets'; end if;
    p_seats := null;
  else
    if p_seats is null or p_seats < 1 then raise exception 'invalid_seats'; end if;
    p_targets := '{}';
  end if;

  insert into tasks (title, description, audience, committee_id, team_id, mode, seats, hours, due_date, created_by)
  values (trim(p_title), coalesce(trim(p_description), ''), p_audience, p_committee, p_team, p_mode, p_seats,
          p_hours, p_due, me.id)
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
    ))
  );
  return v_id;
end $$;

create function public.claim_task(p_task uuid) returns void
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
       or (t.audience = 'leaders' and me.role in ('committee_lead', 'committee_deputy'))) then
    raise exception 'forbidden';
  end if;
  if exists (select 1 from task_assignments where task_id = p_task and member_id = me.id) then
    raise exception 'already_claimed';
  end if;
  select count(*) into taken from task_assignments where task_id = p_task;
  if taken >= t.seats then raise exception 'no_seats'; end if;
  insert into task_assignments (task_id, member_id) values (p_task, me.id);
end $$;

create function public.unclaim_task(p_task uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from task_assignments
  where task_id = p_task and member_id = public.me_id() and status = 'claimed' and assigned_by is null;
  if not found then raise exception 'cannot_unclaim'; end if;
end $$;

create function public.submit_task(p_task uuid, p_note text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
begin
  select * into me from members where user_id = auth.uid() and active;
  select * into t from tasks where id = p_task;
  if me.id is null or t.id is null then raise exception 'not_found'; end if;
  if t.status <> 'active' then raise exception 'task_closed'; end if;
  if nullif(trim(p_link), '') is not null and trim(p_link) !~* '^https?://' then raise exception 'invalid_link'; end if;

  update task_assignments
  set status = 'submitted', note = nullif(trim(p_note), ''), link = nullif(trim(p_link), ''),
      submitted_at = now(), review_note = null
  where task_id = p_task and member_id = me.id and status in ('claimed', 'returned');
  if not found then raise exception 'cannot_submit'; end if;

  insert into notifications (member_id, title, body, link)
  select r.id, 'تسليم بانتظار اعتمادك', me.full_name || ' · ' || t.title, '/portal/tasks?task=' || t.id
  from members r
  where r.active and r.id <> me.id and (
    (t.audience = 'leaders' and r.role in ('president', 'vice_president'))
    or (t.audience <> 'leaders' and (
      (r.role in ('committee_lead', 'committee_deputy') and r.committee_id = t.committee_id)
      or (r.role in ('team_lead', 'team_deputy', 'team_supervisor') and me.team_id is not null and r.team_id = me.team_id)
    ))
  );
end $$;

create function public.review_task(p_task uuid, p_member uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
  a task_assignments;
begin
  select * into me from members where user_id = auth.uid() and active;
  if not public.can_review(p_task, p_member) then raise exception 'forbidden'; end if;
  select * into t from tasks where id = p_task;
  select * into a from task_assignments where task_id = p_task and member_id = p_member for update;
  if a.task_id is null or a.status <> 'submitted' then raise exception 'not_submitted'; end if;

  if p_approve then
    update task_assignments
    set status = 'approved', review_note = nullif(trim(p_note), ''), reviewed_by = me.id, reviewed_at = now()
    where task_id = p_task and member_id = p_member;
    insert into hour_entries (member_id, task_id, hours, earned_on, description, approved_by)
    values (p_member, p_task, t.hours, current_date, t.title, me.id)
    on conflict (member_id, task_id) do nothing;
    insert into notifications (member_id, title, body, link)
    values (p_member, 'اعتُمدت مهمتك', '+' || trim(to_char(t.hours, 'FM990.##')) || ' ساعات · ' || t.title,
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

create function public.set_task_status(p_task uuid, p_status public.task_status) returns void
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
          or (t.audience <> 'leaders' and me.role in ('committee_lead', 'committee_deputy') and me.committee_id = t.committee_id)) then
    raise exception 'forbidden';
  end if;
  update tasks set status = p_status, updated_at = now() where id = p_task;
end $$;

create function public.mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now()
  where member_id = public.me_id() and read_at is null and (p_ids is null or id = any (p_ids))
$$;

-- ---------------------------------------------------------------- reads

create function public.board_of(p_role public.member_role) returns text
language sql immutable as $$
  select case
    when p_role = 'member' then 'members'
    when p_role in ('president', 'vice_president') then null
    else 'leaders'
  end
$$;

-- Rank + tier for everyone on a board; hours only for the viewer's own row.
create function public.leaderboard(p_board text, p_from date, p_to date)
returns table (
  rank bigint, member_id uuid, full_name text, committee_title text, team_name text,
  title text, tier_id text, tier_name text, hours numeric, is_me boolean
)
language sql stable security definer set search_path = public as $$
  with sem as (select * from public.current_semester()),
  base as (
    select m.id, m.full_name, c.title as committee_title, tm.name as team_name, m.title,
      coalesce((select sum(h.hours) from hour_entries h
                where h.member_id = m.id and h.earned_on between p_from and p_to), 0) as period_hours,
      coalesce((select sum(h.hours) from hour_entries h, sem
                where h.member_id = m.id and h.earned_on between sem.starts_on and sem.ends_on), 0) as sem_hours
    from members m
    left join committees c on c.id = m.committee_id
    left join teams tm on tm.id = m.team_id
    where m.active and public.board_of(m.role) = p_board
  )
  select rank() over (order by b.period_hours desc),
         b.id, b.full_name, b.committee_title, b.team_name, b.title,
         (public.tier_for(b.sem_hours)).id, (public.tier_for(b.sem_hours)).name,
         case when b.id = public.me_id() then b.period_hours end,
         b.id = public.me_id()
  from base b
  where public.me_id() is not null
  order by b.period_hours desc, b.full_name
$$;

-- Every member's tier for the community directory (no numbers).
create function public.member_tiers()
returns table (member_id uuid, tier_id text, tier_name text)
language sql stable security definer set search_path = public as $$
  with sem as (select * from public.current_semester())
  select m.id, (public.tier_for(s.h)).id, (public.tier_for(s.h)).name
  from members m
  cross join lateral (
    select coalesce(sum(h.hours), 0) as h from hour_entries h, sem
    where h.member_id = m.id and h.earned_on between sem.starts_on and sem.ends_on
  ) s
  where m.active and public.me_id() is not null
$$;

create function public.my_summary() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me members;
  sem semesters;
  v_sem numeric; v_total numeric; v_month numeric; v_pending numeric; v_done int;
  v_tier tiers; v_next tiers; v_rank bigint; v_board text; v_board_size bigint;
begin
  select * into me from members where user_id = auth.uid() and active;
  if me.id is null then return null; end if;
  sem := public.current_semester();
  select coalesce(sum(hours), 0) into v_total from hour_entries where member_id = me.id;
  select coalesce(sum(hours), 0) into v_sem from hour_entries
    where member_id = me.id and earned_on between sem.starts_on and sem.ends_on;
  select coalesce(sum(hours), 0) into v_month from hour_entries
    where member_id = me.id and earned_on >= date_trunc('month', current_date);
  select coalesce(sum(t.hours), 0) into v_pending from task_assignments a join tasks t on t.id = a.task_id
    where a.member_id = me.id and a.status = 'submitted';
  select count(*) into v_done from task_assignments where member_id = me.id and status = 'approved';
  v_tier := public.tier_for(v_sem);
  select * into v_next from tiers where min_hours > v_sem order by min_hours limit 1;
  v_board := public.board_of(me.role);
  if v_board is not null then
    select l.rank into v_rank
    from public.leaderboard(v_board, date_trunc('month', current_date)::date, current_date) l where l.is_me;
    select count(*) into v_board_size from members where active and public.board_of(role) = v_board;
  end if;
  return jsonb_build_object(
    'semester', to_jsonb(sem), 'semester_hours', v_sem, 'total_hours', v_total, 'month_hours', v_month,
    'pending_hours', v_pending, 'completed_tasks', v_done, 'tier', to_jsonb(v_tier), 'next_tier', to_jsonb(v_next),
    'board', v_board, 'month_rank', v_rank, 'board_size', v_board_size
  );
end $$;

-- Hours and task counts for the members the viewer may see (statistics page).
create function public.member_stats(p_from date, p_to date)
returns table (
  member_id uuid, full_name text, committee_id text, team_id text, role public.member_role, title text,
  period_hours numeric, semester_hours numeric, active_tasks bigint, awaiting_review bigint, approved_tasks bigint,
  tier_name text
)
language sql stable security definer set search_path = public as $$
  with sem as (select * from public.current_semester())
  select m.id, m.full_name, m.committee_id, m.team_id, m.role, m.title,
    coalesce((select sum(h.hours) from hour_entries h where h.member_id = m.id and h.earned_on between p_from and p_to), 0),
    s.h,
    (select count(*) from task_assignments a where a.member_id = m.id and a.status in ('claimed', 'returned')),
    (select count(*) from task_assignments a where a.member_id = m.id and a.status = 'submitted'),
    (select count(*) from task_assignments a where a.member_id = m.id and a.status = 'approved'),
    (public.tier_for(s.h)).name
  from members m
  cross join lateral (
    select coalesce(sum(h.hours), 0) as h from hour_entries h, sem
    where h.member_id = m.id and h.earned_on between sem.starts_on and sem.ends_on
  ) s
  where m.active and m.id <> coalesce(public.me_id(), '00000000-0000-0000-0000-000000000000')
    and public.can_view_member_hours(m.id)
  order by m.full_name
$$;

-- ---------------------------------------------------------------- accounts

create function public.admin_set_email(p_member uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_user uuid;
begin
  if not public.is_leadership() then raise exception 'forbidden'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  insert into member_emails (member_id, email) values (p_member, v_email)
  on conflict (member_id) do update set email = excluded.email;
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is not null then
    update members set user_id = v_user where id = p_member and user_id is null;
  end if;
end $$;

create function public.clear_must_change_password() returns void
language sql security definer set search_path = public as $$
  update members set must_change_password = false where user_id = auth.uid()
$$;

-- When an account is created, attach it to the member registered with that email.
create function public.link_member_on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update members m set user_id = new.id
  from member_emails e
  where e.member_id = m.id and e.email = lower(new.email) and m.user_id is null;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.link_member_on_signup();

-- ---------------------------------------------------------------- grants

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'me_id', 'is_leadership', 'can_view_task', 'can_review', 'can_view_member_hours', 'current_semester',
      'tier_for', 'create_task', 'claim_task', 'unclaim_task', 'submit_task', 'review_task', 'set_task_status',
      'mark_notifications_read', 'board_of', 'leaderboard', 'member_tiers', 'my_summary', 'member_stats',
      'admin_set_email', 'clear_must_change_password', 'link_member_on_signup', 'check_member_team')
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
revoke execute on function public.link_member_on_signup() from authenticated;
revoke execute on function public.check_member_team() from authenticated;
