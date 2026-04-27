-- ============================================================
-- LexLedger Pro — Complete Database Schema
-- Multi-tenant advocate billing SaaS
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS (Advocates / Law Firms)
-- ============================================================
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  firm_name       TEXT,
  bar_council_no  TEXT,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  address         TEXT,
  city            TEXT DEFAULT 'Chennai',
  state           TEXT DEFAULT 'Tamil Nadu',
  gstin           TEXT,
  pan             TEXT,
  primary_court   TEXT DEFAULT 'Madras High Court',
  logo_url        TEXT,
  plan            TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('trial','starter','professional','enterprise')),
  max_users       INTEGER NOT NULL DEFAULT 2,
  trial_ends_at   TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  onboarded_by    UUID,                        -- superadmin user id
  invoice_prefix  TEXT DEFAULT 'INV',
  receipt_prefix  TEXT DEFAULT 'RCP',
  next_invoice_no INTEGER DEFAULT 1,
  next_receipt_no INTEGER DEFAULT 1,
  bank_name       TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  bank_branch     TEXT,
  invoice_notes   TEXT DEFAULT 'Payment due within 30 days. Please transfer to the bank account mentioned above.',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (Users belonging to a tenant)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'clerk' CHECK (role IN ('superadmin','owner','associate','clerk')),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  pincode       TEXT,
  pan           TEXT,
  gstin         TEXT,
  notes         TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CASES (Matters linked to clients)
-- ============================================================
CREATE TABLE cases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  case_number     TEXT,
  cnr_number      TEXT,
  court           TEXT,
  case_type       TEXT,         -- Civil, Criminal, Writ, Arbitration, Tax, Labour
  stage           TEXT,         -- Filing, Hearing, Arguments, Judgment, Disposed
  petitioner      TEXT,
  respondent      TEXT,
  retainer_fee    NUMERIC(12,2) DEFAULT 0,
  next_hearing    DATE,
  last_hearing    DATE,
  judge_name      TEXT,
  bench_type      TEXT,         -- Single, Division, Full Bench
  filing_date     DATE,
  disposal_date   DATE,
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  case_id         UUID REFERENCES cases(id),
  invoice_number  TEXT NOT NULL,
  invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','pending','partial','paid','overdue','cancelled')),
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate        NUMERIC(5,2) DEFAULT 0,
  gst_amount      NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  balance_amount  NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  notes           TEXT,
  terms           TEXT,
  created_by      UUID REFERENCES profiles(id),
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, invoice_number)
);

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================
CREATE TABLE invoice_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     NUMERIC(8,2) NOT NULL DEFAULT 1,
  rate         NUMERIC(12,2) NOT NULL,
  amount       NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECEIPTS
-- ============================================================
CREATE TABLE receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  receipt_number  TEXT NOT NULL,
  receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_mode    TEXT NOT NULL DEFAULT 'cash'
                    CHECK (payment_mode IN ('cash','cheque','neft','rtgs','upi','imps','dd','other')),
  reference_no    TEXT,
  bank_name       TEXT,
  cheque_date     DATE,
  notes           TEXT,
  allocated_amount NUMERIC(12,2) DEFAULT 0,
  unallocated_amount NUMERIC(12,2) GENERATED ALWAYS AS (amount - allocated_amount) STORED,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, receipt_number)
);

-- ============================================================
-- RECEIPT ALLOCATIONS (applying receipts to invoices)
-- ============================================================
CREATE TABLE receipt_allocations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_id   UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL,
  allocated_by UUID REFERENCES profiles(id),
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);

-- ============================================================
-- OUT-OF-POCKET EXPENSES (OPE)
-- ============================================================
CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id),
  case_id       UUID REFERENCES cases(id),
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_type  TEXT NOT NULL
                  CHECK (expense_type IN ('court_fee','stamp_duty','travel','typing','photocopies','filing','misc')),
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  is_billable   BOOLEAN DEFAULT true,
  invoice_id    UUID REFERENCES invoices(id),  -- set when invoiced
  receipt_url   TEXT,                          -- scanned receipt
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HEARING DATES (cached from eCourts or manually entered)
-- ============================================================
CREATE TABLE hearings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id       UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  hearing_date  DATE NOT NULL,
  court_hall    TEXT,
  item_no       INTEGER,
  total_items   INTEGER,
  judge_name    TEXT,
  purpose       TEXT,
  outcome       TEXT,         -- Adjourned, Orders, Arguments, etc.
  next_date     DATE,
  notes         TEXT,
  source        TEXT DEFAULT 'manual' CHECK (source IN ('manual','ecourts_api')),
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID REFERENCES tenants(id),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_tenant    ON profiles(tenant_id);
CREATE INDEX idx_clients_tenant     ON clients(tenant_id);
CREATE INDEX idx_cases_tenant       ON cases(tenant_id);
CREATE INDEX idx_cases_client       ON cases(client_id);
CREATE INDEX idx_invoices_tenant    ON invoices(tenant_id);
CREATE INDEX idx_invoices_client    ON invoices(client_id);
CREATE INDEX idx_invoices_status    ON invoices(tenant_id, status);
CREATE INDEX idx_invoice_items_inv  ON invoice_items(invoice_id);
CREATE INDEX idx_receipts_tenant    ON receipts(tenant_id);
CREATE INDEX idx_receipts_client    ON receipts(client_id);
CREATE INDEX idx_allocations_rcpt   ON receipt_allocations(receipt_id);
CREATE INDEX idx_allocations_inv    ON receipt_allocations(invoice_id);
CREATE INDEX idx_expenses_tenant    ON expenses(tenant_id);
CREATE INDEX idx_expenses_client    ON expenses(client_id);
CREATE INDEX idx_hearings_tenant    ON hearings(tenant_id);
CREATE INDEX idx_hearings_date      ON hearings(tenant_id, hearing_date);
CREATE INDEX idx_audit_tenant       ON audit_logs(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY (Multi-tenancy enforcement)
-- ============================================================
ALTER TABLE tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases                ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_allocations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper: is current user superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
$$ LANGUAGE SQL SECURITY DEFINER;

-- Tenants: own row only (or superadmin sees all)
CREATE POLICY tenant_select ON tenants FOR SELECT
  USING (id = current_tenant_id() OR is_superadmin());
CREATE POLICY tenant_update ON tenants FOR UPDATE
  USING (id = current_tenant_id() OR is_superadmin());

-- Profiles: own tenant only
CREATE POLICY profile_select ON profiles FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_superadmin());
CREATE POLICY profile_insert ON profiles FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id() OR is_superadmin());
CREATE POLICY profile_update ON profiles FOR UPDATE
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Clients
CREATE POLICY clients_all ON clients FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Cases
CREATE POLICY cases_all ON cases FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Invoices
CREATE POLICY invoices_all ON invoices FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Invoice Items
CREATE POLICY invoice_items_all ON invoice_items FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Receipts
CREATE POLICY receipts_all ON receipts FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Receipt Allocations
CREATE POLICY allocations_all ON receipt_allocations FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Expenses
CREATE POLICY expenses_all ON expenses FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Hearings
CREATE POLICY hearings_all ON hearings FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Audit logs
CREATE POLICY audit_select ON audit_logs FOR SELECT
  USING (tenant_id = current_tenant_id() OR is_superadmin());
CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at    BEFORE UPDATE ON tenants    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at    BEFORE UPDATE ON clients    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cases_updated_at      BEFORE UPDATE ON cases      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_invoices_updated_at   BEFORE UPDATE ON invoices   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_receipts_updated_at   BEFORE UPDATE ON receipts   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at   BEFORE UPDATE ON expenses   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_next   INTEGER;
BEGIN
  SELECT invoice_prefix, next_invoice_no INTO v_prefix, v_next
    FROM tenants WHERE id = NEW.tenant_id;
  NEW.invoice_number := v_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
  UPDATE tenants SET next_invoice_no = next_invoice_no + 1 WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- Auto-generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_next   INTEGER;
BEGIN
  SELECT receipt_prefix, next_receipt_no INTO v_prefix, v_next
    FROM tenants WHERE id = NEW.tenant_id;
  NEW.receipt_number := v_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
  UPDATE tenants SET next_receipt_no = next_receipt_no + 1 WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_receipt_number
  BEFORE INSERT ON receipts
  FOR EACH ROW WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
  EXECUTE FUNCTION generate_receipt_number();

-- Update invoice paid_amount when allocation changes
CREATE OR REPLACE FUNCTION sync_invoice_payment()
RETURNS TRIGGER AS $$
DECLARE v_invoice_id UUID;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  UPDATE invoices SET
    paid_amount = (
      SELECT COALESCE(SUM(amount),0)
      FROM receipt_allocations WHERE invoice_id = v_invoice_id
    ),
    status = CASE
      WHEN (SELECT COALESCE(SUM(amount),0) FROM receipt_allocations WHERE invoice_id = v_invoice_id) >= total_amount THEN 'paid'
      WHEN (SELECT COALESCE(SUM(amount),0) FROM receipt_allocations WHERE invoice_id = v_invoice_id) > 0 THEN 'partial'
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    paid_at = CASE
      WHEN (SELECT COALESCE(SUM(amount),0) FROM receipt_allocations WHERE invoice_id = v_invoice_id) >= total_amount THEN NOW()
      ELSE NULL
    END
  WHERE id = v_invoice_id;

  -- Update receipt allocated_amount
  UPDATE receipts SET
    allocated_amount = (
      SELECT COALESCE(SUM(amount),0)
      FROM receipt_allocations WHERE receipt_id = COALESCE(NEW.receipt_id, OLD.receipt_id)
    )
  WHERE id = COALESCE(NEW.receipt_id, OLD.receipt_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_invoice_payment
  AFTER INSERT OR UPDATE OR DELETE ON receipt_allocations
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment();

-- Profile auto-create on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'clerk')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VIEWS
-- ============================================================

-- Dashboard summary per tenant
CREATE OR REPLACE VIEW v_dashboard AS
SELECT
  t.id AS tenant_id,
  (SELECT COUNT(*) FROM clients c WHERE c.tenant_id = t.id AND c.is_active) AS total_clients,
  (SELECT COUNT(*) FROM cases ca WHERE ca.tenant_id = t.id AND ca.is_active) AS total_cases,
  (SELECT COUNT(*) FROM invoices i WHERE i.tenant_id = t.id AND i.status IN ('pending','overdue')) AS open_invoices,
  (SELECT COALESCE(SUM(balance_amount),0) FROM invoices i WHERE i.tenant_id = t.id AND i.status IN ('pending','partial','overdue')) AS total_outstanding,
  (SELECT COALESCE(SUM(total_amount),0) FROM invoices i WHERE i.tenant_id = t.id AND DATE_TRUNC('month',i.invoice_date) = DATE_TRUNC('month',NOW())) AS invoiced_this_month,
  (SELECT COALESCE(SUM(amount),0) FROM receipts r WHERE r.tenant_id = t.id AND DATE_TRUNC('month',r.receipt_date) = DATE_TRUNC('month',NOW())) AS collected_this_month,
  (SELECT COUNT(*) FROM hearings h WHERE h.tenant_id = t.id AND h.hearing_date >= CURRENT_DATE AND h.hearing_date <= CURRENT_DATE + INTERVAL '7 days') AS hearings_this_week
FROM tenants t;

-- Overdue invoices updater (run daily via cron)
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS VOID AS $$
  UPDATE invoices
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- SEED DATA — Superadmin tenant
-- ============================================================
INSERT INTO tenants (id, name, email, plan, max_users, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'LexLedger Administration',
  'admin@lexledger.in',
  'enterprise',
  100,
  true
);
