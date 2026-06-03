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
  Search,
  MessageSquare,
  CalendarClock,
  Zap,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { useTranslations } from "next-intl";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

export function Sidebar({ role, cabinetName, logoUrl }: { role: string; cabinetName: string; logoUrl?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const unreadMessages = useUnreadMessages();

  // Divulgation progressive : chaque rôle ne voit que ce qui le concerne,
  // sans perte de fonctionnalité pour l'admin. INTERN (stagiaire) reste
  // sur l'opérationnel ; le financier et la config sont réservés STAFF+.
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
    <aside className="flex flex-col w-56 min-h-screen border-r bg-white dark:bg-neutral-950">
      {/* Logo header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
        <Link href="/dashboard" className="font-semibold tracking-tight truncate">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={cabinetName} className="h-10 object-contain" />
          ) : (
            <span>{cabinetName}</span>
          )}
        </Link>
        <NotificationBell />
      </div>

      {/* Recherche globale */}
      <div className="px-2 py-2">
        <button
          onClick={() => {
            const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
            window.dispatchEvent(e);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-800"
        >
          <Search className="size-3.5 opacity-60" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="text-[10px] font-mono opacity-40">⌘K</kbd>
        </button>
      </div>

      {/* Navigation — sections filtrées par rôle */}
      <nav className="flex-1 px-2 py-1 space-y-3 overflow-y-auto">
        {sections.map((section, si) => {
          const items = section.items.filter((it) => it.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={si} className="space-y-0.5">
              {section.title && (
                <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
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
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                      active
                        ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    <item.icon className={cn("size-4 shrink-0", active ? "opacity-100" : "opacity-60")} />
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

      {/* Pied de sidebar */}
      <div className="px-2 py-2 border-t border-neutral-100 dark:border-neutral-800 space-y-0.5">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
            pathname === "/profile"
              ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
        >
          <User className="size-4 shrink-0 opacity-60" />
          {t("profile")}
        </Link>
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="size-4 shrink-0 opacity-60" />
            {t("logout")}
          </button>
          <div className="flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
