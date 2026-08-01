# Clueberry — pre-launch product audit

Written after a user-testing session. Everything below was verified against the
running application and the source, not assumed.

## 1. Repository audit

**Stack as built:** Next.js 15 (App Router) · TypeScript strict · Tailwind v4 ·
Prisma 6 → **SQLite** · Auth.js v5 · next-intl (en/fr/ar) · Zod · Vitest ·
Playwright. No external services. 134 unit tests, 19 e2e tests, all green.

**What is genuinely solid and should not be rebuilt:**

- `src/lib/crossword/*` — a pure, framework-free engine: numbering, entry
  extraction, connectivity, symmetry, FR/AR normalization, attempt checking,
  and a real editorial validator. Well covered by tests. **Keep as-is.**
- `src/content/taxonomy/*` → seeded into the DB. 21 subjects / 230 collections
  as typed data; no subject list lives in a component. **Extend, don't replace.**
- The design system (`docs/design-system.md`, `/styleguide`) and the
  playful/archival tone split.
- The constructor desk at `/editor` with the full editorial status workflow.
- The Playground generator: seeded, offline, validated — 1,704 generations
  verified against the validator.

**Library size today:** 39 puzzles — EN 20, FR 10, AR 9. Difficulty spread
easy 15 / medium 20 / hard 4. One Direction has **one** puzzle.

## 2. Broken, incomplete, or misleading features

Ordered by severity. "Misleading" means the code looks finished but the
behaviour a user expects does not happen.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **No account creation of any kind.** `src/lib/auth.ts` registers only a Google provider, and only when `GOOGLE_CLIENT_ID`/`SECRET` are set. With no credentials configured the provider array is empty, so there is no way to register or sign in. No email/password, no reset, no verification. | `auth.ts:15–25` | Blocker |
| 2 | **`PUT /api/attempts` is dead code.** The endpoint validates and writes a `PuzzleAttempt`, but *nothing in the client ever calls it*. The only caller of any attempts API is `ProfileClient` → `/api/attempts/merge`. Signed-in play therefore never reaches the database. | grep: sole caller is `ProfileClient.tsx:100` | Blocker |
| 3 | **Progress is localStorage-only, so it cannot cross devices** and is lost when site data is cleared. There is no sync, no retry, no conflict handling. | `PlayScreen.tsx` has no `fetch` at all | Blocker |
| 4 | **Partial state is not saved.** `LocalAttempt` stores letters, time, mistakes, hints, checks — but *not* the selected cell, the current direction, or timer visibility. Reopening a puzzle drops the player back at entry 1. | `lib/progress/local.ts` | High |
| 5 | **No save feedback.** The floppy indicator reflects a local write only; there is no saving / saved / offline / syncing / failed state. | `GameToolbar` `saved` prop | High |
| 6 | **No `Profile` model.** `User` has language preferences only — no display name, username, avatar, favourites, or longest streak. Usernames and uniqueness do not exist. | `schema.prisma:18–33` | High |
| 7 | **Library too small and lopsided.** FR 10 and AR 9 against a 30/30 target; hard puzzles are 4 of 39. Several collections advertise counts of 0. | seed tally | High |
| 8 | **Empty categories are reachable.** A subject page with no puzzles in the current language still renders, showing "No puzzles match these filters yet." Requirement: do not display an empty FR/AR category. | `/en/subjects/world-war-ii` | Medium |
| 9 | **One Direction is one easy puzzle** against a brief calling for sub-collections and easy→expert range. | content dir | Medium |
| 10 | **Playground cannot save, edit, share, or regenerate.** Generation is real and validated, but the result is throwaway: no rename, no clue editing, no persistence, no presets, no stage feedback. | `PlaygroundBuilder.tsx` | Medium |
| 11 | **Multiplayer is entirely absent** — no models, no transport, no UI. | — | Medium |
| 12 | **Stale-progress hazard on merge.** `/api/attempts/merge` compares a crude score and can still let an older local attempt win over a newer server one; there is no `updatedAt`/version guard. | `merge/route.ts` | Medium |
| 13 | **Achievements are computed client-side only.** `Achievement`/`UserAchievement` tables are seeded but never written to. The journal's badges come from `computeAchievements()` in the browser. | `progress/local.ts` | Low |
| 14 | Subjects list lacks 13 topics the brief now asks for (Movies/TV, Art, Technology, Space, Animals, Food, Language, Morocco, Arab world, French culture, Internet culture, the 2000s, the 2010s). | taxonomy | Low |

**Not found (good):** no fake participants, no mock chat, no hardcoded
completion data, no decorative buttons that lie. The app is honest about Google
sign-in being unconfigured and about Playground puzzles being unreviewed.

## 3. Revised database schema

Added or changed models. Existing models keep their shape unless noted.

```
Profile           userId(unique) displayName username(unique, citext-style
                  lowercased index) avatarKind avatarSeed bio joinedAt
                  favoriteSubjects[] favoriteCollections[]
                  longestStreak currentStreak lastPlayedOn
                  multiplayerDisplayName showPresence
UserSettings      userId(unique) interfaceLanguage puzzleLanguage theme
                  reducedMotion sound autoCheck showTimer highContrast
                  textSize dyslexiaFont arabicFold* (5 flags)
Credential        userId(unique) passwordHash algo updatedAt
PasswordResetToken  userId tokenHash expiresAt usedAt
EmailVerificationToken  userId tokenHash expiresAt usedAt

PuzzleAttempt     + selectedRow selectedColumn direction timerVisible
                  + revision (monotonic, for conflict resolution)
                  + clientUpdatedAt  (last write wins by *client* clock only
                    when revision matches; otherwise server wins)
                  + notes
SavedPuzzle       userId puzzleId savedAt          (bookmarks)
PlaygroundPuzzle  ownerId language subject topic difficulty size seed
                  definition(JSON) title visibility(private|link|public)
                  shareSlug(unique) createdAt updatedAt
UserSticker       userId stickerSlug count firstEarnedAt  (server-side truth)

MultiplayerRoom   code(unique) hostId puzzleId visibility(public|private|invite)
                  participantLimit chatEnabled voiceEnabled allowGuests
                  hintsNeedApproval locked endedAt expiresAt createdAt
RoomParticipant   roomId userId? guestName displayName colorIndex
                  isHost lastSeenAt leftAt muted blocked
RoomPuzzleState   roomId(unique) gridState(JSON) revision updatedAt
RoomMessage       roomId participantId body kind(chat|system) createdAt
RoomInvite        roomId code createdBy expiresAt usesRemaining
```

No audio is stored anywhere. Voice is peer-to-peer only.

## 4. Technical approach

**Persistence.** One `useAttemptSync` hook owns saving. Every meaningful action
writes optimistically to local storage immediately, then debounces a `PUT` to
the server when signed in. Each attempt carries a `revision`; the server
increments it and rejects a write whose base revision is stale, returning the
authoritative row so the client can reconcile instead of clobbering. Failures
queue and retry with backoff; the toolbar shows saving / saved / offline /
syncing / sync failed. Guests keep using local storage and are offered a merge
at registration.

**Real-time.** Chosen: **a standalone `ws` server** (`server/realtime.ts`) run
as its own process, with room and grid state persisted through Prisma.
Rationale — Socket.IO needs a custom Next server, which would complicate the
existing dev/build story; Supabase/Liveblocks/PartyKit are hosted services and
this repo deliberately has no external dependencies. A plain `ws` process is the
smallest thing that genuinely works, and because state lives in the database a
refresh or a server restart restores the room rather than losing it. The client
connects to `NEXT_PUBLIC_REALTIME_URL` and degrades to a clear "reconnecting"
state when it is unreachable.

**Voice.** WebRTC mesh using the same socket for signalling. No media is
recorded or relayed through the server. Microphones require an explicit click.
It ships behind `NEXT_PUBLIC_ENABLE_VOICE`; if it is not solid, the flag stays
off and the control is not rendered at all — no dead button.

**Database.** Still SQLite locally (no PostgreSQL on this machine). The schema
stays Postgres-portable, and `docs/` records the switch procedure.

## 5. Prioritised implementation plan

1. Auth: credentials provider, register/login/logout, password reset, `Profile`
   + `UserSettings`, profile editing, username validation, guest migration.
2. Persistence: `useAttemptSync`, richer attempt state, revision conflict
   handling, retry queue, save-state indicator, server-side stickers.
3. Language completeness: hide empty categories; FR and AR to 30 puzzles each.
4. Library: EN to 40, spread difficulty, add the 13 missing subjects.
5. Playground: guided form, presets, real stages, save/edit/share/regenerate.
6. Discovery: filters (language, difficulty, size, time, origin, status, new).
7. One Direction: sub-collections, easy→expert.
8. Multiplayer: rooms, presence, shared grid, chat, host controls, reconnect;
   voice behind a flag.
9. UX pass, screen by screen.
10. Tests and launch checks.

## 6. Screens requiring redesign

| Screen | Why |
| --- | --- |
| Home | Reorder to Continue → Today → Multiplayer → Subjects → Playground → Recent → Journal |
| Sign in / Register / Reset | Do not exist |
| Profile | Read-only guest card; needs editing, identity, favourites, stats |
| Settings | Split account settings from device preferences |
| Play | Add save-state chip; persist cursor and direction |
| Subjects / Collection | Empty categories must not appear; filters are thin |
| Search | No filters, no zero-result suggestions |
| Playground | Prompt box → guided creation, stages, post-generation editing |
| Multiplayer lobby / room | Do not exist |
| Journal | Should read server stickers when signed in |
