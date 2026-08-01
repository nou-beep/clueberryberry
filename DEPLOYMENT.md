# Deploying Clueberry

GitHub → Vercel → PostgreSQL. Allow about twenty minutes for a first deploy.

Read **[Before you start](#0-before-you-start)** first — there is one thing
about this app that does not fit Vercel's model, and it is better known up
front than discovered at step 6.

---

## 0. Before you start

**Cooperative rooms need a server Vercel cannot host.** Everything else in
Clueberry is a normal Next.js app and deploys to Vercel without ceremony. Rooms
use a persistent WebSocket connection, and Vercel's serverless functions cannot
hold one open. `server/realtime.ts` has to run somewhere that keeps a process
alive — Railway, Render, Fly.io, or any small VM.

You have two honest options:

- **Deploy without rooms.** Leave `NEXT_PUBLIC_REALTIME_URL` unset. The Rooms
  page says multiplayer is not configured on this deployment. Nothing hangs,
  nothing lies. You can add it later.
- **Deploy the realtime server too.** [Step 10](#10-cooperative-rooms) covers
  it. Budget another fifteen minutes.

Everything through step 9 works either way.

---

## 1. Create the GitHub repository

On [github.com/new](https://github.com/new), create an **empty** repository —
no README, no `.gitignore`, no licence. This repository already has all three,
and adding them there creates a conflict on your first push.

Copy the repository URL.

## 2. Push the project

From the project directory:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit"
```

```bash
git branch -M main
```

```bash
git remote add origin <repository-url>
```

```bash
git push -u origin main
```

Before that first commit, confirm no secrets are going up:

```bash
git status --porcelain | grep -E "^\?\? \.env$|\.env\."
```

That should print nothing. `.env` is git-ignored; `.env.example` is the file
that gets committed, and it contains only blanks.

## 3. Create the database

Use any PostgreSQL 14 or newer. Two free options:

**Supabase** — [supabase.com/dashboard](https://supabase.com/dashboard) → New
project. Then Project Settings → Database → Connection string → **Transaction**
mode (port 6543). That pooled string is the one you want.

**Neon** — [console.neon.tech](https://console.neon.tech) → New project. Copy
the **pooled** connection string.

Use the pooled string. Serverless functions open many short-lived connections,
and a direct connection will hit `Too many connections` under any real traffic.

## 4. Connect the repository to Vercel

[vercel.com/new](https://vercel.com/new) → Import Git Repository → pick your
repository.

Vercel detects Next.js on its own. Leave the framework preset, build command
and output directory exactly as detected. Do not deploy yet — set the
environment variables first, or the first build will fail.

## 5. Configure environment variables

In the import screen (or Project → Settings → Environment Variables), add these
four for **Production, Preview and Development**:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Your pooled PostgreSQL string from step 3 |
| `AUTH_SECRET` | Run `openssl rand -base64 32` and paste the result |
| `AUTH_URL` | `https://<your-project>.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | The same URL |

Optional, add only if you want the feature:

| Name | Enables |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | The Google sign-in button |
| `MAIL_WEBHOOK_URL` | Real delivery of verification and reset messages |
| `CLUEBERRY_CONSTRUCTORS` | Access to the `/editor` dashboard, by email |
| `NEXT_PUBLIC_REALTIME_URL` | Cooperative rooms (see step 10) |

Every optional variable you leave out switches its feature off cleanly. None of
them half-work.

## 6. Deploy

Click **Deploy**. The build runs `prisma generate && next build`.

It does not connect to the database — every page that reads data is dynamic —
but `DATABASE_URL` still has to be *set*, because Prisma validates it at
generate time.

## 7. Create the tables and load the puzzles

The database is empty on the first deploy. From your own machine:

```bash
DATABASE_URL="<your production url>" npm run db:push
```

```bash
DATABASE_URL="<your production url>" npm run db:seed
```

The seed loads 34 subjects, 314 collections, 100 puzzles and the last week of
daily puzzles. It is idempotent — running it again updates rather than
duplicates, which is also how you ship new puzzles later.

For a team, prefer migrations over `db:push`: commit a migration with
`npx prisma migrate dev --name <what-changed>`, and run `npm run db:migrate` to
apply it in production.

## 8. Verify production

Open the deployment and check, in this order:

- [ ] The homepage greets you and shows today's puzzle
- [ ] `/en/puzzles` lists subjects with real puzzle counts
- [ ] A puzzle opens, accepts typing, and the save chip says "Saved in this browser"
- [ ] Reload mid-puzzle — your letters and cursor are still there
- [ ] `/fr` and `/ar` each show puzzles **in that language**, not English ones
- [ ] The Arabic pages read right to left and the on-screen keyboard appears
- [ ] Create an account, then reload — progress moved to the account
- [ ] Sign out and back in
- [ ] `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest` all return content
- [ ] The browser tab shows the berry icon

If a French or Arabic category looks empty, the seed did not finish. Re-run it.

## 9. Add a custom domain

Project → Settings → Domains → add your domain, then create the DNS record
Vercel shows you (`CNAME` to `cname.vercel-dns.com` for a subdomain, `A` to
`76.76.21.21` for an apex domain).

**Then update two environment variables** to the new domain and redeploy:

- `AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Sign-in callbacks, canonical URLs and the links inside emails all read from
these. If you skip this, sign-in will bounce people back to the old
`.vercel.app` address. If you use Google sign-in, add the new callback URL
(`https://your-domain.com/api/auth/callback/google`) in the Google console too.

## 10. Cooperative rooms

Skip this if you are deploying without rooms.

The realtime server is a plain Node process. On Railway or Render, create a new
service from the same repository with:

- **Build command** `npm install`
- **Start command** `npm run dev:realtime`
- **Environment** `DATABASE_URL` (the same database) and `REALTIME_PORT` if the
  host requires a specific port

The host gives you a URL. Convert it to a WebSocket URL and set it on Vercel:

```
NEXT_PUBLIC_REALTIME_URL=wss://your-realtime-host.up.railway.app
```

It must be `wss://`, not `ws://` — a browser on an HTTPS page refuses an
insecure socket. Redeploy the Vercel project so the new public variable is
baked into the client bundle, then open `/en/rooms` and create a room.

Voice chat is WebRTC between browsers, so it needs no extra server. It is
always opt-in, asks for the microphone explicitly, and records nothing.

## 11. Automatic deployments

Already on. Vercel builds every push to `main` as production and every other
branch and pull request as a preview.

Two things worth doing:

- **Protect `main`.** GitHub → Settings → Branches → require the `CI` check to
  pass before merging. The workflow in `.github/workflows/ci.yml` runs lint,
  typecheck, unit tests, puzzle validation and a production build.
- **Seed your preview database, or share the production one.** Previews inherit
  production environment variables by default, which means previews write to
  your real database. If that makes you uneasy, give the Preview environment a
  separate `DATABASE_URL`.

## 12. Rolling back

The fastest fix for a bad deploy is not a revert commit:

1. Vercel → your project → **Deployments**
2. Find the last good deployment
3. **⋯ → Promote to Production**

That is live in seconds and does not touch git. Afterwards, fix the code
properly and push.

**If the bad deploy also changed the database schema**, promoting the old build
is not enough — the old code will be talking to the new schema. Roll the schema
back first (or forward, with a fixing migration), then promote.

---

## Common deployment errors

**`Environment variable not found: DATABASE_URL`**
The variable is missing, or it was added after the build. Add it to all three
environments and redeploy — Vercel does not rebuild on a variable change.

**`PrismaClientInitializationError: Can't reach database server`**
Wrong host or port, or the database is paused. Free Supabase projects pause
after a week of inactivity; open the dashboard to wake it.

**`Too many connections`**
An unpooled connection string. Use Supabase port 6543 or Neon's pooled host.

**`Error: @prisma/client did not initialize yet`**
`prisma generate` did not run. The `build` script includes it, and `postinstall`
runs it too — check you have not overridden the build command in Vercel.

**Build fails on a type or lint error that passes locally**
Your local `.next` is stale. Run `rm -rf .next && npm run build`. The build is
configured to fail on these deliberately; do not switch that off.

**Every page 404s except `/`**
The `[locale]` segment did not build. Confirm `src/i18n/routing.ts` still lists
`en`, `fr` and `ar`, and that the middleware file was committed.

**Sign-in redirects to `localhost:3000`**
`AUTH_URL` still points at localhost. Update it and `NEXT_PUBLIC_APP_URL`, then
redeploy.

**`UntrustedHost` from Auth.js**
`AUTH_URL` does not match the domain being served. They must be identical,
including `https://` and any `www.`.

**The Rooms page says multiplayer is not configured**
That is the honest message for a missing `NEXT_PUBLIC_REALTIME_URL`, not a bug.
See step 10.

**Rooms connect locally but not in production**
A `ws://` URL on an HTTPS site. Use `wss://`.

**Arabic pages render left to right**
The `dir` attribute comes from the locale layout. This means the request is not
being matched by the middleware — check `middleware.ts` was committed and its
`matcher` still excludes only `/api`, `/_next` and static files.

**A category is empty in French or Arabic**
The seed did not complete. Re-run `npm run db:seed` against production; it is
safe to run repeatedly.
