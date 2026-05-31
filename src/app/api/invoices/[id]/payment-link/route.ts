import { requireAuth } from "@/lib/auth";
import { hasCompanyAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { invoices, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await segmentData.params;

    // Fetch invoice with company info
    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        status: invoices.status,
        companyName: companies.name,
        companyEmail: companies.email,
        companyId: invoices.companyId,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(eq(invoices.id, id))
      .limit(1);

    if (!invoice) {
      return Response.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // Cloisonnement : CLIENT → sa company, INTERN → company assignée
    if (!(await hasCompanyAccess(user, invoice.companyId))) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    if (invoice.status !== "SENT" && invoice.status !== "OVERDUE") {
      return Response.json(
        { error: "Seules les factures envoyées ou en retard peuvent être payées" },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // Mock mode: return a fake payment URL when Stripe is not configured
    if (!stripeSecretKey) {
      const mockUrl = `${new URL(request.url).origin}/portal/invoices?payment=mock&invoice=${invoice.invoiceNumber}`;

      await db
        .update(invoices)
        .set({ stripePaymentUrl: mockUrl, updatedAt: new Date() })
        .where(eq(invoices.id, id));

      return Response.json({ paymentUrl: mockUrl });
    }

    // Real Stripe Checkout Session
    const totalCents = Math.round(Number(invoice.total) * 100);
    const origin = new URL(request.url).origin;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/portal/invoices?payment=success&invoice=${invoice.invoiceNumber}`);
    params.append("cancel_url", `${origin}/portal/invoices?payment=cancel&invoice=${invoice.invoiceNumber}`);
    params.append("line_items[0][price_data][currency]", "cad");
    params.append("line_items[0][price_data][product_data][name]", `Facture ${invoice.invoiceNumber}`);
    if (invoice.companyName) {
      params.append("line_items[0][price_data][product_data][description]", invoice.companyName);
    }
    params.append("line_items[0][price_data][unit_amount]", totalCents.toString());
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[invoiceId]", invoice.id);
    params.append("metadata[invoiceNumber]", invoice.invoiceNumber);
    if (invoice.companyEmail) {
      params.append("customer_email", invoice.companyEmail);
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const stripeError = await stripeRes.json();
      console.error("[STRIPE] Erreur création session:", stripeError);
      return Response.json(
        { error: "Erreur lors de la création du lien de paiement" },
        { status: 502 }
      );
    }

    const session = await stripeRes.json();
    const paymentUrl = session.url as string;

    // Store payment URL on the invoice
    await db
      .update(invoices)
      .set({ stripePaymentUrl: paymentUrl, updatedAt: new Date() })
      .where(eq(invoices.id, id));

    return Response.json({ paymentUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return Response.json({ error: "Accès interdit" }, { status: 403 });
    }
    console.error("POST /api/invoices/[id]/payment-link error:", error);
    return Response.json(
      { error: "Erreur lors de la génération du lien de paiement" },
      { status: 500 }
    );
  }
}
