import type { Metadata, Viewport } from "next";
import {
  Baloo_Bhaijaan_2,
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans_Arabic,
  Nunito,
} from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";
import { SettingsProvider, SETTINGS_BOOT_SCRIPT } from "@/lib/settings";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { PipCorner } from "@/components/pip/PipCorner";
import { PipProvider } from "@/lib/pip/context";
import "../globals.css";

/* Three type roles; display and body each carry a script-paired face.
   See docs/design-system.md §2. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});
const baloo = Baloo_Bhaijaan_2({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-baloo",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-arabic",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  const title = `${t("name")} — ${t("tagline")}`;
  const description = t("subtitle");

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · ${t("name")}` },
    description,
    applicationName: t("name"),
    manifest: "/manifest.webmanifest",
    // Each locale is a first-class edition, not a translation of a canonical
    // English page, so they point at each other rather than at one original.
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: t("name"),
      title,
      description,
      url: `${siteUrl}/${locale}`,
      locale: locale === "ar" ? "ar_MA" : locale === "fr" ? "fr_FR" : "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffe6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2228" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${fraunces.variable} ${nunito.variable} ${plexMono.variable} ${baloo.variable} ${plexArabic.variable} min-h-screen bg-desk text-ink antialiased`}
      >
        <NextIntlClientProvider>
          <SettingsProvider>
            <PipProvider>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border-2 focus:border-line focus:bg-butter focus:px-3 focus:py-2"
              >
                {locale === "fr"
                  ? "Aller au contenu"
                  : locale === "ar"
                    ? "انتقل إلى المحتوى"
                    : "Skip to content"}
              </a>
              <div className="flex min-h-screen flex-col">
                <Header />
                {/* The page sits on paper; the desk shows around it. */}
                <div className="mx-auto w-full max-w-6xl flex-1 px-2 pb-10 sm:px-4">
                  <main
                    id="main"
                    className="relative min-h-[60vh] rounded-b-[20px] rounded-t-none border-2 border-line bg-paper px-4 pb-12 pt-6 shadow-window sm:px-8"
                  >
                    {children}
                  </main>
                </div>
                <Footer />
                <BottomNav />
              </div>
              <PipCorner />
            </PipProvider>
          </SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
