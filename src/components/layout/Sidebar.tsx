'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { section: 'Overview', items: [
    { href: '/dashboard',            label: 'Dashboard',      icon: '▪' },
  ]},
  { section: 'Billing', items: [
    { href: '/dashboard/clients',    label: 'Clients',        icon: '◉' },
    { href: '/dashboard/invoices',   label: 'Invoices',       icon: '◈' },
    { href: '/dashboard/receipts',   label: 'Receipts',       icon: '◆' },
    { href: '/dashboard/apply',      label: 'Apply Receipts', icon: '◇' },
    { href: '/dashboard/expenses',   label: 'OPE / Expenses', icon: '▲' },
  ]},
  { section: 'eCourts', items: [
    { href: '/dashboard/causelist',  label: 'Cause List',     icon: '⊛' },
    { href: '/dashboard/hearings',   label: 'Next Hearings',  icon: '⊙' },
  ]},
  { section: 'Admin', items: [
    { href: '/dashboard/superadmin', label: 'Super Admin',    icon: '⊕' },
    { href: '/dashboard/settings',   label: 'Settings',       icon: '⚙' },
  ]},
]

interface SidebarProps {
  userName: string
  userRole: string
  tenantName: string
}

export default function Sidebar({ userName, userRole, tenantName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-52 bg-navy-600 flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="text-white font-serif font-bold text-sm leading-tight">LexLedger Pro</div>
        <div className="text-white/40 text-[10px] uppercase tracking-widest mt-0.5">Advocate Billing Suite</div>
      </div>

      {/* Tenant name */}
      <div className="px-4 py-2 bg-navy-700/40 border-b border-white/10">
        <p className="text-white/60 text-[10px] truncate">{tenantName}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-white/35 font-medium">{section}</p>
            {items.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-xs transition-all border-l-2',
                    active
                      ? 'text-white bg-white/10 border-white'
                      : 'text-white/65 border-transparent hover:text-white hover:bg-white/6'
                  )}
                >
                  <span className="w-4 text-center text-sm">{icon}</span>
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div className="min-w-0">
            <p className="text-white/85 text-xs truncate">{userName}</p>
            <p className="text-white/40 text-[10px] capitalize">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
