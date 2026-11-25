-- Lint fix: pin search_path on the board helper.
alter function public.board_of(public.member_role) set search_path = public;
