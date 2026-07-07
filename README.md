# QuickHero (self-hosted MongoDB edition)

This is your QuickHero app rewritten to run entirely on your own machine with
**MongoDB** instead of Supabase/Postgres, and without any dependency on
Lovable's hosted platform. Same UI, same screens, same features.

## What changed under the hood

- **Database:** Supabase/Postgres → **MongoDB** (via Mongoose).
- **Auth:** Supabase Auth → your own **JWT** email/password auth.
- **Realtime:** Supabase Realtime → **Socket.io**.
- **Row-Level Security:** Postgres RLS policies → equivalent permission
  checks written in plain JS on the server (`server/lib/permissions.js`).
- **Triggers** (auto-notifications, admin auto-grant, etc.) → plain JS
  functions called from the routes (`server/lib/triggers.js`).
- **File storage** (ID docs / selfies for volunteer verification) → stored
  on local disk under `server/uploads/`, served statically.
- **Build tooling:** Lovable's private Vite/TanStack-Start plugin → plain
  Vite + `@tanstack/react-router` (client-side app, no SSR needed).

Almost all of your original React components, routes, and business logic
are untouched. The only real "swap" is `src/integrations/supabase/client.ts`,
which now talks to a small Express API (`server/`) instead of Supabase — it
implements the same `.from().select().eq()...` style API your code already
used, so the rest of the app didn't need to change.

**One feature that could not be preserved:** Google sign-in used Lovable's
hosted OAuth service, which isn't available outside their platform. Email/
password sign-in works exactly as before; if you want Google login, you'd
wire up your own OAuth app (e.g. via `passport-google-oauth20`) in
`server/routes/auth.js`.

## Requirements

- Node.js 18+
- MongoDB running locally (or an Atlas connection string)

### Installing MongoDB locally

- **macOS:** `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- **Windows/Linux:** see https://www.mongodb.com/docs/manual/administration/install-community/
- **Or skip installing anything** and use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster — just paste its connection string into `.env`.

## Running it

```bash
npm install
npm run seed   # optional: creates 3 demo accounts (see below)
npm run dev    # starts the API+Socket.io server AND the Vite dev server
```

Then open **http://localhost:5173**.

A `.env` file is already included with sensible local defaults
(`mongodb://127.0.0.1:27017/quickhero`). Edit it if you're using Atlas, want
a custom `JWT_SECRET`, or want to enable the live map (see below).

### Demo accounts (after `npm run seed`)

| Email | Password | Role |
|---|---|---|
| admin@quickhero.local | password123 | Admin (also a verified volunteer) |
| volunteer@quickhero.local | password123 | Verified volunteer |
| user@quickhero.local | password123 | Regular user |

You can also just sign up your own account from the app — the first account
created isn't auto-admin (matching the original setup, which grants admin
only to a specific hardcoded email — see `KNOWN_ADMIN_EMAIL` in
`server/lib/triggers.js` if you want to change it to your own email).

## Optional: Google Maps (live map + ETA)

The interactive live map and admin ETA lookups need a Google Maps API key.
Without it, everything else works fine — those specific screens will show a
friendly "map unavailable" message instead. To enable:

1. Get a key from https://console.cloud.google.com/google/maps-apis (enable
   "Maps JavaScript API" for the browser key, and "Directions API" for the
   server key).
2. In `.env`, set `VITE_GOOGLE_MAPS_API_KEY` (browser) and, optionally,
   `GOOGLE_MAPS_SERVER_KEY` (server-side ETA).
3. Restart `npm run dev`.

## Password reset in local dev

There's no email server wired up locally. When someone requests a password
reset, the reset link is printed to the **server terminal** (the `SERVER`
pane when running `npm run dev`) instead of being emailed — just copy the
printed link into your browser.

## Project layout

```
src/            React app (unchanged structure/routes/components)
server/
  index.js      Express + Socket.io entrypoint
  models/       Mongoose schemas
  routes/       auth, generic db engine, rpc, storage, eta
  lib/          permissions (RLS-equivalent), triggers, JWT, etc.
  uploads/      local file storage for volunteer verification documents
  seed.js       optional demo-data script
```

## Troubleshooting

- **"Could not connect to MongoDB"** — make sure `mongod` is running, or that
  your `MONGO_URI` in `.env` is correct (check for typos, whitelist your IP
  if using Atlas).
- **Port already in use** — the frontend uses `5173`, the API uses `4000`.
  Change `PORT` in `.env` and the proxy target in `vite.config.ts` if needed.
- **Google Maps errors in the console** — expected if you haven't set
  `VITE_GOOGLE_MAPS_API_KEY`; the rest of the app is unaffected.
