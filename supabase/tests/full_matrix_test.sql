-- Full permission matrix against the live data, acting as real members of every role.
-- Everything happens inside one DO block that always ends by raising an exception, so all
-- changes (tasks, claims, hours, notifications, temporary logins) are rolled back.
-- The exception message is the report: one line per check, PASS / FAIL.
-- No emails are sent: those come only from the edge functions, which are not called here.

-- Returns the login id for a member, creating a throw-away auth user when they have none yet.
create or replace function pg_temp.uid(p_name text) returns uuid language plpgsql as $$
declare m uuid; u uuid;
begin
  select id, user_id into m, u from public.members where full_name = p_name;
  if m is null then raise exception 'no member %', p_name; end if;
  if u is null then
    u := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    values (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'matrix-' || substr(u::text, 1, 8) || '@example.test', now(), now());
    update public.members set user_id = u where id = m;
  end if;
  return u;
end $$;

create or replace function pg_temp.mid(p_name text) returns uuid language sql as $$
  select id from public.members where full_name = p_name
$$;

-- Runs one statement as the given login (role «authenticated»), returns its first value as
-- text, or 'ERR:<message>'. A failing statement is rolled back on its own.
create or replace function pg_temp.q(p_user uuid, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  begin
    set local role authenticated;
    execute p_sql into v;
    reset role;
    return coalesce(v, '∅');
  exception when others then
    return 'ERR:' || sqlerrm;
  end;
end $$;

create or replace function pg_temp.qa(p_sql text) returns text language plpgsql as $$
declare v text;
begin
  begin
    set local role anon;
    execute p_sql into v;
    reset role;
    return coalesce(v, '∅');
  exception when others then
    return 'ERR:' || sqlerrm;
  end;
end $$;

create or replace function pg_temp.chk(p_label text, p_got text, p_expect text) returns text language sql as $$
  select E'\n' || case
    when p_expect = 'ERR' and p_got like 'ERR:%' then 'PASS '
    when p_expect like 'ERR:%' and p_got = p_expect then 'PASS '
    when p_expect = 'OK' and p_got not like 'ERR:%' then 'PASS '
    when p_expect like '>%' and p_got ~ '^\d+(\.\d+)?$' and p_got::numeric > substr(p_expect, 2)::numeric then 'PASS '
    when p_got = p_expect then 'PASS '
    else 'FAIL ' end || p_label || '  [got ' || p_got || ' | want ' || p_expect || ']'
$$;

do $$
declare
  r text := '';
  -- logins
  mona uuid := pg_temp.uid('منى الروقي');            -- PR · outreach · member
  yasser uuid := pg_temp.uid('ياسر العمرو');         -- PR · outreach · member
  yazeed uuid := pg_temp.uid('يزيد الرويتع');        -- PR · support · member
  fahd uuid := pg_temp.uid('فهد العقيل');            -- PR · outreach · team lead
  daafas uuid := pg_temp.uid('عبدالعزيز الدعفس');    -- PR · support · team lead
  waleed uuid := pg_temp.uid('الوليد الرشيد');       -- PR · committee lead
  anoud uuid := pg_temp.uid('العنود الشويعر');       -- PR · committee deputy
  faris uuid := pg_temp.uid('فارس العتيبي');         -- media · photo · member
  noof uuid := pg_temp.uid('نوف بن حثلين');          -- media · committee lead
  sultan uuid := pg_temp.uid('سلطان المتعب');        -- fin · committee lead
  hamad uuid := pg_temp.uid('حمد اللعبون');          -- fin · research · supervisor («إشراف»)
  ghaidaz uuid := pg_temp.uid('غيداء الزهراني');     -- fin · content · supervisor
  reema uuid := pg_temp.uid('ريما العتيبي');         -- fin · content · member
  hala uuid := pg_temp.uid('هالة الطخيم');           -- projects · project lead (no powers yet)
  alia uuid := pg_temp.uid('عالية البليهي');         -- tech · committee lead
  raed uuid := pg_temp.uid('رائد المطيري');          -- president
  ghada uuid := pg_temp.uid('غادة العتيبي');         -- vice president
  rose uuid := pg_temp.uid('روز العتيبي');           -- tech deputy + admin
  mariam uuid;                                       -- left the initiative (inactive)
  t1 text; t2 text; t3 text; t4 text; t5 text; t6 text; t7 text; t8 text;
  m_mona uuid := pg_temp.mid('منى الروقي');
  m_yasser uuid := pg_temp.mid('ياسر العمرو');
  m_yazeed uuid := pg_temp.mid('يزيد الرويتع');
  m_fahd uuid := pg_temp.mid('فهد العقيل');
  m_waleed uuid := pg_temp.mid('الوليد الرشيد');
  m_anoud uuid := pg_temp.mid('العنود الشويعر');
  m_faris uuid := pg_temp.mid('فارس العتيبي');
  m_noof uuid := pg_temp.mid('نوف بن حثلين');
  m_reema uuid := pg_temp.mid('ريما العتيبي');
  m_research uuid;
  research uuid;
  d text := (current_date + 5)::text;
  v text;
begin
  select user_id into mariam from members where full_name = 'مريم عبد الباقي';
  select id into m_research from members where team_id = 'fin-research' and role = 'member' and active order by full_name limit 1;
  select coalesce(user_id, pg_temp.uid(full_name)) into research from members where id = m_research;

  ---------------------------------------------------------------- A. reads & privacy
  r := r || E'\n— A. القراءة والخصوصية';
  r := r || pg_temp.chk('عضو يقرأ إيميله فقط', pg_temp.q(mona, 'select count(*) from member_emails'), '1');
  r := r || pg_temp.chk('قائد لجنة يقرأ إيميله فقط', pg_temp.q(waleed, 'select count(*) from member_emails'), '1');
  r := r || pg_temp.chk('نائبة الرئيس تقرأ كل الإيميلات', pg_temp.q(ghada, 'select count(*) from member_emails'), '>100');
  r := r || pg_temp.chk('الأدمن تقرأ كل الإيميلات', pg_temp.q(rose, 'select count(*) from member_emails'), '>100');
  r := r || pg_temp.chk('العضو يشوف دليل الأعضاء', pg_temp.q(mona, 'select count(*) from members where active'), '131');
  r := r || pg_temp.chk('الزائر (بدون دخول) ما يقرأ الأعضاء', pg_temp.qa('select count(*) from members'), 'ERR');
  r := r || pg_temp.chk('الزائر ما يقرأ الإيميلات', pg_temp.qa('select count(*) from member_emails'), 'ERR');
  r := r || pg_temp.chk('الزائر ما يستدعي leaderboard', pg_temp.qa($q$select count(*) from leaderboard('members', current_date - 30, current_date)$q$), 'ERR');
  r := r || pg_temp.chk('is_leadership: عضو', pg_temp.q(mona, 'select is_leadership()'), 'false');
  r := r || pg_temp.chk('is_leadership: قائد لجنة', pg_temp.q(waleed, 'select is_leadership()'), 'false');
  r := r || pg_temp.chk('is_leadership: الرئيس', pg_temp.q(raed, 'select is_leadership()'), 'true');
  r := r || pg_temp.chk('is_leadership: نائبة الرئيس', pg_temp.q(ghada, 'select is_leadership()'), 'true');
  r := r || pg_temp.chk('is_leadership: الأدمن', pg_temp.q(rose, 'select is_leadership()'), 'true');

  ---------------------------------------------------------------- B. direct writes blocked
  r := r || E'\n— B. الكتابة المباشرة ممنوعة';
  r := r || pg_temp.chk('عضو يضيف لنفسه ساعات', pg_temp.q(mona, format($q$insert into hour_entries (member_id, hours) values (%L, 50) returning 1$q$, m_mona)), 'ERR');
  r := r || pg_temp.chk('عضو يرقّي نفسه رئيس', pg_temp.q(mona, format($q$update members set role = 'president' where id = %L returning 1$q$, m_mona)), 'ERR');
  r := r || pg_temp.chk('عضو يحذف المهام', pg_temp.q(mona, 'delete from tasks returning 1'), 'ERR');
  r := r || pg_temp.chk('عضو يضيف إشعار', pg_temp.q(mona, format($q$insert into notifications (member_id, title) values (%L, 'x') returning 1$q$, m_yasser)), 'ERR');
  r := r || pg_temp.chk('عضو يفرّغ جدول المهام (TRUNCATE)', pg_temp.q(mona, 'truncate tasks'), 'ERR');
  r := r || pg_temp.chk('عضو يغيّر إيميل غيره', pg_temp.q(mona, format($q$select admin_set_email(%L, 'x@y.com')$q$, m_yasser)), 'ERR:forbidden');
  r := r || pg_temp.chk('قائد لجنة يغيّر إيميل', pg_temp.q(waleed, format($q$select admin_set_email(%L, 'x@y.com')$q$, m_yasser)), 'ERR:forbidden');

  ---------------------------------------------------------------- C. creating tasks
  r := r || E'\n— C. إنشاء المهام';
  t1 := pg_temp.q(waleed, format($q$select create_task('زيارة تداول', 'تنسيق', 'team', 'pr', 'pr-outreach', 'open', 2, 3, %L, '{}')$q$, d));
  r := r || pg_temp.chk('قائد اللجنة ينشئ مهمة لفريق التواصل', t1, 'OK');
  t2 := pg_temp.q(waleed, format($q$select create_task('معرض Impact', 'جماعية', 'committee', 'pr', null, 'open', 5, 4, %L, '{}')$q$, d));
  r := r || pg_temp.chk('قائد اللجنة ينشئ مهمة جماعية', t2, 'OK');
  t3 := pg_temp.q(waleed, format($q$select create_task('خطاب شكر', 'مسندة', 'people', 'pr', null, 'assigned', null, 2, %L, %L::uuid[])$q$, d, array[m_yazeed]));
  r := r || pg_temp.chk('قائد اللجنة يسند مهمة لشخص', t3, 'OK');
  t4 := pg_temp.q(anoud, format($q$select create_task('قائمة الجهات', 'من النائبة', 'committee', 'pr', null, 'open', 3, 1, %L, '{}')$q$, d));
  r := r || pg_temp.chk('نائبة اللجنة تنشئ مهمة', t4, 'OK');
  r := r || pg_temp.chk('قائد لجنة ينشئ مهمة للجنة ثانية', pg_temp.q(waleed, format($q$select create_task('xxx', '', 'committee', 'media', null, 'open', 2, 1, %L, '{}')$q$, d)), 'ERR:forbidden');
  r := r || pg_temp.chk('قائد فريق ينشئ مهمة', pg_temp.q(fahd, format($q$select create_task('xxx', '', 'team', 'pr', 'pr-outreach', 'open', 2, 1, %L, '{}')$q$, d)), 'ERR:forbidden');
  r := r || pg_temp.chk('عضو ينشئ مهمة', pg_temp.q(mona, format($q$select create_task('xxx', '', 'committee', 'pr', null, 'open', 2, 1, %L, '{}')$q$, d)), 'ERR:forbidden');
  r := r || pg_temp.chk('قائد مشروع ينشئ مهمة (بدون صلاحيات)', pg_temp.q(hala, format($q$select create_task('xxx', '', 'committee', 'projects', null, 'open', 2, 1, %L, '{}')$q$, d)), 'ERR:forbidden');
  r := r || pg_temp.chk('نائبة الرئيس تنشئ مهمة للجنة (مو لقادة)', pg_temp.q(ghada, format($q$select create_task('xxx', '', 'committee', 'pr', null, 'open', 2, 1, %L, '{}')$q$, d)), 'ERR:forbidden');
  t5 := pg_temp.q(ghada, format($q$select create_task('خطة اللجنة', 'لقادة اللجان', 'leaders', null, null, 'open', 3, 5, %L, '{}')$q$, d));
  r := r || pg_temp.chk('نائبة الرئيس تنشئ مهمة مفتوحة لقادة اللجان', t5, 'OK');
  t6 := pg_temp.q(raed, format($q$select create_task('تقرير الفصل', 'مسندة لقائدين', 'leaders', null, null, 'assigned', null, 4, %L, %L::uuid[])$q$, d, array[m_waleed, m_noof]));
  r := r || pg_temp.chk('الرئيس يسند مهمة لقائدين', t6, 'OK');
  r := r || pg_temp.chk('مهمة قادة مسندة لعضو عادي', pg_temp.q(raed, format($q$select create_task('xxx', '', 'leaders', null, null, 'assigned', null, 1, %L, %L::uuid[])$q$, d, array[m_mona])), 'ERR:invalid_targets');
  r := r || pg_temp.chk('إسناد لعضو من لجنة ثانية', pg_temp.q(waleed, format($q$select create_task('xxx', '', 'people', 'pr', null, 'assigned', null, 1, %L, %L::uuid[])$q$, d, array[m_faris])), 'ERR:invalid_targets');
  r := r || pg_temp.chk('مهمة فريق مسندة لعضو من الفريق الثاني', pg_temp.q(waleed, format($q$select create_task('xxx', '', 'team', 'pr', 'pr-outreach', 'assigned', null, 1, %L, %L::uuid[])$q$, d, array[m_yazeed])), 'ERR:invalid_targets');
  r := r || pg_temp.chk('فريق من لجنة ثانية', pg_temp.q(waleed, format($q$select create_task('xxx', '', 'team', 'pr', 'media-photo', 'open', 2, 1, %L, '{}')$q$, d)), 'ERR:invalid_team');
  r := r || pg_temp.chk('تاريخ تسليم في الماضي', pg_temp.q(waleed, $q$select create_task('xxx', '', 'committee', 'pr', null, 'open', 2, 1, current_date - 1, '{}')$q$), 'ERR:due_in_past');
  r := r || pg_temp.chk('ساعات صفر', pg_temp.q(waleed, format($q$select create_task('xxx', '', 'committee', 'pr', null, 'open', 2, 0, %L, '{}')$q$, d)), 'ERR');
  r := r || pg_temp.chk('عنوان قصير جدًا', pg_temp.q(waleed, format($q$select create_task('ab', '', 'committee', 'pr', null, 'open', 2, 1, %L, '{}')$q$, d)), 'ERR');
  r := r || pg_temp.chk('مقاعد صفر', pg_temp.q(waleed, format($q$select create_task('xxx', '', 'committee', 'pr', null, 'open', 0, 1, %L, '{}')$q$, d)), 'ERR:invalid_seats');
  t7 := pg_temp.q(rose, format($q$select create_task('مهمة من الأدمن', '', 'committee', 'media', null, 'open', 2, 1, %L, '{}')$q$, d));
  r := r || pg_temp.chk('الأدمن ينشئ مهمة لأي لجنة', t7, 'OK');
  t8 := pg_temp.q(sultan, format($q$select create_task('بحث مالي', '', 'team', 'fin', 'fin-research', 'open', 3, 2, %L, '{}')$q$, d));
  r := r || pg_temp.chk('قائد المحتوى المالي ينشئ مهمة للبحوث', t8, 'OK');

  ---------------------------------------------------------------- D. who sees what
  r := r || E'\n— D. مين يشوف وش';
  r := r || pg_temp.chk('عضو التواصل يشوف مهمة فريقه', pg_temp.q(mona, format('select count(*) from tasks where id = %L', t1)), '1');
  r := r || pg_temp.chk('عضو المساندة ما يشوف مهمة التواصل', pg_temp.q(yazeed, format('select count(*) from tasks where id = %L', t1)), '0');
  r := r || pg_temp.chk('قائد المساندة ما يشوف مهمة التواصل', pg_temp.q(daafas, format('select count(*) from tasks where id = %L', t1)), '0');
  r := r || pg_temp.chk('قائد التواصل يشوف مهمة فريقه', pg_temp.q(fahd, format('select count(*) from tasks where id = %L', t1)), '1');
  r := r || pg_temp.chk('لجنة ثانية ما تشوف مهمة الفريق', pg_temp.q(faris, format('select count(*) from tasks where id = %L', t1)), '0');
  r := r || pg_temp.chk('الفريقين يشوفون الجماعية (المساندة)', pg_temp.q(yazeed, format('select count(*) from tasks where id = %L', t2)), '1');
  r := r || pg_temp.chk('لجنة ثانية ما تشوف الجماعية', pg_temp.q(faris, format('select count(*) from tasks where id = %L', t2)), '0');
  r := r || pg_temp.chk('المسندة له يشوف مهمته', pg_temp.q(yazeed, format('select count(*) from tasks where id = %L', t3)), '1');
  r := r || pg_temp.chk('زميل من فريق ثاني ما يشوف المسندة', pg_temp.q(mona, format('select count(*) from tasks where id = %L', t3)), '0');
  r := r || pg_temp.chk('قائد فريق المسند له يشوفها', pg_temp.q(daafas, format('select count(*) from tasks where id = %L', t3)), '1');
  r := r || pg_temp.chk('قائد الفريق الثاني ما يشوفها', pg_temp.q(fahd, format('select count(*) from tasks where id = %L', t3)), '0');
  r := r || pg_temp.chk('نائبة اللجنة تشوف المسندة', pg_temp.q(anoud, format('select count(*) from tasks where id = %L', t3)), '1');
  r := r || pg_temp.chk('نائبة الرئيس تشوف كل المهام', pg_temp.q(ghada, format('select count(*) from tasks where id in (%L,%L,%L,%L,%L,%L,%L,%L)', t1, t2, t3, t4, t5, t6, t7, t8)), '8');
  r := r || pg_temp.chk('الأدمن تشوف كل المهام', pg_temp.q(rose, format('select count(*) from tasks where id in (%L,%L,%L,%L,%L,%L,%L,%L)', t1, t2, t3, t4, t5, t6, t7, t8)), '8');
  r := r || pg_temp.chk('قائدة لجنة ثانية تشوف مهمة القادة المفتوحة', pg_temp.q(noof, format('select count(*) from tasks where id = %L', t5)), '1');
  r := r || pg_temp.chk('عضو ما يشوف مهمة القادة', pg_temp.q(mona, format('select count(*) from tasks where id = %L', t5)), '0');
  r := r || pg_temp.chk('قائد فريق ما يشوف مهمة القادة', pg_temp.q(fahd, format('select count(*) from tasks where id = %L', t5)), '0');
  r := r || pg_temp.chk('قائد مشروع ما يشوف مهمة القادة', pg_temp.q(hala, format('select count(*) from tasks where id = %L', t5)), '0');
  r := r || pg_temp.chk('قائد مسندة له مهمة قادة يشوفها', pg_temp.q(waleed, format('select count(*) from tasks where id = %L', t6)), '1');
  r := r || pg_temp.chk('قائدة غير مسندة لها ما تشوف المسندة', pg_temp.q(alia, format('select count(*) from tasks where id = %L', t6)), '0');
  r := r || pg_temp.chk('إشراف المحتوى ما يشوف مهمة البحوث', pg_temp.q(ghaidaz, format('select count(*) from tasks where id = %L', t8)), '0');
  r := r || pg_temp.chk('إشراف البحوث يشوف مهمة فريقه', pg_temp.q(hamad, format('select count(*) from tasks where id = %L', t8)), '1');

  ---------------------------------------------------------------- E. claiming
  r := r || E'\n— E. سحب المهام';
  r := r || pg_temp.chk('منى تسحب مهمة فريقها', pg_temp.q(mona, format('select claim_task(%L)', t1)), 'OK');
  r := r || pg_temp.chk('منى تسحبها مرة ثانية', pg_temp.q(mona, format('select claim_task(%L)', t1)), 'ERR:already_claimed');
  r := r || pg_temp.chk('ياسر يسحب المقعد الثاني', pg_temp.q(yasser, format('select claim_task(%L)', t1)), 'OK');
  r := r || pg_temp.chk('فهد يسحب والمقاعد خلصت', pg_temp.q(fahd, format('select claim_task(%L)', t1)), 'ERR:no_seats');
  r := r || pg_temp.chk('يزيد يسحب مهمة فريق ثاني', pg_temp.q(yazeed, format('select claim_task(%L)', t1)), 'ERR:not_found');
  r := r || pg_temp.chk('لجنة ثانية تسحب الجماعية', pg_temp.q(faris, format('select claim_task(%L)', t2)), 'ERR:not_found');
  r := r || pg_temp.chk('المنشئ يسحب مهمته', pg_temp.q(waleed, format('select claim_task(%L)', t2)), 'ERR:own_task');
  r := r || pg_temp.chk('سحب مهمة مسندة', pg_temp.q(yazeed, format('select claim_task(%L)', t3)), 'ERR:not_open');
  r := r || pg_temp.chk('منى تتراجع عن السحب', pg_temp.q(mona, format('select unclaim_task(%L)', t1)), 'OK');
  r := r || pg_temp.chk('منى ترجع تسحب', pg_temp.q(mona, format('select claim_task(%L)', t1)), 'OK');
  r := r || pg_temp.chk('المسند له ما يقدر يتراجع', pg_temp.q(yazeed, format('select unclaim_task(%L)', t3)), 'ERR:cannot_unclaim');
  r := r || pg_temp.chk('قائدة لجنة تسحب مهمة القادة', pg_temp.q(noof, format('select claim_task(%L)', t5)), 'OK');
  r := r || pg_temp.chk('قائد فريق يسحب مهمة القادة', pg_temp.q(fahd, format('select claim_task(%L)', t5)), 'ERR:not_found');
  r := r || pg_temp.chk('الرئيس يسحب مهمة القادة', pg_temp.q(raed, format('select claim_task(%L)', t5)), 'ERR:forbidden');
  r := r || pg_temp.chk('يزيد يسحب الجماعية', pg_temp.q(yazeed, format('select claim_task(%L)', t2)), 'OK');
  r := r || pg_temp.chk('عضو البحوث يسحب مهمة فريقه', pg_temp.q(research, format('select claim_task(%L)', t8)), 'OK');
  r := r || pg_temp.chk('قائد اللجنة يقفل مهمة نائبته', pg_temp.q(waleed, format($q$select set_task_status(%L, 'closed')$q$, t4)), 'OK');
  r := r || pg_temp.chk('سحب مهمة مقفلة', pg_temp.q(mona, format('select claim_task(%L)', t4)), 'ERR:task_closed');
  r := r || pg_temp.chk('قائد فريق يقفل مهمة', pg_temp.q(fahd, format($q$select set_task_status(%L, 'closed')$q$, t2)), 'ERR:forbidden');
  r := r || pg_temp.chk('عضو يقفل مهمة', pg_temp.q(mona, format($q$select set_task_status(%L, 'cancelled')$q$, t2)), 'ERR:forbidden');
  r := r || pg_temp.chk('قائد لجنة ثانية يقفل مهمة', pg_temp.q(noof, format($q$select set_task_status(%L, 'closed')$q$, t2)), 'ERR:forbidden');

  ---------------------------------------------------------------- F. submit & review
  r := r || E'\n— F. التسليم والاعتماد';
  r := r || pg_temp.chk('رابط مو https', pg_temp.q(mona, format($q$select submit_task(%L, 'تم', 'ftp://x')$q$, t1)), 'ERR:invalid_link');
  r := r || pg_temp.chk('منى تسلّم', pg_temp.q(mona, format($q$select submit_task(%L, 'تم', 'https://example.com')$q$, t1)), 'OK');
  r := r || pg_temp.chk('ياسر يسلّم', pg_temp.q(yasser, format($q$select submit_task(%L, '', '')$q$, t1)), 'OK');
  r := r || pg_temp.chk('تسليم مهمة ما سحبها', pg_temp.q(yazeed, format($q$select submit_task(%L, '', '')$q$, t1)), 'ERR:cannot_submit');
  r := r || pg_temp.chk('إشعار التسليم وصل قائد الفريق', pg_temp.q(fahd, format($q$select count(*) from notifications where link like %L$q$, '%' || t1)), '>0');
  r := r || pg_temp.chk('إشعار التسليم وصل قائد اللجنة', pg_temp.q(waleed, format($q$select count(*) from notifications where link like %L$q$, '%' || t1)), '>0');
  r := r || pg_temp.chk('قائد الفريق الثاني ما وصله إشعار', pg_temp.q(daafas, format($q$select count(*) from notifications where link like %L$q$, '%' || t1)), '0');
  r := r || pg_temp.chk('قائد فريق ثاني يعتمد', pg_temp.q(daafas, format($q$select review_task(%L, %L, true, '')$q$, t1, m_mona)), 'ERR:forbidden');
  r := r || pg_temp.chk('عضو يعتمد زميله', pg_temp.q(mona, format($q$select review_task(%L, %L, true, '')$q$, t1, m_yasser)), 'ERR:forbidden');
  r := r || pg_temp.chk('قائد مشروع يعتمد', pg_temp.q(hala, format($q$select review_task(%L, %L, true, '')$q$, t1, m_mona)), 'ERR:forbidden');
  r := r || pg_temp.chk('نائبة الرئيس تعتمد مهمة لجنة', pg_temp.q(ghada, format($q$select review_task(%L, %L, true, '')$q$, t1, m_mona)), 'ERR:forbidden');
  r := r || pg_temp.chk('إرجاع بدون ملاحظة', pg_temp.q(fahd, format($q$select review_task(%L, %L, false, '  ')$q$, t1, m_mona)), 'ERR:note_required');
  r := r || pg_temp.chk('قائد الفريق يرجّعها بملاحظة', pg_temp.q(fahd, format($q$select review_task(%L, %L, false, 'أضيفي الجدول')$q$, t1, m_mona)), 'OK');
  r := r || pg_temp.chk('منى توصلها «رجعت لك»', pg_temp.q(mona, $q$select count(*) from notifications where title = 'رجعت لك مهمة للتعديل'$q$), '>0');
  r := r || pg_temp.chk('منى تعيد التسليم', pg_temp.q(mona, format($q$select submit_task(%L, 'عدلتها', 'https://example.com/2')$q$, t1)), 'OK');
  r := r || pg_temp.chk('قائد الفريق يعتمد', pg_temp.q(fahd, format($q$select review_task(%L, %L, true, 'ممتاز')$q$, t1, m_mona)), 'OK');
  r := r || pg_temp.chk('اعتماد مكرر', pg_temp.q(fahd, format($q$select review_task(%L, %L, true, '')$q$, t1, m_mona)), 'ERR:not_submitted');
  r := r || pg_temp.chk('الساعات انضافت لمنى', pg_temp.q(mona, format($q$select hours from hour_entries where task_id = %L$q$, t1)), '3.00');
  r := r || pg_temp.chk('منى توصلها «اعتُمدت»', pg_temp.q(mona, $q$select count(*) from notifications where title = 'اعتُمدت مهمتك'$q$), '>0');
  r := r || pg_temp.chk('نائبة اللجنة تعتمد ياسر', pg_temp.q(anoud, format($q$select review_task(%L, %L, true, '')$q$, t1, m_yasser)), 'OK');
  r := r || pg_temp.chk('يزيد يسلّم المسندة', pg_temp.q(yazeed, format($q$select submit_task(%L, '', '')$q$, t3)), 'OK');
  r := r || pg_temp.chk('الأدمن تعتمد أي مهمة', pg_temp.q(rose, format($q$select review_task(%L, %L, true, '')$q$, t3, m_yazeed)), 'OK');
  r := r || pg_temp.chk('قائد اللجنة يقفل الجماعية (يوقف السحب)', pg_temp.q(waleed, format($q$select set_task_status(%L, 'closed')$q$, t2)), 'OK');
  r := r || pg_temp.chk('بعد الإغلاق: عضو جديد ما يسحب', pg_temp.q(mona, format('select claim_task(%L)', t2)), 'ERR:task_closed');
  r := r || pg_temp.chk('يزيد يسلّم الجماعية', pg_temp.q(yazeed, format($q$select submit_task(%L, '', '')$q$, t2)), 'OK');
  r := r || pg_temp.chk('قائد التواصل يعتمد عضو المساندة (جماعية)', pg_temp.q(fahd, format($q$select review_task(%L, %L, true, '')$q$, t2, m_yazeed)), 'ERR:forbidden');
  r := r || pg_temp.chk('قائد المساندة يعتمد عضوه (جماعية)', pg_temp.q(daafas, format($q$select review_task(%L, %L, true, '')$q$, t2, m_yazeed)), 'OK');
  r := r || pg_temp.chk('نوف تسلّم مهمة القادة', pg_temp.q(noof, format($q$select submit_task(%L, '', '')$q$, t5)), 'OK');
  r := r || pg_temp.chk('قائد لجنة يعتمد مهمة قادة', pg_temp.q(waleed, format($q$select review_task(%L, %L, true, '')$q$, t5, m_noof)), 'ERR:forbidden');
  r := r || pg_temp.chk('الرئيس يعتمد مهمة القادة', pg_temp.q(raed, format($q$select review_task(%L, %L, true, '')$q$, t5, m_noof)), 'OK');
  r := r || pg_temp.chk('عضو البحوث يسلّم', pg_temp.q(research, format($q$select submit_task(%L, '', '')$q$, t8)), 'OK');
  r := r || pg_temp.chk('إشراف المحتوى يعتمد عضو البحوث', pg_temp.q(ghaidaz, format($q$select review_task(%L, %L, true, '')$q$, t8, m_research)), 'ERR:forbidden');
  r := r || pg_temp.chk('إشراف البحوث يعتمد عضو فريقه', pg_temp.q(hamad, format($q$select review_task(%L, %L, true, '')$q$, t8, m_research)), 'OK');

  ---------------------------------------------------------------- G. hours privacy & boards
  v := pg_temp.q(sultan, format($q$select create_task('مهمة بتنلغى', '', 'team', 'fin', 'fin-research', 'open', 2, 1, %L, '{}')$q$, d));
  r := r || pg_temp.chk('عضو البحوث يسحب مهمة', pg_temp.q(research, format('select claim_task(%L)', v)), 'OK');
  r := r || pg_temp.chk('القائد يلغي المهمة', pg_temp.q(sultan, format($q$select set_task_status(%L, 'cancelled')$q$, v)), 'OK');
  r := r || pg_temp.chk('بعد الإلغاء: ما يقدر يسلّم', pg_temp.q(research, format($q$select submit_task(%L, '', '')$q$, v)), 'ERR:task_closed');

  r := r || E'\n— G. خصوصية الساعات والصدارة';
  r := r || pg_temp.chk('منى ما تشوف ساعات ياسر', pg_temp.q(mona, format('select count(*) from hour_entries where member_id = %L', m_yasser)), '0');
  r := r || pg_temp.chk('منى تشوف ساعاتها', pg_temp.q(mona, format('select count(*) from hour_entries where member_id = %L', m_mona)), '>0');
  r := r || pg_temp.chk('قائد الفريق يشوف ساعات عضوه', pg_temp.q(fahd, format('select count(*) from hour_entries where member_id = %L', m_mona)), '>0');
  r := r || pg_temp.chk('قائد الفريق الثاني ما يشوفها', pg_temp.q(daafas, format('select count(*) from hour_entries where member_id = %L', m_mona)), '0');
  r := r || pg_temp.chk('قائد اللجنة يشوف ساعات أعضاء لجنته', pg_temp.q(waleed, format('select count(*) from hour_entries where member_id = %L', m_mona)), '>0');
  r := r || pg_temp.chk('قائد اللجنة ما يشوف ساعات نائبته', pg_temp.q(waleed, format('select can_view_member_hours(%L)', m_anoud)), 'false');
  r := r || pg_temp.chk('قائد اللجنة يشوف ساعات قادة الفرق', pg_temp.q(waleed, format('select can_view_member_hours(%L)', m_fahd)), 'true');
  r := r || pg_temp.chk('قائد الفريق ما يشوف ساعات قائد اللجنة', pg_temp.q(fahd, format('select can_view_member_hours(%L)', m_waleed)), 'false');
  r := r || pg_temp.chk('قائدة لجنة ثانية ما تشوف ساعات منى', pg_temp.q(noof, format('select count(*) from hour_entries where member_id = %L', m_mona)), '0');
  r := r || pg_temp.chk('نائبة الرئيس تشوف ساعات الكل', pg_temp.q(ghada, format('select count(*) from hour_entries where member_id = %L', m_noof)), '>0');
  r := r || pg_temp.chk('الصدارة: منى تشوف رقمها بس', pg_temp.q(mona, $q$select count(*) from leaderboard('members', current_date - 30, current_date) where hours is not null$q$), '1');
  r := r || pg_temp.chk('الصدارة: منى تشوف لوحة القادة بدون أرقام', pg_temp.q(mona, $q$select count(*) from leaderboard('leaders', current_date - 30, current_date) where hours is not null$q$), '0');
  r := r || pg_temp.chk('الصدارة: قائد يشوف رقمه بس في لوحة القادة', pg_temp.q(fahd, $q$select count(*) from leaderboard('leaders', current_date - 30, current_date) where hours is not null$q$), '1');
  r := r || pg_temp.chk('الصدارة: يزيد (٦ ساعات اليوم) في المركز الأول', pg_temp.q(yazeed, $q$select rank from leaderboard('members', current_date, current_date) where is_me$q$), '1');
  r := r || pg_temp.chk('الصدارة: منى (٣ ساعات) بعده', pg_temp.q(mona, $q$select rank from leaderboard('members', current_date, current_date) where is_me$q$), '2');
  r := r || pg_temp.chk('الصدارة: الموقوفين ما يطلعون', pg_temp.q(mona, $q$select count(*) from leaderboard('members', current_date - 30, current_date) l join members m on m.id = l.member_id where not m.active$q$), '0');
  r := r || pg_temp.chk('الإحصائيات: العضو ما يشوف أحد', pg_temp.q(mona, $q$select count(*) from member_stats(current_date - 30, current_date)$q$), '0');
  r := r || pg_temp.chk('الإحصائيات: قائد الفريق يشوف أعضاء فريقه بس', pg_temp.q(fahd, $q$select count(*) from member_stats(current_date - 30, current_date) s where s.team_id is distinct from 'pr-outreach' or s.role <> 'member'$q$), '0');
  r := r || pg_temp.chk('الإحصائيات: قائد الفريق يشوف أحد', pg_temp.q(fahd, $q$select count(*) from member_stats(current_date - 30, current_date)$q$), '>0');
  r := r || pg_temp.chk('الإحصائيات: قائد اللجنة يشوف لجنته بدون قادة اللجنة', pg_temp.q(waleed, $q$select count(*) from member_stats(current_date - 30, current_date) s where s.committee_id <> 'pr' or s.role in ('committee_lead','committee_deputy')$q$), '0');
  r := r || pg_temp.chk('الإحصائيات: قائد المشروع ما يشوف أحد', pg_temp.q(hala, $q$select count(*) from member_stats(current_date - 30, current_date)$q$), '0');
  r := r || pg_temp.chk('الإحصائيات: نائبة الرئيس تشوف الكل', pg_temp.q(ghada, $q$select count(*) from member_stats(current_date - 30, current_date)$q$), '130');
  r := r || pg_temp.chk('ملخص منى: ساعات الفصل فيها الـ3', pg_temp.q(mona, $q$select ((my_summary())->>'semester_hours')::numeric >= 3$q$), 'true');
  r := r || pg_temp.chk('ملخص منى: لوحتها الأعضاء', pg_temp.q(mona, $q$select my_summary()->>'board'$q$), 'members');
  r := r || pg_temp.chk('ملخص فهد: لوحته القادة', pg_temp.q(fahd, $q$select my_summary()->>'board'$q$), 'leaders');
  r := r || pg_temp.chk('ملخص الرئيس: بدون لوحة', pg_temp.q(raed, $q$select coalesce(my_summary()->>'board', 'none')$q$), 'none');
  r := r || pg_temp.chk('مستويات الأعضاء متاحة للكل', pg_temp.q(mona, 'select count(*) from member_tiers()'), '131');

  ---------------------------------------------------------------- H. notifications
  r := r || E'\n— H. الإشعارات';
  r := r || pg_temp.chk('منى ما تشوف إشعارات غيرها', pg_temp.q(mona, format('select count(*) from notifications where member_id <> %L', m_mona)), '0');
  r := r || pg_temp.chk('منى تعلّم إشعاراتها مقروءة', pg_temp.q(mona, 'select mark_notifications_read(null)'), 'OK');
  r := r || pg_temp.chk('إشعارات منى صارت مقروءة', pg_temp.q(mona, 'select count(*) from notifications where read_at is null'), '0');
  r := r || pg_temp.chk('إشعارات فهد ما تأثرت', pg_temp.q(fahd, 'select count(*) from notifications where read_at is null'), '>0');
  r := r || pg_temp.chk('يزيد وصله إشعار الإسناد', pg_temp.q(yazeed, format($q$select count(*) from notifications where title = 'أُسندت لك مهمة جديدة' and link like %L$q$, '%' || t3)), '1');
  r := r || pg_temp.chk('المهمة المفتوحة وصلت كل الفريق (إشعار)', pg_temp.q(yasser, format($q$select count(*) from notifications where link like %L$q$, '%' || t1)), '>0');

  ---------------------------------------------------------------- I. inactive member
  r := r || E'\n— I. العضو المنسحب';
  if mariam is null then
    r := r || E'\nSKIP مريم ما عندها حساب';
  else
    r := r || pg_temp.chk('المنسحبة ما تشوف مهام', pg_temp.q(mariam, 'select count(*) from tasks'), '0');
    r := r || pg_temp.chk('المنسحبة ما تسحب', pg_temp.q(mariam, format('select claim_task(%L)', t2)), 'ERR:not_found');
    r := r || pg_temp.chk('المنسحبة بدون ملخص', pg_temp.q(mariam, 'select coalesce(my_summary()::text, ''none'')'), 'none');
    r := r || pg_temp.chk('المنسحبة ما تطلع لها الصدارة', pg_temp.q(mariam, $q$select count(*) from leaderboard('members', current_date - 30, current_date)$q$), '0');
    r := r || pg_temp.chk('المنسحبة ما تقرأ الإيميلات', pg_temp.q(mariam, 'select count(*) from member_emails'), '0');
  end if;

  raise exception 'REPORT (rolled back):%', r;
end $$;
