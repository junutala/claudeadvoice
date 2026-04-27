import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuperAdminClient from './SuperAdminClient'

export default async function SuperAdminPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', session!.user.id).single()

  if (profile?.role !== 'superadmin') redirect('/dashboard')

  const [{ data: tenants }, { data: profiles }] = await Promise.all([
    supabase.from('tenants').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*, tenant:tenants(name)').order('created_at', { ascending: false }),
  ])

  const tenantStats = (tenants || []).map(t => ({
    ...t,
    user_count: (profiles || []).filter(p => p.tenant_id === t.id).length,
  }))

  return <SuperAdminClient tenants={tenantStats} allProfiles={profiles || []} />
}
