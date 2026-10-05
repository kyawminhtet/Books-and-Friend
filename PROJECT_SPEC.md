# Books & Friends — Project Context

This file records the implementation and backend setup that future work should preserve. The original product specification is in the conversation attachment; this page documents the concrete project configuration and current implementation decisions.

## Stack and Supabase project

- Web: Next.js App Router, React, TypeScript.
- Mobile: Expo Router, React Native, TypeScript.
- Shared backend: one Supabase project for all clients.
- Supabase project URL: `https://sokuvztjjfmxbhwhrbwk.supabase.co` (project ref `sokuvztjjfmxbhwhrbwk`).
- Client credentials: publishable key only. Never use a service-role key in browser or mobile code.
- Web client reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`.
- Expo client reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `apps/mobile/.env`; mobile auth persistence uses Expo SecureStore.
- Local environment files are git-ignored. `.env.example` files document variable names without credentials.

## Auth and profiles

- Supabase Auth email/password is used for sign-up, sign-in, sign-out, and password reset.
- Auth accounts are linked to `public.profiles` by the same UUID.
- A database trigger creates a profile after an Auth user is added; the seed script upserts profiles as a safe fallback.
- Profile photos use `public.profiles.avatar_url` and the public Supabase Storage bucket `avatars`. The bucket is provisioned in the Supabase Dashboard; Storage object mutation policies live in `202610030001_profile_avatar_storage.sql`.
- Avatar object paths are scoped by Auth user UUID (`<user-uuid>/<random-file-name>.<extension>`). Image reads use public URLs; upload and delete policies allow only the signed-in owner folder. Web upload accepts JPEG, PNG, and WebP up to 2 MB.
- The web profile editor is at `/settings`; Expo mobile provides the same profile fields and avatar upload from the Profile tab. Mobile avatar uploads use `expo-image-picker`, restrict types and size to the web limits, write to the owner UUID folder, then update `profiles.avatar_url`.
- The two existing development accounts are seeded as **Kyaw Min Htun** (`kmhitmdy24@gmail.com`) and **Loon Poe** (`loonpoe65@gmail.com`). The repeatable data is in `supabase/seed.sql`.

## Schema, migrations, and seed data

Schema migration files live in `supabase/migrations/` and should be applied in filename order. The initial migration creates:

- `profiles`
- `reading_sessions`
- `session_members`
- `comments`
- `reactions`
- `notifications`

The initial migration also adds constraints and indexes, updated-at triggers, chapter validation triggers, RLS policies, and the atomic `create_reading_session(...)` RPC (creates a session and enrolls its creator in one transaction). Realtime publication includes comments, reactions, and memberships.

After the migrations, run `supabase/seed.sql` in the Supabase SQL Editor to set the two profile names and create repeatable development circles, reader progress, comments, reactions, and notifications. The seed uses fixed row IDs and fails clearly if either Auth account is missing.

## Reading progress visibility

- Guest users may browse public sessions and read public discussion comments.
- Guest users must not receive participant membership rows or chapter progress from the API.
- Signed-in users may view active readers’ names and chapter progress. The session page shows an individual progress bar per active member; discovery cards may show group progress to signed-in users.
- This is enforced in the client UI and in RLS. `202610020001_authenticated_member_progress.sql` removes anonymous membership reads while allowing authenticated reads.
- The app must not query `session_members` from an anonymous session. Public guest discovery should omit membership rows; authenticated discovery/detail requests can include them.
- Participant counts are not currently exposed separately to guests.
- The Expo app has Discover, My reading, Notifications, and Profile tabs, plus circle detail, create-circle, and email/password auth screens. It shares the same Supabase schema and policies as web. Discovery and circle detail omit all `session_members` queries for guests; comments remain public. Circle members can add, edit, and delete their comments, react, and update reading progress. Session comments, reactions, and signed-in membership views refresh from Supabase Realtime. The mobile sign-up and password reset flows return to the app through the `booksandfriends` URL scheme; keep its generated auth redirect URI in Supabase Auth’s redirect allow list.

## Data security notes

- RLS is enabled for every application table.
- Profile email addresses remain in `auth.users`, not public profile queries.
- `session_members` has a unique `(session_id, user_id)` key; chapter bounds are enforced in PostgreSQL.
- Only active session members may post comments or reactions, subject to the session being active.
- Notification reads and updates are restricted to the recipient.
- Supabase SQL Editor execution is an administrative operation; seed SQL is not client code.

## Useful commands and files

- Apply schema changes: Supabase Dashboard → SQL Editor, run pending files under `supabase/migrations/` in order.
- Seed dev data: run `supabase/seed.sql` after the migration files and after both Auth accounts exist.
- Web Supabase client: `src/lib/supabase.ts`.
- Mobile Supabase client: `apps/mobile/lib/supabase.ts`.
- Initial schema: `supabase/migrations/202610010001_initial_schema.sql`.
- Anonymous progress restriction: `supabase/migrations/202610020001_authenticated_member_progress.sql`.
- Avatar Storage policies: `supabase/migrations/202610030001_profile_avatar_storage.sql`.

When changing Supabase access, update the migration, RLS behavior, client queries, and this project context together. Do not edit the hosted database only through dashboard changes without recording a migration here.
