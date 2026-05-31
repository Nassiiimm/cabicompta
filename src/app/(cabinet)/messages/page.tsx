import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CabinetMessages } from "@/components/cabinet/cabinet-messages";
import { Loader2 } from "lucide-react";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "CLIENT") redirect("/portal/messages");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conversations avec vos clients.
        </p>
      </div>
      <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}>
        <CabinetMessages currentUserId={user.id} />
      </Suspense>
    </div>
  );
}
