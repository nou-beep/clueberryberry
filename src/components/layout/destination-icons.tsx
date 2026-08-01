import {
  IconGrid,
  IconHome,
  IconPerson,
  IconRooms,
  IconWand,
} from "@/components/ui/Icons";

/**
 * The drawing half of `destinations.ts`, kept separate so that module stays
 * plain data. Keyed by destination key, so a destination without an icon is a
 * compile error the moment it is rendered.
 */
export const DESTINATION_ICONS: Record<
  string,
  (props: { className?: string; size?: number }) => React.ReactElement
> = {
  home: IconHome,
  puzzles: IconGrid,
  playground: IconWand,
  rooms: IconRooms,
  profile: IconPerson,
};
