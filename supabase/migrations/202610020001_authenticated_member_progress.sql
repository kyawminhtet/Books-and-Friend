-- Participant identities and chapter progress are private to signed-in clients.
-- Guests still have public access to sessions and public comments.

drop policy if exists "Session members are publicly readable" on public.session_members;
create policy "Authenticated users can read session members"
  on public.session_members for select to authenticated using (true);

revoke select on public.session_members from anon;
grant select on public.session_members to authenticated;
