-- Members who left the initiative (marked red in the 1448 roster, 26 Nov 2026).
-- Deactivated rather than deleted, so any history stays intact; inactive members can't sign in.
update public.members set active = false
where full_name in ('درة الهدلق', 'لمى الاحمري', 'مريم عبد الباقي');
