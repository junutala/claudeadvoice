import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin — list all tenants (superadmin only)
export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: tenants } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
  const { data: profiles } = await supabase.from('profiles').select('*, tenant:tenants(name)')

  return NextResponse.json({ tenants, profiles })
}

// POST /api/admin — create tenant (superadmin only)
export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role,id').eq('id', session.user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data: tenant, error } = await supabase.from('tenants').insert({
    ...body,
    onboarded_by: profile.id,
    is_active: true,
    trial_ends_at: body.plan === 'trial' ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(tenant, { status: 201 })
}

// PATCH /api/admin — update tenant plan/status
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tenant_id, ...updates } = await req.json()
  const { data, error } = await supabase.from('tenants').update(updates).eq('id', tenant_id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
