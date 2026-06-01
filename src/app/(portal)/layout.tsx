import { PortalHeader } from "@/components/portal/portal-header";
import { PortalNav } from "@/components/portal/portal-nav";
import { AiConsentNotice } from "@/components/ai-consent-notice";
import { getCurrentUser } from "@/lib/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      {user?.role === "CLIENT" && (
        <AiConsentNotice acked={!!user.aiConsentAckedAt} />
      )}
      <PortalHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 sm:px-0 pb-24">
        {children}
      </main>
      <PortalNav />
    </div>
  );
}
