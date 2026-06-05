import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlatformAdmin } from "@/lib/platform";

// Console PLATEFORME — réservée aux super-admins (table platform_admins).
// Hors périmètre tenant : requêtes volontairement cross-cabinet.
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/login");

  const nav = [
    { href: "/platform", label: "Vue d'ensemble" },
    { href: "/platform/cabinets", label: "Cabinets" },
    { href: "/platform/audit", label: "Journal d'audit" },
    { href: "/platform/admins", label: "Super-admins" },
    { href: "/platform/billing", label: "Facturation" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight">CabiCompta · Console</span>
            <nav className="flex items-center gap-4 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <span className="text-xs text-muted-foreground">{admin.email}</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
