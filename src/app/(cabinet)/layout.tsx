import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCabinetContext } from "@/lib/tenant";
import { Sidebar } from "@/components/cabinet/sidebar";
import { MobileNav } from "@/components/cabinet/mobile-nav";
import { GlobalSearch } from "@/components/global-search";
import { ActivityTracker } from "@/components/activity-tracker";
import { PresenceNotice } from "@/components/presence-notice";

export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "CLIENT") {
    redirect("/portal");
  }

  const ctx = await getCabinetContext();
  const cabinetName = ctx?.cabinet.displayName ?? ctx?.cabinet.name ?? "CabiCompta";
  const logoUrl = ctx?.cabinet.logoUrl ?? null;

  return (
    <div className="flex min-h-screen">
      <GlobalSearch />
      <PresenceNotice acked={!!user.presenceNoticeAckedAt} />
      <ActivityTracker />
      <div className="hidden md:flex">
        <Sidebar role={user.role} cabinetName={cabinetName} logoUrl={logoUrl} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav role={user.role} cabinetName={cabinetName} logoUrl={logoUrl} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
