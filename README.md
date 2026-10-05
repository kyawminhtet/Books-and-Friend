# Books & Friends

A responsive reading community built with Next.js, TypeScript, and Supabase.

See [PROJECT_SPEC.md](PROJECT_SPEC.md) for the current Supabase project settings, schema, seed data, and access rules.

The web interface supports English, Burmese, and Japanese. Message catalogs live in `src/i18n/locales/`; the selected language is saved in browser storage and applied across pages.

## Getting started

```sh
npm install
npm run dev
```

Supabase browser configuration lives in `.env.local` (ignored by git). Copy `.env.example` to `.env.local` and set a project URL and publishable key when configuring another environment. Never put a service-role key in client code.

Apply every file in `supabase/migrations/` in filename order before using the app. The initial migration creates the schema, constraints, RLS policies, signup profile trigger, and the atomic `create_reading_session` RPC. The follow-up migration limits participant progress data to signed-in clients.

Create a public `avatars` Storage bucket in the Supabase Dashboard before applying `202610030001_profile_avatar_storage.sql`. The profile settings page uploads JPEG, PNG, and WebP images up to 2 MB and stores each public URL in `profiles.avatar_url`.

## MVP routes

- `/` and `/sessions` — public session discovery
- `/sessions/[id]` — public details, progress, and discussion
- `/sessions/create` — create a session and join it atomically
- `/auth/sign-up`, `/auth/sign-in`, `/auth/forgot-password`, `/auth/reset-password`
- `/my-reading` — joined sessions
- `/settings` — profile details and avatar photo

## Mobile app

The Expo app is in `apps/mobile`. Copy `apps/mobile/.env.example` to `apps/mobile/.env`, add the same Supabase URL and publishable key, then run:

```sh
cd apps/mobile
npm install
npm start
```

Mobile includes Discover, My reading, Notifications, and Profile tabs, circle details and creation, email/password auth, member progress and discussion, and profile photo upload. Guests can view public circle details and comments; membership and progress requests are sent only for signed-in users.
For sign-up confirmation and password recovery links to return to the installed app, allow the generated `booksandfriends` auth redirect URI in Supabase Dashboard → Authentication → URL Configuration.

The landing page shows starter preview cards until the Supabase session table has live data. Preview cards are clearly routed into signup and are not persisted demo content.
