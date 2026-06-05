import { redirect } from "next/navigation";
import { getPlatformAdmin } from "@/lib/platform";

// Console PLATEFORME — réservée aux super-admins (table platform_admins).
// Hors périmètre tenant : requêtes volontairement cross-cabinet.
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight">CabiCompta · Console plateforme</span>
          <span className="text-xs text-muted-foreground">{admin.email}</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
