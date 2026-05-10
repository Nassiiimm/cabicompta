"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export function PortalHeader() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto px-4 sm:px-0 h-full flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">CabiCompta</span>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <NotificationBell />
          <Link
            href="/portal/profile"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="size-4" />
          </Link>
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
