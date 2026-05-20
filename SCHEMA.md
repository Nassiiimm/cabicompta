# Schéma de base de données — CabiCompta

> PostgreSQL (Supabase) · Drizzle ORM · `ca-central-1`
> 17 tables · 11 enums

---

## Enums

| Enum | Valeurs |
|------|---------|
| `user_role` | `ADMIN` `STAFF` `INTERN` `CLIENT` |
| `company_status` | `ACTIVE` `INACTIVE` `ARCHIVED` |
| `company_type` | `T1_PARTICULIER` `T1_AUTONOME` `T2_SOCIETE` |
| `member_role` | `ADMINISTRATOR` `SHAREHOLDER` `CONTACT` |
| `document_category` | `DAS` `TPS_TVQ` `FINANCIAL_STATEMENT` `T1` `REQ_DOC` `IMMOBILISATION` `BANK_STATEMENT` `INVOICE` `TAX_NOTICE` `CORPORATE` `CONTRACT` `RECEIPT` `OTHER` |
| `document_status` | `PENDING` `PROCESSED` `REJECTED` |
| `invoice_status` | `DRAFT` `SENT` `PAID` `OVERDUE` `CANCELLED` |
| `notification_type` | `DEADLINE` `DOCUMENT` `INVOICE` `APPOINTMENT` `TASK` `SYSTEM` |
| `fiscal_type` | `T2` `CO17` `TPS` `TVQ` `TPS_TVQ` `TPS_TVQ_INSTALMENT` `T4` `T4_SUMMARY` `RL1` `RL1_SUMMARY` `DAS` `CNESST` `T2_PAYMENT` `CO17_PAYMENT` `INSTALMENT` `REQ_ANNUAL` `T5` `RL3` |
| `fiscal_status` | `UPCOMING` `IN_PROGRESS` `FILED` `OVERDUE` |
| `workflow_status` | `NOT_STARTED` `IN_PROGRESS` `COMPLETED` `CANCELLED` |
| `workflow_task_status` | `TODO` `IN_PROGRESS` `DONE` `SKIPPED` |

---

## Tables

### `users`
Comptes du système (staff + clients).

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `auth_id` | text UNIQUE | ID Supabase Auth |
| `email` | varchar(255) UNIQUE NOT NULL | |
| `name` | varchar(255) NOT NULL | |
| `phone` | varchar(20) | |
| `role` | user_role NOT NULL | default `CLIENT` |
| `avatar_url` | text | |
| `created_at` | timestamp NOT NULL | |
| `updated_at` | timestamp NOT NULL | |

---

### `companies`
Clients du cabinet (sociétés ou particuliers). Soft-delete via `deleted_at`.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | varchar(255) NOT NULL | |
| `neq` | varchar(20) | Numéro entreprise Québec |
| `arc_number` | varchar(20) | Numéro ARC fédéral |
| `rq_number` | varchar(20) | Numéro Revenu Québec |
| `fiscal_year_end` | date | Fin d'année fiscale |
| `address` | text | |
| `city` | varchar(100) | |
| `province` | varchar(50) | default `QC` |
| `postal_code` | varchar(10) | |
| `phone` | varchar(20) | |
| `email` | varchar(255) | |
| `type` | company_type | T1_PARTICULIER / T1_AUTONOME / T2_SOCIETE |
| `status` | company_status NOT NULL | default `ACTIVE` |
| `assigned_to` | uuid → users | Employé responsable (SET NULL) |
| `notes` | text | |
| `kyc_verified` | boolean NOT NULL | default false |
| `kyc_verified_at` | timestamp | |
| `conflict_check` | boolean NOT NULL | default false |
| `conflict_check_notes` | text | |
| `inbox_email` | varchar(255) | Adresse email entrant |
| `inbox_active` | boolean NOT NULL | default false |
| `bank_name` | varchar(255) | 🔒 ADMIN/STAFF seulement |
| `bank_transit_number` | varchar(20) | 🔒 ADMIN/STAFF seulement |
| `bank_institution_number` | varchar(10) | 🔒 ADMIN/STAFF seulement |
| `bank_account_number` | varchar(50) | 🔒 ADMIN/STAFF seulement |
| `bank_online_id` | varchar(255) | 🔒 ADMIN/STAFF seulement |
| `bank_password` | text | 🔒 ADMIN/STAFF seulement |
| `deleted_at` | timestamp | Soft delete |
| `created_at` | timestamp NOT NULL | |
| `updated_at` | timestamp NOT NULL | |

---

### `company_members`
Liens entre une société et ses contacts/actionnaires/administrateurs.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `company_id` | uuid → companies | CASCADE delete |
| `user_id` | uuid → users | CASCADE delete |
| `role` | member_role NOT NULL | default `CONTACT` |
| `is_primary` | boolean | |
| `created_at` | timestamp NOT NULL | |

---

### `documents`
Fichiers déposés par ou pour les clients. Soft-delete. FK RESTRICT.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `company_id` | uuid → companies | RESTRICT |
| `uploaded_by` | uuid → users | |
| `file_name` | varchar(500) NOT NULL | |
| `file_path` | text NOT NULL | Chemin Supabase Storage |
| `file_size` | integer | Octets |
| `mime_type` | varchar(100) | |
| `category` | document_category | default `OTHER` |
| `subcategory` | varchar(50) | `A` `B` `C` pour catégories 01/02/03 |
| `fiscal_year` | integer | |
| `extracted_data` | jsonb | Données OCR |
| `status` | document_status NOT NULL | default `PENDING` |
| `notes` | text | |
| `deleted_at` | timestamp | Soft delete |
| `created_at` | timestamp NOT NULL | |
| `updated_at` | timestamp NOT NULL | |

---

### `invoices`
Factures émises par le cabinet. Soft-delete. FK RESTRICT (conservation légale 6 ans).

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `company_id` | uuid → companies | RESTRICT |
| `invoice_number` | varchar(50) UNIQUE NOT NULL | |
| `amount_ht` | numeric(10,2) NOT NULL | Montant HT |
| `tps` | numeric(10,2) NOT NULL | |
| `tvq` | numeric(10,2) NOT NULL | |
| `total` | numeric(10,2) NOT NULL | |
| `tps_rate` | numeric(5,3) NOT NULL | default 5.000 |
| `tvq_rate` | numeric(6,3) NOT NULL | default 9.975 |
| `status` | invoice_status NOT NULL | default `DRAFT` |
| `issued_at` | timestamp | |
| `due_date` | date | |
| `paid_at` | timestamp | |
| `notes` | text | |
| `stripe_payment_intent_id` | varchar(255) | |
| `stripe_payment_url` | text | |
| `payment_method` | varchar(50) | |
| `deleted_at` | timestamp | Soft delete |
| `created_at` | timestamp NOT NULL | |
| `updated_at` | timestamp NOT NULL | |

---

### `invoice_items`
Lignes de facturation. CASCADE delete avec la facture.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `invoice_id` | uuid → invoices | CASCADE |
| `description` | text NOT NULL | |
| `quantity` | numeric(10,2) NOT NULL | default 1 |
| `unit_price` | numeric(10,2) NOT NULL | |
| `amount` | numeric(10,2) NOT NULL | |

---

### `notifications`
Notifications in-app par utilisateur.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid → users | CASCADE |
| `title` | varchar(255) NOT NULL | |
| `message` | text NOT NULL | |
| `type` | notification_type NOT NULL | default `SYSTEM` |
| `read` | boolean NOT NULL | default false |
| `link` | text | URL de redirection |
| `created_at` | timestamp NOT NULL | |

---

### `fiscal_deadlines`
Échéances fiscales par client. FK RESTRICT.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `company_id` | uuid → companies | RESTRICT |
| `type` | fiscal_type NOT NULL | T2, TPS, TVQ, T4, RL1, DAS, etc. |
| `label` | varchar(255) NOT NULL | |
| `period` | varchar(50) | Ex: "2024-Q1" |
| `due_date` | date NOT NULL | |
| `status` | fiscal_status NOT NULL | default `UPCOMING` |
| `filed_at` | timestamp | |
| `notes` | text | |
| `deleted_at` | timestamp | Soft delete |
| `created_at` | timestamp NOT NULL | |

---

### `audit_logs`
Piste d'audit complète — conformité Ordre des CPA du Québec.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid → users | SET NULL |
| `action` | varchar(50) NOT NULL | CREATE UPDATE DELETE STATUS_CHANGE LOGIN… |
| `table_name` | varchar(50) NOT NULL | |
| `record_id` | uuid | |
| `old_data` | jsonb | État avant modification |
| `new_data` | jsonb | État après modification |
| `ip_address` | varchar(45) | IPv4/IPv6 |
| `created_at` | timestamp NOT NULL | |

---

### `document_comments`
Messagerie contextuelle par document.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `document_id` | uuid → documents | CASCADE |
| `user_id` | uuid → users | CASCADE |
| `message` | text NOT NULL | |
| `created_at` | timestamp NOT NULL | |

---

### `time_entries`
Feuilles de temps par dossier client. FK RESTRICT.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid → users | CASCADE |
| `company_id` | uuid → companies | RESTRICT |
| `duration` | integer NOT NULL | Minutes |
| `description` | text NOT NULL | |
| `date` | date NOT NULL | |
| `billable` | boolean NOT NULL | default true |
| `created_at` | timestamp NOT NULL | |

---

### `access_logs`
Journal d'accès — conformité Loi 25 (protection des renseignements personnels, Québec).

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid → users | SET NULL |
| `action` | varchar(50) NOT NULL | LOGIN DOCUMENT_VIEW DOCUMENT_DOWNLOAD PORTAL_ACCESS |
| `resource_type` | varchar(50) NOT NULL | document / company / invoice |
| `resource_id` | uuid | |
| `ip_address` | varchar(45) | |
| `user_agent` | text | |
| `created_at` | timestamp NOT NULL | |

---

### `kyc_documents`
Documents KYC — conformité anti-blanchiment / Ordre des CPA. FK RESTRICT.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `company_id` | uuid → companies | RESTRICT |
| `admin_name` | varchar(255) NOT NULL | Nom de l'administrateur identifié |
| `admin_role` | varchar(100) NOT NULL | |
| `document_type` | varchar(50) NOT NULL | PASSPORT / DRIVERS_LICENSE / HEALTH_CARD… |
| `file_path` | text | Chemin Supabase Storage |
| `verified` | boolean NOT NULL | default false |
| `verified_by` | uuid → users | SET NULL |
| `verified_at` | timestamp | |
| `notes` | text | |
| `created_at` | timestamp NOT NULL | |

---

### `workflow_templates`
Modèles de mandats réutilisables (ex: Bilan T2, TPS trimestrielle).

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `name` | varchar(255) NOT NULL | |
| `description` | text | |
| `created_by` | uuid → users | SET NULL |
| `created_at` | timestamp NOT NULL | |
| `updated_at` | timestamp NOT NULL | |

---

### `workflow_template_tasks`
Étapes d'un modèle de workflow. CASCADE delete avec le modèle.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `template_id` | uuid → workflow_templates | CASCADE |
| `title` | varchar(255) NOT NULL | |
| `description` | text | |
| `order` | integer NOT NULL | default 0 |
| `estimated_minutes` | integer | |
| `created_at` | timestamp NOT NULL | |

---

### `workflows`
Instance d'un mandat pour un client spécifique. FK RESTRICT sur company.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `company_id` | uuid → companies | RESTRICT |
| `template_id` | uuid → workflow_templates | SET NULL |
| `name` | varchar(255) NOT NULL | |
| `status` | workflow_status NOT NULL | default `NOT_STARTED` |
| `assigned_to` | uuid → users | SET NULL |
| `due_date` | date | |
| `fiscal_period` | varchar(50) | Ex: "2024" |
| `created_by` | uuid → users | SET NULL |
| `created_at` | timestamp NOT NULL | |
| `updated_at` | timestamp NOT NULL | |

---

### `workflow_tasks`
Tâches d'un workflow actif. CASCADE delete avec le workflow.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `workflow_id` | uuid → workflows | CASCADE |
| `title` | varchar(255) NOT NULL | |
| `description` | text | |
| `order` | integer NOT NULL | default 0 |
| `assigned_to` | uuid → users | SET NULL |
| `status` | workflow_task_status NOT NULL | default `TODO` |
| `blocked_by` | uuid | Auto-référentiel (ALTER TABLE) |
| `due_date` | date | |
| `completed_at` | timestamp | |
| `completed_by` | uuid → users | SET NULL |
| `notes` | text | |
| `estimated_minutes` | integer | |
| `created_at` | timestamp NOT NULL | |
| `updated_at` | timestamp NOT NULL | |

---

## Relations

```
users
  ├── companies.assigned_to (SET NULL)
  ├── company_members.user_id (CASCADE)
  ├── documents.uploaded_by
  ├── notifications.user_id (CASCADE)
  ├── audit_logs.user_id (SET NULL)
  ├── access_logs.user_id (SET NULL)
  ├── time_entries.user_id (CASCADE)
  ├── document_comments.user_id (CASCADE)
  ├── kyc_documents.verified_by (SET NULL)
  ├── workflow_templates.created_by (SET NULL)
  ├── workflows.assigned_to / created_by (SET NULL)
  └── workflow_tasks.assigned_to / completed_by (SET NULL)

companies
  ├── company_members.company_id (CASCADE)
  ├── documents.company_id (RESTRICT)
  ├── invoices.company_id (RESTRICT)
  ├── fiscal_deadlines.company_id (RESTRICT)
  ├── time_entries.company_id (RESTRICT)
  ├── kyc_documents.company_id (RESTRICT)
  └── workflows.company_id (RESTRICT)

invoices
  └── invoice_items.invoice_id (CASCADE)

documents
  └── document_comments.document_id (CASCADE)

workflow_templates
  └── workflow_template_tasks.template_id (CASCADE)

workflows
  └── workflow_tasks.workflow_id (CASCADE)
```

---

## Stratégie de suppression

| Politique | Tables concernées | Raison |
|-----------|-------------------|--------|
| **Soft delete** (`deleted_at`) | `companies` `documents` `invoices` `fiscal_deadlines` | Conservation légale, audit |
| **RESTRICT** | documents, invoices, fiscal_deadlines, time_entries, kyc_documents, workflows → companies | Empêche la suppression accidentelle d'un client avec des données liées |
| **CASCADE** | company_members, invoice_items, document_comments, workflow_tasks → parent | Données dépendantes sans valeur autonome |
| **SET NULL** | assigned_to, created_by, verified_by, audit/access logs | Préserve l'historique même si l'utilisateur est supprimé |
