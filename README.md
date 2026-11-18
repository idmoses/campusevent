# CampusConnect — Stages 1–3 (setup, schema, auth)

Run with a local server from this folder, e.g. `npx serve .` or the VS Code Live Server extension. Opening files by double-click will not work (ES modules + Supabase auth need http).

## Supabase setup
1. Create a Supabase project.
2. SQL Editor: run `database/schema.sql`, then `functions.sql`, then `policies.sql`, in that order.
3. Authentication > Providers: enable Email, with "Confirm email" on. Add your site URL and `/reset-password.html` to the redirect allow-list.
4. Put your Project URL and anon/publishable key in `assets/js/config/supabase.js`.
5. Serve the folder over HTTP (e.g. `npx serve .`); ES modules do not work from `file://`.

## First administrator
Register normally, verify your email, then in the SQL Editor run:
`update public.profiles set role = 'admin' where email = 'you@school.edu';`
Clients cannot do this: a trigger rejects role changes unless the caller is already an admin, and signup ignores any role sent in metadata.

## Status
Written but not yet run against a live Supabase project. Pending: stages 4–10.

## Stage 4–5 setup (dashboards, events, registration)
After the three base SQL files, also run `database/patch_stage4.sql` (seat-count view + backfills missing profiles).
Optional: run `database/sample_events.sql` to load six demo events.

## Stage 6–8 setup (admin tools, attendance, analytics)
Run `database/patch_stage6.sql` (image storage bucket, manual attendance, analytics function).
Check-in uses the registration code shown on the student's event page; camera QR scanning is not included.
