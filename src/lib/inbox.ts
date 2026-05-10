/**
 * Email Inbox Utilities
 * Generates inbox addresses and parses inbound email webhook payloads.
 */

/**
 * Generate a slug-based inbox email for a company.
 * e.g. "Transport Léveillé Inc." → "transport-leveille@docs.cabicompta.com"
 */
export function generateInboxEmail(companyName: string): string {
  const slug = companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanum → dash
    .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
    .slice(0, 40); // max length

  return `${slug}@docs.cabicompta.com`;
}

export type InboundAttachment = {
  filename: string;
  contentType: string;
  content: string; // base64 encoded
  size: number;
};

export type ParsedInboundEmail = {
  from: string;
  to: string;
  subject: string;
  attachments: InboundAttachment[];
};

/**
 * Parse an inbound email webhook payload.
 * Supports Resend / SendGrid / Mailgun common formats.
 */
export function parseInboundEmail(body: Record<string, unknown>): ParsedInboundEmail {
  // Resend format
  if (body.from && body.to && typeof body.from === "string") {
    return {
      from: body.from as string,
      to: Array.isArray(body.to) ? (body.to as string[])[0] : (body.to as string),
      subject: (body.subject as string) ?? "(sans objet)",
      attachments: parseAttachments(body.attachments),
    };
  }

  // SendGrid format (envelope + raw fields)
  if (body.envelope || body.from || body.sender) {
    const envelope = body.envelope
      ? JSON.parse(body.envelope as string)
      : null;

    return {
      from: (body.from as string) ?? (body.sender as string) ?? envelope?.from ?? "",
      to: envelope?.to?.[0] ?? (body.to as string) ?? "",
      subject: (body.subject as string) ?? "(sans objet)",
      attachments: parseAttachments(body.attachments),
    };
  }

  // Mailgun format
  return {
    from: (body.sender as string) ?? (body.from as string) ?? "",
    to: (body.recipient as string) ?? (body.to as string) ?? "",
    subject: (body.subject as string) ?? "(sans objet)",
    attachments: parseAttachments(body.attachments),
  };
}

function parseAttachments(raw: unknown): InboundAttachment[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((att) => att && typeof att === "object")
    .map((att: Record<string, unknown>) => ({
      filename: (att.filename as string) ?? (att.name as string) ?? "document",
      contentType:
        (att.contentType as string) ??
        (att.content_type as string) ??
        (att.type as string) ??
        "application/octet-stream",
      content: (att.content as string) ?? (att.data as string) ?? "",
      size: (att.size as number) ?? 0,
    }));
}
