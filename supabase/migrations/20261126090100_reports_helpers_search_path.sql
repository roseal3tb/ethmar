-- Pin the search path of the two date helpers (database linter).
alter function public.week_of(date) set search_path = public;
alter function public.riyadh_today() set search_path = public;
