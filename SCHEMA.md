# Schéma de la base de données — CabiCompta

**13 tables, 9 enums, PostgreSQL (Supabase)**

## Principes de conformité comptable

### A. Soft Delete (Conservation légale)
Les tables `companies`, `documents`, `invoices` et `fiscal_deadlines` ont un champ `deleted_at`. Une suppression ne détruit jamais la donnée — elle est masquée de l'interface mais conservée en base. Obligation légale : **6 ans minimum** de conservation au Québec (Loi sur les impôts, art. 1000).

L'archivage d'une société **cascade** : tous ses documents, factures et échéances sont automatiquement soft-deleted.

### B. RESTRICT au lieu de CASCADE
Les FK des tables sensibles (`invoices`, `documents`, `fiscal_deadlines`) utilisent `ON DELETE RESTRICT`. Il est **impossible** de supprimer physiquement une société tant qu'elle a des factures ou documents.

### C. Piste d'audit (audit_logs)
Chaque modification critique (création, mise à jour, changement de statut, suppression) est enregistrée dans `audit_logs` avec l'utilisateur, l'état avant/après, et l'horodatage. Conformité Ordre des CPA du Québec.

### D. Taux de taxes figés
Les factures stockent `tps_rate` et `tvq_rate` au moment de l'émission. Si les taux changent dans le futur, les anciennes factures restent intactes.

---

## Tables

### users

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK, default random |
| auth_id | text | UNIQUE — lien Supabase Auth UID |
| email | varchar(255) | NOT NULL, UNIQUE |
| name | varchar(255) | NOT NULL |
| phone | varchar(20) | |
| role | user_role | NOT NULL, default 'CLIENT' |
| avatar_url | text | |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

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
| address | text | |
| city | varchar(100) | |
| province | varchar(50) | default 'QC' |
| postal_code | varchar(10) | |
| phone | varchar(20) | |
| email | varchar(255) | |
| status | company_status | NOT NULL, default 'ACTIVE' |
| assigned_to | uuid | FK → users, ON DELETE SET NULL |
| notes | text | |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Enum `company_status`** : `ACTIVE` | `INACTIVE` | `ARCHIVED`

---

### company_members

Lie un utilisateur CLIENT à sa société.

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
| company_id | uuid | FK → companies, CASCADE |
| uploaded_by | uuid | FK → users |
| file_name | varchar(500) | NOT NULL |
| file_path | text | NOT NULL — chemin Supabase Storage |
| file_size | integer | octets |
| mime_type | varchar(100) | |
| category | document_category | default 'OTHER' |
| fiscal_year | integer | |
| extracted_data | jsonb | données extraites par OCR/IA |
| status | document_status | NOT NULL, default 'PENDING' |
| notes | text | |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Enum `document_category`** : `BANK_STATEMENT` | `INVOICE` | `TAX_NOTICE` | `FINANCIAL_STATEMENT` | `TPS_TVQ` | `CORPORATE` | `CONTRACT` | `RECEIPT` | `OTHER`

**Enum `document_status`** : `PENDING` | `PROCESSED` | `REJECTED`

---

### invoices

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, CASCADE |
| invoice_number | varchar(50) | NOT NULL, UNIQUE |
| amount_ht | numeric(10,2) | NOT NULL |
| tps | numeric(10,2) | NOT NULL — 5% fédéral |
| tvq | numeric(10,2) | NOT NULL — 9,975% provincial |
| total | numeric(10,2) | NOT NULL |
| status | invoice_status | NOT NULL, default 'DRAFT' |
| issued_at | timestamp | |
| due_date | date | |
| paid_at | timestamp | |
| notes | text | |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Enum `invoice_status`** : `DRAFT` | `SENT` | `PAID` | `OVERDUE` | `CANCELLED`

**Transitions valides** :
- DRAFT → SENT, CANCELLED
- SENT → PAID, OVERDUE, CANCELLED
- OVERDUE → PAID, CANCELLED

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
| company_id | uuid | FK → companies, CASCADE |
| type | fiscal_type | NOT NULL |
| label | varchar(255) | NOT NULL |
| period | varchar(50) | ex: "2026", "2026-Q1", "2026-03" |
| due_date | date | NOT NULL |
| status | fiscal_status | NOT NULL, default 'UPCOMING' |
| filed_at | timestamp | |
| notes | text | |
| created_at | timestamp | NOT NULL |

**Enum `fiscal_type`** : `T2` | `CO17` | `TPS` | `TVQ` | `TPS_TVQ` | `T4` | `RL1` | `DAS` | `T2_PAYMENT` | `CO17_PAYMENT` | `INSTALMENT` | `REQ_ANNUAL` | `T5` | `RL3`

**Enum `fiscal_status`** : `UPCOMING` | `IN_PROGRESS` | `FILED` | `OVERDUE`

---

### appointments

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, RESTRICT |
| staff_id | uuid | FK → users |
| title | varchar(255) | NOT NULL |
| description | text | |
| start_at | timestamp | NOT NULL |
| end_at | timestamp | NOT NULL |
| location | varchar(255) | |
| status | appointment_status | NOT NULL, default 'SCHEDULED' |
| created_at | timestamp | NOT NULL |

**Enum `appointment_status`** : `SCHEDULED` | `CONFIRMED` | `CANCELLED` | `COMPLETED`

---

### tasks

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| company_id | uuid | FK → companies, SET NULL |
| assigned_to | uuid | FK → users, SET NULL |
| title | varchar(255) | NOT NULL |
| description | text | |
| status | task_status | NOT NULL, default 'TODO' |
| priority | task_priority | NOT NULL, default 'MEDIUM' |
| due_date | date | |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Enum `task_status`** : `TODO` | `IN_PROGRESS` | `REVIEW` | `DONE`

**Enum `task_priority`** : `LOW` | `MEDIUM` | `HIGH` | `URGENT`

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
| link | text | redirection au clic |
| created_at | timestamp | NOT NULL |

**Enum `notification_type`** : `DEADLINE` | `DOCUMENT` | `INVOICE` | `APPOINTMENT` | `TASK` | `SYSTEM`

---

### audit_logs

Piste d'audit — conformité Ordre des CPA du Québec.

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users, SET NULL |
| action | varchar(50) | NOT NULL — CREATE, UPDATE, DELETE, STATUS_CHANGE, SOFT_DELETE, LOGIN |
| table_name | varchar(50) | NOT NULL |
| record_id | uuid | |
| old_data | jsonb | état avant modification |
| new_data | jsonb | état après modification |
| ip_address | varchar(45) | |
| created_at | timestamp | NOT NULL |

**Index** : `(table_name, record_id)`, `(user_id)`, `(created_at)`

---

## Relations

```
users 1:N → companies.assigned_to      (comptable assigné au dossier)
users 1:N → company_members.user_id    (membre d'une société)
users 1:N → documents.uploaded_by      (auteur de l'upload)
users 1:N → appointments.staff_id      (RDV assigné)
users 1:N → tasks.assigned_to          (tâche assignée)
users 1:N → notifications.user_id      (destinataire)
users 1:N → audit_logs.user_id         (auteur de l'action)

companies 1:N → company_members        (CASCADE)
companies 1:N → documents              (RESTRICT — conservation légale)
companies 1:N → invoices               (RESTRICT — conservation légale)
companies 1:N → fiscal_deadlines       (RESTRICT — conservation légale)
companies 1:N → appointments           (RESTRICT)
companies 1:N → tasks                  (SET NULL)

invoices 1:N → invoice_items           (CASCADE)
```

## Diagramme

```
                    ┌──────────┐
                    │  users   │
                    └────┬─────┘
          ┌──────────────┼──────────────────┐
          │              │                  │
          ▼              ▼                  ▼
   ┌────────────┐ ┌────────────┐   ┌───────────────┐
   │ companies  │ │ notifica-  │   │ appointments  │
   └─────┬──────┘ │ tions      │   └───────────────┘
         │        └────────────┘
    ┌────┼────┬─────────┐
    │    │    │         │
    ▼    ▼    ▼         ▼
┌──────┐┌───┐┌────────┐┌───────┐
│compa-││doc││invoices││fiscal │
│ny_   ││ume││        ││dead-  │
│membe-││nts│└───┬────┘│lines  │
│rs    │└───┘    │     └───────┘
└──────┘         ▼
           ┌──────────┐
           │ invoice_  │
           │ items     │
           └──────────┘
```

## Stockage fichiers (hors DB)

```
Supabase Storage
└── bucket: "documents" (privé, 10 Mo max par fichier)
    └── {company_id}/{year}/{file_name}
        Accès via URL signée (1h d'expiration)
```

## Source

Schéma Drizzle : `src/lib/db/schema.ts`
