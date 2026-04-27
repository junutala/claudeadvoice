import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date() 
}

export function daysDiff(date: string): number {
  const diff = new Date(date).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const COURTS = [
  'Supreme Court of India',
  'Madras High Court',
  'Bombay High Court',
  'Delhi High Court',
  'Calcutta High Court',
  'Karnataka High Court',
  'Kerala High Court',
  'Andhra Pradesh High Court',
  'Telangana High Court',
  'City Civil Court, Chennai',
  'Principal District Court',
  'Subordinate Court',
  'Family Court',
  'Labour Court',
  'Consumer Forum',
  'Debt Recovery Tribunal',
  'National Company Law Tribunal',
  'Income Tax Appellate Tribunal',
]

export const CASE_TYPES = [
  'Civil', 'Criminal', 'Constitutional / Writ',
  'Arbitration', 'Labour', 'Tax', 'Family',
  'Company Law', 'Consumer', 'Revenue', 'Other',
]

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
  court_fee: 'Court Fee',
  stamp_duty: 'Stamp Duty',
  travel: 'Travel',
  typing: 'Typing / Stationery',
  photocopies: 'Photocopies',
  filing: 'Filing Charges',
  misc: 'Miscellaneous',
}

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  neft: 'NEFT',
  rtgs: 'RTGS',
  upi: 'UPI',
  imps: 'IMPS',
  dd: 'Demand Draft',
  other: 'Other',
}

export const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700' },
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700' },
  partial:   { label: 'Partial',   color: 'bg-orange-100 text-orange-700' },
  paid:      { label: 'Paid',      color: 'bg-green-100 text-green-700' },
  overdue:   { label: 'Overdue',   color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
}

export const PLAN_CONFIG = {
  trial:        { label: 'Trial',        color: 'bg-gray-100 text-gray-600',   maxUsers: 1  },
  starter:      { label: 'Starter',      color: 'bg-blue-100 text-blue-700',   maxUsers: 2  },
  professional: { label: 'Professional', color: 'bg-gold-100 text-gold-700',   maxUsers: 5  },
  enterprise:   { label: 'Enterprise',   color: 'bg-navy-100 text-navy-700',   maxUsers: 10 },
}
