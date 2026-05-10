# Schéma de la base de données — CabiCompta

**14 tables, 9 enums, PostgreSQL (Supabase)**

## Principes de conformité comptable

### A. Soft Delete (Conservation légale)
Les tables `companies`, `documents`, `invoices` et `fiscal_deadlines` ont un champ `deleted_at`. Une suppression ne détruit jamais la donnée — elle est masquée de l'interface mais conservée en base. Obligation légale : **6 ans minimum** de conservation au Québec (Loi sur les impôts, art. 1000).

L'archivage d'une société **cascade** : tous ses documents, factures et échéances sont automatiquement soft-deleted.

### B. RESTRICT au lieu de CASCADE
Les FK des tables sensibles (`invoices`, `documents`, `fiscal_deadlines`, `kyc_documents`) utilisent `ON DELETE RESTRICT`. Il est **impossible** de supprimer physiquement une société tant qu'elle a des factures ou documents.

### C. Piste d'audit (audit_logs)
Chaque modification critique (création, mise à jour, changement de statut, suppression) est enregistrée dans `audit_logs` avec l'utilisateur, l'état avant/après, et l'horodatage. Conformité Ordre des CPA du Québec.

### D. Taux de taxes figés
Les factures stockent `tps_rate` et `tvq_rate` au moment de l'émission. Si les taux changent dans le futur, les anciennes factures restent intactes.

### E. KYC / Anti-blanchiment
Les pièces d'identité des administrateurs sont stockées dans `kyc_documents`. Vérification de conflit d'intérêts obligatoire avant acceptation de mandat.

### F. Journal d'accès (Loi 25)
Chaque connexion et accès à un document confidentiel est enregistré dans `access_logs` avec IP et user agent.

---

## Tables

### users

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| auth_id | text | UNIQUE — lien Supabase Auth |
| email | varchar(255) | NOT NULL, UNIQUE |
| name | varchar(255) | NOT NULL |
| phone | varchar(20) | |
| role | user_role | NOT NULL, default 'CLIENT' |
| avatar_url | text | |
| created_at / updated_at | timestamp | NOT NULL |

**Enum `user_role`** : `ADMIN` | `STAFF` | `CLIENT`

---

### companies

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| name | varchar(255) | NOT NULL |
| neq | varchar(20) | Numéro Entreprise Québec |
| arc_number | varchar(20) | Numéro ARC (fédéral) |
| rq_number | varchar(20) | Numéro Revenu Québec |
| fiscal_year_end | date | Fin d'exercice |
| address, city, province, postal_code | text/varchar | |
| phone | varchar(20) | |
| email | varchar(255) | |
| status | company_status | NOT NULL, default 'ACTIVE' |
| assigned_to | uuid | FK → users, SET NULL |
| notes | text | |
| kyc_verified | boolean | NOT NULL, default false |
| kyc_verified_at | timestamp | |
| conflict_check | boolean | NOT NULL, default false |
| conflict_check_notes | text | |
| inbox_email | varchar(255) | ex: transport-leveille@docs.cabicompta.com |
| inbox_active | boolean | NOT NULL, default false |
| deleted_at | timestamp | Soft delete |
| created_at / updated_at | timestamp | NOT NULL |

**Enum `company_status`** : `ACTIVE` | `INACTIVE` | `ARCHIVED`

---

### company_members

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, CASCADE |
| user_id | uuid | FK → users, CASCADE |
| role | member_role | NOT NULL, default 'CONTACT' |
| is_primary | boolean | default false |
| created_at | timestamp | NOT NULL |

**Enum `member_role`** : `ADMINISTRATOR` | `SHAREHOLDER` | `CONTACT`

---

### documents

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, RESTRICT |
| uploaded_by | uuid | FK → users |
| file_name | varchar(500) | NOT NULL |
| file_path | text | NOT NULL — chemin Supabase Storage |
| file_size | integer | octets |
| mime_type | varchar(100) | |
| category | document_category | default 'OTHER' |
| fiscal_year | integer | |
| extracted_data | jsonb | données OCR/IA |
| status | document_status | NOT NULL, default 'PENDING' |
| notes | text | |
| deleted_at | timestamp | Soft delete |
| created_at / updated_at | timestamp | NOT NULL |

**Enum `document_category`** : `BANK_STATEMENT` | `INVOICE` | `TAX_NOTICE` | `FINANCIAL_STATEMENT` | `TPS_TVQ` | `CORPORATE` | `CONTRACT` | `RECEIPT` | `OTHER`

**Enum `document_status`** : `PENDING` | `PROCESSED` | `REJECTED`

---

### invoices

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, RESTRICT |
| invoice_number | varchar(50) | NOT NULL, UNIQUE |
| amount_ht | numeric(10,2) | NOT NULL |
| tps | numeric(10,2) | NOT NULL — montant TPS |
| tvq | numeric(10,2) | NOT NULL — montant TVQ |
| total | numeric(10,2) | NOT NULL |
| tps_rate | numeric(5,3) | NOT NULL, default 5.000 — taux figé |
| tvq_rate | numeric(6,3) | NOT NULL, default 9.975 — taux figé |
| status | invoice_status | NOT NULL, default 'DRAFT' |
| issued_at | timestamp | |
| due_date | date | |
| paid_at | timestamp | |
| notes | text | |
| stripe_payment_intent_id | varchar(255) | ID Stripe |
| stripe_payment_url | text | URL Checkout session |
| payment_method | varchar(50) | stripe, interac, cash, etc. |
| deleted_at | timestamp | Soft delete |
| created_at / updated_at | timestamp | NOT NULL |

**Enum `invoice_status`** : `DRAFT` | `SENT` | `PAID` | `OVERDUE` | `CANCELLED`

**Transitions** : DRAFT→SENT/CANCELLED, SENT→PAID/OVERDUE/CANCELLED, OVERDUE→PAID/CANCELLED

---

### invoice_items

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| invoice_id | uuid | FK → invoices, CASCADE |
| description | text | NOT NULL |
| quantity | numeric(10,2) | NOT NULL, default 1 |
| unit_price | numeric(10,2) | NOT NULL |
| amount | numeric(10,2) | NOT NULL |

---

### fiscal_deadlines

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, RESTRICT |
| type | fiscal_type | NOT NULL |
| label | varchar(255) | NOT NULL |
| period | varchar(50) | ex: "2026", "2026-Q1" |
| due_date | date | NOT NULL |
| status | fiscal_status | NOT NULL, default 'UPCOMING' |
| filed_at | timestamp | |
| notes | text | |
| deleted_at | timestamp | Soft delete |
| created_at | timestamp | NOT NULL |

**Enum `fiscal_type`** : `T2` | `CO17` | `TPS` | `TVQ` | `TPS_TVQ` | `T4` | `RL1` | `DAS` | `T2_PAYMENT` | `CO17_PAYMENT` | `INSTALMENT` | `REQ_ANNUAL` | `T5` | `RL3`

**Enum `fiscal_status`** : `UPCOMING` | `IN_PROGRESS` | `FILED` | `OVERDUE`

---

### notifications

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users, CASCADE |
| title | varchar(255) | NOT NULL |
| message | text | NOT NULL |
| type | notification_type | NOT NULL, default 'SYSTEM' |
| read | boolean | NOT NULL, default false |
| link | text | |
| created_at | timestamp | NOT NULL |

**Enum `notification_type`** : `DEADLINE` | `DOCUMENT` | `INVOICE` | `APPOINTMENT` | `TASK` | `SYSTEM`

---

### document_comments

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| document_id | uuid | FK → documents, CASCADE |
| user_id | uuid | FK → users, CASCADE |
| message | text | NOT NULL |
| created_at | timestamp | NOT NULL |

---

### time_entries

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users, CASCADE |
| company_id | uuid | FK → companies, RESTRICT |
| duration | integer | NOT NULL — minutes |
| description | text | NOT NULL |
| date | date | NOT NULL |
| billable | boolean | NOT NULL, default true |
| created_at | timestamp | NOT NULL |

---

### audit_logs

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users, SET NULL |
| action | varchar(50) | NOT NULL |
| table_name | varchar(50) | NOT NULL |
| record_id | uuid | |
| old_data | jsonb | |
| new_data | jsonb | |
| ip_address | varchar(45) | |
| created_at | timestamp | NOT NULL |

**Index** : `(table_name, record_id)`, `(user_id)`, `(created_at)`

---

### access_logs

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users, SET NULL |
| action | varchar(50) | NOT NULL |
| resource_type | varchar(50) | NOT NULL |
| resource_id | uuid | |
| ip_address | varchar(45) | |
| user_agent | text | |
| created_at | timestamp | NOT NULL |

**Index** : `(resource_type, resource_id)`, `(user_id)`, `(created_at)`

---

### kyc_documents

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, RESTRICT |
| admin_name | varchar(255) | NOT NULL |
| admin_role | varchar(100) | NOT NULL |
| document_type | varchar(50) | NOT NULL — PASSPORT, DRIVERS_LICENSE, etc. |
| file_path | text | |
| verified | boolean | NOT NULL, default false |
| verified_by | uuid | FK → users, SET NULL |
| verified_at | timestamp | |
| notes | text | |
| created_at | timestamp | NOT NULL |

---

## Relations

```
users 1:N → companies.assigned_to      (comptable assigné)
users 1:N → company_members.user_id    (membre d'une société)
users 1:N → documents.uploaded_by      (auteur upload)
users 1:N → notifications.user_id      (destinataire)
users 1:N → time_entries.user_id       (feuille de temps)
users 1:N → audit_logs.user_id         (auteur action)
users 1:N → access_logs.user_id        (accédant)
users 1:N → kyc_documents.verified_by  (vérificateur KYC)

companies 1:N → company_members        (CASCADE)
companies 1:N → documents              (RESTRICT)
companies 1:N → invoices               (RESTRICT)
companies 1:N → fiscal_deadlines       (RESTRICT)
companies 1:N → time_entries           (RESTRICT)
companies 1:N → kyc_documents          (RESTRICT)

invoices 1:N → invoice_items           (CASCADE)
documents 1:N → document_comments      (CASCADE)
```

## Stockage fichiers

```
Supabase Storage
└── bucket: "documents" (privé, 10 Mo max)
    └── {company_id}/{timestamp}_{file_name}
        Accès via URL signée (1h expiration)
```

## Index DB

```
idx_companies_deleted          (deleted_at)
idx_documents_company_status   (company_id, status)
idx_documents_deleted          (deleted_at)
idx_invoices_company_status    (company_id, status)
idx_invoices_deleted           (deleted_at)
idx_fiscal_company_date        (company_id, due_date)
idx_fiscal_deleted             (deleted_at)
idx_notifications_user_read    (user_id, read, created_at)
idx_time_entries_company_date  (company_id, date)
idx_audit_logs_table_record    (table_name, record_id)
idx_audit_logs_user            (user_id)
idx_audit_logs_created         (created_at)
idx_access_logs_user           (user_id)
idx_access_logs_resource       (resource_type, resource_id)
idx_access_logs_created        (created_at)
idx_kyc_company                (company_id)
```

## Source

Schéma Drizzle : `src/lib/db/schema.ts`
