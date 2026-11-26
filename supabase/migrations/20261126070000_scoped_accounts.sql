-- Who may invite a member / send them a new password link:
--   leadership (president, vice presidents, admins)  → everyone
--   committee lead / deputy                         → their committee (not leadership)
--   team lead / deputy / supervisor                 → plain members of their team
create or replace function public.can_manage_account(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      public.is_leadership()
      or (me.role in ('committee_lead', 'committee_deputy')
          and t.committee_id = me.committee_id
          and t.role not in ('president', 'vice_president') and not t.is_admin)
      or (me.role in ('team_lead', 'team_deputy', 'team_supervisor')
          and me.team_id is not null and t.team_id = me.team_id and t.role = 'member')
    from members me, members t
    where me.user_id = auth.uid() and me.active and t.id = p_member and t.active
  ), false)
$$;
revoke all on function public.can_manage_account(uuid) from public, anon;
grant execute on function public.can_manage_account(uuid) to authenticated;

-- Leads see the emails of the people they may invite (still not anyone else's).
drop policy if exists "read own email or leadership" on public.member_emails;
create policy "read own email or managed" on public.member_emails
  for select to authenticated
  using (member_id = (select public.me_id()) or public.can_manage_account(member_id));
