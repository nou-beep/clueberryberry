"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { IconChevron } from "@/components/ui/Icons";
import type { LibraryFacets } from "@/lib/db/queries";

/**
 * The library filter bar.
 *
 * Every control writes to the URL and the page re-renders on the server, so a
 * filtered view is a link you can send someone. Only options the database can
 * actually satisfy are offered — the facets come from a real count, and a
 * dimension with a single value is not rendered as a filter at all.
 */

const SELECT =
  "label-caps min-h-11 cursor-pointer appearance-none bg-transparent ps-3 pe-8 text-ink";

function Field({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex items-center rounded-[10px] border-2 border-line bg-paper-sunken">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={SELECT}
      >
        {children}
      </select>
      <IconChevron className="pointer-events-none absolute end-2 size-4 rotate-90 text-ink-faint" />
    </span>
  );
}

export function LibraryFilters({
  facets,
  showStatus = true,
}: {
  facets: LibraryFacets;
  showStatus?: boolean;
}) {
  const t = useTranslations("library");
  const tSubjects = useTranslations("subjects");
  const tDiff = useTranslations("difficulty");
  const tLang = useTranslations("languages");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = (key: string) => params.get(key) ?? "";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "") next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const active = [
    "language",
    "subject",
    "difficulty",
    "size",
    "time",
    "origin",
    "status",
    "sort",
  ].filter((key) => get(key) !== "");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {facets.languages.length > 1 && (
        <Field label={t("filters.language")} value={get("language")} onChange={(v) => set("language", v)}>
          <option value="">{t("filters.allLanguages")}</option>
          {facets.languages.map((code) => (
            <option key={code} value={code}>
              {tLang(code)}
            </option>
          ))}
        </Field>
      )}

      {facets.subjects.length > 1 && (
        <Field label={t("filters.subject")} value={get("subject")} onChange={(v) => set("subject", v)}>
          <option value="">{t("filters.allSubjects")}</option>
          {facets.subjects.map((subject) => (
            <option key={subject.slug} value={subject.slug}>
              {subject.name}
            </option>
          ))}
        </Field>
      )}

      {facets.difficulties.length > 1 && (
        <Field
          label={tSubjects("allDifficulties")}
          value={get("difficulty")}
          onChange={(v) => set("difficulty", v)}
        >
          <option value="">{tSubjects("allDifficulties")}</option>
          {facets.difficulties.map((value) => (
            <option key={value} value={value}>
              {tDiff(value as "easy" | "medium" | "hard")}
            </option>
          ))}
        </Field>
      )}

      {facets.sizes.length > 1 && (
        <Field label={t("filters.size")} value={get("size")} onChange={(v) => set("size", v)}>
          <option value="">{t("filters.allSizes")}</option>
          {facets.sizes.map((value) => (
            <option key={value} value={value}>
              {t(`sizes.${value}`)}
            </option>
          ))}
        </Field>
      )}

      {facets.times.length > 1 && (
        <Field label={t("filters.time")} value={get("time")} onChange={(v) => set("time", v)}>
          <option value="">{t("filters.allTimes")}</option>
          {facets.times.map((value) => (
            <option key={value} value={value}>
              {t(`times.${value}`)}
            </option>
          ))}
        </Field>
      )}

      {/* Origin only appears once there is more than one kind of puzzle to tell
          apart; with an all-official library the control would do nothing. */}
      {facets.origins.length > 1 && (
        <Field label={t("filters.origin")} value={get("origin")} onChange={(v) => set("origin", v)}>
          <option value="">{t("filters.allOrigins")}</option>
          {facets.origins.map((value) => (
            <option key={value} value={value}>
              {t(`origins.${value}`)}
            </option>
          ))}
        </Field>
      )}

      {showStatus && (
        <Field label={t("filters.status")} value={get("status")} onChange={(v) => set("status", v)}>
          <option value="">{tSubjects("all")}</option>
          <option value="completed">{tSubjects("completed")}</option>
          <option value="incomplete">{tSubjects("incomplete")}</option>
        </Field>
      )}

      <Field label={t("filters.sort")} value={get("sort")} onChange={(v) => set("sort", v)}>
        <option value="">{t("sorts.new")}</option>
        <option value="title">{t("sorts.title")}</option>
        {/* Offered only when there are real attempts to rank by. */}
        {facets.popularityAvailable && <option value="popular">{t("sorts.popular")}</option>}
      </Field>

      {active.length > 0 && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="label-caps min-h-11 rounded-full border-2 border-line-soft bg-paper px-3 text-ink-soft hover:text-ink"
        >
          {t("filters.clear", { count: active.length })}
        </button>
      )}
    </div>
  );
}
