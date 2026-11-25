-- Nobody is "#1" with zero hours: only members with approved hours in the period get a rank.
-- (On launch day everyone ties at 0, and a podium of three random names looks broken.)
create or replace function public.leaderboard(p_board text, p_from date, p_to date)
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
  select case when b.period_hours > 0 then rank() over (order by b.period_hours desc) end,
         b.id, b.full_name, b.committee_title, b.team_name, b.title,
         (public.tier_for(b.sem_hours)).id, (public.tier_for(b.sem_hours)).name,
         case when b.id = public.me_id() then b.period_hours end,
         b.id = public.me_id()
  from base b
  where public.me_id() is not null
  order by b.period_hours desc, b.full_name
$$;
