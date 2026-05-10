import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  pgEnum,
  integer,
  numeric,
  boolean,
  jsonb,
  date,
} from "drizzle-orm/pg-core";

// Enums
export const userRole = pgEnum("user_role", ["ADMIN", "STAFF", "CLIENT"]);
export const companyStatus = pgEnum("company_status", [
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);
export const memberRole = pgEnum("member_role", [
  "ADMINISTRATOR",
  "SHAREHOLDER",
  "CONTACT",
]);
export const documentCategory = pgEnum("document_category", [
  "BANK_STATEMENT",
  "INVOICE",
  "TAX_NOTICE",
  "FINANCIAL_STATEMENT",
  "TPS_TVQ",
  "CORPORATE",
  "CONTRACT",
  "RECEIPT",
  "OTHER",
]);
export const documentStatus = pgEnum("document_status", [
  "PENDING",
  "PROCESSED",
  "REJECTED",
]);
export const invoiceStatus = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);
export const notificationType = pgEnum("notification_type", [
  "DEADLINE",
  "DOCUMENT",
  "INVOICE",
  "APPOINTMENT",
  "TASK",
  "SYSTEM",
]);
export const fiscalType = pgEnum("fiscal_type", [
  "T2",
  "CO17",
  "TPS",
  "TVQ",
  "TPS_TVQ",
  "T4",
  "RL1",
  "DAS",
  "T2_PAYMENT",
  "CO17_PAYMENT",
  "INSTALMENT",
  "REQ_ANNUAL",
  "T5",
  "RL3",
]);
export const fiscalStatus = pgEnum("fiscal_status", [
  "UPCOMING",
  "IN_PROGRESS",
  "FILED",
  "OVERDUE",
]);

// ═══════════════════════════════════════════════════════════
// Tables
// ═══════════════════════════════════════════════════════════

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: text("auth_id").unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRole("role").notNull().default("CLIENT"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Soft delete : deleted_at non-null = masqué de l'interface, données conservées
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  neq: varchar("neq", { length: 20 }),
  arcNumber: varchar("arc_number", { length: 20 }),
  rqNumber: varchar("rq_number", { length: 20 }),
  fiscalYearEnd: date("fiscal_year_end"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 50 }).default("QC"),
  postalCode: varchar("postal_code", { length: 10 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  status: companyStatus("status").notNull().default("ACTIVE"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"), // Soft delete — conservation légale
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CASCADE sur company_members OK — si société supprimée physiquement (admin), les liens suivent
export const companyMembers = pgTable("company_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull().default("CONTACT"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// RESTRICT : un document ne doit JAMAIS être supprimé par cascade
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  category: documentCategory("category").default("OTHER"),
  fiscalYear: integer("fiscal_year"),
  extractedData: jsonb("extracted_data"),
  status: documentStatus("status").notNull().default("PENDING"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"), // Soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// RESTRICT : une facture ne doit JAMAIS être supprimée par cascade
// Conservation légale obligatoire (6 ans minimum au Québec)
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  amountHt: numeric("amount_ht", { precision: 10, scale: 2 }).notNull(),
  tps: numeric("tps", { precision: 10, scale: 2 }).notNull(),
  tvq: numeric("tvq", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  // Taux appliqués au moment de l'émission — fige le contexte légal
  tpsRate: numeric("tps_rate", { precision: 5, scale: 3 }).notNull().default("5.000"),
  tvqRate: numeric("tvq_rate", { precision: 6, scale: 3 }).notNull().default("9.975"),
  status: invoiceStatus("status").notNull().default("DRAFT"),
  issuedAt: timestamp("issued_at"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"), // Soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 })
    .notNull()
    .default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
});


export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: notificationType("type").notNull().default("SYSTEM"),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fiscalDeadlines = pgTable("fiscal_deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  type: fiscalType("type").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  period: varchar("period", { length: 50 }),
  dueDate: date("due_date").notNull(),
  status: fiscalStatus("status").notNull().default("UPCOMING"),
  filedAt: timestamp("filed_at"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Piste d'audit — qui a fait quoi, quand
// Conformité Ordre des CPA du Québec
// ═══════════════════════════════════════════════════════════
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN, etc.
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId: uuid("record_id"),
  oldData: jsonb("old_data"), // état avant modification
  newData: jsonb("new_data"), // état après modification
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Messagerie contextuelle — commentaires par document
// ═══════════════════════════════════════════════════════════
export const documentComments = pgTable("document_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Time tracking — feuilles de temps par dossier
// ═══════════════════════════════════════════════════════════
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  duration: integer("duration").notNull(), // minutes
  description: text("description").notNull(),
  date: date("date").notNull(),
  billable: boolean("billable").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Journal d'accès — conformité Loi 25 (protection des
// renseignements personnels au Québec)
// ═══════════════════════════════════════════════════════════
export const accessLogs = pgTable("access_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // LOGIN, DOCUMENT_VIEW, DOCUMENT_DOWNLOAD, PORTAL_ACCESS
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // document, company, invoice
  resourceId: uuid("resource_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type FiscalDeadline = typeof fiscalDeadlines.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type DocumentComment = typeof documentComments.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type AccessLog = typeof accessLogs.$inferSelect;
