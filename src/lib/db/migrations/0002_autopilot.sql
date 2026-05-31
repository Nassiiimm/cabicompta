-- Pilote Automatique Fiscal
-- Profil fiscal étendu sur companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS gst_filing VARCHAR(20) DEFAULT 'QUARTERLY',
  ADD COLUMN IF NOT EXISTS has_employees BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS has_installments BOOLEAN NOT NULL DEFAULT FALSE;

-- Demandes documentaires liées aux workflows
CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS doc_requests_workflow_idx ON document_requests(workflow_id);
CREATE INDEX IF NOT EXISTS doc_requests_company_idx ON document_requests(company_id);
CREATE INDEX IF NOT EXISTS doc_requests_status_idx ON document_requests(company_id, status);
