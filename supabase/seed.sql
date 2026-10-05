-- Books & Friends sample data for two existing Supabase Auth users.
-- Run this in the Supabase SQL Editor AFTER applying the initial schema migration
-- and creating both auth users. Safe to run repeatedly: seeded rows have fixed IDs.
-- Change the display names below if you prefer different public names.

begin;

do $$
declare
  kyaw_id uuid;
  loon_id uuid;
  circle_one constant uuid := '8b152200-5b57-4fd5-9f38-c701c8f9a001';
  circle_two constant uuid := '8b152200-5b57-4fd5-9f38-c701c8f9a002';
  comment_one constant uuid := '8b152200-5b57-4fd5-9f38-c701c8f9b001';
  comment_two constant uuid := '8b152200-5b57-4fd5-9f38-c701c8f9b002';
  comment_three constant uuid := '8b152200-5b57-4fd5-9f38-c701c8f9b003';
begin
  select id into kyaw_id from auth.users where lower(email) = lower('kmhitmdy24@gmail.com');
  select id into loon_id from auth.users where lower(email) = lower('loonpoe65@gmail.com');

  if kyaw_id is null then
    raise exception 'No Supabase Auth user found for kmhitmdy24@gmail.com';
  end if;
  if loon_id is null then
    raise exception 'No Supabase Auth user found for loonpoe65@gmail.com';
  end if;
  if kyaw_id = loon_id then
    raise exception 'The two email addresses resolved to the same Auth user';
  end if;

  insert into public.profiles (id, display_name)
  values (kyaw_id, 'Kyaw Min Htun'), (loon_id, 'Loon Poe')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.reading_sessions
    (id, creator_id, book_title, author, total_chapters, description, status, start_date, target_end_date)
  values
    (circle_one, kyaw_id, 'Four Thousand Weeks', 'Oliver Burkeman', 12,
     'A thoughtful circle about time, attention, and making room for what matters.',
     'active', current_date - 14, current_date + 28),
    (circle_two, loon_id, 'Braiding Sweetgrass', 'Robin Wall Kimmerer', 32,
     'Reading nature, reciprocity, and the stories that change how we see the world.',
     'active', current_date - 7, current_date + 49)
  on conflict (id) do update set
    creator_id = excluded.creator_id,
    book_title = excluded.book_title,
    author = excluded.author,
    total_chapters = excluded.total_chapters,
    description = excluded.description,
    status = excluded.status,
    start_date = excluded.start_date,
    target_end_date = excluded.target_end_date;

  insert into public.session_members
    (session_id, user_id, current_chapter, progress_note, membership_status, last_progress_at)
  values
    (circle_one, kyaw_id, 4, 'The chapter on choosing what to neglect gave me a lot to think about.', 'active', now()),
    (circle_one, loon_id, 6, 'Taking this one slowly and enjoying the conversation.', 'active', now()),
    (circle_two, kyaw_id, 8, 'Loved the connection between knowledge and gratitude here.', 'active', now()),
    (circle_two, loon_id, 11, 'The section on reciprocity is staying with me.', 'active', now())
  on conflict (session_id, user_id) do update set
    current_chapter = excluded.current_chapter,
    progress_note = excluded.progress_note,
    membership_status = excluded.membership_status,
    last_progress_at = excluded.last_progress_at;

  insert into public.comments (id, session_id, user_id, content, chapter_reference)
  values
    (comment_one, circle_one, kyaw_id,
     'I keep coming back to the idea that accepting our limits can make our choices feel more meaningful.', 3),
    (comment_two, circle_one, loon_id,
     'Same here. It made me want to protect a little more time for reading without rushing through it.', 4),
    (comment_three, circle_two, kyaw_id,
     'The contrast between seeing nature as a resource and as a community really stood out to me.', 7)
  on conflict (id) do update set
    session_id = excluded.session_id,
    user_id = excluded.user_id,
    content = excluded.content,
    chapter_reference = excluded.chapter_reference,
    deleted_at = null;

  insert into public.reactions (comment_id, user_id, emoji)
  values
    (comment_one, loon_id, '💚'),
    (comment_two, kyaw_id, '📚'),
    (comment_three, loon_id, '🌿')
  on conflict (comment_id, user_id) do update set emoji = excluded.emoji;

  insert into public.notifications
    (id, recipient_id, actor_id, notification_type, session_id, comment_id, is_read)
  values
    ('8b152200-5b57-4fd5-9f38-c701c8f9c001', kyaw_id, loon_id, 'comment', circle_one, comment_two, false),
    ('8b152200-5b57-4fd5-9f38-c701c8f9c002', loon_id, kyaw_id, 'reaction', circle_two, comment_three, false)
  on conflict (id) do update set
    recipient_id = excluded.recipient_id,
    actor_id = excluded.actor_id,
    notification_type = excluded.notification_type,
    session_id = excluded.session_id,
    comment_id = excluded.comment_id,
    is_read = excluded.is_read;
end $$;

commit;

-- Quick result check:
-- select p.display_name, u.email from public.profiles p join auth.users u on u.id = p.id
-- where lower(u.email) in ('kmhitmdy24@gmail.com', 'loonpoe65@gmail.com');
-- select book_title, author, status from public.reading_sessions
-- where id in ('8b152200-5b57-4fd5-9f38-c701c8f9a001', '8b152200-5b57-4fd5-9f38-c701c8f9a002');
