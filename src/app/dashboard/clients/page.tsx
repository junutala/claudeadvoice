import { createServerClient } from '@/lib/supabase/server'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const { data: clients } = await supabase
    .from('clients')
    .select(`*, cases(id, title, case_number, court, next_hearing, is_active),
      invoices(balance_amount, status)`)
    .eq('tenant_id', profile?.tenant_id)
    .eq('is_active', true)
    .order('name')

  const enriched = (clients || []).map((c: any) => ({
    ...c,
    outstanding: c.invoices?.filter((i: any) => ['pending','partial','overdue'].includes(i.status))
      .reduce((s: number, i: any) => s + (i.balance_amount || 0), 0) || 0,
    active_cases: c.cases?.filter((ca: any) => ca.is_active).length || 0,
  }))

  return <ClientsClient clients={enriched} />
}
