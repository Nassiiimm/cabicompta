import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

// Comparaison à temps constant (évite les timing attacks sur la signature)
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Stripe signature format: t=timestamp,v1=hash
    const parts = signature.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const v1Hash = parts.find((p) => p.startsWith("v1="))?.slice(3);

    if (!timestamp || !v1Hash) return false;

    // Verify timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );
    const expectedHash = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return timingSafeEqualHex(expectedHash, v1Hash);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = request.headers.get("stripe-signature");

    // Signature OBLIGATOIRE — sans elle, n'importe qui pourrait forger
    // un "paiement" et marquer une facture comme payée.
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET non configuré — webhook rejeté");
      return Response.json({ error: "Webhook non configuré" }, { status: 503 });
    }
    if (!signature) {
      return Response.json({ error: "Signature manquante" }, { status: 400 });
    }
    const valid = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!valid) {
      return Response.json({ error: "Signature invalide" }, { status: 400 });
    }

    const event = JSON.parse(payload);

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      if (!session) {
        return Response.json({ error: "Session manquante" }, { status: 400 });
      }

      const invoiceId = session.metadata?.invoiceId;
      if (!invoiceId) {
        // Not our invoice — ignore gracefully
        return Response.json({ received: true });
      }

      // Verify invoice exists
      const [existing] = await db
        .select({ id: invoices.id, status: invoices.status })
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!existing) {
        return Response.json({ received: true });
      }

      // Only update if not already paid
      if (existing.status !== "PAID") {
        const paymentIntentId =
          session.payment_intent ?? session.id ?? null;

        await db
          .update(invoices)
          .set({
            status: "PAID",
            paidAt: new Date(),
            paymentMethod: "stripe",
            stripePaymentIntentId: paymentIntentId,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId));

        logAudit({
          userId: null,
          action: "STRIPE_PAYMENT",
          tableName: "invoices",
          recordId: invoiceId,
          oldData: { status: existing.status },
          newData: {
            status: "PAID",
            paymentMethod: "stripe",
            stripePaymentIntentId: paymentIntentId,
          },
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("POST /api/webhooks/stripe error:", error);
    return Response.json(
      { error: "Erreur traitement webhook" },
      { status: 500 }
    );
  }
}
