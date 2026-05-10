"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  LogOut,
  Shield,
  Eye,
  BarChart3,
  UserCog,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Factures", href: "/invoices", icon: Receipt },
];

const adminNav = [
  { label: "Vue pratique", href: "/admin/practice", icon: BarChart3 },
  { label: "Journal d'audit", href: "/admin/audit", icon: Shield },
  { label: "Journal d'accès", href: "/admin/access", icon: Eye },
  { label: "Équipe", href: "/admin/staff", icon: UserCog },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 h-14 border-b bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-sm font-semibold tracking-tight">CabiCompta</span>
        <div className="w-9" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-neutral-950 border-r flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-14 px-4 flex items-center justify-between border-b">
              <span className="text-sm font-semibold tracking-tight">CabiCompta</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex-1 p-2 space-y-0.5 mt-1">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
                      active
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-2 pb-1">
              <p className="px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                Admin
              </p>
              {adminNav.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
                      active
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="p-2 border-t space-y-0.5">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors",
                  pathname === "/profile"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <User className="size-4" />
                Profil
              </Link>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <LogOut className="size-4" />
                  Déconnexion
                </button>
                <ThemeToggle />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
