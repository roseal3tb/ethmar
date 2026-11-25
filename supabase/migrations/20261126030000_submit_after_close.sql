-- "إغلاق المهمة" means no new claims. People who already hold the task must
-- still be able to hand it in (and be reviewed). Only a cancelled task stops submissions.
create or replace function public.submit_task(p_task uuid, p_note text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
declare
  me members;
  t tasks;
begin
  select * into me from members where user_id = auth.uid() and active;
  select * into t from tasks where id = p_task;
  if me.id is null or t.id is null then raise exception 'not_found'; end if;
  if t.status = 'cancelled' then raise exception 'task_closed'; end if;
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
