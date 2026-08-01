import type { Entry, FactCard, Puzzle, Subject, Topic } from "@prisma/client";
import type {
  ClueStyle,
  Difficulty,
  Direction,
  EntryDef,
  Grid,
  NormalizationRules,
  PuzzleLanguage,
  PuzzleStatus,
} from "@/lib/crossword/types";

/** Localized string bags are stored as JSON strings for SQLite portability. */
export type Localized = Partial<Record<"en" | "fr" | "ar", string>>;

export function parseLocalized(json: string): Localized {
  try {
    return JSON.parse(json) as Localized;
  } catch {
    return {};
  }
}

export function pickLocalized(json: string, locale: string): string {
  const bag = parseLocalized(json);
  return bag[locale as keyof Localized] ?? bag.en ?? Object.values(bag)[0] ?? "";
}

export interface PuzzleWithRelations extends Puzzle {
  entries: Entry[];
  subject: Subject;
  topic: Topic;
  factCards: FactCard[];
}

/** Client-safe puzzle payload used by the play screen and editor preview. */
export interface PlayablePuzzle {
  id: string;
  slug: string;
  title: string;
  language: PuzzleLanguage;
  subjectSlug: string;
  subjectName: string;
  subjectTheme: string;
  topicSlug: string;
  topicName: string;
  difficulty: Difficulty;
  width: number;
  height: number;
  grid: Grid;
  entries: EntryDef[];
  author: string;
  introduction: string | null;
  completionMessage: string | null;
  estimatedSolveTime: number | null;
  normalization: Partial<NormalizationRules> | undefined;
  status: PuzzleStatus;
  factCards: Array<{
    text: string;
    sourceTitle: string | null;
    sourceUrl: string | null;
    reviewStatus: string;
  }>;
}

export function toPlayablePuzzle(
  p: PuzzleWithRelations,
  locale: string
): PlayablePuzzle {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    language: p.language as PuzzleLanguage,
    subjectSlug: p.subject.slug,
    subjectName: pickLocalized(p.subject.names, locale),
    subjectTheme: p.subject.theme,
    topicSlug: p.topic.slug,
    topicName: pickLocalized(p.topic.names, locale),
    difficulty: p.difficulty as Difficulty,
    width: p.gridWidth,
    height: p.gridHeight,
    grid: JSON.parse(p.gridData) as Grid,
    entries: p.entries
      .sort((a, b) => a.number - b.number)
      .map((e) => ({
        number: e.number,
        direction: e.direction as Direction,
        row: e.row,
        column: e.column,
        answer: e.answer,
        clue: e.clue,
        clueStyle: e.clueStyle as ClueStyle,
        acceptedAlternatives: JSON.parse(e.acceptedAlternatives) as string[],
        explanation: e.explanation ?? undefined,
        isThemeEntry: e.isThemeEntry,
      })),
    author: p.author,
    introduction: p.introduction,
    completionMessage: p.completionMessage,
    estimatedSolveTime: p.estimatedSolveTime,
    normalization: p.normalization
      ? (JSON.parse(p.normalization) as Partial<NormalizationRules>)
      : undefined,
    status: p.status as PuzzleStatus,
    factCards: p.factCards
      .sort((a, b) => a.order - b.order)
      .map((f) => ({
        text: f.text,
        sourceTitle: f.sourceTitle,
        sourceUrl: f.sourceUrl,
        reviewStatus: f.reviewStatus,
      })),
  };
}
