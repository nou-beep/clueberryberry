"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { PuzzleIndexRow } from "@/lib/db/queries";
import { loadAttempts } from "@/lib/progress/local";
import { PuzzleCard } from "./PuzzleCard";

/**
 * Server-filtered rows, with the one filter the server cannot answer applied
 * here: whether *this* player has finished a puzzle. Progress lives on the
 * device, so completion is read from local storage — the value still travels in
 * the URL, so a filtered view stays linkable.
 */
export function FilteredPuzzleGrid({
  rows,
  status,
  emptyMessage,
}: {
  rows: PuzzleIndexRow[];
  status?: string;
  emptyMessage?: string;
}) {
  const t = useTranslations("subjects");
  const [completed, setCompleted] = useState<Set<string> | null>(null);

  useEffect(() => {
    const attempts = loadAttempts();
    setCompleted(
      new Set(
        Object.values(attempts)
          .filter((attempt) => attempt.status === "completed")
          .map((attempt) => attempt.puzzleId)
      )
    );
  }, []);

  const filtered = useMemo(() => {
    if (!status || completed === null) return rows;
    if (status === "completed") return rows.filter((row) => completed.has(row.id));
    if (status === "incomplete") return rows.filter((row) => !completed.has(row.id));
    return rows;
  }, [rows, status, completed]);

  if (filtered.length === 0) {
    return (
      <p className="rounded-card border-2 border-dashed border-line-soft p-8 text-center text-sm text-ink-faint">
        {emptyMessage ?? t("empty")}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((row) => (
        <li key={row.id}>
          <PuzzleCard puzzle={row} />
        </li>
      ))}
    </ul>
  );
}
