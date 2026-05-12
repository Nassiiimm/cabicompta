import { PortalHeader } from "@/components/portal/portal-header";
import { PortalNav } from "@/components/portal/portal-nav";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <PortalHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8 sm:px-0 pb-24">
        {children}
      </main>
      <PortalNav />
    </div>
  );
}
