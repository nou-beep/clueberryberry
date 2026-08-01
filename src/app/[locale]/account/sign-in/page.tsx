import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { googleEnabled } from "@/lib/auth";
import { SignInForm } from "@/components/account/SignInForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("signInTitle") };
}

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Whether Google can work at all is a server fact; the button is not
  // rendered when it would be decorative.
  return <SignInForm googleEnabled={googleEnabled} />;
}
