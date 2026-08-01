/**
 * Icon set: 24×24, 1.75px round strokes, one small charm off-center.
 * Icons inherit currentColor and never carry meaning alone.
 * See docs/design-system.md §5.
 */

type IconProps = { className?: string; size?: number };

function Svg({
  children,
  className = "size-5",
  size,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      width={size}
      height={size}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 11l8-6.5 8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
    <path d="M10 20.5v-5h4v5" />
    <circle cx="19" cy="6" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconFlask = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3.5h6M10.5 3.5v5L6 17a2 2 0 0 0 1.8 3h8.4A2 2 0 0 0 18 17l-4.5-8.5v-5" />
    <path d="M7.6 14h8.8" />
    <circle cx="13" cy="17" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconBinder = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12A1.5 1.5 0 0 1 19.5 5v14A1.5 1.5 0 0 1 18 20.5H6z" />
    <path d="M6 3.5A1.5 1.5 0 0 0 4.5 5v14A1.5 1.5 0 0 0 6 20.5" />
    <path d="M4.5 8.5h3M4.5 12h3M4.5 15.5h3" />
  </Svg>
);

export const IconJournal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v13H7.5A2.5 2.5 0 0 1 5 17.5z" />
    <path d="M9 8.5h6M9 12h6M9 15.5h4" />
    <path d="M19 20a2.5 2.5 0 0 1-2.5-2.5" />
  </Svg>
);

export const IconWand = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19l9.5-9.5" />
    <path d="M13 5.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    <path d="M18.5 14.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
  </Svg>
);

export const IconBunnyHead = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="9" cy="6.5" rx="1.8" ry="4" />
    <ellipse cx="15" cy="6.5" rx="1.8" ry="4" />
    <circle cx="12" cy="15" r="5.5" />
    <circle cx="10.2" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="13.8" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    <path d="M11 17.2c.6.6 1.4.6 2 0" />
  </Svg>
);

export const IconGear = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.8l1.9 1.1M17.2 15.1l1.9 1.1M4.9 16.2l1.9-1.1M17.2 8.9l1.9-1.1" />
  </Svg>
);

export const IconArchive = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="4" rx="1.5" />
    <path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9" />
    <path d="M10 13h4" />
  </Svg>
);

export const IconPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 19.5l1-4 10-10 3 3-10 10z" />
    <path d="M14 6.5l3 3" />
    <circle cx="19.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconFloppy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 4v6h8V4" />
    <rect x="8.5" y="13.5" width="7" height="6.5" rx="1" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 13l4.5 4.5L19 7" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.8 12S6 6.5 12 6.5 21.2 12 21.2 12 18 17.5 12 17.5 2.8 12 2.8 12z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconStar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4l2.4 5.2 5.6.7-4.2 3.9 1.1 5.6L12 16.6 7.1 19.4l1.1-5.6L4 9.9l5.6-.7z" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.4 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.4-3.4-8.5S9.7 5.9 12 3.5z" />
  </Svg>
);

export const IconChevron = ({ className = "size-5", flip }: IconProps & { flip?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={className}
    style={flip ? { transform: "scaleX(-1)" } : undefined}
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l4.5 4.5" />
    <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

/** A little crossword grid: the Puzzles tab. */
export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
    <rect x="14.8" y="14.8" width="5.7" height="5.7" fill="currentColor" stroke="none" opacity="0.25" />
  </Svg>
);

/** Two heads side by side: the Rooms tab. Shapes only, no faces. */
export const IconRooms = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8.4" r="3.4" />
    <path d="M3 19.6c0-3.1 2.7-5.2 6-5.2s6 2.1 6 5.2" />
    <path d="M16.4 6.2a3.4 3.4 0 0 1 0 6.6" />
    <path d="M17.6 14.9c2.1.6 3.6 2.4 3.6 4.7" />
  </Svg>
);

/** A stitched avatar badge: the Profile tab. */
export const IconPerson = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.2" r="3.8" />
    <path d="M4.6 20.2c0-3.6 3.3-6.2 7.4-6.2s7.4 2.6 7.4 6.2" />
    <circle cx="19.4" cy="5.2" r="1" fill="currentColor" stroke="none" />
  </Svg>
);
