'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard',            label: 'Dashboard'      },
  { href: '/dashboard/clients',    label: 'Clients'        },
  { href: '/dashboard/invoices',   label: 'Invoices'       },
  { href: '/dashboard/receipts',   label: 'Receipts'       },
  { href: '/dashboard/apply',      label: 'Apply Receipts' },
  { href: '/dashboard/expenses',   label: 'Expenses'       },
  { href: '/dashboard/causelist',  label: 'Cause List'     },
  { href: '/dashboard/hearings',   label: 'Hearings'       },
  { href: '/dashboard/superadmin', label: 'Admin'          },
  { href: '/dashboard/settings',   label: 'Settings'       },
]

export default function MobileNav({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-navy-600 flex items-center justify-between px-4 py-3">
        <span className="text-white font-serif font-bold text-sm">LexLedger Pro</span>
        <button onClick={() => setOpen(!open)} className="text-white text-xl">
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
          <div className="w-64 h-full bg-navy-600 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-4 border-b border-white/10">
              <p className="text-white font-serif font-bold">LexLedger Pro</p>
              <p className="text-white/50 text-xs mt-0.5">{userName}</p>
            </div>
            <nav className="flex-1 overflow-y-auto py-3">
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block px-4 py-2.5 text-sm border-l-2 transition-all',
                    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                      ? 'text-white bg-white/10 border-white'
                      : 'text-white/65 border-transparent hover:text-white'
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-3 border-t border-white/10">
              <button onClick={handleSignOut} className="text-white/60 text-sm hover:text-white">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
