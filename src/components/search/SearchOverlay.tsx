"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { IconSearch } from "@/components/ui/Icons";
import { SubjectMotif } from "@/components/ui/SubjectMotif";
import { subjectThemeAttrs } from "@/lib/subject-theme";
import type { SearchHit } from "@/app/api/search/route";

interface Group {
  key: string;
  hits: SearchHit[];
}

const GROUP_LABEL: Record<string, string> = {
  subjects: "groupSubjects",
  collections: "groupCollections",
  puzzles: "groupPuzzles",
  rooms: "groupRooms",
  creators: "groupCreators",
  playground: "groupPlayground",
};

/**
 * Search is an overlay, not a destination — see docs/information-architecture.md.
 * It opens from the header button, ⌘K / Ctrl-K, or "/" when focus is not already
 * in a text field, and it returns results from everywhere at once.
 *
 * Only groups the API actually returned are rendered, so an empty feature never
 * shows an empty shelf.
 */
export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const flat = groups.flatMap((g) => g.hits);

  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setCursor(0);
      // The dialog animates in; focusing on the next frame avoids the scroll
      // jump some browsers make when focusing a not-yet-painted element.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&locale=${locale}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { groups: Group[] };
        setGroups(data.groups);
        setCursor(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setGroups([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, locale, open]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  if (!open) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
    } else if (event.key === "Enter" && flat[cursor]) {
      event.preventDefault();
      go(flat[cursor].href);
    }
  };

  let index = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/35 p-4 pt-[8vh] backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("overlayTitle")}
        onKeyDown={onKeyDown}
        className="w-full max-w-xl rounded-[20px] border-2 border-line bg-paper-bright shadow-[var(--shadow-window)]"
      >
        <div className="flex items-center gap-2.5 border-b-2 border-line px-4 py-3">
          <IconSearch className="size-5 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 rounded-full border-2 border-line px-3 text-xs font-semibold text-ink-soft hover:bg-paper-sunken"
          >
            Esc
          </button>
        </div>

        <div id={listId} className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-faint">{t("typing")}</p>
          ) : loading && groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-faint">{t("searching")}</p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-soft">
              {t("noResults", { query: query.trim() })}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="mb-1">
                <h2 className="label-caps px-3 pb-1 pt-2 text-ink-faint">
                  {t(GROUP_LABEL[group.key] ?? "groupPuzzles")}
                </h2>
                <ul>
                  {group.hits.map((hit) => {
                    index += 1;
                    const active = index === cursor;
                    const position = index;
                    return (
                      <li key={hit.id}>
                        <Link
                          href={hit.href}
                          onClick={onClose}
                          onMouseEnter={() => setCursor(position)}
                          aria-current={active ? "true" : undefined}
                          {...(hit.subject ? subjectThemeAttrs(hit.subject) : {})}
                          className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 ${
                            active ? "bg-paper-sunken" : ""
                          }`}
                        >
                          {hit.subject ? (
                            <SubjectMotif
                              subject={hit.subject}
                              className="size-5 shrink-0 text-[var(--accent)]"
                            />
                          ) : (
                            <span className="size-5 shrink-0" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">
                              {hit.label}
                            </span>
                            {hit.sublabel ? (
                              <span className="block truncate text-xs text-ink-faint">
                                {hit.sublabel}
                              </span>
                            ) : null}
                          </span>
                          {hit.badge ? (
                            <span className="label-caps shrink-0 text-ink-faint">
                              {hit.badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
