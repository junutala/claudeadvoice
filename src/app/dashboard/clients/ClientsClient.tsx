'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate, COURTS, CASE_TYPES } from '@/lib/utils'
import {
  PageHeader, SearchInput, Button, Card, Table, Tr, Td,
  Badge, Modal, FormGroup, Input, Select, Textarea, EmptyState
} from '@/components/ui'
import type { ClientFormData } from '@/types'

export default function ClientsClient({ clients: initial }: { clients: any[] }) {
  const [clients, setClients] = useState(initial)
  const [search, setSearch]   = useState('')
  const [modalOpen, setModal] = useState(false)
  const [saving, setSaving]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientFormData>()

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cases?.some((ca: any) => ca.title?.toLowerCase().includes(search.toLowerCase()) ||
      ca.case_number?.toLowerCase().includes(search.toLowerCase()))
  )

  const onSubmit = async (data: ClientFormData) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: profile } = await supabase.from('profiles').select('tenant_id,id').eq('id', session!.user.id).single()

    const { data: client, error } = await supabase.from('clients').insert({
      tenant_id: profile?.tenant_id,
      name: data.name, email: data.email, phone: data.phone,
      address: data.address, city: data.city, state: data.state,
      pincode: data.pincode, pan: data.pan, gstin: data.gstin, notes: data.notes,
      created_by: profile?.id,
    }).select().single()

    if (!error && client && data.case_title) {
      await supabase.from('cases').insert({
        tenant_id: profile?.tenant_id, client_id: client.id,
        title: data.case_title, case_number: data.case_number,
        cnr_number: data.cnr_number, court: data.court,
        case_type: data.case_type, retainer_fee: data.retainer_fee || 0,
        created_by: profile?.id,
      })
    }

    setSaving(false)
    if (!error) {
      setModal(false)
      reset()
      router.refresh()
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        sub="All clients and matters"
        actions={<Button variant="primary" onClick={() => setModal(true)}>+ New Client</Button>}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, case, or CNR..." />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="◉" message="No clients found" action={<Button variant="primary" onClick={() => setModal(true)}>Add first client</Button>} />
        ) : (
          <Table headers={['Client / Matter', 'Court', 'Cases', 'Outstanding', 'Status', '']}>
            {filtered.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <p className="font-medium text-gray-900 text-xs">{c.name}</p>
                  {c.cases?.[0] && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {c.cases[0].case_number} · {c.cases[0].title?.slice(0, 40)}
                    </p>
                  )}
                </Td>
                <Td className="text-xs">{c.cases?.[0]?.court || '—'}</Td>
                <Td className="text-xs">{c.active_cases} active</Td>
                <Td>
                  <span className={`text-xs font-semibold ${c.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(c.outstanding)}
                  </span>
                </Td>
                <Td>
                  <Badge variant={c.outstanding > 0 ? 'warn' : 'success'}>
                    {c.outstanding > 0 ? 'Outstanding' : 'Clear'}
                  </Badge>
                </Td>
                <Td>
                  <Button size="sm" onClick={() => router.push(`/dashboard/clients/${c.id}`)}>View</Button>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* New Client Modal */}
      <Modal open={modalOpen} onClose={() => { setModal(false); reset() }} title="New Client / Matter" wide
        footer={<>
          <Button onClick={() => { setModal(false); reset() }}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Client'}
          </Button>
        </>}
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Client Name" required error={errors.name?.message}>
              <Input {...register('name', { required: 'Required' })} placeholder="Full name or firm" />
            </FormGroup>
            <FormGroup label="Phone">
              <Input {...register('phone')} placeholder="+91 XXXXX XXXXX" />
            </FormGroup>
            <FormGroup label="Email">
              <Input {...register('email')} type="email" placeholder="client@email.com" />
            </FormGroup>
            <FormGroup label="PAN">
              <Input {...register('pan')} placeholder="ABCDE1234F" />
            </FormGroup>
          </div>
          <FormGroup label="Address">
            <Textarea {...register('address')} placeholder="Client address for invoices" />
          </FormGroup>
          <div className="grid grid-cols-3 gap-3">
            <FormGroup label="City"><Input {...register('city')} placeholder="Chennai" /></FormGroup>
            <FormGroup label="State"><Input {...register('state')} placeholder="Tamil Nadu" /></FormGroup>
            <FormGroup label="Pincode"><Input {...register('pincode')} placeholder="600001" /></FormGroup>
          </div>
          <FormGroup label="GSTIN (if applicable)">
            <Input {...register('gstin')} placeholder="33AAAAA0000A1Z5" />
          </FormGroup>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-800 mb-3">Case / Matter Details</p>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Case Title">
                <Input {...register('case_title')} placeholder="Petitioner v. Respondent" />
              </FormGroup>
              <FormGroup label="Case Number">
                <Input {...register('case_number')} placeholder="WP / OS / CRL.A ..." />
              </FormGroup>
              <FormGroup label="CNR Number">
                <Input {...register('cnr_number')} placeholder="TNHC01-000000-2025" />
              </FormGroup>
              <FormGroup label="Retainer Fee (₹)">
                <Input {...register('retainer_fee')} type="number" placeholder="0" />
              </FormGroup>
              <FormGroup label="Court">
                <Select {...register('court')}>
                  <option value="">— Select court —</option>
                  {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormGroup>
              <FormGroup label="Case Type">
                <Select {...register('case_type')}>
                  <option value="">— Select type —</option>
                  {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormGroup>
            </div>
          </div>

          <FormGroup label="Notes">
            <Textarea {...register('notes')} placeholder="Internal notes about this client..." />
          </FormGroup>
        </form>
      </Modal>
    </div>
  )
}
