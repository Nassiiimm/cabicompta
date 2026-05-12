# CabiCompta — Diagrammes UML

> Rendu : VS Code (extension Mermaid), GitHub, ou https://mermaid.live

---

## 1. Diagramme Entité-Relation (ER)

```mermaid
erDiagram

    users {
        uuid id PK
        text auth_id UK
        varchar email UK
        varchar name
        varchar phone
        user_role role
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }

    companies {
        uuid id PK
        varchar name
        varchar neq
        varchar arc_number
        varchar rq_number
        date fiscal_year_end
        text address
        varchar city
        varchar province
        varchar postal_code
        varchar phone
        varchar email
        company_status status
        uuid assigned_to FK
        text notes
        boolean kyc_verified
        timestamp kyc_verified_at
        boolean conflict_check
        text conflict_check_notes
        varchar inbox_email
        boolean inbox_active
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    company_members {
        uuid id PK
        uuid company_id FK
        uuid user_id FK
        member_role role
        boolean is_primary
        timestamp created_at
    }

    documents {
        uuid id PK
        uuid company_id FK
        uuid uploaded_by FK
        varchar file_name
        text file_path
        integer file_size
        varchar mime_type
        document_category category
        integer fiscal_year
        jsonb extracted_data
        document_status status
        text notes
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    document_comments {
        uuid id PK
        uuid document_id FK
        uuid user_id FK
        text message
        timestamp created_at
    }

    invoices {
        uuid id PK
        uuid company_id FK
        varchar invoice_number UK
        numeric amount_ht
        numeric tps
        numeric tvq
        numeric total
        numeric tps_rate
        numeric tvq_rate
        invoice_status status
        timestamp issued_at
        date due_date
        timestamp paid_at
        text notes
        varchar stripe_payment_intent_id
        text stripe_payment_url
        varchar payment_method
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    invoice_items {
        uuid id PK
        uuid invoice_id FK
        text description
        numeric quantity
        numeric unit_price
        numeric amount
    }

    fiscal_deadlines {
        uuid id PK
        uuid company_id FK
        fiscal_type type
        varchar label
        varchar period
        date due_date
        fiscal_status status
        timestamp filed_at
        text notes
        timestamp deleted_at
        timestamp created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        varchar title
        text message
        notification_type type
        boolean read
        text link
        timestamp created_at
    }

    time_entries {
        uuid id PK
        uuid user_id FK
        uuid company_id FK
        integer duration
        text description
        date date
        boolean billable
        timestamp created_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar table_name
        uuid record_id
        jsonb old_data
        jsonb new_data
        varchar ip_address
        timestamp created_at
    }

    access_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar resource_type
        uuid resource_id
        varchar ip_address
        text user_agent
        timestamp created_at
    }

    kyc_documents {
        uuid id PK
        uuid company_id FK
        varchar admin_name
        varchar admin_role
        varchar document_type
        text file_path
        boolean verified
        uuid verified_by FK
        timestamp verified_at
        text notes
        timestamp created_at
    }

    workflow_templates {
        uuid id PK
        varchar name
        text description
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    workflow_template_tasks {
        uuid id PK
        uuid template_id FK
        varchar title
        text description
        integer order
        integer estimated_minutes
        timestamp created_at
    }

    workflows {
        uuid id PK
        uuid company_id FK
        uuid template_id FK
        varchar name
        workflow_status status
        uuid assigned_to FK
        date due_date
        varchar fiscal_period
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    workflow_tasks {
        uuid id PK
        uuid workflow_id FK
        varchar title
        text description
        integer order
        uuid assigned_to FK
        workflow_task_status status
        timestamp completed_at
        uuid completed_by FK
        text notes
        integer estimated_minutes
        timestamp created_at
        timestamp updated_at
    }

    %% Relations
    users ||--o{ companies : "assigned_to"
    users ||--o{ company_members : "user_id"
    users ||--o{ documents : "uploaded_by"
    users ||--o{ document_comments : "user_id"
    users ||--o{ notifications : "user_id"
    users ||--o{ time_entries : "user_id"
    users ||--o{ audit_logs : "user_id"
    users ||--o{ access_logs : "user_id"
    users ||--o{ kyc_documents : "verified_by"
    users ||--o{ workflow_templates : "created_by"
    users ||--o{ workflows : "assigned_to"
    users ||--o{ workflows : "created_by"
    users ||--o{ workflow_tasks : "assigned_to"
    users ||--o{ workflow_tasks : "completed_by"

    companies ||--o{ company_members : "company_id"
    companies ||--o{ documents : "company_id"
    companies ||--o{ invoices : "company_id"
    companies ||--o{ fiscal_deadlines : "company_id"
    companies ||--o{ time_entries : "company_id"
    companies ||--o{ kyc_documents : "company_id"
    companies ||--o{ workflows : "company_id"

    documents ||--o{ document_comments : "document_id"
    invoices ||--o{ invoice_items : "invoice_id"

    workflow_templates ||--o{ workflow_template_tasks : "template_id"
    workflow_templates ||--o{ workflows : "template_id"
    workflows ||--o{ workflow_tasks : "workflow_id"
```

---

## 2. Diagramme de classes — Couche Auth

```mermaid
classDiagram

    class AppUser {
        +string id
        +string authId
        +string email
        +string name
        +string|null phone
        +UserRole role
        +string|null avatarUrl
    }

    class UserRole {
        <<enumeration>>
        ADMIN
        STAFF
        CLIENT
    }

    class AuthLib {
        +getSession() SupabaseUser|null
        +getCurrentUser() AppUser|null
        +requireAuth() AppUser
        +requireStaff() AppUser
        +requireAdmin() AppUser
    }

    class RateLimiter {
        -Map~string,Record~ store
        +rateLimitByIp(request, limit, windowMs) boolean
    }

    class AuditLogger {
        +logAudit(userId, action, tableName, recordId, oldData, newData) void
    }

    class AccessLogger {
        +logAccess(userId, action, resourceType, resourceId, ip, userAgent) void
    }

    AppUser --> UserRole
    AuthLib --> AppUser
    AuthLib ..> RateLimiter : uses
    AuthLib ..> AuditLogger : uses
    AuthLib ..> AccessLogger : uses
```

---

## 3. Diagramme de classes — Workflows

```mermaid
classDiagram

    class WorkflowTemplate {
        +uuid id
        +string name
        +string|null description
        +uuid|null createdBy
        +Date createdAt
        +Date updatedAt
    }

    class WorkflowTemplateTask {
        +uuid id
        +uuid templateId
        +string title
        +string|null description
        +number order
        +number|null estimatedMinutes
        +Date createdAt
    }

    class Workflow {
        +uuid id
        +uuid companyId
        +uuid|null templateId
        +string name
        +WorkflowStatus status
        +uuid|null assignedTo
        +string|null dueDate
        +string|null fiscalPeriod
        +uuid|null createdBy
        +Date createdAt
        +Date updatedAt
        +autoUpdateStatus() void
    }

    class WorkflowTask {
        +uuid id
        +uuid workflowId
        +string title
        +string|null description
        +number order
        +uuid|null assignedTo
        +WorkflowTaskStatus status
        +Date|null completedAt
        +uuid|null completedBy
        +string|null notes
        +number|null estimatedMinutes
        +Date createdAt
        +Date updatedAt
    }

    class WorkflowStatus {
        <<enumeration>>
        NOT_STARTED
        IN_PROGRESS
        COMPLETED
        CANCELLED
    }

    class WorkflowTaskStatus {
        <<enumeration>>
        TODO
        IN_PROGRESS
        DONE
        SKIPPED
    }

    WorkflowTemplate "1" --> "0..*" WorkflowTemplateTask : contient
    WorkflowTemplate "1" --> "0..*" Workflow : instancie
    Workflow "1" --> "0..*" WorkflowTask : contient
    Workflow --> WorkflowStatus
    WorkflowTask --> WorkflowTaskStatus
```

---

## 4. Diagramme de séquence — Upload document

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant FE as Frontend
    participant API as POST /api/documents
    participant RL as RateLimiter
    participant Auth as requireAuth()
    participant DB as Drizzle/PostgreSQL
    participant S3 as Supabase Storage
    participant AL as logAudit()

    U->>FE: Sélectionne un fichier
    FE->>API: POST multipart/form-data (file, companyId, category)

    API->>RL: rateLimitByIp(20 req/min)
    alt Limite dépassée
        RL-->>API: false
        API-->>FE: 429 Trop de requêtes
    end

    API->>Auth: requireAuth()
    alt Non authentifié
        Auth-->>API: throw "Unauthorized"
        API-->>FE: 401
    end

    alt role === CLIENT
        API->>DB: SELECT company_members WHERE userId + companyId
        DB-->>API: membership
        alt Pas membre
            API-->>FE: 403 Accès refusé
        end
    end

    API->>API: Vérifier taille (max 10 Mo)
    alt Trop grand
        API-->>FE: 400 Fichier trop grand
    end

    API->>S3: uploadFile(bucket, path, buffer, mimeType)
    S3-->>API: OK

    API->>DB: INSERT documents
    DB-->>API: document

    API->>AL: logAudit(CREATE, documents, doc.id)
    Note over AL: fire-and-forget

    API-->>FE: 201 { document }
    FE->>U: Document ajouté
```

---

## 5. Diagramme de séquence — Paiement Stripe

```mermaid
sequenceDiagram
    actor S as Staff
    actor C as Client
    participant API1 as POST /api/invoices/[id]/payment-link
    participant Stripe as Stripe API
    participant DB as PostgreSQL
    participant WH as POST /api/webhooks/stripe

    S->>API1: Générer lien de paiement
    API1->>Stripe: createCheckoutSession(amount, currency)
    Stripe-->>API1: { url, payment_intent_id }
    API1->>DB: UPDATE invoices SET stripe_payment_url, stripe_payment_intent_id
    API1-->>S: { url }

    S->>C: Envoie le lien

    C->>Stripe: Visite checkout URL
    C->>Stripe: Saisit carte → confirme paiement
    Stripe-->>C: Succès

    Stripe->>WH: POST checkout.session.completed
    WH->>WH: Vérifie signature Stripe (STRIPE_WEBHOOK_SECRET)
    WH->>DB: UPDATE invoices SET status=PAID, paid_at=now()
    WH-->>Stripe: 200 OK
```

---

## 6. Diagramme de séquence — Workflow (cycle de vie)

```mermaid
sequenceDiagram
    actor A as Admin
    actor S as Staff
    participant WT as POST /api/workflow-templates
    participant WF as POST /api/workflows
    participant TK as PUT /api/workflows/[id]/tasks/[taskId]
    participant DB as PostgreSQL

    A->>WT: Créer modèle "Bilan T2" (8 étapes)
    WT->>DB: INSERT workflow_templates + workflow_template_tasks
    WT-->>A: template créé

    S->>WF: Créer workflow { companyId, templateId, dueDate }
    WF->>DB: INSERT workflows (status: NOT_STARTED)
    WF->>DB: COPY template_tasks → workflow_tasks (status: TODO)
    WF-->>S: workflow + tâches créé

    loop Pour chaque tâche
        S->>TK: PUT { status: "IN_PROGRESS" }
        TK->>DB: UPDATE workflow_tasks
        TK->>DB: Recalcul → UPDATE workflows SET status=IN_PROGRESS
        TK-->>S: tâche mise à jour

        S->>TK: PUT { status: "DONE" }
        TK->>DB: UPDATE workflow_tasks SET completed_at, completed_by
        TK->>DB: Recalcul — si toutes DONE/SKIPPED → status=COMPLETED
        TK-->>S: tâche terminée
    end

    Note over DB: workflow.status = COMPLETED
```

---

## 7. Diagramme d'état — Facture

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Création

    DRAFT --> SENT : Envoi au client
    DRAFT --> CANCELLED : Annulation

    SENT --> PAID : Paiement reçu (Stripe webhook / manuel)
    SENT --> OVERDUE : Cron check-invoices (due_date dépassée)
    SENT --> CANCELLED : Annulation

    OVERDUE --> PAID : Paiement tardif
    OVERDUE --> CANCELLED : Annulation

    PAID --> [*]
    CANCELLED --> [*]
```

---

## 8. Diagramme d'état — Workflow

```mermaid
stateDiagram-v2
    [*] --> NOT_STARTED : Création

    NOT_STARTED --> IN_PROGRESS : 1ère tâche passée IN_PROGRESS ou DONE
    IN_PROGRESS --> COMPLETED : Toutes les tâches DONE ou SKIPPED
    IN_PROGRESS --> NOT_STARTED : Toutes les tâches repassent TODO
    IN_PROGRESS --> CANCELLED : Annulation manuelle
    NOT_STARTED --> CANCELLED : Annulation manuelle

    COMPLETED --> [*]
    CANCELLED --> [*]
```

---

## 9. Diagramme d'état — Échéance fiscale

```mermaid
stateDiagram-v2
    [*] --> UPCOMING : Génération calendrier

    UPCOMING --> IN_PROGRESS : Mise à jour manuelle (staff)
    UPCOMING --> OVERDUE : Cron (due_date dépassée)
    UPCOMING --> FILED : Production directe

    IN_PROGRESS --> FILED : Dossier produit
    IN_PROGRESS --> OVERDUE : Cron (due_date dépassée)

    OVERDUE --> FILED : Production tardive

    FILED --> [*]
```

---

## 10. Diagramme de composants — Architecture globale

```mermaid
graph TB
    subgraph Client["Navigateur / PWA"]
        UI_CAB["Espace Cabinet<br/>(ADMIN/STAFF)"]
        UI_PORT["Portail Client<br/>(CLIENT)"]
        UI_SCAN["Scanner Mobile<br/>(PWA caméra)"]
    end

    subgraph Next["Next.js 16 (Vercel)"]
        PROXY["proxy.ts<br/>(auth middleware)"]
        SC["Server Components<br/>(pages)"]
        CC["Client Components<br/>(interactivité)"]
        API["Route Handlers<br/>(API REST)"]
        CRON["Cron Endpoints<br/>/api/fiscal/*"]
    end

    subgraph Supabase["Supabase (ca-central-1)"]
        AUTH["Supabase Auth<br/>(JWT, sessions)"]
        DB["PostgreSQL<br/>(17 tables)"]
        STORAGE["Storage<br/>bucket: documents"]
    end

    subgraph External["Services externes"]
        STRIPE["Stripe<br/>(checkout, webhooks)"]
        ANTHROPIC["Claude API<br/>(OCR Vision)"]
        RESEND["Resend<br/>(emails)"]
        INBOUND["Inbound Email<br/>(webhook)"]
    end

    UI_CAB --> PROXY
    UI_PORT --> PROXY
    UI_SCAN --> API

    PROXY --> AUTH
    PROXY --> SC
    SC --> API
    CC --> API

    API --> DB
    API --> STORAGE
    API --> STRIPE
    API --> ANTHROPIC
    API --> RESEND

    STRIPE --> API
    INBOUND --> API

    CRON --> DB
    CRON --> RESEND
```
