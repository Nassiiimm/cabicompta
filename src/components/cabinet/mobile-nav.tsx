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
  GitBranch,
  MessageSquare,
  CalendarClock,
  Zap,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { useTranslations } from "next-intl";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

export function MobileNav({ role, cabinetName, logoUrl }: { role: string; cabinetName: string; logoUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const unreadMessages = useUnreadMessages();

  // Mêmes sections et règles de rôle que la sidebar desktop (parité).
  const ALL = ["ADMIN", "STAFF", "INTERN"];
  const STAFF_UP = ["ADMIN", "STAFF"];
  const ADMIN_ONLY = ["ADMIN"];

  const sections: {
    title?: string;
    items: { label: string; href: string; icon: LucideIcon; roles: string[] }[];
  }[] = [
    {
      items: [
        { label: t("dashboard"), href: "/dashboard", icon: LayoutDashboard, roles: ALL },
      ],
    },
    {
      title: t("sectionProduction"),
      items: [
        { label: t("workflows"), href: "/workflows", icon: GitBranch, roles: ALL },
        { label: t("documents"), href: "/documents", icon: FileText, roles: ALL },
        { label: t("deadlines"), href: "/deadlines", icon: CalendarClock, roles: ALL },
        { label: t("autopilot"), href: "/autopilot", icon: Zap, roles: STAFF_UP },
      ],
    },
    {
      title: t("sectionRelations"),
      items: [
        { label: t("clients"), href: "/clients", icon: Users, roles: ALL },
        { label: t("messages"), href: "/messages", icon: MessageSquare, roles: ALL },
        { label: t("invoices"), href: "/invoices", icon: Receipt, roles: STAFF_UP },
      ],
    },
    {
      title: t("sectionAdmin"),
      items: [
        { label: t("practice"), href: "/admin/practice", icon: BarChart3, roles: ADMIN_ONLY },
        { label: t("templates"), href: "/admin/workflow-templates", icon: GitBranch, roles: ADMIN_ONLY },
        { label: t("audit"), href: "/admin/audit", icon: Shield, roles: ADMIN_ONLY },
        { label: t("access"), href: "/admin/access", icon: Eye, roles: ADMIN_ONLY },
        { label: t("team"), href: "/admin/staff", icon: UserCog, roles: ADMIN_ONLY },
        { label: t("import"), href: "/admin/import", icon: Upload, roles: ADMIN_ONLY },
      ],
    },
  ];

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
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={cabinetName} className="h-9 object-contain" />
        ) : (
          <span className="font-semibold tracking-tight truncate">{cabinetName}</span>
        )}
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
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={cabinetName} className="h-9 object-contain" />
              ) : (
                <span className="font-semibold tracking-tight truncate">{cabinetName}</span>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex-1 p-2 space-y-3 mt-1 overflow-y-auto">
              {sections.map((section, si) => {
                const items = section.items.filter((it) => it.roles.includes(role));
                if (items.length === 0) return null;
                return (
                  <div key={si} className="space-y-0.5">
                    {section.title && (
                      <p className="px-3 pt-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                        {section.title}
                      </p>
                    )}
                    {items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      const badge = item.href === "/messages" && unreadMessages > 0 ? unreadMessages : 0;
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
                          <span className="flex-1">{item.label}</span>
                          {badge > 0 && (
                            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                              {badge > 9 ? "9+" : badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

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
                {t("profile")}
              </Link>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <LogOut className="size-4" />
                  {t("logout")}
                </button>
                <div className="flex items-center gap-1">
                  <LocaleToggle />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
