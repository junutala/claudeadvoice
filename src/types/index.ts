// ============================================================
// LexLedger Pro — Shared TypeScript Types
// ============================================================

export type UserRole = 'superadmin' | 'owner' | 'associate' | 'clerk'
export type Plan = 'trial' | 'starter' | 'professional' | 'enterprise'
export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMode = 'cash' | 'cheque' | 'neft' | 'rtgs' | 'upi' | 'imps' | 'dd' | 'other'
export type ExpenseType = 'court_fee' | 'stamp_duty' | 'travel' | 'typing' | 'photocopies' | 'filing' | 'misc'
export type HearingSource = 'manual' | 'ecourts_api'
export type CaseStage = 'Filing' | 'Hearing' | 'Arguments' | 'Judgment' | 'Disposed'

export interface Tenant {
  id: string
  name: string
  firm_name?: string
  bar_council_no?: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  gstin?: string
  pan?: string
  primary_court?: string
  logo_url?: string
  plan: Plan
  max_users: number
  trial_ends_at?: string
  is_active: boolean
  invoice_prefix: string
  receipt_prefix: string
  next_invoice_no: number
  next_receipt_no: number
  bank_name?: string
  bank_account?: string
  bank_ifsc?: string
  bank_branch?: string
  invoice_notes?: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  tenant_id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  tenant_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  pan?: string
  gstin?: string
  notes?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  // joins
  cases?: Case[]
  outstanding?: number
}

export interface Case {
  id: string
  tenant_id: string
  client_id: string
  title: string
  case_number?: string
  cnr_number?: string
  court?: string
  case_type?: string
  stage?: string
  petitioner?: string
  respondent?: string
  retainer_fee: number
  next_hearing?: string
  last_hearing?: string
  judge_name?: string
  bench_type?: string
  filing_date?: string
  disposal_date?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
  // joins
  client?: Client
  hearings?: Hearing[]
}

export interface Invoice {
  id: string
  tenant_id: string
  client_id: string
  case_id?: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: InvoiceStatus
  subtotal: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  paid_amount: number
  balance_amount: number
  notes?: string
  terms?: string
  created_by?: string
  sent_at?: string
  paid_at?: string
  created_at: string
  updated_at: string
  // joins
  client?: Client
  case?: Case
  items?: InvoiceItem[]
  allocations?: ReceiptAllocation[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  tenant_id: string
  description: string
  quantity: number
  rate: number
  amount: number
  sort_order: number
  created_at: string
}

export interface Receipt {
  id: string
  tenant_id: string
  client_id: string
  receipt_number: string
  receipt_date: string
  amount: number
  payment_mode: PaymentMode
  reference_no?: string
  bank_name?: string
  cheque_date?: string
  notes?: string
  allocated_amount: number
  unallocated_amount: number
  created_by?: string
  created_at: string
  updated_at: string
  // joins
  client?: Client
  allocations?: ReceiptAllocation[]
}

export interface ReceiptAllocation {
  id: string
  tenant_id: string
  receipt_id: string
  invoice_id: string
  amount: number
  allocated_by?: string
  allocated_at: string
  notes?: string
  // joins
  receipt?: Receipt
  invoice?: Invoice
}

export interface Expense {
  id: string
  tenant_id: string
  client_id?: string
  case_id?: string
  expense_date: string
  expense_type: ExpenseType
  description: string
  amount: number
  is_billable: boolean
  invoice_id?: string
  receipt_url?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  // joins
  client?: Client
  case?: Case
  invoice?: Invoice
}

export interface Hearing {
  id: string
  tenant_id: string
  case_id: string
  hearing_date: string
  court_hall?: string
  item_no?: number
  total_items?: number
  judge_name?: string
  purpose?: string
  outcome?: string
  next_date?: string
  notes?: string
  source: HearingSource
  created_by?: string
  created_at: string
  // joins
  case?: Case
}

export interface DashboardStats {
  tenant_id: string
  total_clients: number
  total_cases: number
  open_invoices: number
  total_outstanding: number
  invoiced_this_month: number
  collected_this_month: number
  hearings_this_week: number
}

// Form types
export interface InvoiceFormData {
  client_id: string
  case_id?: string
  invoice_date: string
  due_date: string
  gst_rate: number
  notes?: string
  terms?: string
  items: { description: string; quantity: number; rate: number }[]
}

export interface ClientFormData {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  pan?: string
  gstin?: string
  notes?: string
  // case
  case_title?: string
  case_number?: string
  cnr_number?: string
  court?: string
  case_type?: string
  retainer_fee?: number
}

export interface ReceiptFormData {
  client_id: string
  receipt_date: string
  amount: number
  payment_mode: PaymentMode
  reference_no?: string
  bank_name?: string
  cheque_date?: string
  notes?: string
}

export interface ExpenseFormData {
  client_id?: string
  case_id?: string
  expense_date: string
  expense_type: ExpenseType
  description: string
  amount: number
  is_billable: boolean
  notes?: string
}

// eCourts API types (mock)
export interface ECourtCase {
  cnr: string
  case_no: string
  case_type: string
  filing_date: string
  petitioner: string
  respondent: string
  court: string
  judge: string
  next_hearing: string
  item_no: number
  orders: ECourtOrder[]
}

export interface ECourtOrder {
  date: string
  order_no: string
  download_url: string
}

export interface CauseListResult {
  court: string
  date: string
  bench: string
  items: CauseListItem[]
}

export interface CauseListItem {
  item_no: number
  case_no: string
  cnr: string
  petitioner: string
  respondent: string
  advocate: string
  purpose: string
}
