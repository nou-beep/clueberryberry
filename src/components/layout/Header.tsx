import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BinderTabs } from "./BinderTabs";
import { Logo } from "./Logo";
import { SearchButton } from "@/components/search/SearchButton";
import { AccountMenu } from "@/components/account/AccountMenu";

export function Header() {
  const tApp = useTranslations("app");

  return (
    <header className="relative">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo />
          <span className="hidden sm:block">
            <span className="font-display block text-2xl leading-none text-ink">
              {tApp("name")}
            </span>
            <span className="label-caps text-ink-faint">{tApp("tagline")}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2.5">
          <SearchButton />
          <LanguageSwitcher />
          <AccountMenu />
        </div>
      </div>
      <BinderTabs />
    </header>
  );
}
