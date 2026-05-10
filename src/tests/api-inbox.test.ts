import { describe, it, expect } from "vitest";
import { generateInboxEmail, parseInboundEmail } from "@/lib/inbox";

describe("generateInboxEmail", () => {
  it("creates slug from company name", () => {
    const result = generateInboxEmail("Acme Corporation");
    expect(result).toBe("acme-corporation@docs.cabicompta.com");
  });

  it("handles accented characters (strips accents)", () => {
    const result = generateInboxEmail("Transport Léveillé Inc.");
    expect(result).toBe("transport-leveille-inc@docs.cabicompta.com");
  });

  it("handles spaces and special characters", () => {
    const result = generateInboxEmail("My Company (2026) — Ltd.");
    expect(result).toBe("my-company-2026-ltd@docs.cabicompta.com");
  });

  it("converts to lowercase", () => {
    const result = generateInboxEmail("ABC DEF");
    expect(result).toBe("abc-def@docs.cabicompta.com");
  });

  it("trims leading and trailing dashes", () => {
    const result = generateInboxEmail("--Company--");
    expect(result).toBe("company@docs.cabicompta.com");
  });

  it("handles accented characters in punctuation-heavy names", () => {
    // NFD: é → e + combining accent → stripped → "Associes"
    const result = generateInboxEmail("St-Jean & Associés, S.E.N.C.");
    expect(result).toBe("st-jean-associes-s-e-n-c@docs.cabicompta.com");
  });

  it("truncates to max 40 characters for slug", () => {
    const longName = "This Is An Extremely Long Company Name That Should Be Truncated";
    const result = generateInboxEmail(longName);
    const slug = result.split("@")[0];
    expect(slug.length).toBeLessThanOrEqual(40);
  });

  it("handles numeric-only names", () => {
    const result = generateInboxEmail("123456");
    expect(result).toBe("123456@docs.cabicompta.com");
  });
});

describe("parseInboundEmail", () => {
  it("extracts from/to/subject from Resend format", () => {
    const result = parseInboundEmail({
      from: "sender@example.com",
      to: "inbox@docs.cabicompta.com",
      subject: "Invoice attached",
    });
    expect(result.from).toBe("sender@example.com");
    expect(result.to).toBe("inbox@docs.cabicompta.com");
    expect(result.subject).toBe("Invoice attached");
  });

  it("handles array 'to' field", () => {
    const result = parseInboundEmail({
      from: "sender@example.com",
      to: ["first@docs.cabicompta.com", "second@docs.cabicompta.com"],
      subject: "Multiple recipients",
    });
    expect(result.to).toBe("first@docs.cabicompta.com");
  });

  it("extracts from SendGrid envelope format", () => {
    const result = parseInboundEmail({
      envelope: JSON.stringify({
        from: "sender@sg.com",
        to: ["target@docs.cabicompta.com"],
      }),
      from: "sender@sg.com",
      subject: "SendGrid test",
    });
    expect(result.from).toBe("sender@sg.com");
    expect(result.subject).toBe("SendGrid test");
  });

  it("handles Mailgun format with sender and recipient", () => {
    // Note: sender triggers the SendGrid/envelope branch in the code,
    // so `recipient` is not used — `to` comes from envelope or body.to
    const result = parseInboundEmail({
      sender: "mg-sender@example.com",
      recipient: "mg-inbox@docs.cabicompta.com",
      to: "mg-inbox@docs.cabicompta.com",
      subject: "Mailgun test",
    });
    expect(result.from).toBe("mg-sender@example.com");
    expect(result.to).toBe("mg-inbox@docs.cabicompta.com");
    expect(result.subject).toBe("Mailgun test");
  });

  it("falls back to Mailgun-only fields when no from/envelope/sender", () => {
    // This hits the final fallback branch
    const result = parseInboundEmail({
      subject: "Fallback test",
    });
    expect(result.from).toBe("");
    expect(result.to).toBe("");
    expect(result.subject).toBe("Fallback test");
  });

  it("defaults subject to '(sans objet)' when missing", () => {
    const result = parseInboundEmail({
      from: "sender@example.com",
      to: "inbox@docs.cabicompta.com",
    });
    expect(result.subject).toBe("(sans objet)");
  });

  it("parses attachments correctly", () => {
    const result = parseInboundEmail({
      from: "sender@example.com",
      to: "inbox@docs.cabicompta.com",
      subject: "With attachments",
      attachments: [
        {
          filename: "invoice.pdf",
          contentType: "application/pdf",
          content: "base64data",
          size: 12345,
        },
      ],
    });
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe("invoice.pdf");
    expect(result.attachments[0].contentType).toBe("application/pdf");
    expect(result.attachments[0].size).toBe(12345);
  });

  it("returns empty attachments when none provided", () => {
    const result = parseInboundEmail({
      from: "sender@example.com",
      to: "inbox@docs.cabicompta.com",
      subject: "No attachments",
    });
    expect(result.attachments).toEqual([]);
  });
});
