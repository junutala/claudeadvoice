import { createServerClient } from '@/lib/supabase/server'
import HearingsClient from './HearingsClient'

export default async function HearingsPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: upcoming }, { data: past }, { data: cases }] = await Promise.all([
    supabase.from('hearings')
      .select('*, case:cases(id, title, case_number, court, client_id, client:clients(name))')
      .eq('tenant_id', profile?.tenant_id)
      .gte('hearing_date', today)
      .order('hearing_date', { ascending: true }),
    supabase.from('hearings')
      .select('*, case:cases(id, title, case_number, court, client:clients(name))')
      .eq('tenant_id', profile?.tenant_id)
      .lt('hearing_date', today)
      .order('hearing_date', { ascending: false })
      .limit(20),
    supabase.from('cases')
      .select('id, title, case_number, court, client:clients(name)')
      .eq('tenant_id', profile?.tenant_id)
      .eq('is_active', true)
      .order('title'),
  ])

  return <HearingsClient upcoming={upcoming || []} past={past || []} cases={cases || []} tenantId={profile?.tenant_id} />
}
