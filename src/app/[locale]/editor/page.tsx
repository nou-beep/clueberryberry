import { redirect } from "@/i18n/navigation";

export default async function EditorIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/editor/puzzles", locale });
}
