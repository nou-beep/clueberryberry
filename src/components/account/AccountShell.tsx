import type { ReactNode } from "react";
import { Window } from "@/components/ui/Window";
import { TapeStrip } from "@/components/ui/bits";

/**
 * The common frame for the four account screens: one window on the desk, a
 * short lead, the form, and whatever escape routes belong under it.
 */
export function AccountShell({
  title,
  lead,
  icon,
  children,
  footer,
}: {
  title: string;
  lead?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="font-display mt-2 text-4xl">{title}</h1>
      <Window title={title} icon={icon}>
        <div className="relative p-4 sm:p-5">
          <TapeStrip className="-top-3 end-8" rotate={4} />
          {lead && <p className="mb-4 text-sm leading-relaxed text-ink-soft">{lead}</p>}
          {children}
        </div>
      </Window>
      {footer && <div className="space-y-3">{footer}</div>}
    </div>
  );
}
