import { createServerClient } from '@/lib/supabase/server'
import ExpensesClient from './ExpensesClient'

export default async function ExpensesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const [{ data: expenses }, { data: clients }] = await Promise.all([
    supabase.from('expenses')
      .select('*, client:clients(name), case:cases(title, case_number), invoice:invoices(invoice_number)')
      .eq('tenant_id', profile?.tenant_id)
      .order('expense_date', { ascending: false }),
    supabase.from('clients').select('id, name, cases(id, title, case_number)').eq('tenant_id', profile?.tenant_id).eq('is_active', true).order('name'),
  ])

  return <ExpensesClient expenses={expenses || []} clients={clients || []} tenantId={profile?.tenant_id} />
}
