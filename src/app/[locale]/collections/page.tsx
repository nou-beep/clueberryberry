import { redirect } from "next/navigation";

/** Collections are a shelf inside the Puzzles hub; the old index redirects. */
export default async function CollectionsIndexRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/puzzles`);
}
