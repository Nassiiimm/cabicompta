import { describe, it, expect } from "vitest";
import * as schema from "@/lib/db/schema";

describe("database schema", () => {
  it("exports all 17 table definitions", () => {
    expect(schema.users).toBeDefined();
    expect(schema.companies).toBeDefined();
    expect(schema.companyMembers).toBeDefined();
    expect(schema.documents).toBeDefined();
    expect(schema.invoices).toBeDefined();
    expect(schema.invoiceItems).toBeDefined();
    expect(schema.notifications).toBeDefined();
    expect(schema.fiscalDeadlines).toBeDefined();
    expect(schema.auditLogs).toBeDefined();
    expect(schema.documentComments).toBeDefined();
    expect(schema.timeEntries).toBeDefined();
    expect(schema.accessLogs).toBeDefined();
    expect(schema.kycDocuments).toBeDefined();
    expect(schema.workflowTemplates).toBeDefined();
    expect(schema.workflowTemplateTasks).toBeDefined();
    expect(schema.workflows).toBeDefined();
    expect(schema.workflowTasks).toBeDefined();
  });

  it("does NOT export removed tables (tasks, appointments)", () => {
    expect((schema as Record<string, unknown>).tasks).toBeUndefined();
    expect((schema as Record<string, unknown>).appointments).toBeUndefined();
  });

  it("companies has soft delete field", () => {
    expect(schema.companies.deletedAt).toBeDefined();
  });

  it("invoices has tax rate fields", () => {
    expect(schema.invoices.tpsRate).toBeDefined();
    expect(schema.invoices.tvqRate).toBeDefined();
  });

  it("documents has soft delete field", () => {
    expect(schema.documents.deletedAt).toBeDefined();
  });

  it("invoices has soft delete field", () => {
    expect(schema.invoices.deletedAt).toBeDefined();
  });

  it("exports all enums", () => {
    expect(schema.userRole).toBeDefined();
    expect(schema.companyStatus).toBeDefined();
    expect(schema.memberRole).toBeDefined();
    expect(schema.documentCategory).toBeDefined();
    expect(schema.documentStatus).toBeDefined();
    expect(schema.invoiceStatus).toBeDefined();
    expect(schema.notificationType).toBeDefined();
    expect(schema.fiscalType).toBeDefined();
    expect(schema.fiscalStatus).toBeDefined();
    expect(schema.companyType).toBeDefined();
    expect(schema.workflowStatus).toBeDefined();
    expect(schema.workflowTaskStatus).toBeDefined();
  });

  it("does NOT export removed enums", () => {
    expect((schema as Record<string, unknown>).taskStatus).toBeUndefined();
    expect((schema as Record<string, unknown>).taskPriority).toBeUndefined();
    expect((schema as Record<string, unknown>).appointmentStatus).toBeUndefined();
  });

  it("userRole has correct values", () => {
    expect(schema.userRole.enumValues).toEqual(["ADMIN", "STAFF", "INTERN", "CLIENT"]);
  });

  it("companyStatus has correct values", () => {
    expect(schema.companyStatus.enumValues).toEqual(["ACTIVE", "INACTIVE", "ARCHIVED"]);
  });

  it("documentCategory has all 13 categories", () => {
    expect(schema.documentCategory.enumValues).toHaveLength(13);
    expect(schema.documentCategory.enumValues).toContain("BANK_STATEMENT");
    expect(schema.documentCategory.enumValues).toContain("TPS_TVQ");
    expect(schema.documentCategory.enumValues).toContain("DAS");
    expect(schema.documentCategory.enumValues).toContain("IMMOBILISATION");
  });

  it("invoiceStatus has all 5 statuses", () => {
    expect(schema.invoiceStatus.enumValues).toEqual([
      "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED",
    ]);
  });

  it("fiscalType has all tax types", () => {
    const types = schema.fiscalType.enumValues;
    expect(types).toContain("T2");
    expect(types).toContain("CO17");
    expect(types).toContain("TPS_TVQ");
    expect(types).toContain("DAS");
    expect(types).toContain("INSTALMENT");
    expect(types).toContain("REQ_ANNUAL");
  });

  it("companies table has assignedTo field", () => {
    expect(schema.companies.assignedTo).toBeDefined();
  });

  it("companies table has banking fields", () => {
    expect(schema.companies.bankName).toBeDefined();
    expect(schema.companies.bankTransitNumber).toBeDefined();
    expect(schema.companies.bankInstitutionNumber).toBeDefined();
    expect(schema.companies.bankAccountNumber).toBeDefined();
    expect(schema.companies.bankOnlineId).toBeDefined();
    expect(schema.companies.bankPassword).toBeDefined();
  });

  it("companies table has type field", () => {
    expect(schema.companies.type).toBeDefined();
  });

  it("documents table has subcategory field", () => {
    expect(schema.documents.subcategory).toBeDefined();
  });

  it("workflows table has fiscalDeadlineId field", () => {
    expect(schema.workflows.fiscalDeadlineId).toBeDefined();
  });

  it("exports type helpers", () => {
    const _user: schema.User | undefined = undefined;
    const _company: schema.Company | undefined = undefined;
    const _doc: schema.Document | undefined = undefined;
    const _invoice: schema.Invoice | undefined = undefined;
    const _notification: schema.Notification | undefined = undefined;
    const _deadline: schema.FiscalDeadline | undefined = undefined;
    const _audit: schema.AuditLog | undefined = undefined;
    const _comment: schema.DocumentComment | undefined = undefined;
    const _time: schema.TimeEntry | undefined = undefined;
    const _access: schema.AccessLog | undefined = undefined;
    const _kyc: schema.KycDocument | undefined = undefined;
    const _wfTemplate: schema.WorkflowTemplate | undefined = undefined;
    const _wfTemplateTask: schema.WorkflowTemplateTask | undefined = undefined;
    const _wf: schema.Workflow | undefined = undefined;
    const _wfTask: schema.WorkflowTask | undefined = undefined;
    expect(true).toBe(true);
  });
});
