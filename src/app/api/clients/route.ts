import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()
  const { data, error } = await supabase
    .from('clients')
    .select('*, cases(id, title, case_number, court, next_hearing)')
    .eq('tenant_id', profile?.tenant_id)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data: profile } = await supabase.from('profiles').select('tenant_id,id').eq('id', session.user.id).single()

  const { data, error } = await supabase.from('clients').insert({
    ...body, tenant_id: profile?.tenant_id, created_by: profile?.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
