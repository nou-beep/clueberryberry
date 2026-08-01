"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { sizeBandOf, type PuzzleIndexRow } from "@/lib/db/queries";
import { loadAttempts } from "@/lib/progress/local";
import { NotebookPage, Stamp } from "@/components/ui/bits";
import { IconChevron } from "@/components/ui/Icons";
import { PuzzleCard } from "./PuzzleCard";

interface Props {
  puzzles: PuzzleIndexRow[];
  showLanguageFilter?: boolean;
}

/** Native select inside a 2px-outlined wrapper, per design-system §4. */
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex items-center rounded-[10px] border-2 border-line bg-paper-sunken">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="label-caps min-h-11 cursor-pointer appearance-none bg-transparent ps-3 pe-8 text-ink"
      >
        {children}
      </select>
      <IconChevron className="pointer-events-none absolute end-2 size-4 rotate-90 text-ink-faint" />
    </span>
  );
}

/**
 * Filterable puzzle grid: difficulty, language, grid size, completion.
 *
 * The filters live in the URL, so a filtered shelf is a link someone can send.
 * Completion is the one dimension resolved here rather than on the server:
 * progress lives on the device.
 */
export function PuzzleList({ puzzles, showLanguageFilter = true }: Props) {
  const t = useTranslations("subjects");
  const tDiff = useTranslations("difficulty");
  const tLang = useTranslations("languages");
  const tLib = useTranslations("library");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const read = (key: string) => params.get(key) ?? "all";
  const write = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const difficulty = read("difficulty");
  const language = read("language");
  const status = read("status");
  const size = read("size");
  const setDifficulty = (value: string) => write("difficulty", value);
  const setLanguage = (value: string) => write("language", value);
  const setStatus = (value: string) => write("status", value);
  const setSize = (value: string) => write("size", value);

  useEffect(() => {
    const attempts = loadAttempts();
    setCompleted(
      new Set(
        Object.values(attempts)
          .filter((a) => a.status === "completed")
          .map((a) => a.puzzleId)
      )
    );
  }, []);

  const filtered = useMemo(
    () =>
      puzzles.filter((p) => {
        if (difficulty !== "all" && p.difficulty !== difficulty) return false;
        if (language !== "all" && p.language !== language) return false;
        if (size !== "all" && sizeBandOf(p) !== size) return false;
        if (status === "completed" && !completed.has(p.id)) return false;
        if (status === "incomplete" && completed.has(p.id)) return false;
        return true;
      }),
    [puzzles, difficulty, language, size, status, completed]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          label={t("allDifficulties")}
          value={difficulty}
          onChange={setDifficulty}
        >
          <option value="all">{t("allDifficulties")}</option>
          {(["easy", "medium", "hard"] as const).map((d) => (
            <option key={d} value={d}>
              {tDiff(d)}
            </option>
          ))}
        </FilterSelect>
        {showLanguageFilter && (
          <FilterSelect label={t("allLanguages")} value={language} onChange={setLanguage}>
            <option value="all">{t("allLanguages")}</option>
            {(["en", "fr", "ar"] as const).map((l) => (
              <option key={l} value={l}>
                {tLang(l)}
              </option>
            ))}
          </FilterSelect>
        )}
        <FilterSelect label={tLib("filters.size")} value={size} onChange={setSize}>
          <option value="all">{tLib("filters.allSizes")}</option>
          {(["small", "medium", "large"] as const).map((band) => (
            <option key={band} value={band}>
              {tLib(`sizes.${band}`)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label={t("filterStatus")} value={status} onChange={setStatus}>
          <option value="all">{t("all")}</option>
          <option value="completed">{t("completed")}</option>
          <option value="incomplete">{t("incomplete")}</option>
        </FilterSelect>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-card border-2 border-dashed border-line-soft p-8 text-center text-sm text-ink-faint">
          {t("empty")}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <PuzzleCard puzzle={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface DatedGroup {
  date: string;
  entries: Array<{ language: string; puzzle: PuzzleIndexRow }>;
}

/**
 * Dated rows on a notebook page — the archive. Deliberately calm: one line per
 * edition, and a small stamp on a day whose editions are all finished.
 */
export function DailyArchiveRows({ groups }: { groups: DatedGroup[] }) {
  const tDiff = useTranslations("difficulty");
  const tLang = useTranslations("languages");
  const tResults = useTranslations("results");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const attempts = loadAttempts();
    setCompleted(
      new Set(
        Object.values(attempts)
          .filter((a) => a.status === "completed")
          .map((a) => a.puzzleId)
      )
    );
  }, []);

  return (
    <NotebookPage className="py-4">
      <ol>
        {groups.map((group) => {
          const allDone = group.entries.every((e) => completed.has(e.puzzle.id));
          return (
            <li
              key={group.date}
              className="dotted-rule flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/daily/${group.date}`}
                  className="label-caps font-mono text-accent hover:underline"
                >
                  {group.date}
                </Link>
                {allDone && (
                  <Stamp>{tResults("completedStamp")}</Stamp>
                )}
              </div>
              <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
                {group.entries.map((e) => (
                  <li
                    key={e.language}
                    className="flex min-w-0 items-baseline gap-2 text-sm"
                  >
                    <span className="label-caps shrink-0 text-ink-faint">
                      {tLang(e.language)}
                    </span>
                    <Link
                      href={`/play/${e.puzzle.slug}`}
                      className="truncate font-medium hover:text-accent"
                    >
                      {e.puzzle.title}
                    </Link>
                    {completed.has(e.puzzle.id) && (
                      <span className="shrink-0 text-correct" title={tResults("completedStamp")}>
                        ✓
                      </span>
                    )}
                    <span className="label-caps ms-auto shrink-0 text-ink-faint">
                      {tDiff(e.puzzle.difficulty)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </NotebookPage>
  );
}
