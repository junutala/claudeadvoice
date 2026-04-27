'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { formatDate, COURTS } from '@/lib/utils'
import {
  PageHeader, SearchInput, Button, Card, CardHeader, CardTitle, CardBody,
  StatCard, Table, Tr, Td, Badge, Tabs, Modal, FormGroup, Input, Select, Textarea
} from '@/components/ui'

const PLAN_OPTIONS = [
  { value: 'trial',        label: 'Trial (1 user, Free)',               maxUsers: 1  },
  { value: 'starter',      label: 'Starter (2 users, ₹999/mo)',         maxUsers: 2  },
  { value: 'professional', label: 'Professional (5 users, ₹2,499/mo)',  maxUsers: 5  },
  { value: 'enterprise',   label: 'Enterprise (10 users, ₹4,999/mo)',   maxUsers: 10 },
]

const PLAN_BADGES: Record<string, string> = {
  trial: 'neutral', starter: 'info', professional: 'gold', enterprise: 'success'
}

export default function SuperAdminClient({ tenants: initial, allProfiles }: {
  tenants: any[]; allProfiles: any[]
}) {
  const [tenants, setTenants] = useState(initial)
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState('Tenants')
  const [modal, setModal]     = useState(false)
  const [manageModal, setManageModal] = useState<any>(null)
  const [saving, setSaving]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { plan: 'starter', max_users: 2, primary_court: 'Madras High Court' },
  })

  const watchPlan = watch('plan')

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.bar_council_no?.toLowerCase().includes(search.toLowerCase())
  )

  const totalMRR = tenants.filter(t => t.is_active && t.plan !== 'trial').reduce((s, t) => {
    const prices: Record<string, number> = { starter: 999, professional: 2499, enterprise: 4999 }
    return s + (prices[t.plan] || 0)
  }, 0)

  const onSubmit = async (data: any) => {
    setSaving(true)
    // 1. Create the tenant
    const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
      name: data.name, firm_name: data.firm_name, bar_council_no: data.bar_council_no,
      email: data.email, phone: data.phone, primary_court: data.primary_court,
      plan: data.plan, max_users: parseInt(data.max_users),
      trial_ends_at: data.plan === 'trial' ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
      is_active: true,
    }).select().single()

    if (!tErr && tenant) {
      // 2. Create auth user (in real app: send invite email)
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: data.email,
        password: Math.random().toString(36).slice(-10),
        email_confirm: true,
        user_metadata: { full_name: data.name, role: 'owner' },
      })

      if (!authErr && authData?.user) {
        await supabase.from('profiles').update({ tenant_id: tenant.id, role: 'owner' }).eq('id', authData.user.id)
      }
    }

    setSaving(false)
    if (!tErr) { reset(); setModal(false); router.refresh() }
  }

  const handleToggleActive = async (tenant: any) => {
    await supabase.from('tenants').update({ is_active: !tenant.is_active }).eq('id', tenant.id)
    router.refresh()
  }

  const handleUpdatePlan = async (tenantId: string, plan: string) => {
    const maxUsers = PLAN_OPTIONS.find(p => p.value === plan)?.maxUsers || 2
    await supabase.from('tenants').update({ plan, max_users: maxUsers }).eq('id', tenantId)
    setManageModal(null)
    router.refresh()
  }

  return (
    <div>
      <PageHeader
        title="Super Admin"
        sub="Tenant and subscription management"
        actions={<Button variant="primary" onClick={() => setModal(true)}>+ Onboard Advocate</Button>}
      />

      {/* Platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Tenants" value={String(tenants.length)} sub="All advocates" />
        <StatCard label="Active" value={String(tenants.filter(t => t.is_active).length)} sub="Subscribed" trend="up" />
        <StatCard label="Total Users" value={String(allProfiles.length)} sub="Across all tenants" />
        <StatCard label="MRR" value={`₹${totalMRR.toLocaleString('en-IN')}`} sub="Monthly recurring" trend="up" />
      </div>

      <Tabs tabs={['Tenants','Users']} active={tab} onChange={setTab} />

      {tab === 'Tenants' ? (
        <>
          <div className="mb-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, or bar number..." />
          </div>
          <Card>
            <Table headers={['Advocate / Firm','Bar No.','Court','Plan','Users','Joined','Status','']}>
              {filteredTenants.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <p className="text-xs font-semibold text-gray-900">{t.firm_name || t.name}</p>
                    <p className="text-[10px] text-gray-500">{t.email}</p>
                  </Td>
                  <Td className="text-xs">{t.bar_council_no || '—'}</Td>
                  <Td className="text-xs text-gray-600 max-w-[100px] truncate">{t.primary_court}</Td>
                  <Td>
                    <Badge variant={PLAN_BADGES[t.plan] as any || 'neutral'}>{t.plan}</Badge>
                  </Td>
                  <Td className="text-xs">{t.user_count} / {t.max_users}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(t.created_at)}</Td>
                  <Td>
                    {!t.is_active
                      ? <Badge variant="danger">Inactive</Badge>
                      : t.plan === 'trial'
                      ? <Badge variant="warn">Trial</Badge>
                      : <Badge variant="success">Active</Badge>}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => setManageModal(t)}>Manage</Button>
                      <Button size="sm" variant={t.is_active ? 'danger' : 'secondary'} onClick={() => handleToggleActive(t)}>
                        {t.is_active ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>
          </Card>
        </>
      ) : (
        <Card>
          <Table headers={['Name','Email','Role','Tenant','Joined','Status']}>
            {allProfiles.map((p) => (
              <Tr key={p.id}>
                <Td className="text-xs font-medium text-gray-900">{p.full_name}</Td>
                <Td className="text-xs text-gray-600">{p.email}</Td>
                <Td><Badge variant={p.role === 'owner' ? 'info' : 'neutral'}>{p.role}</Badge></Td>
                <Td className="text-xs text-gray-600">{(p.tenant as any)?.name || '—'}</Td>
                <Td className="text-xs text-gray-500">{formatDate(p.created_at)}</Td>
                <Td><Badge variant={p.is_active ? 'success' : 'danger'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Onboard Modal */}
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Onboard New Advocate" wide
        footer={<>
          <Button onClick={() => { setModal(false); reset() }}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Creating...' : 'Create & Send Invite'}
          </Button>
        </>}
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Advocate Name" required error={errors.name?.message}>
              <Input {...register('name', { required: true })} placeholder="Full name" />
            </FormGroup>
            <FormGroup label="Firm Name (optional)">
              <Input {...register('firm_name')} placeholder="M/s XYZ Law Associates" />
            </FormGroup>
            <FormGroup label="Email (login)" required error={errors.email?.message}>
              <Input {...register('email', { required: true })} type="email" placeholder="advocate@email.com" />
            </FormGroup>
            <FormGroup label="Phone">
              <Input {...register('phone')} placeholder="+91 XXXXX XXXXX" />
            </FormGroup>
            <FormGroup label="Bar Council No.">
              <Input {...register('bar_council_no')} placeholder="TN/XXXXX/YYYY" />
            </FormGroup>
            <FormGroup label="Primary Court">
              <Select {...register('primary_court')}>
                {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Subscription Plan">
              <Select {...register('plan')} onChange={e => {
                const p = PLAN_OPTIONS.find(x => x.value === e.target.value)
                setValue('max_users', p?.maxUsers || 2)
              }}>
                {PLAN_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Max Users Allowed">
              <Input {...register('max_users')} type="number" min={1} max={50} />
            </FormGroup>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            An invitation email will be sent to the advocate with temporary login credentials.
            {watchPlan === 'trial' && ' They will have a 14-day free trial.'}
          </div>
        </form>
      </Modal>

      {/* Manage Tenant Modal */}
      {manageModal && (
        <Modal open={!!manageModal} onClose={() => setManageModal(null)} title={`Manage — ${manageModal.firm_name || manageModal.name}`}
          footer={<Button onClick={() => setManageModal(null)}>Close</Button>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ['Email', manageModal.email], ['Phone', manageModal.phone || '—'],
                ['Bar No.', manageModal.bar_council_no || '—'], ['Court', manageModal.primary_court],
                ['Plan', manageModal.plan], ['Users', `${manageModal.user_count} / ${manageModal.max_users}`],
                ['Joined', formatDate(manageModal.created_at)], ['Status', manageModal.is_active ? 'Active' : 'Suspended'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-gray-500">{label}</p>
                  <p className="font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Change Plan</p>
              <div className="flex gap-2 flex-wrap">
                {PLAN_OPTIONS.map(p => (
                  <Button key={p.value} size="sm"
                    variant={manageModal.plan === p.value ? 'primary' : 'ghost'}
                    onClick={() => handleUpdatePlan(manageModal.id, p.value)}>
                    {p.label.split(' ')[0]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Bank Details on File</p>
              {manageModal.bank_account ? (
                <p className="text-xs text-gray-600">{manageModal.bank_name} · {manageModal.bank_account} · {manageModal.bank_ifsc}</p>
              ) : <p className="text-xs text-gray-400">Not configured</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
