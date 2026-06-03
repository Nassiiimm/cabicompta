"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export function PortalHeader({ cabinetName, logoUrl }: { cabinetName: string; logoUrl?: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto px-4 sm:px-0 h-full flex items-center justify-between">
        <Link href="/portal" className="font-semibold tracking-tight truncate max-w-[60%]">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={cabinetName} className="h-8 object-contain" />
          ) : (
            <span>{cabinetName}</span>
          )}
        </Link>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <NotificationBell />
          <button
            onClick={handleSignOut}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
