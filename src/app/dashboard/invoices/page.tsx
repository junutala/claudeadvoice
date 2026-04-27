export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase/server'
import InvoicesClient from './InvoicesClient'

export default async function InvoicesPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase.from('invoices')
      .select('*, client:clients(name, id), case:cases(title, case_number)')
      .eq('tenant_id', profile?.tenant_id)
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').eq('tenant_id', profile?.tenant_id).eq('is_active', true).order('name'),
  ])

  return <InvoicesClient invoices={invoices || []} clients={clients || []} tenantId={profile?.tenant_id} />
}
