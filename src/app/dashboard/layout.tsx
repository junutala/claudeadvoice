import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenant:tenants(*)')
    .eq('id', session.user.id)
    .single()

  const userName   = profile?.full_name  || session.user.email || 'User'
  const userRole   = profile?.role        || 'clerk'
  const tenantName = (profile?.tenant as any)?.firm_name || (profile?.tenant as any)?.name || 'LexLedger'

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar userName={userName} userRole={userRole} tenantName={tenantName} />
      </div>

      {/* Mobile nav */}
      <MobileNav userName={userName} />

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
