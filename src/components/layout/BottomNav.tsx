"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { DESTINATIONS, activeDestination } from "./destinations";
import { DESTINATION_ICONS } from "./destination-icons";

/**
 * The mobile bar: the same five destinations, same order, always visible, never
 * scrolling sideways. Each target is a full fifth of the width and at least
 * 56px tall, so it clears the 44px minimum comfortably even with the label.
 *
 * The active tab lifts its icon onto a colored pill rather than changing the
 * label's colour alone — colour is never the only signal.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const current = activeDestination(pathname);

  return (
    <nav
      aria-label={t("primary")}
      className="sticky bottom-0 z-30 border-t-2 border-line bg-paper-bright pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch">
        {DESTINATIONS.map(({ href, key, tone }) => {
          const Icon = DESTINATION_ICONS[key];
          const active = current?.key === key;
          return (
            <li key={key} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 pb-1.5 pt-2 text-[11px] font-semibold"
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full border-2 transition-transform duration-[120ms] ${
                    active
                      ? `${tone} border-line text-ink`
                      : "border-transparent text-ink-soft"
                  }`}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className={active ? "text-ink" : "text-ink-soft"}>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
