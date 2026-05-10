import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/cabinet/sidebar";

export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user?.role === "CLIENT") {
    redirect("/portal");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 p-6 sm:p-8">{children}</main>
    </div>
  );
}
