import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendWelcomeEmail,
  sendDocumentRequestEmail,
  sendDeadlineReminderEmail,
  sendInvoiceEmail,
} from "@/lib/email";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("email templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("without RESEND_API_KEY", () => {
    it("sendWelcomeEmail returns false gracefully", async () => {
      const result = await sendWelcomeEmail("test@test.com", "Test", "pass123");
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("sendDocumentRequestEmail returns false gracefully", async () => {
      const result = await sendDocumentRequestEmail("test@test.com", "Test", "Company");
      expect(result).toBe(false);
    });

    it("sendDeadlineReminderEmail returns false gracefully", async () => {
      const result = await sendDeadlineReminderEmail("test@test.com", "Test", "T2", 7);
      expect(result).toBe(false);
    });

    it("sendInvoiceEmail returns false gracefully", async () => {
      const result = await sendInvoiceEmail("test@test.com", "Test", "FAC-001", "500 $");
      expect(result).toBe(false);
    });
  });
});
