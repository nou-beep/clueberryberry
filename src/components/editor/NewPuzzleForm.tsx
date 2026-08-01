"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

interface Props {
  subjects: Array<{ slug: string; name: string }>;
  topics: Array<{ slug: string; name: string; subjectSlug: string }>;
}

const field =
  "w-full border border-line bg-paper-bright px-2 py-1.5 text-sm text-ink";

export function NewPuzzleForm({ subjects, topics }: Props) {
  const t = useTranslations("editor");
  const tLang = useTranslations("languages");
  const tDiff = useTranslations("difficulty");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState("en");
  const [subject, setSubject] = useState(subjects[0]?.slug ?? "");
  const [difficulty, setDifficulty] = useState("medium");
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [author, setAuthor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const subjectTopics = topics.filter((x) => x.subjectSlug === subject);
  const [topic, setTopic] = useState(subjectTopics[0]?.slug ?? "");
  const effectiveTopic = subjectTopics.some((x) => x.slug === topic)
    ? topic
    : subjectTopics[0]?.slug ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/editor/puzzles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        language,
        subject,
        topic: effectiveTopic,
        difficulty,
        width,
        height,
        author,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof data?.error === "string" ? data.error : "invalid");
      return;
    }
    const { id } = (await res.json()) as { id: string };
    router.push(`/editor/puzzles/${id}`);
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-lg">
      <h1 className="font-display text-3xl font-semibold">{t("newPuzzle")}</h1>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="label-caps text-ink-soft">{t("titleField")}</span>
          <input
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug || slug === toSlug(title)) setSlug(toSlug(e.target.value));
            }}
            className={field}
          />
        </label>
        <label className="block">
          <span className="label-caps text-ink-soft">{t("slug")}</span>
          <input
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={`${field} font-mono`}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="label-caps text-ink-soft">{t("language")}</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={field}>
              {(["en", "fr", "ar"] as const).map((l) => (
                <option key={l} value={l}>
                  {tLang(l)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps text-ink-soft">{t("difficulty")}</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={field}
            >
              {(["easy", "medium", "hard"] as const).map((d) => (
                <option key={d} value={d}>
                  {tDiff(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps text-ink-soft">{t("subject")}</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={field}>
              {subjects.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps text-ink-soft">{t("topic")}</span>
            <select
              value={effectiveTopic}
              onChange={(e) => setTopic(e.target.value)}
              className={field}
            >
              {subjectTopics.map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-caps text-ink-soft">{t("width")}</span>
            <input
              type="number"
              min={3}
              max={25}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className={field}
            />
          </label>
          <label className="block">
            <span className="label-caps text-ink-soft">{t("height")}</span>
            <input
              type="number"
              min={3}
              max={25}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className={field}
            />
          </label>
        </div>
        <label className="block">
          <span className="label-caps text-ink-soft">{t("author")}</span>
          <input
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={field}
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-wrong">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="label-caps mt-6 border-2 border-line bg-pink px-5 py-2.5 text-ink disabled:opacity-50"
      >
        {t("saveDraft")}
      </button>
    </form>
  );
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
