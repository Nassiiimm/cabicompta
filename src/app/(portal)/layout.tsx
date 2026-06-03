import { PortalHeader } from "@/components/portal/portal-header";
import { PortalNav } from "@/components/portal/portal-nav";
import { AiConsentNotice } from "@/components/ai-consent-notice";
import { getCurrentUser } from "@/lib/auth";
import { getCabinetContext } from "@/lib/tenant";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const ctx = await getCabinetContext();
  const cabinetName = ctx?.cabinet.displayName ?? ctx?.cabinet.name ?? "CabiCompta";

  return (
    <div className="min-h-screen bg-background">
      {user?.role === "CLIENT" && (
        <AiConsentNotice acked={!!user.aiConsentAckedAt} />
      )}
      <PortalHeader cabinetName={cabinetName} logoUrl={ctx?.cabinet.logoUrl ?? null} />
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 sm:px-0 pb-24">
        {children}
      </main>
      <PortalNav />
    </div>
  );
}
