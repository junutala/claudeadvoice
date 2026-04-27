import { createServerClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('*, tenant:tenants(*)').eq('id', session!.user.id).single()

  return <SettingsClient profile={profile} tenant={(profile?.tenant as any) || {}} />
}
