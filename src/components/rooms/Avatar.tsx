import { participantColor } from "@/lib/multiplayer/room";

interface Props {
  name: string;
  colorIndex: number;
  size?: number;
  online?: boolean;
  title?: string;
}

/** First grapheme of the name, so Arabic and emoji names work too. */
function initial(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

/**
 * A drawn initial disc in the participant's cursor colour — the same colour
 * that marks their square on the grid, so the two read as one person.
 */
export function Avatar({ name, colorIndex, size = 28, online = true, title }: Props) {
  const color = participantColor(colorIndex);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-line font-sans font-bold text-paper-bright"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.round(size * 0.42),
        opacity: online ? 1 : 0.45,
      }}
      title={title ?? name}
      aria-hidden
    >
      {initial(name)}
    </span>
  );
}
