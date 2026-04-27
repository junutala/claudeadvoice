-- Client Contacts (multiple contacts per client)
CREATE TABLE IF NOT EXISTS client_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  designation TEXT,
  email       TEXT,
  phone       TEXT,
  is_primary  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_client ON client_contacts(client_id);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY contacts_all ON client_contacts FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Plans table (legal service plans)
CREATE TABLE IF NOT EXISTS plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_name    TEXT NOT NULL,
  description  TEXT,
  fee_amount   NUMERIC(12,2) DEFAULT 0,
  fee_type     TEXT DEFAULT 'fixed' CHECK (fee_type IN ('fixed','monthly','hourly','retainer')),
  start_date   DATE,
  end_date     DATE,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_client ON plans(client_id);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_all ON plans FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());

-- Plan responsibilities
CREATE TABLE IF NOT EXISTS plan_responsibilities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id  UUID REFERENCES profiles(id),
  role_name   TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plan_responsibilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY responsibilities_all ON plan_responsibilities FOR ALL
  USING (tenant_id = current_tenant_id() OR is_superadmin());
