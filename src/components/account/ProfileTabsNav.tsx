import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Sections of the personal hub. Journal, Settings and the old Progress page
 * are sections here rather than top-level destinations
 * (docs/information-architecture.md).
 */
export const PROFILE_TABS = ["desk", "journal", "settings"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

export function asProfileTab(value: string | undefined): ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "desk";
}

export async function ProfileTabsNav({
  active,
  locale,
}: {
  active: ProfileTab;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "profile" });

  return (
    <nav aria-label={t("sections")} className="mt-3">
      <ul className="flex flex-wrap gap-2">
        {PROFILE_TABS.map((tab) => {
          const current = tab === active;
          return (
            <li key={tab}>
              <Link
                href={{ pathname: "/profile", query: tab === "desk" ? {} : { tab } }}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-xl border-2 px-3.5 text-[14px] font-semibold transition-transform duration-[120ms] ${
                  current
                    ? "border-line bg-butter text-ink shadow-sticker"
                    : "border-line-soft bg-paper-sunken/70 text-ink-soft hover:-translate-y-px hover:text-ink"
                }`}
              >
                {t(`tab_${tab}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
