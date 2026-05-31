import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { documents, companyMembers, companies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireStaff } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

type RouteContext = { params: Promise<{ id: string }> };

function mime(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    avif: "image/avif",
  };
  return map[ext] ?? "application/octet-stream";
}

// GET /api/documents/[id]/view — sert le fichier inline (sans Content-Disposition: attachment)
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await context.params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) return new Response("Document introuvable", { status: 404 });

    if (user.role === "CLIENT") {
      const membership = await db
        .select({ companyId: companyMembers.companyId })
        .from(companyMembers)
        .where(and(eq(companyMembers.userId, user.id), eq(companyMembers.companyId, doc.companyId)))
        .limit(1);
      if (membership.length === 0) return new Response("Accès refusé", { status: 403 });
    } else {
      await requireStaff();
      if (user.role === "INTERN") {
        const [company] = await db
          .select({ assignedTo: companies.assignedTo })
          .from(companies)
          .where(eq(companies.id, doc.companyId))
          .limit(1);
        if (!company || company.assignedTo !== user.id) return new Response("Accès refusé", { status: 403 });
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: blob, error } = await supabase.storage.from("documents").download(doc.filePath);
    if (error || !blob) return new Response("Erreur lecture fichier", { status: 500 });

    const contentType = mime(doc.fileName);
    const arrayBuffer = await blob.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response("Non autorisé", { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return new Response("Accès refusé", { status: 403 });
    }
    return new Response("Erreur serveur", { status: 500 });
  }
}
