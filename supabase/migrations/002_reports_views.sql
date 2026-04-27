-- ============================================================
-- Migration 002 — Reports view & overdue cron
-- ============================================================

-- Monthly billing summary per tenant
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  i.tenant_id,
  DATE_TRUNC('month', i.invoice_date)        AS month,
  COUNT(*)                                   AS invoice_count,
  SUM(i.total_amount)                        AS total_invoiced,
  SUM(i.paid_amount)                         AS total_collected,
  SUM(i.balance_amount)                      AS total_outstanding,
  COUNT(*) FILTER (WHERE i.status = 'paid')  AS paid_count,
  COUNT(*) FILTER (WHERE i.status = 'overdue') AS overdue_count
FROM invoices i
GROUP BY i.tenant_id, DATE_TRUNC('month', i.invoice_date);

-- Client ledger view (all money movement per client)
CREATE OR REPLACE VIEW v_client_ledger AS
SELECT
  c.id         AS client_id,
  c.tenant_id,
  c.name       AS client_name,
  COUNT(DISTINCT i.id)  AS total_invoices,
  SUM(i.total_amount)   AS total_billed,
  SUM(i.paid_amount)    AS total_paid,
  SUM(i.balance_amount) AS outstanding,
  COUNT(DISTINCT ca.id) AS case_count,
  MAX(i.invoice_date)   AS last_invoice_date
FROM clients c
LEFT JOIN invoices i  ON i.client_id = c.id
LEFT JOIN cases   ca  ON ca.client_id = c.id AND ca.is_active
WHERE c.is_active = true
GROUP BY c.id, c.tenant_id, c.name;

-- ============================================================
-- pg_cron job to auto-mark overdue invoices (requires pg_cron extension)
-- Uncomment in Supabase: Extensions → pg_cron
-- ============================================================
-- SELECT cron.schedule('mark-overdue', '0 1 * * *', 'SELECT mark_overdue_invoices()');
