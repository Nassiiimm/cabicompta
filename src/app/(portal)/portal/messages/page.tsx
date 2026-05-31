import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalMessages } from "@/components/portal/portal-messages";

export default async function PortalMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Échangez directement avec votre comptable.
        </p>
      </div>
      <PortalMessages currentUserId={user.id} />
    </div>
  );
}
