"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function toggle() {
    const next = locale === "fr" ? "en" : "fr";
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="text-xs px-2 py-1 rounded border border-current opacity-60 hover:opacity-100 transition-opacity font-medium tracking-wide disabled:opacity-30"
      title={locale === "fr" ? "Switch to English" : "Passer en français"}
    >
      {isPending ? "…" : locale === "fr" ? "EN" : "FR"}
    </button>
  );
}
