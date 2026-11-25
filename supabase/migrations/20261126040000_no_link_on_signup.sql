-- Accounts are linked to members only by the invitation (member-accounts edge function).
-- Linking on sign-up by email let anyone who knew a member's address register first with a
-- password of their own and get attached to that member before the real person was invited.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.link_member_on_signup();
