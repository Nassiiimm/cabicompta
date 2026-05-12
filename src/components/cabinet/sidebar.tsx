"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Workflows", href: "/workflows", icon: GitBranch },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Factures", href: "/invoices", icon: Receipt },
];

const adminNav = [
  { label: "Vue pratique", href: "/admin/practice", icon: BarChart3 },
  { label: "Modèles workflows", href: "/admin/workflow-templates", icon: GitBranch },
  { label: "Journal d'audit", href: "/admin/audit", icon: Shield },
  { label: "Journal d'accès", href: "/admin/access", icon: Eye },
  { label: "Équipe", href: "/admin/staff", icon: UserCog },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-56 border-r min-h-screen bg-neutral-50/50 dark:bg-neutral-900/50">
      <div className="h-14 px-4 flex items-center justify-between border-b">
        <span className="text-sm font-semibold tracking-tight">CabiCompta</span>
        <NotificationBell />
      </div>

      <nav className="flex-1 p-2 space-y-0.5 mt-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
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

      {role === "ADMIN" && <div className="px-2 pb-1">
        <p className="px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
          Admin
        </p>
        {adminNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
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
      </div>}

      <div className="p-2 border-t space-y-0.5">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
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
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="size-4" />
            Déconnexion
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
