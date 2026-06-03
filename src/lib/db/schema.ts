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
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Enums
export const userRole = pgEnum("user_role", ["ADMIN", "STAFF", "INTERN", "CLIENT"]);
export const cabinetStatus = pgEnum("cabinet_status", ["ACTIVE", "SUSPENDED"]);
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
  // Catégories structurées (01-06)
  "DAS",
  "TPS_TVQ",
  "FINANCIAL_STATEMENT",
  "T1",
  "REQ_DOC",
  "IMMOBILISATION",
  // Catégories génériques
  "BANK_STATEMENT",
  "INVOICE",
  "TAX_NOTICE",
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
  "TPS_TVQ_INSTALMENT",
  "T4",
  "T4_SUMMARY",
  "RL1",
  "RL1_SUMMARY",
  "DAS",
  "CNESST",
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

export const companyType = pgEnum("company_type", [
  "T1_PARTICULIER",
  "T1_AUTONOME",
  "T2_SOCIETE",
]);

export const workflowStatus = pgEnum("workflow_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const workflowTaskStatus = pgEnum("workflow_task_status", [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "SKIPPED",
]);

// ═══════════════════════════════════════════════════════════
// Tenant — un cabinet = un client de la plateforme (multi-tenant)
// Toutes les tables métier portent un cabinet_id et sont scopées par lui.
// ═══════════════════════════════════════════════════════════
export const cabinets = pgTable("cabinets", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 63 }).notNull().unique(), // sous-domaines + namespacing storage (futur)
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  status: cabinetStatus("status").notNull().default("ACTIVE"),
  plan: varchar("plan", { length: 50 }).notNull().default("pilot"),
  // White-label
  displayName: varchar("display_name", { length: 255 }),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 9 }),
  emailFrom: varchar("email_from", { length: 255 }),
  // Contact
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  address: text("address"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Tables
// ═══════════════════════════════════════════════════════════

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  authId: text("auth_id").unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRole("role").notNull().default("CLIENT"),
  avatarUrl: text("avatar_url"),
  // Loi 25 : horodatage de l'acquittement de la notice de surveillance de
  // présence par l'employé (null = pas encore informé/acquitté). Auditable.
  presenceNoticeAckedAt: timestamp("presence_notice_acked_at"),
  // Mandat CFC + Loi 25 : consentement du client à l'analyse IA de ses
  // documents (null = pas encore consenti). Auditable.
  aiConsentAckedAt: timestamp("ai_consent_acked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("users_cabinet_idx").on(t.cabinetId),
}));

// Soft delete : deleted_at non-null = masqué de l'interface, données conservées
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
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
  type: companyType("type"),
  status: companyStatus("status").notNull().default("ACTIVE"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  // KYC / Conformité
  kycVerified: boolean("kyc_verified").notNull().default(false),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  conflictCheck: boolean("conflict_check").notNull().default(false),
  conflictCheckNotes: text("conflict_check_notes"),
  // Email inbox
  inboxEmail: varchar("inbox_email", { length: 255 }),
  inboxActive: boolean("inbox_active").notNull().default(false),
  // Informations bancaires — accès restreint ADMIN/STAFF uniquement
  bankName: varchar("bank_name", { length: 255 }),
  bankTransitNumber: varchar("bank_transit_number", { length: 20 }),
  bankInstitutionNumber: varchar("bank_institution_number", { length: 10 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankOnlineId: varchar("bank_online_id", { length: 255 }),
  bankPassword: text("bank_password"),
  // Portails gouvernementaux — accès restreint ADMIN/STAFF uniquement
  clicsequrId: varchar("clicsequr_id", { length: 255 }),
  clicsequrPassword: text("clicsequr_password"),
  arcId: varchar("arc_id", { length: 255 }),
  arcPassword: text("arc_password"),
  cnesstId: varchar("cnesst_id", { length: 255 }),
  cnesstPassword: text("cnesst_password"),
  reqId: varchar("req_id", { length: 255 }),
  reqPassword: text("req_password"),
  serviceCanadaId: varchar("service_canada_id", { length: 255 }),
  serviceCanadaPassword: text("service_canada_password"),
  // Profil fiscal — pilote automatique
  gstFiling: varchar("gst_filing", { length: 20 }).default("QUARTERLY"), // MONTHLY | QUARTERLY | ANNUAL | NONE
  hasEmployees: boolean("has_employees").notNull().default(false),
  employeeCount: integer("employee_count"),
  hasInstallments: boolean("has_installments").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("companies_cabinet_idx").on(t.cabinetId),
}));

// CASCADE sur company_members OK — si société supprimée physiquement (admin), les liens suivent
export const companyMembers = pgTable("company_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: memberRole("role").notNull().default("CONTACT"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("company_members_cabinet_idx").on(t.cabinetId),
}));

// RESTRICT : un document ne doit JAMAIS être supprimé par cascade
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
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
  subcategory: varchar("subcategory", { length: 50 }),
  fiscalYear: integer("fiscal_year"),
  extractedData: jsonb("extracted_data"),
  status: documentStatus("status").notNull().default("PENDING"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"), // Soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("documents_cabinet_idx").on(t.cabinetId),
}));

// RESTRICT : une facture ne doit JAMAIS être supprimée par cascade
// Conservation légale obligatoire (6 ans minimum au Québec)
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
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
  // Stripe
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripePaymentUrl: text("stripe_payment_url"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("invoices_cabinet_idx").on(t.cabinetId),
  // Le numéro de facture est unique PAR cabinet (plus globalement)
  invoiceNumberPerCabinet: uniqueIndex("invoices_cabinet_invoice_number_idx").on(t.cabinetId, t.invoiceNumber),
}));

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 })
    .notNull()
    .default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
}, (t) => ({
  cabinetIdx: index("invoice_items_cabinet_idx").on(t.cabinetId),
}));


export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: notificationType("type").notNull().default("SYSTEM"),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("notifications_cabinet_idx").on(t.cabinetId),
}));

export const fiscalDeadlines = pgTable("fiscal_deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
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
}, (t) => ({
  cabinetIdx: index("fiscal_deadlines_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Piste d'audit — qui a fait quoi, quand
// Conformité Ordre des CPA du Québec
// ═══════════════════════════════════════════════════════════
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN, etc.
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId: uuid("record_id"),
  oldData: jsonb("old_data"), // état avant modification
  newData: jsonb("new_data"), // état après modification
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("audit_logs_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Messagerie contextuelle — commentaires par document
// ═══════════════════════════════════════════════════════════
export const documentComments = pgTable("document_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("document_comments_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Time tracking — feuilles de temps par dossier
// ═══════════════════════════════════════════════════════════
export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
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
}, (t) => ({
  cabinetIdx: index("time_entries_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Journal d'accès — conformité Loi 25 (protection des
// renseignements personnels au Québec)
// ═══════════════════════════════════════════════════════════
export const accessLogs = pgTable("access_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // LOGIN, DOCUMENT_VIEW, DOCUMENT_DOWNLOAD, PORTAL_ACCESS
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // document, company, invoice
  resourceId: uuid("resource_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("access_logs_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// KYC — Conformité anti-blanchiment / Ordre des CPA
// ═══════════════════════════════════════════════════════════
export const kycDocuments = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  adminName: varchar("admin_name", { length: 255 }).notNull(),
  adminRole: varchar("admin_role", { length: 100 }).notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(), // PASSPORT, DRIVERS_LICENSE, HEALTH_CARD, etc.
  filePath: text("file_path"),
  verified: boolean("verified").notNull().default(false),
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("kyc_documents_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Workflows — gestion de la production du cabinet
// ═══════════════════════════════════════════════════════════

export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("workflow_templates_cabinet_idx").on(t.cabinetId),
}));

export const workflowTemplateTasks = pgTable("workflow_template_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  templateId: uuid("template_id")
    .notNull()
    .references(() => workflowTemplates.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("workflow_template_tasks_cabinet_idx").on(t.cabinetId),
}));

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  templateId: uuid("template_id").references(() => workflowTemplates.id, {
    onDelete: "set null",
  }),
  fiscalDeadlineId: uuid("fiscal_deadline_id").references(() => fiscalDeadlines.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  status: workflowStatus("status").notNull().default("NOT_STARTED"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  fiscalPeriod: varchar("fiscal_period", { length: 50 }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("workflows_cabinet_idx").on(t.cabinetId),
}));

export const workflowTasks = pgTable("workflow_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  status: workflowTaskStatus("status").notNull().default("TODO"),
  blockedBy: uuid("blocked_by"), // FK auto-référentielle ajoutée via ALTER TABLE
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  estimatedMinutes: integer("estimated_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("workflow_tasks_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Demandes documentaires — pilote automatique fiscal
// Documents requis par filing, visibles par le client
// ═══════════════════════════════════════════════════════════
export const documentRequests = pgTable("document_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  required: boolean("required").notNull().default(true),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | RECEIVED
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("document_requests_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Messagerie portail client — fil de discussion client ↔ cabinet
// ═══════════════════════════════════════════════════════════
export const portalMessages = pgTable("portal_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  fromRole: text("from_role").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  cabinetIdx: index("portal_messages_cabinet_idx").on(t.cabinetId),
}));

// ═══════════════════════════════════════════════════════════
// Présence — temps actif passé sur l'app par employé (automatique)
// Distinct de time_entries : présence ≠ heures facturables par dossier.
// Une ligne par (employé, jour), alimentée par les heartbeats du client.
// ═══════════════════════════════════════════════════════════
export const activitySessions = pgTable(
  "activity_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cabinetId: uuid("cabinet_id").notNull().references(() => cabinets.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    activeSeconds: integer("active_seconds").notNull().default(0),
    lastHeartbeatAt: timestamp("last_heartbeat_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userDateIdx: uniqueIndex("activity_user_date_idx").on(t.userId, t.date),
    cabinetIdx: index("activity_sessions_cabinet_idx").on(t.cabinetId),
  })
);

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
export type Cabinet = typeof cabinets.$inferSelect;
export type NewCabinet = typeof cabinets.$inferInsert;
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
export type KycDocument = typeof kycDocuments.$inferSelect;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type WorkflowTemplateTask = typeof workflowTemplateTasks.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type WorkflowTask = typeof workflowTasks.$inferSelect;
export type DocumentRequest = typeof documentRequests.$inferSelect;
export type PortalMessage = typeof portalMessages.$inferSelect;
export type ActivitySession = typeof activitySessions.$inferSelect;
