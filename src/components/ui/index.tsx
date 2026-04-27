'use client'
import React from 'react'
import { cn } from '@/lib/utils'

// ── Badge ────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warn' | 'danger' | 'info' | 'gold' | 'neutral'
const badgeClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  warn:    'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  info:    'bg-blue-100 text-blue-700',
  gold:    'bg-yellow-100 text-yellow-700',
  neutral: 'bg-gray-100 text-gray-500',
}
export function Badge({ variant = 'default', children, className }: {
  variant?: BadgeVariant; children: React.ReactNode; className?: string
}) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', badgeClasses[variant], className)}>
      {children}
    </span>
  )
}

// ── Status Badge ──────────────────────────────────────────────────
import { STATUS_CONFIG } from '@/lib/utils'
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>{cfg.label}</span>
}

// ── Button ────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const btnClasses: Record<BtnVariant, string> = {
  primary:   'bg-navy-600 text-white hover:bg-navy-700 border-navy-600',
  secondary: 'bg-navy-50 text-navy-700 hover:bg-navy-100 border-navy-200',
  ghost:     'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 border-red-600',
}
export function Button({ variant = 'ghost', size = 'md', className, children, ...props }: {
  variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; className?: string;
  children: React.ReactNode; [key: string]: any
}) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }
  return (
    <button
      className={cn('inline-flex items-center gap-1.5 rounded border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap', btnClasses[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-white border border-gray-200 rounded-lg', className)}>{children}</div>
}
export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-4 py-3 border-b border-gray-200 flex items-center justify-between', className)}>{children}</div>
}
export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-900">{children}</h3>
}
export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>
}

// ── Stat Card ─────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down'
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold font-serif text-gray-900">{value}</p>
        {sub && (
          <p className={cn('text-xs mt-1', trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-500')}>
            {sub}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

// ── Form Elements ─────────────────────────────────────────────────
export function FormGroup({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputBase = 'w-full text-sm text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 transition-colors'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputBase, className)} {...props} />
  )
)
Input.displayName = 'Input'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(inputBase, className)} {...props}>{children}</select>
  )
)
Select.displayName = 'Select'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(inputBase, 'resize-y min-h-[70px]', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={cn('bg-white rounded-lg border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto', wide ? 'w-full max-w-2xl' : 'w-full max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">✕</button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────
export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Tr({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={cn('border-b border-gray-100 last:border-0', onClick && 'cursor-pointer hover:bg-gray-50')}>
      {children}
    </tr>
  )
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2.5 text-gray-700 align-middle', className)}>{children}</td>
}

// ── Tabs ──────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: {
  tabs: string[]; active: string; onChange: (t: string) => void
}) {
  return (
    <div className="flex border-b border-gray-200 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
            active === tab
              ? 'border-navy-600 text-navy-700 font-medium'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────
export function EmptyState({ icon, message, action }: {
  icon?: string; message: string; action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12 text-gray-400">
      {icon && <div className="text-3xl mb-2">{icon}</div>}
      <p className="text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  return (
    <div className={cn('rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-semibold flex-shrink-0', sizes[size])}>
      {initials}
    </div>
  )
}

// ── Page Header ───────────────────────────────────────────────────
export function PageHeader({ title, sub, actions }: {
  title: string; sub?: string; actions?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="text-lg font-bold font-serif text-gray-900">{title}</h1>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

// ── Search Input ──────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-navy-500"
      />
    </div>
  )
}

// ── Hearing Chip ──────────────────────────────────────────────────
export function HearingChip({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-700 font-medium">
      📅 {date}
    </span>
  )
}
