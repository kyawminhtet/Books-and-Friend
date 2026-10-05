create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles(id),
  book_title text not null check (char_length(trim(book_title)) between 1 and 160),
  author text not null check (char_length(trim(author)) between 1 and 120),
  total_chapters integer not null check (total_chapters > 0), description text check (description is null or char_length(description) <= 1000),
  cover_image_url text, start_date date, target_end_date date,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (start_date is null or target_end_date is null or target_end_date >= start_date)
);

create table public.session_members (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.reading_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, current_chapter integer not null default 0,
  progress_note text check (progress_note is null or char_length(progress_note) <= 300), joined_at timestamptz not null default now(),
  last_progress_at timestamptz, membership_status text not null default 'active' check (membership_status in ('active','left')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(session_id,user_id),
  check (current_chapter >= 0)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.reading_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, content text not null check (char_length(trim(content)) between 1 and 2000),
  chapter_reference integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (chapter_reference is null or chapter_reference >= 1)
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(), comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, emoji text not null check (char_length(emoji) between 1 and 32),
  created_at timestamptz not null default now(), unique(comment_id,user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  notification_type text not null check (notification_type in ('comment','reaction','member_joined','progress')),
  session_id uuid references public.reading_sessions(id) on delete cascade, comment_id uuid references public.comments(id) on delete cascade,
  is_read boolean not null default false, created_at timestamptz not null default now()
);

create index idx_reading_sessions_status on public.reading_sessions(status);
create index idx_reading_sessions_creator on public.reading_sessions(creator_id);
create index idx_reading_sessions_created_at on public.reading_sessions(created_at desc);
create index idx_reading_sessions_search on public.reading_sessions using gin (to_tsvector('simple', book_title || ' ' || author));
create index idx_session_members_session on public.session_members(session_id);
create index idx_session_members_user on public.session_members(user_id);
create index idx_session_members_active on public.session_members(session_id,membership_status);
create index idx_comments_session_created on public.comments(session_id,created_at);
create index idx_comments_user on public.comments(user_id);
create index idx_reactions_comment on public.reactions(comment_id);
create index idx_reactions_user on public.reactions(user_id);
create index idx_notifications_recipient_read on public.notifications(recipient_id,is_read);
create index idx_notifications_recipient_created on public.notifications(recipient_id,created_at desc);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger reading_sessions_updated_at before update on public.reading_sessions for each row execute function public.set_updated_at();
create trigger session_members_updated_at before update on public.session_members for each row execute function public.set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute function public.set_updated_at();

create function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (id,display_name) values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''), split_part(new.email,'@',1))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_user();

create function public.enforce_member_chapter() returns trigger language plpgsql set search_path = '' as $$
declare chapters integer; begin select total_chapters into chapters from public.reading_sessions where id = new.session_id; if chapters is null or new.current_chapter < 0 or new.current_chapter > chapters then raise exception 'Chapter must be between 0 and the total chapter count'; end if; return new; end $$;
create trigger session_member_chapter_guard before insert or update of current_chapter,session_id on public.session_members for each row execute function public.enforce_member_chapter();

create function public.enforce_comment_chapter() returns trigger language plpgsql set search_path = '' as $$
declare chapters integer; begin select total_chapters into chapters from public.reading_sessions where id = new.session_id; if new.chapter_reference is not null and (new.chapter_reference < 1 or new.chapter_reference > chapters) then raise exception 'Chapter reference is outside this book'; end if; return new; end $$;
create trigger comment_chapter_guard before insert or update of chapter_reference,session_id on public.comments for each row execute function public.enforce_comment_chapter();

create function public.create_reading_session(p_book_title text,p_author text,p_total_chapters integer,p_description text default null,p_cover_image_url text default null,p_start_date date default null,p_target_end_date date default null) returns uuid language plpgsql security invoker set search_path = '' as $$
declare sid uuid; uid uuid := auth.uid(); begin if uid is null then raise exception 'Authentication required'; end if;
insert into public.reading_sessions(creator_id,book_title,author,total_chapters,description,cover_image_url,start_date,target_end_date) values (uid,trim(p_book_title),trim(p_author),p_total_chapters,nullif(trim(p_description),''),nullif(trim(p_cover_image_url),''),p_start_date,p_target_end_date) returning id into sid;
insert into public.session_members(session_id,user_id) values (sid,uid); return sid; end $$;

create function public.is_active_member(sid uuid) returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.session_members sm where sm.session_id=sid and sm.user_id=auth.uid() and sm.membership_status='active') $$;

alter table public.profiles enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Members update own profile" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "Public sessions are readable" on public.reading_sessions for select using (true);
create policy "Members create own sessions" on public.reading_sessions for insert to authenticated with check (creator_id=auth.uid());
create policy "Creators update their sessions" on public.reading_sessions for update to authenticated using (creator_id=auth.uid()) with check (creator_id=auth.uid());
create policy "Session members are publicly readable" on public.session_members for select using (true);
create policy "Members join active sessions" on public.session_members for insert to authenticated with check (user_id=auth.uid() and membership_status='active' and exists(select 1 from public.reading_sessions s where s.id=session_id and s.status='active'));
create policy "Members update own membership" on public.session_members for update to authenticated using (user_id=auth.uid() and exists(select 1 from public.reading_sessions s where s.id=session_id and s.status='active')) with check (user_id=auth.uid() and exists(select 1 from public.reading_sessions s where s.id=session_id and s.status='active'));
create policy "Public comments are readable" on public.comments for select using (deleted_at is null or user_id=auth.uid());
create policy "Active members add comments" on public.comments for insert to authenticated with check (user_id=auth.uid() and public.is_active_member(session_id) and exists(select 1 from public.reading_sessions s where s.id=session_id and s.status='active'));
create policy "Authors edit own comments" on public.comments for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Authors remove own comments" on public.comments for delete to authenticated using (user_id=auth.uid());
create policy "Public reactions are readable" on public.reactions for select using (true);
create policy "Active members react" on public.reactions for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.comments c join public.reading_sessions s on s.id=c.session_id where c.id=comment_id and c.deleted_at is null and s.status='active' and public.is_active_member(c.session_id)));
create policy "Owners change reaction" on public.reactions for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Owners remove reaction" on public.reactions for delete to authenticated using (user_id=auth.uid());
create policy "Owners read notifications" on public.notifications for select to authenticated using (recipient_id=auth.uid());
create policy "Owners mark notifications read" on public.notifications for update to authenticated using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());

grant select on public.profiles,public.reading_sessions,public.session_members,public.comments,public.reactions to anon,authenticated;
grant insert,update on public.profiles to authenticated;
grant insert,update on public.reading_sessions to authenticated;
grant insert on public.session_members to authenticated;
grant update(current_chapter,progress_note,last_progress_at,membership_status) on public.session_members to authenticated;
grant insert,update,delete on public.comments to authenticated;
grant insert,update,delete on public.reactions to authenticated;
grant select,update on public.notifications to authenticated;
grant execute on function public.create_reading_session(text,text,integer,text,text,date,date) to authenticated;

alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.session_members;
