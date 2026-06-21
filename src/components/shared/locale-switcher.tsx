"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_LABELS, type Locale } from "@/types";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();

  function onSelectLocale(newLocale: Locale) {
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    }
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors outline-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <span className="text-xs">{LOCALE_LABELS[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => onSelectLocale(loc as Locale)}
            className={loc === locale ? "bg-accent" : ""}
          >
            {LOCALE_LABELS[loc as Locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
