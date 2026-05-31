import { requireStaff } from "@/lib/auth";
import { AutopilotDashboard } from "./autopilot-dashboard";

export const metadata = { title: "Pilote automatique — CFC" };

export default async function AutopilotPage() {
  await requireStaff();
  return <AutopilotDashboard />;
}
