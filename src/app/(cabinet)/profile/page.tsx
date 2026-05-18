import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const user = await requireAuth();
  const t = await getTranslations("profile");

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Administrateur",
    STAFF: "Comptable",
    INTERN: "Stagiaire",
    CLIENT: "Client",
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("personalInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("name")}</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("email")}</span>
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
          <CardTitle>{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
