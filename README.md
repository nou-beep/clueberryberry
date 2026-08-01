# Clueberry

> A little notebook of crosswords.

Crosswords in **English, French and Arabic**, written by people. Each language
is authored independently rather than translated, so the French grids have
French jokes in them and the Arabic grids are built around Arabic wordplay.
Finish one and you earn a sticker for your journal.

It looks like a website someone made in 2004 for a club they loved and then kept
tending for twenty years — cream paper on a pink desk, binder tabs, rounded
windows, glossy buttons, collectible stickers, and a small helper called **Pip**
in the corner. The full visual contract lives in
[docs/design-system.md](docs/design-system.md), the navigation model in
[docs/information-architecture.md](docs/information-architecture.md), and a live
style guide with every component sits at `/styleguide`.

---

## Features

- **Three independent libraries.** 40 English, 30 French and 30 Arabic puzzles.
  Nothing is machine-translated, and a category with no puzzle in your language
  is never shown to you.
- **A daily puzzle** in each language, plus the full archive.
- **34 subjects and 314 collections**, from biology and geology to Moroccan
  history, internet culture and the two world wars.
- **Full Arabic support**, right to left, with a built-in Arabic keyboard and
  answer checking that forgives spelling variants and never requires diacritics.
- **Progress that survives.** Guests keep progress in the browser; signing in
  moves it to an account, and every write carries a revision so two devices
  cannot silently overwrite each other.
- **Cooperative rooms.** Solve the same grid together in real time, with text
  chat and optional voice. Needs a separately-hosted realtime server — see
  [DEPLOYMENT.md](DEPLOYMENT.md).
- **A Playground** for making your own crosswords, with a guided flow and an
  assistant that helps rather than takes over.
- **A sticker book and journal** instead of a statistics dashboard.
- **Accessible by construction:** keyboard-only solving, visible focus, a
  high-contrast mode, and colour never used as the only signal.

## Screenshots

<!-- Add screenshots here. Suggested set:
     docs/screenshots/home.png       — the homepage
     docs/screenshots/play.png       — solving a puzzle
     docs/screenshots/puzzles.png    — the Puzzles hub
     docs/screenshots/playground.png — making a crossword
     docs/screenshots/arabic.png     — an Arabic puzzle, right to left
-->

_Screenshots go here._

---

## Technology

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4, design tokens in `src/app/globals.css` |
| Database | PostgreSQL via Prisma 6 (SQLite supported for offline development) |
| Auth | Auth.js v5 — email/password, optional Google |
| i18n | next-intl, `/en` `/fr` `/ar`, full RTL |
| Validation | Zod on every server input |
| Realtime | A standalone `ws` server (`server/realtime.ts`) |
| Tests | Vitest (unit), Playwright (end-to-end) |

## Requirements

- **Node.js 20.9 or newer** and npm
- **A PostgreSQL database.** A free [Neon](https://neon.tech) or
  [Supabase](https://supabase.com) project is enough. If you would rather not
  sign up for anything, you can use a local SQLite file instead — see below.

---

## Installation

```bash
git clone <repository-url>
cd clueberry
npm install
```

`npm install` runs `prisma generate` for you.

### Configure the environment

```bash
cp .env.example .env
```

Fill in the required values:

- `DATABASE_URL` — your PostgreSQL connection string
- `AUTH_SECRET` — generate one with `openssl rand -base64 32`
- `AUTH_URL` and `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` locally

Every other variable is optional; each one left blank switches its feature off
rather than half-enabling it. `.env.example` explains each.

### Set up the database

```bash
npm run db:push
npm run db:seed
```

`db:push` creates the tables; `db:seed` loads the 100 puzzles, 34 subjects and
314 collections, and schedules the last week of daily puzzles. It is idempotent.

### Prefer no database signup? Use SQLite

```bash
npm run db:sqlite
```

Then set `DATABASE_URL="file:./dev.db"` in `.env` and run `db:push` and
`db:seed` as above. Run `npm run db:postgres` to switch back before deploying —
Vercel cannot use a SQLite file.

---

## Running locally

```bash
npm run dev
```

Open <http://localhost:3000>. You land on `/en`; `/fr` and `/ar` are one click
away in the header. You do not need an account to play.

To work on cooperative rooms, run the realtime server in a second terminal:

```bash
npm run dev:realtime
```

and point the app at it in `.env`:

```
NEXT_PUBLIC_REALTIME_URL=ws://localhost:3106
```

Leave that blank and the Rooms page says plainly that multiplayer is not
configured, instead of spinning forever.

> Don't run `next build` against a checkout a dev server is serving — it
> overwrites `.next` and breaks the running server. Set `NEXT_DIST_DIR` to build
> into a separate directory instead.

---

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooled, on Vercel) |
| `AUTH_SECRET` | Yes | Signs sessions and tokens |
| `AUTH_URL` | Yes | Canonical URL, used for sign-in callbacks |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical URL, used in metadata and email links |
| `GOOGLE_CLIENT_ID` | No | Enables the Google button; hidden when unset |
| `GOOGLE_CLIENT_SECRET` | No | Pairs with the above |
| `NEXT_PUBLIC_REALTIME_URL` | No | WebSocket URL for cooperative rooms |
| `REALTIME_PORT` | No | Port the realtime server binds to (default 3106) |
| `MAIL_WEBHOOK_URL` | No | Where to POST verification and reset messages |
| `CLUEBERRY_CONSTRUCTORS` | No | Comma-separated emails allowed into `/editor` |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run dev:realtime` | The WebSocket server for cooperative rooms |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run verify` | Lint, typecheck, unit tests and content validation |
| `npm run check:puzzles` | Validates every puzzle file's grid and clues |
| `npm run db:push` · `db:migrate` · `db:seed` · `db:studio` | Database tasks |
| `npm run db:sqlite` · `db:postgres` | Switch the Prisma datasource |

---

## Building

```bash
npm run build
npm start
```

The build fails on any TypeScript or ESLint error — deliberately.

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full walkthrough: GitHub, Vercel,
the database, environment variables, custom domains, rollbacks, and the errors
you are most likely to hit.

The short version: push to GitHub, import the repository on Vercel, set the four
required environment variables, deploy. Cooperative rooms need one extra step,
because Vercel's serverless runtime cannot host a WebSocket server.

## Database setup

Any PostgreSQL 14+ database works. On Vercel, use a **pooled** connection
string — serverless functions open many short-lived connections, and an
unpooled URL will exhaust the server.

After the first deploy, push the schema and seed the production database from
your own machine:

```bash
DATABASE_URL="<your production url>" npm run db:push
```

```bash
DATABASE_URL="<your production url>" npm run db:seed
```

## Authentication setup

Email and password sign-in works with no configuration beyond `AUTH_SECRET`.

For Google sign-in, create an OAuth client at
[console.cloud.google.com](https://console.cloud.google.com/apis/credentials),
add `<AUTH_URL>/api/auth/callback/google` as an authorised redirect URI, and set
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Leave them unset and the Google
button is not rendered at all.

Verification and password-reset messages need `MAIL_WEBHOOK_URL` to reach a real
inbox. Without it the app does not pretend to send mail: it logs the link and
shows it in the interface.

---

## Troubleshooting

**`Environment variable not found: DATABASE_URL`**
Copy `.env.example` to `.env` and fill it in. On Vercel, set the variables in
Project → Settings → Environment Variables, then redeploy.

**`Can't reach database server`**
Check the connection string, and that your provider accepts connections from
Vercel (Neon and Supabase do by default).

**`Too many connections` in production**
You are using an unpooled connection string. Switch to the pooled one
(Supabase port 6543, or Neon's pooled host).

**Builds locally, fails on Vercel**
Almost always a missing environment variable. The build needs `DATABASE_URL`
and `AUTH_SECRET` to be *set*, even though it never connects.

**`Cannot find module './vendor-chunks/next.js'`**
A `next build` ran while `next dev` was serving the same directory. Delete
`.next` and restart.

**Rooms never connect**
`NEXT_PUBLIC_REALTIME_URL` is unset or unreachable. Over HTTPS it must be a
`wss://` URL — browsers refuse plain `ws://` from a secure page.

**Arabic answers rejected when they look right**
Checking folds أ/إ/آ to ا and ى to ي; ة and ه are interchangeable only where a
puzzle says so, and diacritics are always ignored. If one specific answer is
wrong, that is a content bug — please file it.

---

## Folder structure

```
├── docs/                     Design system, IA, authoring guide, product audit
├── e2e/                      Playwright tests
├── prisma/
│   ├── schema.prisma         Data model
│   └── seed.ts               Loads taxonomy + puzzle files into the database
├── public/                   Static assets
├── scripts/
│   ├── check-puzzles.ts      Validates every puzzle file
│   └── switch-datasource.ts  Postgres ⇄ SQLite
├── server/
│   └── realtime.ts           Standalone WebSocket server for rooms
├── src/
│   ├── app/
│   │   ├── [locale]/         All pages, one tree per language
│   │   └── api/              Route handlers
│   ├── components/           UI, grouped by area
│   ├── content/
│   │   ├── puzzles/          100 authored puzzle files
│   │   └── taxonomy/         Subjects and collections, in three languages
│   ├── i18n/                 next-intl routing and request config
│   ├── lib/                  Crossword engine, queries, auth, progress
│   └── messages/             UI strings: en.json, fr.json, ar.json
└── tests/                    Unit tests
```

The crossword engine in `src/lib/crossword/` is the heart of it: grid building,
numbering, navigation, answer normalization, and a validator that refuses a grid
with an unchecked square or an orphan slot.

---

## Contributing

Puzzle contributions are very welcome. Read
[docs/authoring-guide.md](docs/authoring-guide.md) first — it covers clue voice,
the difficulty ladder, and the rules for sensitive subjects.

Before opening a pull request:

```bash
npm run verify
```

Every puzzle file must pass `npm run check:puzzles` with zero errors. Facts need
a named source; anything contested is marked `needs_review` with the reason.

## License

MIT. See [LICENSE](LICENSE).
