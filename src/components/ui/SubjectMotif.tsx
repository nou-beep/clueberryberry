import { FALLBACK_THEME, isSubjectTheme, type SubjectTheme } from "@/lib/subject-theme";

/**
 * Subject decoration. The layout never changes between subjects — only this
 * layer does. See docs/design-system.md §1, §5 and §8.
 *
 * `SubjectMotif` is the single doodle used on covers and headers: a 24×24 box,
 * 1.75px round strokes, and at most one small charm placed off-centre.
 * `MotifField` is the faint repeating pattern that sits behind a page.
 *
 * Both maps are keyed by `SubjectTheme`, so a new theme cannot be added to the
 * registry without also being drawn here. Objects only — never people, never
 * logos, wordmarks or album art, and no cute charm on a sensitive subject.
 */

const MOTIFS: Record<SubjectTheme, React.ReactNode> = {
  // Pressed leaf with veins, drawn like a herbarium sheet.
  biology: (
    <>
      <path d="M12 21c-6.5-5-6.5-12 0-17 6.5 5 6.5 12 0 17z" />
      <path d="M12 4v17M12 9l-3.5 2M12 9l3.5 2M12 14l-4 2.4M12 14l4 2.4" />
    </>
  ),
  // Heart on a notebook line, with an ink drop.
  psychology: (
    <>
      <path d="M12 20s-7-4.6-7-9.4C5 8 6.9 6.4 9 6.4c1.4 0 2.5.8 3 1.9.5-1.1 1.6-1.9 3-1.9 2.1 0 4 1.6 4 4.2 0 4.8-7 9.4-7 9.4z" />
      <path d="M3.5 4h17" strokeDasharray="2 2.5" />
    </>
  ),
  // Erlenmeyer flask with graduation marks and a bubble.
  chemistry: (
    <>
      <path d="M9.5 3.5h5M10.6 3.5v5L6.4 17a1.9 1.9 0 0 0 1.7 2.9h7.8a1.9 1.9 0 0 0 1.7-2.9l-4.2-8.5v-5" />
      <path d="M8.2 14.5h7.6M9.6 12h4.8" />
      <circle cx="13" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A cut gemstone with its facets, plus a loose chip beside it.
  geology: (
    <>
      <path d="M12 3.2 18.2 9.4 15 20.2H9L5.8 9.4z" />
      <path d="M5.8 9.4h12.4M12 3.2 9.4 9.4 12 20.2 14.6 9.4z" />
      <circle cx="20.4" cy="17.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // Globe with an equator and one meridian; a pin dot off to the side.
  geography: (
    <>
      <circle cx="11.4" cy="12.4" r="8" />
      <path d="M3.4 12.4h16" />
      <path d="M11.4 4.4a11 11 0 0 1 0 16 11 11 0 0 1 0-16z" />
      <circle cx="21" cy="4.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A little pocket calculator and a coin.
  finance: (
    <>
      <rect x="3.4" y="4" width="11" height="16" rx="2" />
      <path d="M5.6 6.6h6.6" />
      <circle cx="6.4" cy="12.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11.6" cy="12.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="6.4" cy="16" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="9" cy="16" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="11.6" cy="16" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="18.6" cy="17" r="3.4" />
      <path d="M17.2 17h2.8" />
    </>
  ),
  // Globe with a franked stamp in the corner: borders and post.
  geopolitics: (
    <>
      <circle cx="9.6" cy="13.6" r="6.8" />
      <path d="M2.8 13.6h13.6" />
      <path d="M9.6 6.8a10 10 0 0 1 0 13.6 10 10 0 0 1 0-13.6z" />
      <rect x="14.4" y="2.8" width="6.8" height="5.4" rx="0.9" />
      <path d="M15.9 4.6h3.8M15.9 6.4h2.3" />
    </>
  ),
  // A posted postcard: stamp in the corner, postmark, two address lines.
  history: (
    <>
      <rect x="3" y="6" width="18" height="12.5" rx="1.5" />
      <rect x="15.5" y="8" width="4" height="3.5" rx="0.5" />
      <path d="M6 9.5h6.5M6 12.5h6.5M6 15.5h4" />
      <path d="M14.5 15.5c1-1.2 2.5-1.2 3.5 0" />
    </>
  ),
  // Archival subjects: a plain dispatch sheet, folded once. No charm.
  ww1: (
    <>
      <path d="M5 3.8h14v16.4H5z" />
      <path d="M5 12h14" />
      <path d="M7.6 7h8.8M7.6 9.4h6" />
    </>
  ),
  // Archival subjects: a folded map fragment. No charm.
  ww2: (
    <>
      <path d="M3.6 6.4 9.2 4.6l5.6 1.8 5.6-1.8v13l-5.6 1.8-5.6-1.8-5.6 1.8z" />
      <path d="M9.2 4.6v13M14.8 6.4v13" />
    </>
  ),
  // A page with a turned corner and a question mark: the general-knowledge tab.
  general: (
    <>
      <path d="M4.8 3.8h9.4l4.8 4.8v11.6H4.8z" />
      <path d="M14.2 3.8v4.8H19" />
      <path d="M9.4 12.4c0-1.4 1.2-2.4 2.6-2.4s2.6 1 2.6 2.4c0 1.7-2.6 1.8-2.6 3.5" />
      <circle cx="12" cy="18" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // An exclamation stamp with a star charm: did you know?
  funfacts: (
    <>
      <circle cx="10.6" cy="12.4" r="7.6" />
      <path d="M10.6 8v5.4" />
      <circle cx="10.6" cy="16.8" r="0.95" fill="currentColor" stroke="none" />
      <path d="M19.6 3.4l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" />
    </>
  ),
  // A small temple under a crescent moon.
  mythology: (
    <>
      <path d="M2.6 11 10.4 6.8l7.8 4.2" />
      <path d="M3.4 11h14" />
      <path d="M5.4 12.6v4.6M10.4 12.6v4.6M15.4 12.6v4.6" />
      <path d="M3.6 17.2h13.6M2.4 19.6h16" />
      <path d="M22 2.6c-3.4.8-3.4 5.2 0 6-2-1-2-5 0-6z" />
    </>
  ),
  // A fluted column with a laurel sprig.
  greek: (
    <>
      <path d="M5.6 5h8.8" />
      <path d="M7 5v13M12.6 5v13" />
      <path d="M9.8 7.4v8.4" />
      <path d="M5 18h10.2" />
      <path d="M17.2 18c2.4-1.7 4.2-5.1 4.4-8.8" />
      <path d="M18.4 13.6c-1.2.4-1.6 1.6-1 2.6 1.2-.4 1.6-1.6 1-2.6z" />
      <path d="M20.1 10c-1.2.4-1.6 1.6-1 2.6 1.2-.4 1.6-1.6 1-2.6z" />
    </>
  ),
  // A papyrus sheet on its rollers with a decorative band, and a star.
  // Border shapes only — no invented glyphs.
  egyptian: (
    <>
      <path d="M6.2 5.4c1.7-1.6 9.7-1.6 11.4 0" />
      <path d="M6.2 18.6c1.7 1.6 9.7 1.6 11.4 0" />
      <path d="M7.6 5.2v13.6M16.2 5.2v13.6" />
      <path d="M7.6 10h8.6M7.6 13h8.6" />
      <path d="M9.2 11.5h1.3M11.2 11.5h1.3M13.2 11.5h1.3" />
      <path d="M20.6 15.2l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7z" />
    </>
  ),
  // A cassette with two reels and a tape run.
  music: (
    <>
      <rect x="2.8" y="5.6" width="18.4" height="12.8" rx="2.2" />
      <path d="M6 9.2h12" />
      <circle cx="9.2" cy="13.2" r="1.8" />
      <circle cx="14.8" cy="13.2" r="1.8" />
      <path d="M11.2 13.2h2.4" />
      <circle cx="4.9" cy="16.6" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  // A closed book with a ribbon bookmark hanging out of it.
  books: (
    <>
      <path d="M5.4 3.8h11.4a1.8 1.8 0 0 1 1.8 1.8v14.6H7.2a1.8 1.8 0 0 1-1.8-1.8z" />
      <path d="M7.2 3.8v16.4" />
      <path d="M13 3.8v7.6l2-1.6 2 1.6V3.8" />
      <circle cx="10.2" cy="17.2" r="0.85" fill="currentColor" stroke="none" />
    </>
  ),
  // A pressed flower against the red margin rule of a page.
  literature: (
    <>
      <path d="M4.4 3.4v17.2" />
      <circle cx="14" cy="8.6" r="1.5" />
      <circle cx="17" cy="11" r="1.5" />
      <circle cx="14" cy="13.4" r="1.5" />
      <circle cx="11" cy="11" r="1.5" />
      <circle cx="14" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <path d="M14 14.9v5.2" />
      <path d="M14 17.6c1.7 0 2.7-1 2.9-2.3" />
    </>
  ),
  // Ticket stub.
  movies: (
    <>
      <path d="M4 8.5h16v3a2.5 2.5 0 0 0 0 5v3H4v-3a2.5 2.5 0 0 0 0-5z" />
      <path d="M12 9.5v9" strokeDasharray="2 2" />
    </>
  ),
  // D-pad with a pixel corner.
  games: (
    <>
      <path d="M9.6 4h4.8v5.6H20v4.8h-5.6V20H9.6v-5.6H4V9.6h5.6z" />
      <path d="M17.6 17.6h2v2h-2z" fill="currentColor" stroke="none" />
    </>
  ),
  // A beaded friendship bracelet with a star charm. Generic craft object.
  taylor: (
    <>
      <circle cx="11.4" cy="12.4" r="7" />
      <rect x="9.4" y="3.4" width="4" height="4" rx="0.9" />
      <rect x="2.4" y="10.4" width="4" height="4" rx="0.9" />
      <path d="M20.2 4l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" />
    </>
  ),
  // A generic concert ticket with a tear line, and a small heart.
  onedirection: (
    <>
      <rect x="2.6" y="7.6" width="18.8" height="9.2" rx="1.6" />
      <path d="M15.4 7.6v9.2" strokeDasharray="2 2" />
      <circle cx="5.6" cy="12.2" r="1.1" />
      <path d="M19.4 6c-1.3-1-2.1-1.8-2.1-2.7 0-.7.6-1.2 1.3-1.2.4 0 .7.2.8.4.1-.2.4-.4.8-.4.7 0 1.3.5 1.3 1.2 0 .9-.8 1.7-2.1 2.7z" />
    </>
  ),
  // A little handheld computer with an antenna blip.
  technology: (
    <>
      <rect x="3.6" y="6.4" width="14.8" height="11.2" rx="1.8" />
      <path d="M6.2 9h9.6M6.2 12h6.4" />
      <path d="M8.4 20.6h7.6" />
      <circle cx="21" cy="5.4" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // Ringed planet with one small star.
  space: (
    <>
      <circle cx="11" cy="12" r="6" />
      <path d="M3.4 15.4c4.6 2.2 12 2.2 16.6 0" />
      <path d="M19.8 3l.7 1.6 1.7.3-1.2 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.2-1.2 1.7-.3z" />
    </>
  ),
  // A speech tag beside a dictionary card.
  language: (
    <>
      <path d="M3.4 5.4h11.2v8.4H8l-4.6 3.4v-3.4H3.4z" />
      <path d="M6 8.4h6M6 11h4" />
      <path d="M17 9.4h3.6v11H17z" />
      <path d="M17 12.6h3.6" />
    </>
  ),
  // A cat-ish face outline with a whisker and a paw dot.
  animals: (
    <>
      <path d="M5.4 9.6 4.6 4.8l4.2 2.4a8.6 8.6 0 0 1 6.4 0l4.2-2.4-.8 4.8" />
      <path d="M19.6 9.6a7.6 7.6 0 1 1-15.2 0" />
      <circle cx="9.4" cy="12.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="12.4" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 15.2v1M10.2 16.6c1.2.9 2.4.9 3.6 0" />
    </>
  ),
  // A cupcake in its wrapper with a cherry.
  food: (
    <>
      <path d="M5.4 12.6h13.2l-1.6 7.6H7z" />
      <path d="M6.4 12.6a5.6 5.6 0 0 1 11.2 0" />
      <path d="M12 5.4v2.4" />
      <circle cx="12" cy="4.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  // A painter's palette with a thumb hole and one paint blob.
  art: (
    <>
      <path d="M12 3.6c4.9 0 8.8 3.5 8.8 7.8 0 2.5-2 3.3-3.4 3.3h-1.6c-1.2 0-2.1.9-2.1 2 0 1.4 1 1.7 1 2.9 0 .9-.8 1.6-2.1 1.6-4.9 0-8.8-3.9-8.8-8.8S7.1 3.6 12 3.6z" />
      <circle cx="8.2" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.4" cy="7.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="9.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // A chat window with a cursor arrow: the shape of an old forum post.
  internet: (
    <>
      <rect x="3.2" y="4.6" width="14.6" height="11" rx="1.8" />
      <path d="M3.2 8h14.6" />
      <path d="M6 11h8M6 13.2h5" />
      <path d="M15.4 14.6 21 20.2l-1.8.6-.9 1.6-2.9-7.8z" />
    </>
  ),
  // A flip phone with a heart charm dangling: the 2000s.
  y2k: (
    <>
      <rect x="6.4" y="2.8" width="9" height="8.4" rx="1.4" />
      <rect x="6.4" y="12" width="9" height="9.2" rx="1.4" />
      <path d="M8.6 5.4h4.6" />
      <path d="M8.8 14.6h1.4M11.6 14.6H13M8.8 17.2h1.4M11.6 17.2H13" />
      <path d="M19.6 8.8c-1.2-1-1.9-1.7-1.9-2.5 0-.7.5-1.1 1.2-1.1.3 0 .6.2.7.4.1-.2.4-.4.7-.4.7 0 1.2.4 1.2 1.1 0 .8-.7 1.5-1.9 2.5z" />
    </>
  ),
  // A zellij star tile with a mint-tea glass beside it. Objects only.
  morocco: (
    <>
      <path d="M9 3.6l1.9 3.1 3.1-1.9-1.9 3.1 3.1 1.9-3.1 1.9 1.9 3.1-3.1-1.9L9 15.9l-1.9-3.1-3.1 1.9 1.9-3.1-3.1-1.9 3.1-1.9-1.9-3.1 3.1 1.9z" />
      <path d="M16.6 12.6h4.8l-.8 8h-3.2z" />
      <path d="M17.2 15.6h3.6" />
    </>
  ),
  // A carved wooden door arch with a lantern. Architectural, not political.
  arabworld: (
    <>
      <path d="M5.6 20.4V10.6a4.8 4.8 0 0 1 9.6 0v9.8z" />
      <path d="M10.4 10.6v9.8" />
      <path d="M4.2 20.4h12.4" />
      <path d="M19.4 5.6h2.4M20.6 5.6v1.6" />
      <path d="M18.8 7.2h3.6l-.6 4.4h-2.4z" />
    </>
  ),
  // A croissant on a café saucer.
  frenchculture: (
    <>
      <path d="M4.2 13.6c1.4-4.8 5.4-7.4 9.4-6.8 2.8.4 4.4 2.6 4 4.8-.4 2.2-2.6 3.2-4.4 2.4" />
      <path d="M7.4 11.2l1.6 2.4M10.8 9.6l1.4 2.6M14 9.2l.8 2.6" />
      <path d="M3 17.6h18" />
      <circle cx="19.6" cy="5.2" r="1" fill="currentColor" stroke="none" />
    </>
  ),
};

export function SubjectMotif({
  subject,
  className = "size-8",
}: {
  subject: string;
  className?: string;
}) {
  const motif = MOTIFS[isSubjectTheme(subject) ? subject : FALLBACK_THEME];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`pointer-events-none ${className}`}
    >
      {motif}
    </svg>
  );
}

/**
 * Tiny repeating doodles per subject, drawn on a 132×132 tile: one mark near the
 * top-leading corner and one small companion near the bottom-trailing one, so
 * the repeat never forms a grid of identical stamps.
 */
const FIELD_PATHS: Record<SubjectTheme, string> = {
  biology:
    "<path d='M20 34c-6-4.5-6-11 0-15 6 4.5 6 11 0 15zM20 19v15' /><circle cx='72' cy='78' r='5'/><path d='M64 96c4-6 12-6 16 0' />",
  psychology:
    "<path d='M22 28s-6-4-6-8c0-2.2 1.6-3.6 3.4-3.6 1.2 0 2.1.7 2.6 1.6.5-.9 1.4-1.6 2.6-1.6 1.8 0 3.4 1.4 3.4 3.6 0 4-6 8-6 8z'/><path d='M62 74l4 4M66 74l-4 4'/><circle cx='90' cy='30' r='3'/>",
  chemistry:
    "<path d='M14 14h8M16 14v6l-4 8h12l-4-8v-6'/><circle cx='74' cy='80' r='4'/><circle cx='86' cy='68' r='2.5'/>",
  geology:
    "<path d='M22 10 30 19 26 33h-8L14 19z'/><path d='M14 19h16'/><path d='M70 82h22M74 90h16'/>",
  geography:
    "<circle cx='24' cy='24' r='11'/><path d='M13 24h22'/><path d='M24 13a15 15 0 0 1 0 22 15 15 0 0 1 0-22z'/><circle cx='84' cy='84' r='4'/>",
  finance:
    "<rect x='12' y='10' width='18' height='24' rx='3'/><path d='M16 15h10'/><circle cx='19' cy='25' r='2'/><circle cx='26' cy='25' r='2'/><circle cx='82' cy='82' r='7'/><path d='M78 82h8'/>",
  geopolitics:
    "<circle cx='24' cy='26' r='11'/><path d='M13 26h22'/><path d='M24 15a15 15 0 0 1 0 22 15 15 0 0 1 0-22z'/><rect x='72' y='70' width='18' height='14' rx='2'/><path d='M76 75h10M76 79h6'/>",
  history:
    "<rect x='12' y='14' width='20' height='14' rx='2'/><path d='M16 19h8M16 23h6'/><path d='M66 76h20M66 82h14'/><circle cx='92' cy='24' r='4'/>",
  ww1: "<path d='M14 10h20v28H14z'/><path d='M14 24h20'/><path d='M19 15h10M19 19h7'/><path d='M72 76h22M72 84h16'/>",
  ww2: "<path d='M12 16 22 12l10 4 10-4v24l-10 4-10-4-10 4z'/><path d='M22 12v24M32 16v24'/><path d='M74 80h20'/>",
  general:
    "<path d='M14 10h14l6 6v20H14z'/><path d='M28 10v6h6'/><path d='M21 21c0-2 1.6-3.4 3.5-3.4S28 19 28 21c0 2.4-3.5 2.6-3.5 5'/><circle cx='82' cy='82' r='4'/>",
  funfacts:
    "<circle cx='24' cy='24' r='11'/><path d='M24 17v8'/><circle cx='24' cy='30' r='1.6'/><path d='M84 68l3 6 6 1-4.5 4.5 1 6-5.5-3-5.5 3 1-6L80 75l6-1z'/>",
  mythology:
    "<path d='M12 22 24 14l12 8'/><path d='M15 22v14M24 22v14M33 22v14'/><path d='M11 37h26'/><path d='M90 70a7 7 0 1 0 0 14 8.4 8.4 0 0 1 0-14z'/>",
  greek:
    "<path d='M14 12h16'/><path d='M17 12v22M27 12v22'/><path d='M12 35h22'/><path d='M74 92c4-3 8-9 9-16'/><path d='M77 86c-1-2.5 0-5 3-6M82 78c-.5-2.5.8-4.8 3.6-5.4'/>",
  egyptian:
    "<path d='M18 12h14v26H18z'/><path d='M14 12h22M14 38h22'/><path d='M18 22h14M18 28h14'/><path d='M86 74l2 4 4 2-4 2-2 4-2-4-4-2 4-2z'/>",
  music:
    "<rect x='10' y='14' width='28' height='19' rx='3'/><path d='M15 20h18'/><circle cx='19' cy='27' r='2.6'/><circle cx='29' cy='27' r='2.6'/><circle cx='84' cy='82' r='4'/>",
  books:
    "<path d='M14 12h18a3 3 0 0 1 3 3v22H17a3 3 0 0 1-3-3z'/><path d='M17 12v25'/><path d='M26 12v11l3-2.4 3 2.4V12'/><circle cx='82' cy='82' r='4'/>",
  literature:
    "<path d='M10 8v36'/><circle cx='26' cy='18' r='3'/><circle cx='32' cy='24' r='3'/><circle cx='26' cy='30' r='3'/><circle cx='20' cy='24' r='3'/><path d='M26 34v8'/><circle cx='86' cy='84' r='4'/>",
  movies:
    "<path d='M10 16h20v4a3 3 0 0 0 0 6v4H10v-4a3 3 0 0 0 0-6z'/><circle cx='76' cy='78' r='4'/><path d='M88 30h8v10h-8z'/>",
  games:
    "<path d='M16 10h6v6h6v6h-6v6h-6v-6h-6v-6h6z'/><path d='M74 74h6v6h-6z'/><path d='M96 40l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5z'/>",
  taylor:
    "<circle cx='24' cy='24' r='10'/><rect x='21' y='11' width='6' height='6' rx='1.5'/><rect x='11' y='21' width='6' height='6' rx='1.5'/><path d='M86 72l2.5 5 5 .8-3.6 3.6.8 5-4.7-2.5-4.7 2.5.8-5-3.6-3.6 5-.8z'/>",
  onedirection:
    "<rect x='10' y='16' width='30' height='16' rx='3'/><path d='M30 16v16' stroke-dasharray='3 3'/><circle cx='16' cy='24' r='2'/><path d='M86 88c-4-3-6.5-5.6-6.5-8.4 0-2.2 1.8-3.6 3.6-3.6 1.2 0 2.2.6 2.9 1.5.7-.9 1.7-1.5 2.9-1.5 1.8 0 3.6 1.4 3.6 3.6 0 2.8-2.5 5.4-6.5 8.4z'/>",
  technology:
    "<rect x='10' y='14' width='24' height='18' rx='3'/><path d='M15 20h14M15 25h9'/><path d='M18 36h12'/><circle cx='86' cy='80' r='4'/>",
  space:
    "<circle cx='24' cy='22' r='9'/><path d='M11 27c7.5 3.6 18.5 3.6 26 0'/><path d='M86 74l2.5 5 5 .8-3.6 3.6.8 5-4.7-2.5-4.7 2.5.8-5-3.6-3.6 5-.8z'/>",
  language:
    "<path d='M10 12h18v13h-10l-8 5v-5h-0z'/><path d='M14 17h10M14 21h7'/><path d='M76 72h10v18H76z'/><path d='M76 79h10'/>",
  animals:
    "<path d='M14 20l-1-7 6 3.4a13 13 0 0 1 9 0L34 13l-1 7'/><path d='M33 20a9.5 9.5 0 1 1-19 0'/><circle cx='20' cy='23' r='1.6'/><circle cx='27' cy='23' r='1.6'/><path d='M80 80c2 3 6 3 8 0'/>",
  food:
    "<path d='M12 22h18l-2 12H14z'/><path d='M13 22a8 8 0 0 1 16 0'/><circle cx='21' cy='13' r='2'/><circle cx='84' cy='82' r='4'/>",
  art: "<path d='M24 10c7 0 12.5 5 12.5 11S31 32 29 32h-2a3 3 0 0 0-3 3c0 2 1.5 2.4 1.5 4 0 1.3-1.2 2.3-3 2.3C15.5 41.3 10 35 10 27S17 10 24 10z'/><circle cx='19' cy='20' r='1.8'/><circle cx='26' cy='17' r='1.8'/><path d='M80 78h14'/>",
  internet:
    "<rect x='10' y='12' width='24' height='18' rx='3'/><path d='M10 18h24'/><path d='M14 22h12M14 26h8'/><path d='M78 72l12 12-4 1.2-2 3.4z'/>",
  y2k: "<rect x='16' y='8' width='14' height='13' rx='2'/><rect x='16' y='23' width='14' height='15' rx='2'/><path d='M19 27h3M25 27h3M19 32h3M25 32h3'/><path d='M86 88c-4-3-6.5-5.6-6.5-8.4 0-2.2 1.8-3.6 3.6-3.6 1.2 0 2.2.6 2.9 1.5.7-.9 1.7-1.5 2.9-1.5 1.8 0 3.6 1.4 3.6 3.6 0 2.8-2.5 5.4-6.5 8.4z'/>",
  morocco:
    "<path d='M24 8l3.4 5.6 5.6-3.4-3.4 5.6 5.6 3.4-5.6 3.4 3.4 5.6-5.6-3.4L24 30l-3.4-5.6-5.6 3.4 3.4-5.6-5.6-3.4 5.6-3.4-3.4-5.6 5.6 3.4z'/><path d='M78 74h10l-1.6 14h-6.8z'/><path d='M79 80h8'/>",
  arabworld:
    "<path d='M14 38V24a8 8 0 0 1 16 0v14z'/><path d='M22 24v14'/><path d='M11 38h22'/><path d='M82 74h8l-1.4 10h-5.2z'/><path d='M84 71h4'/>",
  frenchculture:
    "<path d='M11 26c2.4-8 9-12.4 15.6-11.4 4.6.7 7.4 4.4 6.7 8-.7 3.7-4.4 5.4-7.4 4'/><path d='M16 22l2.6 4M22 19l2.4 4.4M27 18l1.4 4.4'/><path d='M9 33h30'/><circle cx='86' cy='82' r='4'/>",
};

/**
 * The faint motif field. Sits behind the page, never behind the grid or text —
 * capped at 7% opacity by the `.motif-field` class, and suppressed entirely
 * under `[data-tone="archival"]` and in high-contrast mode.
 */
export function MotifField({ subject }: { subject: string }) {
  const paths = FIELD_PATHS[isSubjectTheme(subject) ? subject : FALLBACK_THEME];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='132' height='132' viewBox='0 0 132 132' fill='none' stroke='#000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${paths}</svg>`;
  return (
    <div
      aria-hidden
      className="motif-field pointer-events-none absolute inset-0 -z-10"
      style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` }}
    />
  );
}
