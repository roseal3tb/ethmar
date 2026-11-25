-- The member directory is for active members only, not for any login that happens to exist
-- (e.g. someone who signed up with an address that isn't on the roster).
drop policy if exists "read members" on public.members;
create policy "read members" on public.members
  for select to authenticated
  using ((select public.me_id()) is not null);
