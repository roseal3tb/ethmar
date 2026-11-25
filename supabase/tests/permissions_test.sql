-- Permission scenarios for the portal. Runs inside one DO block and always ends by
-- raising an exception, so every change (test users, tasks, hours) is rolled back.
-- The exception message is the report: one line per check, «PASS»/«FAIL».
do $$
declare
  r text := '';
  ok boolean;
  n int;
  v text;
  u record;
  t_team uuid; t_comm uuid; t_lead uuid;
  m_lead uuid; m_flead uuid; m_slead uuid; m_o1 uuid; m_o2 uuid; m_o3 uuid; m_s1 uuid; m_pres uuid; m_vp uuid;
  m_media uuid; m_tech_lead uuid; m_pr_dep uuid; m_proj uuid;

begin
  -- Test accounts, linked to real member rows (rolled back at the end).
  for u in select id, full_name from members where full_name in (
    'الوليد الرشيد', 'فهد العقيل', 'عبدالعزيز الدعفس', 'منى الروقي', 'عبدالله الفليح', 'فيصل العبيد',
    'يزيد الرويتع', 'رائد المطيري', 'غادة العتيبي', 'فارس العتيبي', 'عالية البليهي', 'العنود الشويعر', 'هالة الطخيم')
  loop
    insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    values (u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'test-' || substr(u.id::text, 1, 8) || '@example.test', now(), now());
    update members set user_id = u.id where id = u.id;
  end loop;
  select id into m_lead from members where full_name = 'الوليد الرشيد';
  select id into m_flead from members where full_name = 'فهد العقيل';
  select id into m_slead from members where full_name = 'عبدالعزيز الدعفس';
  select id into m_o1 from members where full_name = 'منى الروقي';
  select id into m_o2 from members where full_name = 'عبدالله الفليح';
  select id into m_o3 from members where full_name = 'فيصل العبيد';
  select id into m_s1 from members where full_name = 'يزيد الرويتع';
  select id into m_pres from members where full_name = 'رائد المطيري';
  select id into m_vp from members where full_name = 'غادة العتيبي';
  select id into m_media from members where full_name = 'فارس العتيبي';
  select id into m_tech_lead from members where full_name = 'عالية البليهي';
  select id into m_pr_dep from members where full_name = 'العنود الشويعر';
  select id into m_proj from members where full_name = 'هالة الطخيم';

  -- helper: act as a member (auth.uid() reads request.jwt.claims)
  -- 1) Committee lead creates a team task (outreach only) and a committee-wide task.
  perform set_config('request.jwt.claims', json_build_object('sub', m_lead, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  t_team := create_task('تنسيق زيارة تداول', 'تواصل مع الجهة', 'team', 'pr', 'pr-outreach', 'open', 2, 3, current_date + 5, '{}');
  t_comm := create_task('تجهيز معرض Impact', 'مهمة جماعية', 'committee', 'pr', null, 'open', 5, 4, current_date + 7, '{}');
  r := r || E'\nPASS lead creates team + committee tasks';
  execute 'reset role';

  -- 2) Visibility
  for u in select * from (values
      (m_o1, t_team, true, 'outreach member sees outreach task'),
      (m_s1, t_team, false, 'support member does NOT see outreach task'),
      (m_flead, t_team, true, 'outreach lead sees outreach task'),
      (m_slead, t_team, false, 'support lead does NOT see outreach task'),
      (m_media, t_team, false, 'other committee does NOT see team task'),
      (m_o1, t_comm, true, 'outreach member sees committee-wide task'),
      (m_s1, t_comm, true, 'support member sees committee-wide task'),
      (m_media, t_comm, false, 'other committee does NOT see committee task'),
      (m_vp, t_team, true, 'vice president sees everything')
    ) as x(who, task, expected, label)
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', u.who, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from tasks where id = u.task;
    execute 'reset role';
    r := r || E'\n' || case when (n > 0) = u.expected then 'PASS ' else 'FAIL ' end || u.label;
  end loop;

  -- 3) Claiming
  perform set_config('request.jwt.claims', json_build_object('sub', m_s1, 'role', 'authenticated')::text, true);
  begin perform claim_task(t_team); r := r || E'\nFAIL support member claimed outreach task';
  exception when others then r := r || E'\nPASS support member cannot claim outreach task (' || sqlerrm || ')'; end;
  perform set_config('request.jwt.claims', json_build_object('sub', m_o1, 'role', 'authenticated')::text, true);
  perform claim_task(t_team);
  perform set_config('request.jwt.claims', json_build_object('sub', m_o2, 'role', 'authenticated')::text, true);
  perform claim_task(t_team);
  perform set_config('request.jwt.claims', json_build_object('sub', m_o3, 'role', 'authenticated')::text, true);
  begin perform claim_task(t_team); r := r || E'\nFAIL third member got a seat';
  exception when others then r := r || E'\nPASS seats are enforced (' || sqlerrm || ')'; end;

  -- 4) Submitting and reviewing team task
  perform set_config('request.jwt.claims', json_build_object('sub', m_o1, 'role', 'authenticated')::text, true);
  perform submit_task(t_team, 'تم التنسيق', 'https://example.com/report');
  perform set_config('request.jwt.claims', json_build_object('sub', m_slead, 'role', 'authenticated')::text, true);
  r := r || E'\n' || case when not can_review(t_team, m_o1) then 'PASS' else 'FAIL' end || ' support lead cannot review outreach work';
  begin perform review_task(t_team, m_o1, true, null); r := r || E'\nFAIL support lead approved';
  exception when others then r := r || E'\nPASS support lead approve blocked (' || sqlerrm || ')'; end;
  perform set_config('request.jwt.claims', json_build_object('sub', m_o2, 'role', 'authenticated')::text, true);
  r := r || E'\n' || case when not can_review(t_team, m_o1) then 'PASS' else 'FAIL' end || ' a member cannot review a peer';
  perform set_config('request.jwt.claims', json_build_object('sub', m_flead, 'role', 'authenticated')::text, true);
  perform review_task(t_team, m_o1, true, 'ممتاز');
  select count(*) into n from hour_entries where member_id = m_o1 and task_id = t_team;
  r := r || E'\n' || case when n = 1 then 'PASS' else 'FAIL' end || ' outreach lead approves → hours written';

  -- 5) Committee-wide task: approved by the submitter's team head
  perform set_config('request.jwt.claims', json_build_object('sub', m_s1, 'role', 'authenticated')::text, true);
  perform claim_task(t_comm);
  perform submit_task(t_comm, null, null);
  perform set_config('request.jwt.claims', json_build_object('sub', m_flead, 'role', 'authenticated')::text, true);
  r := r || E'\n' || case when not can_review(t_comm, m_s1) then 'PASS' else 'FAIL' end || ' outreach lead cannot approve a support member on a shared task';
  perform set_config('request.jwt.claims', json_build_object('sub', m_slead, 'role', 'authenticated')::text, true);
  r := r || E'\n' || case when can_review(t_comm, m_s1) then 'PASS' else 'FAIL' end || ' support lead approves own member on a shared task';
  perform set_config('request.jwt.claims', json_build_object('sub', m_pr_dep, 'role', 'authenticated')::text, true);
  r := r || E'\n' || case when can_review(t_comm, m_s1) then 'PASS' else 'FAIL' end || ' committee deputy may approve anything in the committee';
  perform set_config('request.jwt.claims', json_build_object('sub', m_slead, 'role', 'authenticated')::text, true);
  begin perform review_task(t_comm, m_s1, false, ''); r := r || E'\nFAIL returned without a note';
  exception when others then r := r || E'\nPASS send-back requires a note (' || sqlerrm || ')'; end;
  perform review_task(t_comm, m_s1, false, 'أضف الصور');
  select status::text into v from task_assignments where task_id = t_comm and member_id = m_s1;
  r := r || E'\n' || case when v = 'returned' then 'PASS' else 'FAIL' end || ' returned for edits';

  -- 6) Hours privacy (RLS on hour_entries)
  for u in select * from (values
      (m_o1, 1, 'member sees own hours'),
      (m_o2, 0, 'member cannot see a peer''s hours'),
      (m_flead, 1, 'team lead sees own team member hours'),
      (m_slead, 0, 'other team lead cannot see them'),
      (m_lead, 1, 'committee lead sees committee member hours'),
      (m_tech_lead, 0, 'another committee''s lead cannot see them'),
      (m_pres, 1, 'president sees all hours')
    ) as x(who, expected, label)
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', u.who, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    select count(*) into n from hour_entries where member_id = m_o1;
    execute 'reset role';
    r := r || E'\n' || case when n = u.expected then 'PASS ' else 'FAIL ' end || u.label || ' (' || n || ')';
  end loop;

  -- 7) Leaderboard shows only the viewer's own number
  perform set_config('request.jwt.claims', json_build_object('sub', m_o2, 'role', 'authenticated')::text, true);
  select count(*) into n from leaderboard('members', current_date - 30, current_date) l where l.hours is not null and not l.is_me;
  r := r || E'\n' || case when n = 0 then 'PASS' else 'FAIL' end || ' leaderboard hides other members'' hours';
  perform set_config('request.jwt.claims', json_build_object('sub', m_o1, 'role', 'authenticated')::text, true);
  select hours into v from leaderboard('members', current_date - 30, current_date) l where l.is_me;
  r := r || E'\n' || case when v::numeric = 3 then 'PASS' else 'FAIL' end || ' leaderboard shows my own hours (' || coalesce(v, 'null') || ')';
  select rank::text into v from leaderboard('members', current_date - 30, current_date) l where l.is_me;
  r := r || E'\n' || case when v = '1' then 'PASS' else 'FAIL' end || ' ranked first with 3 hours';
  select count(*) into n from leaderboard('leaders', current_date - 30, current_date);
  r := r || E'\n' || case when n > 30 then 'PASS' else 'FAIL' end || ' leaders board lists leaders (' || n || ')';

  -- 8) Creating is limited
  for u in select * from (values (m_o1, 'member'), (m_flead, 'team lead'), (m_proj, 'project lead'), (m_tech_lead, 'other committee lead')) as x(who, label)
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', u.who, 'role', 'authenticated')::text, true);
    begin
      perform create_task('اختبار', '', 'committee', 'pr', null, 'open', 1, 1, current_date + 1, '{}');
      r := r || E'\nFAIL ' || u.label || ' created a PR task';
    exception when others then r := r || E'\nPASS ' || u.label || ' cannot create PR tasks';
    end;
  end loop;

  -- 9) Leadership tasks for committee leads
  perform set_config('request.jwt.claims', json_build_object('sub', m_vp, 'role', 'authenticated')::text, true);
  t_lead := create_task('خطة اللجنة للفصل', 'ارفع الخطة', 'leaders', null, null, 'assigned', null, 5, current_date + 10, array[m_lead]);
  perform set_config('request.jwt.claims', json_build_object('sub', m_lead, 'role', 'authenticated')::text, true);
  perform submit_task(t_lead, 'الخطة مرفقة', null);
  perform set_config('request.jwt.claims', json_build_object('sub', m_flead, 'role', 'authenticated')::text, true);
  r := r || E'\n' || case when not can_review(t_lead, m_lead) then 'PASS' else 'FAIL' end || ' team lead cannot approve leadership tasks';
  perform set_config('request.jwt.claims', json_build_object('sub', m_pres, 'role', 'authenticated')::text, true);
  perform review_task(t_lead, m_lead, true, null);
  r := r || E'\nPASS president approves a task the vice president gave';
  perform set_config('request.jwt.claims', json_build_object('sub', m_pr_dep, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from hour_entries where member_id = m_lead;
  execute 'reset role';
  r := r || E'\n' || case when n = 0 then 'PASS' else 'FAIL' end || ' committee deputy cannot see the lead''s hours';
  perform set_config('request.jwt.claims', json_build_object('sub', m_vp, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from hour_entries where member_id = m_lead;
  execute 'reset role';
  r := r || E'\n' || case when n = 1 then 'PASS' else 'FAIL' end || ' vice president sees the lead''s hours';

  -- 10) Direct writes are blocked; emails private
  perform set_config('request.jwt.claims', json_build_object('sub', m_lead, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into hour_entries (member_id, hours) values (m_lead, 50);
    r := r || E'\nFAIL direct hours insert allowed';
  exception when others then r := r || E'\nPASS direct hours insert blocked';
  end;
  begin
    update members set role = 'president' where id = m_lead;
    get diagnostics n = row_count;
    r := r || E'\n' || case when n = 0 then 'PASS' else 'FAIL' end || ' cannot promote self';
  exception when others then r := r || E'\nPASS cannot promote self';
  end;
  execute 'reset role';

  raise exception 'TEST REPORT:%', r;
end $$;
