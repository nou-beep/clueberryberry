import type { AttemptGridState, Grid } from "./types";

export interface ShareInput {
  appName: string;
  title: string;
  subjectName: string;
  language: string;
  difficultyLabel: string;
  timeLabel: string | null; // null when the timer is disabled
  hintsUsed: number;
  hintsLabel: string;
  noHintsLabel: string;
  grid: Grid;
  state: AttemptGridState;
  url?: string;
}

/**
 * Plain-text share result. Abstract squares only — never letters:
 * ⬛ block, 🟩 solved unaided, 🟨 solved with reveal/check help.
 * Wide grids are sampled down so the card stays postable.
 */
export function shareText(input: ShareInput): string {
  const { grid, state } = input;
  const rows: string[] = [];
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const maxCols = 11;
  const step = width > maxCols ? width / maxCols : 1;

  for (let r = 0; r < height; r += step > 1 ? step : 1) {
    const ri = Math.floor(r);
    let line = "";
    for (let x = 0; x < Math.min(width, maxCols); x++) {
      const ci = Math.floor(x * step);
      if (grid[ri][ci] === null) {
        line += "⬛";
      } else {
        const flags = state.cells[ri][ci].flags;
        line += flags.includes("revealed") || flags.includes("checked-wrong") ? "🟨" : "🟩";
      }
    }
    rows.push(line);
  }

  const hints =
    input.hintsUsed > 0
      ? `${input.hintsUsed} ${input.hintsLabel}`
      : input.noHintsLabel;
  const meta = [input.subjectName, input.difficultyLabel, input.language.toUpperCase()]
    .filter(Boolean)
    .join(" · ");
  const stats = [input.timeLabel, hints].filter(Boolean).join(" · ");

  return [
    `${input.appName} — ${input.title}`,
    meta,
    stats,
    "",
    rows.join("\n"),
    input.url ?? "",
  ]
    .filter((l, i) => l !== "" || i === 3)
    .join("\n");
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
