-- The initiative's admin (only Rose) may approve her own submissions. Everyone else still needs
-- someone other than themselves to approve their work.
create or replace function public.can_review(p_task uuid, p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from members me, tasks t, members x
    where me.user_id = auth.uid() and me.active and t.id = p_task and x.id = p_member
      and (me.is_admin or (me.id <> x.id and (
        (t.audience = 'leaders' and me.role in ('president', 'vice_president'))
        or (t.audience = 'project' and public.can_manage_project(t.project_id))
        or (t.audience not in ('leaders', 'project') and (
          (me.role in ('committee_lead', 'committee_deputy') and me.committee_id = t.committee_id)
          or (me.role in ('team_lead', 'team_deputy', 'team_supervisor')
              and me.team_id is not null and me.team_id = x.team_id and me.committee_id = t.committee_id)
        ))
      )))
  )
$$;

revoke all on function public.can_review(uuid, uuid) from public, anon;
grant execute on function public.can_review(uuid, uuid) to authenticated;
