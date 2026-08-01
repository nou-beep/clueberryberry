"use client";

import { useTranslations } from "next-intl";
import { STAGE_IDS, type StageEvent, type StageLog } from "@/lib/playground/stages";

const STATUS_MARK: Record<StageEvent["status"], string> = {
  running: "…",
  done: "✓",
  retrying: "↻",
  failed: "✕",
};

const STATUS_TONE: Record<StageEvent["status"], string> = {
  running: "border-line bg-butter",
  done: "border-line bg-mint",
  retrying: "border-line bg-peach",
  failed: "border-wrong bg-paper-bright text-wrong",
};

/**
 * The generator's real progress.
 *
 * Every row is a stage the pipeline actually runs (see src/lib/playground/stages),
 * and its status comes from the generator itself as it works — there is no timed
 * animation here and no bar that fills on its own. A stage that has not been
 * reached yet is shown as pending, not as in progress.
 */
export function StageList({ log, running }: { log: StageLog; running: boolean }) {
  const t = useTranslations("playground");

  return (
    <ol className="space-y-1.5" aria-live="polite">
      {STAGE_IDS.map((id) => {
        const event = log[id];
        const detail = event?.detail;
        return (
          <li key={id} className="flex min-h-11 items-center gap-3">
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[13px] ${
                event ? STATUS_TONE[event.status] : "border-line-soft bg-paper-sunken text-ink-faint"
              }`}
            >
              {event ? STATUS_MARK[event.status] : "·"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] text-ink">{t(`stages.${id}`)}</span>
              <span className="label-caps block text-ink-faint">
                {event ? t(`stageStatus.${event.status}`) : t("stageStatus.pending")}
                {detail?.words !== undefined && ` · ${t("stageDetail.words", { count: detail.words })}`}
                {detail?.entries !== undefined && ` · ${t("stageDetail.entries", { count: detail.entries })}`}
                {detail?.crossings !== undefined && ` · ${t("stageDetail.crossings", { count: detail.crossings })}`}
                {detail?.cells !== undefined && ` · ${t("stageDetail.cells", { count: detail.cells })}`}
                {detail?.repairs ? ` · ${t("stageDetail.repairs", { count: detail.repairs })}` : ""}
                {event && event.pass > 1 && ` · ${t("stageDetail.pass", { count: event.pass })}`}
              </span>
              {detail?.check && event?.status !== "done" && (
                <span className="block text-sm text-ink-soft">
                  {t.has(`checks.${detail.check}`)
                    ? t(`checks.${detail.check}`)
                    : t("checks.unknown")}
                </span>
              )}
            </span>
          </li>
        );
      })}
      {running && <li className="sr-only">{t("stageStatus.running")}</li>}
    </ol>
  );
}
