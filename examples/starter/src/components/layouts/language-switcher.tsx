"use client";

import { getLocaleAction } from "@/i18n/get-locale";
import { COOKIE_KEY_LOCALE, SUPPORTED_LOCALES } from "@/lib/const";
import { Button } from "@repo/design-system/components/shadcn-ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/design-system/components/shadcn-ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import useSWR from "swr";

export function LanguageSwitcher() {
  const t = useTranslations("Layout");
  const { data: currentLocale } = useSWR(COOKIE_KEY_LOCALE, getLocaleAction, {
    fallbackData: SUPPORTED_LOCALES[0].code,
    revalidateOnFocus: false,
  });
  const handleOnChange = useCallback((locale: string) => {
    document.cookie = `${COOKIE_KEY_LOCALE}=${locale}; path=/;`;
    window.location.reload();
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
          <span className="sr-only">{t("language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="text-muted-foreground">
          {t("language")}
        </DropdownMenuLabel>
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuCheckboxItem
            key={locale.code}
            checked={locale.code === currentLocale}
            onCheckedChange={() =>
              locale.code !== currentLocale && handleOnChange(locale.code)
            }
          >
            {locale.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
