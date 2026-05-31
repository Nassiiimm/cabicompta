import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedInvoiceData } from "@/types";

const anthropic = new Anthropic();

const PROMPT = (fileName: string) => `Analyse ce document "${fileName}" et retourne un JSON avec:

1. "category": une de ces valeurs: BANK_STATEMENT, INVOICE, TAX_NOTICE, FINANCIAL_STATEMENT, TPS_TVQ, CORPORATE, CONTRACT, RECEIPT, OTHER

2. "data": les données extraites. Si c'est une facture (INVOICE/RECEIPT), extrais:
   - vendor (fournisseur)
   - invoiceNumber (numéro de facture)
   - date (format YYYY-MM-DD)
   - amountHt (montant hors taxes)
   - tps (taxe fédérale 5%)
   - tvq (taxe provinciale 9.975%)
   - total
   - lineItems: [{description, quantity, unitPrice, amount}]

Pour les autres types, extrais les informations pertinentes sous forme de paires clé-valeur.

Contexte: cabinet comptable québécois, fiscalité canadienne.

Retourne UNIQUEMENT le JSON, sans markdown ni explication.`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function extractDocumentData(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{
  category: string;
  data: ExtractedInvoiceData | Record<string, unknown>;
}> {
  const base64 = fileBuffer.toString("base64");
  const isPdf = mimeType === "application/pdf";

  const contentBlock: Anthropic.MessageCreateParams["messages"][0]["content"] =
    isPdf
      ? [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf" as const,
              data: base64,
            },
          },
          { type: "text", text: PROMPT(fileName) },
        ]
      : [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as ImageMediaType,
              data: base64,
            },
          },
          { type: "text", text: PROMPT(fileName) },
        ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: contentBlock }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    return JSON.parse(text);
  } catch {
    return { category: "OTHER", data: {} };
  }
}
