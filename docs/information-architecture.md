# Information architecture

Companion to `docs/design-system.md`. That document says how things look; this
one says where things are and why.

## The problem this replaces

The first build shipped ten top-level tabs — Home, Daily, Subjects, Search,
Collections, Journal, Playground, Archive, Editor, Settings. Six of those were
the same activity (finding a puzzle) wearing different hats, one was a personal
record, one was an authoring tool that most players will never open, and one was
a preferences screen. A player arriving for the first time had to read ten
labels and guess which one meant "play".

## The rule

**Five destinations. One question each.**

| Destination | The one question it answers | Primary action |
| --- | --- | --- |
| 🏠 Home | What should I play right now? | Play today's puzzle |
| 🧩 Puzzles | What puzzle am I looking for? | Open a puzzle |
| ✨ Playground | What do I want to make? | Create a new crossword |
| 👥 Rooms | Who do I want to play with? | Join a room |
| 👤 Profile | What have I done? | Continue playing |

A screen that would answer two unrelated questions is two screens, or it is one
screen that has been given the wrong job.

Nothing else is a top-level item. Anything that was one is now a section, a
tab, or an overlay inside one of the five.

## Where the old tabs went

| Was | Is now |
| --- | --- |
| Daily | The featured card on Home; the full run lives under Puzzles → Daily archive |
| Subjects | Puzzles → Browse by subject (`/subjects/[subject]` stays as the detail route) |
| Collections | Puzzles → Featured collections (`/collections/[slug]` stays) |
| Archive | Puzzles → Daily archive |
| Search | A global overlay, reachable from every screen (`⌘K`, `/`, or the header button) |
| Journal | Profile → Journal |
| Settings | Profile → Settings |
| Progress | Merged into Profile; the standalone page redirects |
| Editor | Not in navigation. Reached from Profile → Creator dashboard, or Playground → Advanced editing |

Old URLs are kept and redirected rather than deleted, so links people already
have keep working.

## Home is short

Home is not a directory. It is the answer to one question, and it ends.

1. **Greeting** — time of day and, once there is an account, a first name.
2. **Today's puzzle** — the largest element on the page. Title, subject,
   difficulty, estimated time, one Play button.
3. **Continue playing** — active attempts only, at most three, each with real
   progress and a Resume button. "See all" appears only when there are more.
4. **Live rooms** — real rooms with real participant counts, plus Create room.
   Hidden entirely when nothing is live, never padded with invented rooms.
5. **Recommended** — derived from what this player has actually played
   (recent subjects, difficulty, language). Falls back to *nothing* rather than
   to a generic list, because a generic list is a lie about personalisation.
6. **Recently added** — five items, horizontal, and that is the end of the page.

## Puzzles

Search first, because search is how someone with something in mind finds it.
Then, in order: browse by subject, featured collections, daily archive, newest,
popular, favourites. Sections with no content for the current language are not
rendered — an empty French shelf is worse than no shelf.

## Playground is a workshop, not a chatbot

The landing page is a studio: create from scratch, generate with help, import
notes, my creations, shared with me, templates, recent, drafts. One large
**Create new crossword** button.

The creation flow is a guided strip — language → subject → topic → difficulty →
grid size → generate → preview → edit → save → play — where every step is
editable and the assistant is one tool on the bench, never the interface. The
person leaves feeling that they made the puzzle.

## One primary action per screen

Each screen has exactly one button with primary weight. Everything else is
secondary or a link. Two buttons of equal weight side by side is a bug.

## Mobile

A five-item bottom bar, same five destinations, same order. No horizontal
scrolling nav, no overflow menu, no tab smaller than 44×44. Search is the icon
in the header; it opens the same overlay as on desktop.

## Honesty

The navigation must not advertise what does not exist. A section with no real
data is not rendered, is not shown with placeholder rows, and is not shown with
a spinner that never resolves. If a destination is built but not finished, it
sits behind a named development flag and is absent from the bar.
