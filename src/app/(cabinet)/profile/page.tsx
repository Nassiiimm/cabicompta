import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  STAFF: "Comptable",
  CLIENT: "Client",
};

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">Profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nom</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Courriel</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
