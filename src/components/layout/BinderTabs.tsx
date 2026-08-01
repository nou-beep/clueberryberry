"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { DESTINATIONS, activeDestination } from "./destinations";
import { DESTINATION_ICONS } from "./destination-icons";

/**
 * Tabs in a binder, not a nav bar: each tab is outlined, they overlap by 2px,
 * and the active tab merges into the page below by dropping its bottom border.
 *
 * Five tabs, so the strip fits without scrolling at 360px and nothing hides in
 * an overflow menu. Hidden on small screens, where `BottomNav` takes over.
 */
export function BinderTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const current = activeDestination(pathname);

  return (
    <nav
      aria-label={t("primary")}
      className="relative z-10 -mb-0.5 hidden md:block"
    >
      <ul className="flex items-end gap-0 px-3 sm:px-6">
        {DESTINATIONS.map(({ href, key, tone }) => {
          const Icon = DESTINATION_ICONS[key];
          const active = current?.key === key;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative -me-0.5 flex min-h-11 items-center gap-2 overflow-hidden whitespace-nowrap rounded-t-[14px] border-2 px-4 pt-2.5 text-sm font-semibold transition-transform duration-[120ms] ${
                  active
                    ? "z-10 border-line border-b-transparent bg-paper-bright pb-3 text-ink"
                    : "border-line/50 bg-paper-sunken/80 pb-2 text-ink-soft hover:-translate-y-px hover:text-ink"
                }`}
              >
                {/* the colored index strip along the top of the tab */}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1.5 ${tone} ${active ? "" : "opacity-50"}`}
                />
                <Icon className="size-[18px] shrink-0" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
