import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { CreateStaffForm } from "./create-staff";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  STAFF: "Comptable",
  INTERN: "Stagiaire",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  STAFF: "secondary",
  INTERN: "outline",
};

export default async function StaffPage() {
  await requireAdmin();

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
        <h1 className="text-lg font-semibold">Equipe</h1>
        <CreateStaffForm />
      </div>

      {staffUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun membre dans l&apos;equipe.
        </p>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-4 py-2">Nom</th>
                <th className="text-left font-medium px-4 py-2">Courriel</th>
                <th className="text-left font-medium px-4 py-2">Role</th>
                <th className="text-left font-medium px-4 py-2">
                  Date de creation
                </th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
