"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHead } from "@/components/ui/bits";
import { loadAttempts, type LocalAttempt } from "@/lib/progress/local";

/** "Continue your puzzle" — only renders when local in-progress attempts exist. */
export function ContinueStrip() {
  const t = useTranslations("landing");
  const [inProgress, setInProgress] = useState<LocalAttempt[]>([]);

  useEffect(() => {
    const attempts = Object.values(loadAttempts())
      .filter((a) => a.status === "in_progress" && a.completionPercentage > 0)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 3);
    setInProgress(attempts);
  }, []);

  if (inProgress.length === 0) return null;

  return (
    <section aria-labelledby="continue-title">
      <SectionHead id="continue-title">{t("continue")}</SectionHead>
      <ul className="grid gap-3 sm:grid-cols-3">
        {inProgress.map((a) => (
          <li key={a.puzzleId}>
            <Link
              href={`/play/${a.slug}`}
              data-subject={a.subjectSlug}
              className="group flex min-h-11 items-center justify-between gap-3 rounded-card border-2 border-line bg-paper-sunken p-3 shadow-card transition-transform duration-[180ms] hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="min-w-0">
                <span className="font-display block truncate group-hover:text-accent">
                  {a.title}
                </span>
                {/* the pencil-line progress bar, always paired with the number */}
                <span className="mt-1 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="block h-1.5 w-16 overflow-hidden rounded-full border border-line bg-paper"
                  >
                    <span
                      className="block h-full bg-accent"
                      style={{ width: `${a.completionPercentage}%` }}
                    />
                  </span>
                  <span className="label-caps font-mono text-ink-faint">
                    {a.completionPercentage}%
                  </span>
                </span>
              </span>
              <span className="label-caps shrink-0 rounded-full border-2 border-line bg-butter px-2 py-1 text-ink">
                {t("continueAction")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
