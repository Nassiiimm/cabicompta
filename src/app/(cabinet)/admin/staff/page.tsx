import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { CreateStaffForm } from "./create-staff";
import { DeleteStaffButton } from "./delete-staff";
import { getTranslations } from "next-intl/server";

export default async function StaffPage() {
  await requireAdmin();
  const t = await getTranslations("admin.team");

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: t("roles.ADMIN"),
    STAFF: t("roles.STAFF"),
    INTERN: t("roles.INTERN"),
  };

  const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
    ADMIN: "default",
    STAFF: "secondary",
    INTERN: "outline",
  };

  const staffUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`${users.role} IN ('ADMIN', 'STAFF', 'INTERN')`)
    .orderBy(users.createdAt);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <CreateStaffForm />
      </div>

      {staffUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("noTeam")}
        </p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-4 py-2">{t("name")}</th>
                <th className="text-left font-medium px-4 py-2">{t("email")}</th>
                <th className="text-left font-medium px-4 py-2">{t("role")}</th>
                <th className="text-left font-medium px-4 py-2">{t("createdAt")}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {staffUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5 font-medium">{user.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={ROLE_VARIANTS[user.role] ?? "secondary"}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {user.createdAt.toLocaleDateString("fr-CA")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DeleteStaffButton id={user.id} name={user.name ?? user.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
