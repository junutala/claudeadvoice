import { createServerClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatCard, Card, CardHeader, CardTitle, CardBody, StatusBadge, HearingChip } from '@/components/ui'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()
  const tenantId = profile?.tenant_id

  // Fetch all dashboard data in parallel
  const [
    { data: clients },
    { data: invoices },
    { data: receiptsMonth },
    { data: hearings },
    { data: expenses },
  ] = await Promise.all([
    supabase.from('clients').select('id').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('invoices').select('*, client:clients(name)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
    supabase.from('receipts').select('amount').eq('tenant_id', tenantId)
      .gte('receipt_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    supabase.from('hearings').select('*, case:cases(title, case_number, court)').eq('tenant_id', tenantId)
      .gte('hearing_date', new Date().toISOString().split('T')[0])
      .order('hearing_date', { ascending: true }).limit(5),
    supabase.from('expenses').select('amount, is_billable, invoice_id').eq('tenant_id', tenantId)
      .gte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ])

  const outstanding = (invoices || [])
    .filter(i => ['pending','partial','overdue'].includes(i.status))
    .reduce((s: number, i: any) => s + (i.balance_amount || 0), 0)

  const collectedMonth = (receiptsMonth || []).reduce((s: number, r: any) => s + r.amount, 0)
  const invoicedMonth  = (invoices  || [])
    .filter((i: any) => i.invoice_date >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
    .reduce((s: number, i: any) => s + i.total_amount, 0)

  const unbilledOPE = (expenses || []).filter((e: any) => e.is_billable && !e.invoice_id)
    .reduce((s: number, e: any) => s + e.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-serif font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/invoices/new" className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50">+ Invoice</Link>
          <Link href="/dashboard/clients/new" className="px-3 py-1.5 text-xs bg-navy-600 text-white rounded-md hover:bg-navy-700">+ Client</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} sub="All open invoices" trend="down" />
        <StatCard label={`Collected (${new Date().toLocaleDateString('en-IN',{month:'short'})})`} value={formatCurrency(collectedMonth)} sub="This month" trend="up" />
        <StatCard label="Active Clients" value={String(clients?.length || 0)} sub="Across all cases" />
        <StatCard label="Unbilled OPE" value={formatCurrency(unbilledOPE)} sub="Expenses to invoice" trend="down" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <Link href="/dashboard/invoices" className="text-xs text-navy-600 hover:underline">View all →</Link>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Invoice','Client','Amount','Due','Status'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(invoices || []).map((inv: any) => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                      <td className="px-3 py-2.5">
                        <Link href={`/dashboard/invoices/${inv.id}`} className="text-navy-600 text-xs font-medium hover:underline">{inv.invoice_number}</Link>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[120px] truncate">{inv.client?.name}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-900">{formatCurrency(inv.total_amount)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{formatDate(inv.due_date)}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                  {!invoices?.length && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-400">No invoices yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Upcoming Hearings */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Hearings</CardTitle>
              <Link href="/dashboard/hearings" className="text-xs text-navy-600 hover:underline">All →</Link>
            </CardHeader>
            <CardBody className="p-0">
              {(hearings || []).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No hearings scheduled</p>
              )}
              {(hearings || []).map((h: any, i: number) => (
                <div key={h.id} className={`px-4 py-3 ${i < (hearings?.length||0)-1 ? 'border-b border-gray-100' : ''}`}>
                  <p className="text-xs font-semibold text-gray-900 truncate">{h.case?.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{h.case?.court} · {h.case?.case_number}</p>
                  <HearingChip date={formatDate(h.hearing_date)} />
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardBody className="flex flex-col gap-2">
              {[
                { label: '+ New Invoice',   href: '/dashboard/invoices/new' },
                { label: '+ Record Receipt', href: '/dashboard/receipts/new' },
                { label: '+ Add Expense',   href: '/dashboard/expenses/new' },
                { label: '⌕ Cause List',   href: '/dashboard/causelist' },
              ].map(({ label, href }) => (
                <Link key={href} href={href}
                  className="text-xs text-center py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-navy-50 hover:border-navy-200 hover:text-navy-700 transition-colors">
                  {label}
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
