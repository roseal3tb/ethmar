-- Defence in depth. RLS already blocks writes (only SELECT policies exist), but the default
-- Supabase grants still allow TRUNCATE, which RLS does not cover. Every write goes through the
-- SECURITY DEFINER functions, so clients only need SELECT, and only when signed in.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
grant select on all tables in schema public to authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from authenticated;
