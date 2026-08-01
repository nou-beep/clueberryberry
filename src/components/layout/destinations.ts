/**
 * The whole navigation. Five destinations, one question each — see
 * docs/information-architecture.md. Adding a sixth is a design change, not a
 * code change: everything else belongs *inside* one of these.
 *
 * Icons live with the components that draw them (`DESTINATION_ICONS`), so this
 * module stays plain data and can be tested without a JSX transform.
 *
 * `owns` lists the route prefixes that highlight the tab, so detail pages
 * (a subject, a collection, a room) keep the player oriented instead of
 * clearing the whole bar.
 */
export interface Destination {
  href: string;
  /** Key under `nav` in the message catalogue. */
  key: string;
  /** The colored index strip on the binder tab. */
  tone: string;
  owns: string[];
}

export const DESTINATIONS: Destination[] = [
  { href: "/", key: "home", tone: "bg-pink", owns: [] },
  {
    href: "/puzzles",
    key: "puzzles",
    tone: "bg-butter",
    owns: ["/puzzles", "/subjects", "/collections", "/daily", "/archive", "/play"],
  },
  {
    href: "/playground",
    key: "playground",
    tone: "bg-lavender",
    owns: ["/playground", "/editor"],
  },
  { href: "/rooms", key: "rooms", tone: "bg-mint", owns: ["/rooms"] },
  {
    href: "/profile",
    key: "profile",
    tone: "bg-peach",
    owns: ["/profile", "/journal", "/settings", "/progress", "/account"],
  },
];

/** Which tab a pathname belongs to. Home only matches exactly. */
export function activeDestination(pathname: string): Destination | undefined {
  if (pathname === "/") return DESTINATIONS[0];
  return DESTINATIONS.find((d) =>
    [d.href, ...d.owns].some(
      (prefix) =>
        prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`))
    )
  );
}
