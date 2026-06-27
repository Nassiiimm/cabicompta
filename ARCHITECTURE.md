# CabiCompta — Architecture complète

> Gestion de cabinet comptable québécois
> Stack : Next.js 16, Drizzle ORM, PostgreSQL (Supabase), Supabase Auth/Storage, Tailwind, shadcn/ui
> Date : mai 2026 — 17 tables, 11 enums, ~25K LOC, 205 tests

---

## Analyse fiscale IA (absorption de FiscalAuto — juin 2026)

CabiCompta intègre désormais les **9 analyseurs fiscaux** auparavant fournis par le projet
tiers **FiscalAuto** (Express + Gemini + Turso, mono-tenant). FiscalAuto est **décommissionné** :
ses clients/dossiers vivaient déjà dans CabiCompta et son analyse est absorbée. Le patch
`fiscalauto-cabicompta-compat.patch` est donc **caduc**.

- **Source unique** : `src/lib/analysis/specs.ts` (prompt + schéma + normalisation par type).
- **Moteur** : `src/lib/ocr.ts` → `analyzeDocument()` (Claude).
- **Deux canaux** : (1) **web** `POST /api/analyze/[type]` via API Anthropic payante ;
  (2) **poste** `GET /api/ingest/analysis-specs` + MCP (`get_analysis_spec`) exécuté par le
  Claude Max du cabinet (gratuit), résultats poussés via `/api/ingest/documents`.
- **Stockage** : `documents.extractedData` (jsonb), typé par catégorie.
- **Affichage** : `src/app/(cabinet)/documents/[id]/page.tsx` + `components/cabinet/analysis-view.tsx`.

---

## 1. Structure des dossiers

```
cabicompta/
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Groupe de routes non-protégées
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── (cabinet)/                # Espace cabinet — ADMIN + STAFF
│   │   │   ├── layout.tsx            # Layout avec Sidebar + auth check
│   │   │   ├── dashboard/page.tsx    # Vue d'ensemble + graphique revenus
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx          # Liste clients (filtres, recherche)
│   │   │   │   ├── new/page.tsx      # Création société
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Fiche client (Server Component)
│   │   │   │       ├── client-tabs.tsx       # Onglets (Aperçu/Docs/Factures/Échéances/Workflows/Temps/Conformité)
│   │   │   │       ├── workflow-tab.tsx      # Onglet workflows
│   │   │   │       ├── time-tracker.tsx      # Saisie temps manuelle
│   │   │   │       ├── kyc-section.tsx       # KYC / conformité
│   │   │   │       ├── assign-staff.tsx      # Assignation comptable
│   │   │   │       ├── invite-client.tsx     # Invitation portail client
│   │   │   │       ├── deadline-action.tsx   # Changer statut échéance
│   │   │   │       ├── generate-deadlines-button.tsx
│   │   │   │       ├── request-docs-button.tsx
│   │   │   │       ├── delete-button.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   ├── workflows/
│   │   │   │   └── page.tsx          # Vue globale tous les workflows (staff)
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx          # Liste docs (filtres, upload)
│   │   │   │   ├── document-filters.tsx
│   │   │   │   ├── document-search.tsx
│   │   │   │   ├── document-list-actions.tsx
│   │   │   │   └── documents-actions.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx          # Liste factures
│   │   │   │   ├── new/page.tsx      # Création facture (+ prefill depuis temps)
│   │   │   │   ├── invoice-filters.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Détail facture + PDF + Stripe
│   │   │   │       └── invoice-actions.tsx
│   │   │   ├── admin/
│   │   │   │   ├── practice/page.tsx         # Super-dashboard cabinet
│   │   │   │   ├── audit/page.tsx            # Journal d'audit (Ordre CPA)
│   │   │   │   ├── access/page.tsx           # Journal d'accès (Loi 25)
│   │   │   │   ├── staff/page.tsx            # Gestion équipe
│   │   │   │   └── workflow-templates/page.tsx # CRUD modèles workflows
│   │   │   └── profile/page.tsx
│   │   │
│   │   ├── (portal)/                 # Portail client — CLIENT uniquement
│   │   │   ├── layout.tsx
│   │   │   └── portal/
│   │   │       ├── page.tsx          # Dashboard client (upload, notifications)
│   │   │       ├── documents/page.tsx
│   │   │       ├── invoices/page.tsx
│   │   │       └── profile/page.tsx
│   │   │
│   │   └── api/                      # Route handlers Next.js
│   │       ├── auth/
│   │       │   ├── me/route.ts               # GET /api/auth/me
│   │       │   └── reset-password/route.ts
│   │       ├── clients/
│   │       │   ├── route.ts                  # GET /POST /api/clients
│   │       │   └── [id]/
│   │       │       ├── route.ts              # GET/PUT/DELETE
│   │       │       ├── assign/route.ts       # PUT assignation staff
│   │       │       ├── invite/route.ts       # POST invitation client
│   │       │       └── kyc-status/route.ts   # PUT statut KYC
│   │       ├── documents/
│   │       │   ├── route.ts                  # GET/POST (upload)
│   │       │   └── [id]/
│   │       │       ├── route.ts              # GET/PUT/DELETE
│   │       │       └── comments/route.ts     # GET/POST commentaires
│   │       ├── invoices/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── pdf/route.ts          # GET → génère PDF
│   │       │       └── payment-link/route.ts # POST → Stripe checkout
│   │       ├── workflows/
│   │       │   ├── route.ts                  # GET/POST workflows
│   │       │   └── [id]/
│   │       │       ├── route.ts              # GET/PUT/DELETE workflow
│   │       │       └── tasks/[taskId]/route.ts # PUT mise à jour tâche
│   │       ├── workflow-templates/
│   │       │   ├── route.ts                  # GET/POST templates (admin)
│   │       │   └── [id]/route.ts             # GET/PUT/DELETE
│   │       ├── fiscal/
│   │       │   ├── generate/route.ts         # POST génération échéances
│   │       │   ├── [id]/route.ts             # PUT statut échéance
│   │       │   ├── check-deadlines/route.ts  # GET cron — vérifie retards
│   │       │   ├── check-invoices/route.ts   # GET cron — vérifie factures
│   │       │   └── auto-reminders/route.ts   # GET cron — envoie rappels
│   │       ├── time-entries/
│   │       │   ├── route.ts                  # GET/POST
│   │       │   └── to-invoice/route.ts       # POST → prefill facture
│   │       ├── notifications/
│   │       │   ├── route.ts                  # GET
│   │       │   └── read/route.ts             # PUT marquer lu
│   │       ├── admin/
│   │       │   ├── staff/route.ts            # GET/POST membres staff
│   │       │   ├── staff/[id]/route.ts       # PUT/DELETE
│   │       │   ├── audit-logs/route.ts       # GET
│   │       │   └── access-logs/route.ts      # GET
│   │       ├── analytics/revenue/route.ts    # GET données graphique
│   │       ├── kyc/route.ts / [id]/route.ts  # CRUD KYC docs
│   │       ├── ocr/route.ts                  # POST → Claude Vision API
│   │       ├── staff/route.ts                # GET liste staff (pour assignation)
│   │       ├── portal/company/route.ts       # GET infos société (portail)
│   │       ├── export/
│   │       │   ├── clients/route.ts          # GET → CSV
│   │       │   ├── invoices/route.ts         # GET → CSV
│   │       │   ├── time-entries/route.ts     # GET → CSV
│   │       │   └── audit-logs/route.ts       # GET → CSV
│   │       └── webhooks/
│   │           ├── stripe/route.ts           # POST → checkout.session.completed
│   │           └── inbound-email/route.ts    # POST → email entrant → document
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui : badge, button, card, input, label, textarea, sonner
│   │   ├── cabinet/
│   │   │   ├── sidebar.tsx           # Navigation principale
│   │   │   ├── mobile-nav.tsx        # Navigation mobile
│   │   │   ├── document-comments.tsx # Messagerie par document
│   │   │   ├── upload-dialog.tsx     # Dialog upload
│   │   │   ├── export-button.tsx     # Export CSV
│   │   │   └── revenue-chart.tsx     # Graphique Recharts
│   │   ├── portal/
│   │   │   ├── portal-header.tsx
│   │   │   ├── portal-upload-zone.tsx    # Drag & drop
│   │   │   ├── portal-document-list.tsx
│   │   │   ├── portal-invoice-list.tsx
│   │   │   ├── portal-archive.tsx
│   │   │   └── mobile-scanner.tsx        # PWA caméra + grayscale
│   │   ├── notification-bell.tsx
│   │   └── theme-toggle.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle schema (17 tables, 11 enums)
│   │   │   ├── index.ts              # Instance Drizzle
│   │   │   └── migrations/           # SQL générés par drizzle-kit generate
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase client-side
│   │   │   ├── server.ts             # Supabase server-side
│   │   │   ├── middleware.ts         # updateSession
│   │   │   └── storage.ts            # uploadFile, getSignedUrl
│   │   ├── auth.ts                   # getSession, requireAuth, requireStaff, requireAdmin
│   │   ├── audit.ts                  # logAudit() — fire-and-forget
│   │   ├── access-log.ts             # logAccess() — fire-and-forget
│   │   ├── email.ts                  # Resend — sendEmail()
│   │   ├── ocr.ts                    # Claude Vision — extractDocumentData()
│   │   ├── fiscal-calendar.ts        # Génération échéances Québec
│   │   ├── inbox.ts                  # generateInboxEmail()
│   │   ├── rate-limit.ts             # rateLimitByIp() — Map in-memory
│   │   ├── csv.ts                    # toCSV()
│   │   └── utils.ts                  # cn()
│   │
│   ├── types/index.ts                # AppUser type
│   ├── proxy.ts                      # Middleware Next.js 16 (auth session)
│   └── tests/                        # 27 fichiers, 205 tests (vitest)
│
├── drizzle.config.ts
├── next.config.ts
└── .env.local
```

---

## 2. Schéma de base de données

### 11 Enums

| Enum | Valeurs |
|------|---------|
| `user_role` | ADMIN, STAFF, CLIENT |
| `company_status` | ACTIVE, INACTIVE, ARCHIVED |
| `member_role` | ADMINISTRATOR, SHAREHOLDER, CONTACT |
| `document_category` | BANK_STATEMENT, INVOICE, TAX_NOTICE, FINANCIAL_STATEMENT, TPS_TVQ, CORPORATE, CONTRACT, RECEIPT, OTHER |
| `document_status` | PENDING, PROCESSED, REJECTED |
| `invoice_status` | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| `notification_type` | DEADLINE, DOCUMENT, INVOICE, APPOINTMENT, TASK, SYSTEM |
| `fiscal_type` | T2, CO17, TPS, TVQ, TPS_TVQ, T4, RL1, DAS, T2_PAYMENT, CO17_PAYMENT, INSTALMENT, REQ_ANNUAL, T5, RL3 |
| `fiscal_status` | UPCOMING, IN_PROGRESS, FILED, OVERDUE |
| `workflow_status` | NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED |
| `workflow_task_status` | TODO, IN_PROGRESS, DONE, SKIPPED |

---

### 17 Tables — Relations

```
┌─────────────┐
│    users    │──────────────────────────────────────────────┐
│  (ADMIN /   │                                              │
│  STAFF /    │◄── assigned_to ──── companies ──────────────►│
│  CLIENT)    │                         │                    │
└─────────────┘                         │ 1:N               │
       │                                ▼                    │
       │                    ┌──────────────────┐             │
       │◄── user_id ────────│ company_members  │             │
       │                    │ (rôle par société)│             │
       │                    └──────────────────┘             │
       │                                │                    │
       │                    ┌───────────┴──────────────────┐ │
       │                    │           │                  │ │
       │                    ▼           ▼                  ▼ │
       │              documents      invoices     fiscal_     │
       │              (RESTRICT)    (RESTRICT)   deadlines   │
       │                  │             │        (RESTRICT)  │
       │                  │             ▼                    │
       │                  │       invoice_items              │
       │                  │        (CASCADE)                 │
       │                  ▼                                  │
       │         document_comments                           │
       │           (CASCADE)                                 │
       │                                                     │
       │◄── user_id ─── time_entries (company RESTRICT)      │
       │◄── user_id ─── notifications                        │
       │◄── user_id ─── audit_logs (SET NULL)                │
       │◄── user_id ─── access_logs (SET NULL)               │
       │◄── verified_by ── kyc_documents (company RESTRICT)  │
       │◄── created_by ─── workflow_templates                │
       └──────────────────────────────────────────────────────┘

workflow_templates ──1:N──► workflow_template_tasks (CASCADE)
       │
       │ (optionnel, SET NULL)
       ▼
   workflows ──────────────────── companies (RESTRICT)
       │          └── assigned_to/created_by ── users (SET NULL)
       │
       └──1:N──► workflow_tasks (CASCADE)
                   └── assigned_to/completed_by ── users (SET NULL)
```

---

### Détail des 17 tables

#### users
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| auth_id | text UNIQUE | Lien Supabase Auth |
| email | varchar(255) UNIQUE | |
| name | varchar(255) | |
| phone | varchar(20) | |
| role | user_role | default CLIENT |
| avatar_url | text | |
| created_at / updated_at | timestamp | |

#### companies
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| name | varchar(255) | |
| neq | varchar(20) | Numéro Entreprise Québec |
| arc_number | varchar(20) | Numéro ARC fédéral |
| rq_number | varchar(20) | Numéro Revenu Québec |
| fiscal_year_end | date | |
| address, city, province, postal_code | text/varchar | |
| phone, email | varchar | |
| status | company_status | default ACTIVE |
| assigned_to | uuid → users SET NULL | Comptable responsable |
| notes | text | |
| kyc_verified | boolean | default false |
| kyc_verified_at | timestamp | |
| conflict_check | boolean | default false |
| conflict_check_notes | text | |
| inbox_email | varchar(255) | ex: transport-leveille@docs.cabicompta.com |
| inbox_active | boolean | default false |
| deleted_at | timestamp | **Soft delete** |
| created_at / updated_at | timestamp | |

#### company_members
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| company_id | uuid → companies CASCADE | |
| user_id | uuid → users CASCADE | |
| role | member_role | default CONTACT |
| is_primary | boolean | default false |
| created_at | timestamp | |

#### documents
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| company_id | uuid → companies **RESTRICT** | |
| uploaded_by | uuid → users | |
| file_name | varchar(500) | |
| file_path | text | Chemin Supabase Storage |
| file_size | integer | octets |
| mime_type | varchar(100) | |
| category | document_category | default OTHER |
| fiscal_year | integer | |
| extracted_data | jsonb | Données OCR Claude Vision |
| status | document_status | default PENDING |
| notes | text | |
| deleted_at | timestamp | **Soft delete** |
| created_at / updated_at | timestamp | |

#### invoices
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| company_id | uuid → companies **RESTRICT** | |
| invoice_number | varchar(50) UNIQUE | |
| amount_ht | numeric(10,2) | |
| tps | numeric(10,2) | Montant TPS calculé |
| tvq | numeric(10,2) | Montant TVQ calculé |
| total | numeric(10,2) | |
| tps_rate | numeric(5,3) | **Figé à l'émission** (5.000) |
| tvq_rate | numeric(6,3) | **Figé à l'émission** (9.975) |
| status | invoice_status | default DRAFT |
| issued_at | timestamp | Date d'émission |
| due_date | date | |
| paid_at | timestamp | |
| notes | text | |
| stripe_payment_intent_id | varchar(255) | |
| stripe_payment_url | text | URL Checkout |
| payment_method | varchar(50) | stripe/interac/cash |
| deleted_at | timestamp | **Soft delete** |
| created_at / updated_at | timestamp | |

#### invoice_items
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| invoice_id | uuid → invoices CASCADE | |
| description | text | |
| quantity | numeric(10,2) | default 1 |
| unit_price | numeric(10,2) | |
| amount | numeric(10,2) | quantity × unit_price |

#### fiscal_deadlines
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| company_id | uuid → companies **RESTRICT** | |
| type | fiscal_type | T2, CO17, TPS, TVQ, T4, RL1, DAS… |
| label | varchar(255) | ex: "Déclaration T2 — 2026" |
| period | varchar(50) | ex: "2026", "2026-Q1" |
| due_date | date | |
| status | fiscal_status | default UPCOMING |
| filed_at | timestamp | |
| notes | text | |
| deleted_at | timestamp | **Soft delete** |
| created_at | timestamp | |

#### notifications
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid → users CASCADE | |
| title | varchar(255) | |
| message | text | |
| type | notification_type | default SYSTEM |
| read | boolean | default false |
| link | text | URL de redirection |
| created_at | timestamp | |

#### document_comments
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| document_id | uuid → documents CASCADE | |
| user_id | uuid → users CASCADE | |
| message | text | |
| created_at | timestamp | |

#### time_entries
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid → users CASCADE | Comptable |
| company_id | uuid → companies **RESTRICT** | |
| duration | integer | Minutes |
| description | text | |
| date | date | |
| billable | boolean | default true |
| created_at | timestamp | |

#### audit_logs
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid → users SET NULL | Auteur de l'action |
| action | varchar(50) | CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN |
| table_name | varchar(50) | Table modifiée |
| record_id | uuid | ID de l'enregistrement |
| old_data | jsonb | État avant |
| new_data | jsonb | État après |
| ip_address | varchar(45) | IPv4 ou IPv6 |
| created_at | timestamp | |

#### access_logs
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid → users SET NULL | |
| action | varchar(50) | LOGIN, DOCUMENT_VIEW, DOCUMENT_DOWNLOAD, PORTAL_ACCESS |
| resource_type | varchar(50) | document, company, invoice |
| resource_id | uuid | |
| ip_address | varchar(45) | |
| user_agent | text | |
| created_at | timestamp | |

#### kyc_documents
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| company_id | uuid → companies **RESTRICT** | |
| admin_name | varchar(255) | Nom de l'administrateur identifié |
| admin_role | varchar(100) | Rôle dans la société |
| document_type | varchar(50) | PASSPORT, DRIVERS_LICENSE, HEALTH_CARD… |
| file_path | text | Supabase Storage |
| verified | boolean | default false |
| verified_by | uuid → users SET NULL | |
| verified_at | timestamp | |
| notes | text | |
| created_at | timestamp | |

#### workflow_templates
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| name | varchar(255) | ex: "Bilan annuel T2", "TPS trimestrielle" |
| description | text | |
| created_by | uuid → users SET NULL | |
| created_at / updated_at | timestamp | |

#### workflow_template_tasks
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| template_id | uuid → workflow_templates CASCADE | |
| title | varchar(255) | ex: "Collecter relevés bancaires" |
| description | text | |
| order | integer | Ordre d'affichage |
| estimated_minutes | integer | Durée estimée |
| created_at | timestamp | |

#### workflows
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| company_id | uuid → companies **RESTRICT** | |
| template_id | uuid → workflow_templates SET NULL | Modèle source (optionnel) |
| name | varchar(255) | |
| status | workflow_status | Auto-calculé selon tâches |
| assigned_to | uuid → users SET NULL | Comptable responsable |
| due_date | date | |
| fiscal_period | varchar(50) | ex: "2026-Q1" |
| created_by | uuid → users SET NULL | |
| created_at / updated_at | timestamp | |

#### workflow_tasks
| Colonne | Type | Notes |
|---------|------|-------|
| id | uuid PK | |
| workflow_id | uuid → workflows CASCADE | |
| title | varchar(255) | |
| description | text | |
| order | integer | |
| assigned_to | uuid → users SET NULL | |
| status | workflow_task_status | default TODO |
| completed_at | timestamp | Auto-set lors du passage à DONE |
| completed_by | uuid → users SET NULL | Auto-set |
| notes | text | |
| estimated_minutes | integer | |
| created_at / updated_at | timestamp | |

---

## 3. Flux d'authentification

```
Browser
  │
  ├── GET /*
  │     │
  │     ▼
  │   proxy.ts (Next.js matcher — toutes routes sauf _next/static, images)
  │     │
  │     ▼
  │   updateSession() [Supabase middleware]
  │     ├── Cookie valide → refresh token si expiré → continue
  │     └── Pas de cookie → redirect /login
  │
  ├── Page/Route Handler
  │     │
  │     ▼
  │   requireAuth()        → throw "Unauthorized" si pas de session
  │   requireStaff()       → throw "Forbidden" si role === CLIENT
  │   requireAdmin()       → throw "Forbidden" si role !== ADMIN
  │
  └── Supabase Auth (JWT)
        ├── users.auth_id ←→ supabase.auth.users.id
        └── Session cookiée (httpOnly, sameSite)
```

---

## 4. Flux par fonctionnalité

### Upload document

```
Client/Staff → POST /api/documents (multipart/form-data)
  ├── rateLimitByIp() — 20 req/min
  ├── requireAuth()
  ├── Vérification membership si CLIENT
  ├── Validation taille (10 Mo max)
  ├── uploadFile() → Supabase Storage bucket "documents"
  │     path: {companyId}/{timestamp}_{safeName}
  ├── INSERT documents
  └── logAudit(CREATE, documents)
```

### Génération facture PDF

```
Staff → GET /api/invoices/[id]/pdf
  ├── requireStaff()
  ├── Fetch invoice + invoice_items + company depuis DB
  ├── html2canvas → canvas → jsPDF
  └── Response avec Content-Type: application/pdf
```

### Paiement Stripe

```
Staff → POST /api/invoices/[id]/payment-link
  ├── Crée Stripe Checkout Session (mode payment)
  ├── UPDATE invoices SET stripe_payment_url
  └── Return {url}

Client → Stripe Checkout → Paiement → Webhook

POST /api/webhooks/stripe (vérification signature Stripe)
  └── checkout.session.completed
      └── UPDATE invoices SET status=PAID, paid_at=now()
```

### OCR document

```
Staff → POST /api/ocr { documentId }
  ├── requireStaff()
  ├── getSignedUrl(filePath) — URL temporaire 1h
  ├── Claude Vision API (claude-3-5-sonnet)
  │     Prompt : extraire montants, dates, catégorie
  └── UPDATE documents SET extracted_data = { ... }
```

### Calendrier fiscal — génération

```
POST /api/fiscal/generate { companyId }
  ├── fiscal-calendar.ts — calcule toutes les échéances
  │     selon fiscal_year_end de la société
  │     Québec : T2, CO-17, TPS/TVQ (mensuel/trimestriel/annuel),
  │              DAS, T4, RL-1, REQ annuel, acomptes provisionnels
  └── INSERT fiscal_deadlines (ignoré si déjà existant)

Crons (vercel.json ou cron job externe) :
  GET /api/fiscal/check-deadlines  → passe UPCOMING→OVERDUE si date dépassée
  GET /api/fiscal/check-invoices   → passe SENT→OVERDUE si due_date dépassée
  GET /api/fiscal/auto-reminders   → envoie emails rappels J-7, J-1
```

### Workflow

```
Admin → POST /api/workflow-templates
  └── Crée modèle + étapes (ex: "Bilan T2" avec 8 étapes)

Staff → POST /api/workflows { companyId, templateId, name, dueDate }
  ├── Crée workflow
  ├── Copie les étapes du template → workflow_tasks (status: TODO)
  └── workflow.status = NOT_STARTED

Staff → PUT /api/workflows/[id]/tasks/[taskId] { status: "DONE" }
  ├── Met à jour la tâche (completed_at, completed_by)
  └── Recalcule workflow.status :
        todo=0 && done=N → COMPLETED
        done>0 || in_progress>0 → IN_PROGRESS
        sinon → NOT_STARTED
```

### Email inbox

```
Email entrant → Webhook inbound (Mailgun/SendGrid/Postmark)
POST /api/webhooks/inbound-email
  ├── Identifie la société via inbox_email
  ├── Sauvegarde pièce jointe → Supabase Storage
  └── INSERT documents (status: PENDING, category: OTHER)
```

---

## 5. Rôles et permissions

| Action | ADMIN | STAFF | CLIENT |
|--------|-------|-------|--------|
| Dashboard cabinet | ✅ | ✅ | ❌ |
| CRUD clients | ✅ | ✅ | ❌ |
| Voir ses propres documents | ✅ | ✅ | ✅ (sa société) |
| Upload documents | ✅ | ✅ | ✅ (sa société) |
| Traiter documents (OCR, statut) | ✅ | ✅ | ❌ |
| CRUD factures | ✅ | ✅ | ❌ |
| Voir ses factures | ✅ | ✅ | ✅ (sa société) |
| Payer via Stripe | ✅ | ✅ | ✅ |
| Workflows | ✅ | ✅ | ❌ |
| Modèles workflows | ✅ | ❌ | ❌ |
| Time tracking | ✅ | ✅ | ❌ |
| Gestion équipe | ✅ | ❌ | ❌ |
| Journal audit | ✅ | ❌ | ❌ |
| Journal accès | ✅ | ❌ | ❌ |
| KYC | ✅ | ✅ | ❌ |
| Vue pratique | ✅ | ❌ | ❌ |
| Scanner mobile PWA | ❌ | ❌ | ✅ |

---

## 6. Conformité légale

| Obligation | Implémentation |
|------------|----------------|
| Conservation 6 ans (LI Québec art. 1000) | Soft delete sur companies, documents, invoices, fiscal_deadlines |
| Suppression physique impossible tant qu'il y a des documents/factures | FK RESTRICT sur toutes les tables critiques |
| Taux de taxes figés au moment de l'émission | tps_rate / tvq_rate stockés dans invoices |
| Piste d'audit (Ordre des CPA du Québec) | audit_logs — qui, quoi, avant/après, IP |
| Journal d'accès (Loi 25 Québec) | access_logs — LOGIN, DOCUMENT_VIEW, DOWNLOAD |
| KYC / Anti-blanchiment (Ordre des CPA) | kyc_documents — pièces d'identité + vérification conflit |
| Numéros fiscaux québécois | NEQ, numéro RQ, numéro ARC par société |

---

## 7. Stockage

```
Supabase Storage
└── bucket: "documents" (privé, RLS)
    └── {company_id}/{timestamp}_{safe_file_name}
        Accès via getSignedUrl() — expiration 1h
        Taille max : 10 Mo par fichier
        Types : tout accepté (⚠ whitelist MIME à implémenter)
```

---

## 8. Services externes

| Service | Usage | Config |
|---------|-------|--------|
| Supabase Auth | Sessions, JWT, magic link | .env.local |
| Supabase Storage | Stockage fichiers | bucket "documents" |
| Supabase DB | PostgreSQL hébergé | ca-central-1 |
| Stripe | Checkout sessions, webhooks paiement | STRIPE_SECRET_KEY |
| Anthropic Claude | OCR Vision API (extraction données docs) | ANTHROPIC_API_KEY |
| Resend | Emails transactionnels (invitations, rappels) | RESEND_API_KEY |
| Inbound email provider | Webhook email → document auto | webhooks/inbound-email |

---

## 9. Tests

```
27 fichiers de test — 205 tests — 0 échec (vitest)

api-auth.test.ts          Auth, session, reset password
api-clients.test.ts       CRUD sociétés, recherche, filtres
api-documents.test.ts     Upload, liste, soft delete, permissions CLIENT
api-invoices.test.ts      CRUD factures, statuts, calculs TPS/TVQ
api-time-entries.test.ts  Saisie temps, to-invoice
api-kyc.test.ts           KYC docs, vérification
api-notifications.test.ts Lecture, marquage lu
api-comments.test.ts      Messagerie par document
api-inbox.test.ts         Webhook email entrant
api-stripe.test.ts        Webhook paiement, PAID
api-pdf.test.ts           Génération PDF facture
api-pagination.test.ts    Pagination, limites
api-soft-delete.test.ts   Soft delete, RESTRICT FK
api-staff.test.ts         Permissions staff vs client
api-staff-mgmt.test.ts    Création/suppression staff (admin)
api-portal.test.ts        Portail client — isolation données
api-assign.test.ts        Assignation staff → société
api-invite.test.ts        Invitation client
api-cron-invoices.test.ts Cron OVERDUE factures
fiscal-calendar.test.ts   Génération échéances Québec
invoice-creation.test.ts  Création facture complète avec items
audit.test.ts             logAudit fire-and-forget
email.test.ts             sendEmail Resend
csv.test.ts               Export CSV
rate-limit.test.ts        Rate limiting IP
schema.test.ts            Intégrité du schéma Drizzle
new-features.test.ts      Tests features récentes
```

---

## 10. Points à compléter

| Priorité | Tâche |
|----------|-------|
| 🔴 Critique | Whitelist MIME types sur upload (actuellement aucune restriction) |
| 🔴 Critique | Filtre `isNull(deletedAt)` manquant sur `clients/[id]/page.tsx` |
| 🟠 Important | CSRF tokens sur toutes les mutations |
| 🟠 Important | Security headers (CSP, X-Frame-Options, HSTS) dans next.config.ts |
| 🟠 Important | `requireAuth()` explicite dans les pages Server Components |
| 🟡 Moyen | N+1 queries dans dashboard (graphique revenus : 12 requêtes → 1 GROUP BY) |
| 🟡 Moyen | `createdAt` → `issuedAt` pour le graphique revenus comptables |
| 🟡 Moyen | Time tracking réel (Start/Stop + inactivité) au lieu de saisie manuelle |
| 🟡 Moyen | Signature électronique (DocuSign/eSign API) |
| 🟢 Bas | Tests composants React (render) |
| 🟢 Bas | Tests d'intégration (flows complets end-to-end) |
| 🟢 Bas | `vercel.json` avec cron schedule |
| 🟢 Bas | Clés Resend + Anthropic en production |
