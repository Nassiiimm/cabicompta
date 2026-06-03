import { db } from "@/lib/db";
import { companies, documents, notifications, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadFile } from "@/lib/supabase/storage";
import { parseInboundEmail } from "@/lib/inbox";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    // Verify inbound email secret — fail-closed : sans secret configuré, la
    // route est refusée (sinon elle traiterait n'importe quel payload public).
    const secret = process.env.INBOUND_EMAIL_SECRET;
    const headerSecret =
      request.headers.get("x-inbound-secret") ??
      request.headers.get("authorization")?.replace("Bearer ", "");
    if (!secret || headerSecret !== secret) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = parseInboundEmail(body);

    if (!parsed.to) {
      return Response.json({ error: "Destinataire manquant" }, { status: 400 });
    }

    // Normalize the "to" address — extract email from "Name <email>" format
    const toEmail = parsed.to.includes("<")
      ? parsed.to.match(/<(.+?)>/)?.[1] ?? parsed.to
      : parsed.to;

    // Look up company by inbox_email
    const [company] = await db
      .select({
        id: companies.id,
        cabinetId: companies.cabinetId,
        name: companies.name,
        assignedTo: companies.assignedTo,
        inboxActive: companies.inboxActive,
      })
      .from(companies)
      .where(
        and(
          eq(companies.inboxEmail, toEmail.toLowerCase()),
          eq(companies.inboxActive, true)
        )
      )
      .limit(1);

    if (!company) {
      return Response.json(
        { error: "Aucune entreprise trouvée pour cette adresse" },
        { status: 404 }
      );
    }

    if (!parsed.attachments.length) {
      return Response.json(
        { message: "Aucune pièce jointe — courriel ignoré" },
        { status: 200 }
      );
    }

    // We need a system user ID for uploadedBy — use the assigned staff or first admin
    let uploaderId = company.assignedTo;
    if (!uploaderId) {
      const [admin] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "ADMIN"))
        .limit(1);
      uploaderId = admin?.id ?? null;
    }

    if (!uploaderId) {
      return Response.json(
        { error: "Aucun utilisateur système trouvé" },
        { status: 500 }
      );
    }

    const createdDocs: string[] = [];

    for (const attachment of parsed.attachments) {
      try {
        const buffer = Buffer.from(attachment.content, "base64");

        // Skip empty attachments
        if (buffer.length === 0) continue;

        // Max 10 MB
        if (buffer.length > 10 * 1024 * 1024) continue;

        const timestamp = Date.now();
        const safeName = attachment.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${company.cabinetId}/${company.id}/${timestamp}_${safeName}`;

        await uploadFile("documents", storagePath, buffer, attachment.contentType);

        const [doc] = await db
          .insert(documents)
          .values({
            cabinetId: company.cabinetId,
            companyId: company.id,
            uploadedBy: uploaderId,
            fileName: attachment.filename,
            filePath: storagePath,
            fileSize: buffer.length,
            mimeType: attachment.contentType,
            category: "OTHER",
            fiscalYear: new Date().getFullYear(),
            status: "PENDING",
            notes: `Reçu par courriel de ${parsed.from} — ${parsed.subject}`,
          })
          .returning();

        createdDocs.push(doc.id);

        logAudit({
          cabinetId: company.cabinetId,
          userId: null,
          action: "INBOUND_EMAIL_UPLOAD",
          tableName: "documents",
          recordId: doc.id,
          newData: {
            fileName: attachment.filename,
            companyId: company.id,
            from: parsed.from,
            subject: parsed.subject,
          },
        });
      } catch (err) {
        console.error("[INBOUND_EMAIL] Erreur pièce jointe:", attachment.filename, err);
      }
    }

    // Notify assigned staff
    if (company.assignedTo && createdDocs.length > 0) {
      try {
        await db.insert(notifications).values({
          cabinetId: company.cabinetId,
          userId: company.assignedTo,
          title: "Nouveau document reçu par courriel",
          message: `${createdDocs.length} document${createdDocs.length > 1 ? "s" : ""} reçu${createdDocs.length > 1 ? "s" : ""} de ${parsed.from} pour ${company.name}`,
          type: "DOCUMENT",
          link: `/clients/${company.id}`,
        });
      } catch {
        console.error("[INBOUND_EMAIL] Erreur notification");
      }
    }

    return Response.json({
      received: true,
      documents: createdDocs.length,
    });
  } catch (error) {
    console.error("POST /api/webhooks/inbound-email error:", error);
    return Response.json(
      { error: "Erreur traitement courriel entrant" },
      { status: 500 }
    );
  }
}
