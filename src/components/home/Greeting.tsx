"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * "Good afternoon, Nou 🌸"
 *
 * Client-side because the time of day that matters is the player's, not the
 * server's. It renders the neutral afternoon greeting until the browser reports
 * its own hour, which avoids a hydration mismatch and never flashes the wrong
 * time of day for more than a frame.
 *
 * The name is only ever passed in from a real signed-in profile; guests get the
 * greeting alone rather than an invented nickname.
 */
const FLOWER = { morning: "🌤", afternoon: "🌸", evening: "🌙", night: "✩" } as const;

type Part = keyof typeof FLOWER;

function partOfDay(hour: number): Part {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 23) return "evening";
  return "night";
}

export function Greeting({ name }: { name?: string | null }) {
  const t = useTranslations("landing");
  const [part, setPart] = useState<Part>("afternoon");

  useEffect(() => {
    setPart(partOfDay(new Date().getHours()));
  }, []);

  const key = {
    morning: "greetMorning",
    afternoon: "greetAfternoon",
    evening: "greetEvening",
    night: "greetNight",
  }[part];

  return (
    <h1 className="font-display text-2xl sm:text-3xl">
      {t(key, { name: name ? `, ${name}` : "" })}{" "}
      <span aria-hidden>{FLOWER[part]}</span>
    </h1>
  );
}
