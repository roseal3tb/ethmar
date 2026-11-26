-- Rows tied on the period's hours (and everyone with no hours in the period) are ordered by their
-- semester hours, so the level badges read top-down (ماسي before برونزي) instead of roster order.
create or replace function public.leaderboard(p_board text, p_from date, p_to date)
returns table (
  rank bigint, member_id uuid, full_name text, committee_title text, team_name text,
  title text, tier_id text, tier_name text, hours numeric, is_me boolean
)
language sql stable security definer set search_path = public as $$
  with sem as (select * from public.current_semester()),
  base as (
    select m.id, m.full_name, m.sort, c.title as committee_title, tm.name as team_name, m.title,
      coalesce((select sum(h.hours) from hour_entries h
                where h.member_id = m.id and h.earned_on between p_from and p_to), 0) as period_hours,
      (select max(h.created_at) from hour_entries h
                where h.member_id = m.id and h.earned_on between p_from and p_to) as reached_at,
      coalesce((select sum(h.hours) from hour_entries h, sem
                where h.member_id = m.id and h.earned_on between sem.starts_on and sem.ends_on), 0) as sem_hours
    from members m
    left join committees c on c.id = m.committee_id
    left join teams tm on tm.id = m.team_id
    where m.active and public.board_of(m.role) = p_board
  ),
  ordered as (
    select b.*, row_number() over (
      order by b.period_hours desc, b.reached_at asc nulls last, b.sem_hours desc, b.sort asc nulls last, b.full_name, b.id
    ) as pos
    from base b
  )
  select case when o.period_hours > 0 then o.pos end,
         o.id, o.full_name, o.committee_title, o.team_name, o.title,
         (public.tier_for(o.sem_hours)).id, (public.tier_for(o.sem_hours)).name,
         case when o.id = public.me_id() then o.period_hours end,
         o.id = public.me_id()
  from ordered o
  where public.me_id() is not null
  order by o.pos
$$;

revoke all on function public.leaderboard(text, date, date) from public, anon;
grant execute on function public.leaderboard(text, date, date) to authenticated;
