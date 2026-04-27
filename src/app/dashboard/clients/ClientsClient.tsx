'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm, useFieldArray } from 'react-hook-form'
import { formatCurrency, COURTS, CASE_TYPES } from '@/lib/utils'
import {
  PageHeader, SearchInput, Button, Card, Table, Tr, Td,
  Badge, Modal, FormGroup, Input, Select, Textarea, EmptyState
} from '@/components/ui'

interface ContactField { name: string; designation: string; email: string; phone: string; is_primary: boolean }
interface CaseField { title: string; case_number: string; cnr_number: string; court: string; case_type: string; retainer_fee: string }
interface ClientFormData {
  name: string; email: string; phone: string; address: string
  city: string; state: string; pincode: string; pan: string; gstin: string; notes: string
  contacts: ContactField[]
  cases: CaseField[]
}

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ClientsClient({ clients: initial, tenantId }: { clients: any[]; tenantId: string }) {
  const [clients, setClients]   = useState(initial)
  const [search, setSearch]     = useState('')
  const [modalOpen, setModal]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ClientFormData>({
    defaultValues: {
      contacts: [{ name: '', designation: '', email: '', phone: '', is_primary: true }],
      cases:    [{ title: '', case_number: '', cnr_number: '', court: '', case_type: '', retainer_fee: '' }],
    },
  })

  const { fields: contactFields, append: addContact, remove: removeContact } = useFieldArray({ control, name: 'contacts' })
  const { fields: caseFields,   append: addCase,    remove: removeCase    } = useFieldArray({ control, name: 'cases' })

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cases?.some((ca: any) =>
      ca.title?.toLowerCase().includes(search.toLowerCase()) ||
      ca.case_number?.toLowerCase().includes(search.toLowerCase())
    )
  )

  const onSubmit = async (data: ClientFormData) => {
    setSaving(true)
    setSaveError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setSaveError('Not logged in'); setSaving(false); return }
      const { data: profile } = await supabase.from('profiles').select('id,tenant_id').eq('id', session.user.id).single()

      // Insert client
      const { data: client, error: clientErr } = await supabase.from('clients').insert({
        tenant_id: profile?.tenant_id ?? tenantId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        pan: data.pan || null,
        gstin: data.gstin || null,
        notes: data.notes || null,
        created_by: profile?.id,
      }).select().single()

      if (clientErr || !client) {
        setSaveError(clientErr?.message || 'Failed to save client')
        setSaving(false)
        return
      }

      // Insert contacts (filter empty ones)
      const validContacts = data.contacts.filter(c => c.name.trim())
      if (validContacts.length > 0) {
        await supabase.from('client_contacts').insert(
          validContacts.map((c, i) => ({
            tenant_id: profile?.tenant_id ?? tenantId,
            client_id: client.id,
            name: c.name,
            designation: c.designation || null,
            email: c.email || null,
            phone: c.phone || null,
            is_primary: i === 0,
          }))
        )
      }

      // Insert cases (filter empty ones)
      const validCases = data.cases.filter(c => c.title.trim())
      if (validCases.length > 0) {
        await supabase.from('cases').insert(
          validCases.map(c => ({
            tenant_id: profile?.tenant_id ?? tenantId,
            client_id: client.id,
            title: c.title,
            case_number: c.case_number || null,
            cnr_number: c.cnr_number || null,
            court: c.court || null,
            case_type: c.case_type || null,
            retainer_fee: parseFloat(c.retainer_fee) || 0,
            created_by: profile?.id,
          }))
        )
      }

      reset()
      setModal(false)
      router.refresh()
    } catch (e: any) {
      setSaveError(e.message || 'Unexpected error')
    }
    setSaving(false)
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        sub="All clients and matters"
        actions={<Button variant="primary" onClick={() => setModal(true)}>+ New Client</Button>}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, case number or CNR..." />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="◉" message="No clients found"
            action={<Button variant="primary" onClick={() => setModal(true)}>Add first client</Button>} />
        ) : (
          <Table headers={['Client','Primary Contact','Court / Case','Cases','Outstanding','']}>
            {filtered.map((c) => (
              <Tr key={c.id} onClick={() => router.push(`/dashboard/clients/${c.id}`)}>
                <Td>
                  <p className="font-semibold text-xs text-gray-900">{c.name}</p>
                  {c.email && <p className="text-[10px] text-gray-400">{c.email}</p>}
                  {c.phone && <p className="text-[10px] text-gray-400">{c.phone}</p>}
                </Td>
                <Td>
                  {c.client_contacts?.filter((ct: any) => ct.is_primary)[0] ? (
                    <div>
                      <p className="text-xs font-medium text-gray-800">{c.client_contacts.filter((ct: any) => ct.is_primary)[0].name}</p>
                      <p className="text-[10px] text-gray-400">{c.client_contacts.filter((ct: any) => ct.is_primary)[0].phone}</p>
                    </div>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </Td>
                <Td>
                  {c.cases?.[0] ? (
                    <div>
                      <p className="text-xs text-gray-700 truncate max-w-[140px]">{c.cases[0].title}</p>
                      <p className="text-[10px] text-gray-400">{c.cases[0].case_number} · {c.cases[0].court}</p>
                    </div>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </Td>
                <Td><Badge variant="info">{c.active_cases} active</Badge></Td>
                <Td>
                  <span className={`text-xs font-semibold ${c.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(c.outstanding)}
                  </span>
                </Td>
                <Td><Link href={`/dashboard/clients/${c.id}`} onClick={e => e.stopPropagation()}><Button size="sm">View</Button></Link></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* ── New Client Modal ── */}
      <Modal open={modalOpen} onClose={() => { setModal(false); reset(); setSaveError('') }}
        title="New Client" wide
        footer={<>
          <Button onClick={() => { setModal(false); reset(); setSaveError('') }}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Client'}
          </Button>
        </>}
      >
        {saveError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{saveError}</div>
        )}
        <form className="space-y-5">

          {/* ── Basic Info ── */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">Client Information</p>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Client / Firm Name" required error={errors.name?.message}>
                <Input {...register('name', { required: 'Client name is required' })} placeholder="Full name or firm name" />
              </FormGroup>
              <FormGroup label="Primary Email" error={errors.email?.message}>
                <Input {...register('email', {
                  validate: v => !v || EMAIL_RE.test(v) || 'Enter a valid email'
                })} type="email" placeholder="client@email.com" />
              </FormGroup>
              <FormGroup label="Primary Phone" error={errors.phone?.message}>
                <Input {...register('phone', {
                  validate: v => !v || PHONE_RE.test(v.replace(/\s/g,'')) || 'Enter valid 10-digit mobile'
                })} placeholder="98XXXXXXXX" maxLength={10} />
              </FormGroup>
              <FormGroup label="PAN">
                <Input {...register('pan')} placeholder="ABCDE1234F" maxLength={10} />
              </FormGroup>
              <FormGroup label="GSTIN">
                <Input {...register('gstin')} placeholder="33AAAAA0000A1Z5" />
              </FormGroup>
            </div>
            <div className="mt-3">
              <FormGroup label="Address">
                <Textarea {...register('address')} placeholder="Office / residential address" rows={2} />
              </FormGroup>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <FormGroup label="City"><Input {...register('city')} placeholder="Chennai" /></FormGroup>
              <FormGroup label="State"><Input {...register('state')} placeholder="Tamil Nadu" /></FormGroup>
              <FormGroup label="Pincode"><Input {...register('pincode')} placeholder="600001" maxLength={6} /></FormGroup>
            </div>
          </div>

          {/* ── Contacts ── */}
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700">Contact Persons</p>
              <Button size="sm" variant="ghost" type="button"
                onClick={() => addContact({ name: '', designation: '', email: '', phone: '', is_primary: false })}>
                + Add Contact
              </Button>
            </div>
            {contactFields.map((field, idx) => (
              <div key={field.id} className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    {idx === 0 ? 'Primary Contact' : `Contact ${idx + 1}`}
                  </span>
                  {idx > 0 && (
                    <button type="button" onClick={() => removeContact(idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormGroup label="Name" required error={(errors.contacts?.[idx]?.name)?.message}>
                    <Input {...register(`contacts.${idx}.name`, { required: idx === 0 ? 'Required' : false })}
                      placeholder="Contact name" />
                  </FormGroup>
                  <FormGroup label="Designation">
                    <Input {...register(`contacts.${idx}.designation`)} placeholder="Partner / Director" />
                  </FormGroup>
                  <FormGroup label="Mobile" error={(errors.contacts?.[idx]?.phone)?.message}>
                    <Input {...register(`contacts.${idx}.phone`, {
                      validate: v => !v || PHONE_RE.test(v.replace(/\s/g,'')) || 'Enter valid 10-digit mobile'
                    })} placeholder="98XXXXXXXX" maxLength={10} />
                  </FormGroup>
                  <FormGroup label="Email" error={(errors.contacts?.[idx]?.email)?.message}>
                    <Input {...register(`contacts.${idx}.email`, {
                      validate: v => !v || EMAIL_RE.test(v) || 'Enter a valid email'
                    })} placeholder="contact@email.com" />
                  </FormGroup>
                </div>
              </div>
            ))}
          </div>

          {/* ── Cases ── */}
          <div>
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700">Cases / Matters</p>
              <Button size="sm" variant="ghost" type="button"
                onClick={() => addCase({ title: '', case_number: '', cnr_number: '', court: '', case_type: '', retainer_fee: '' })}>
                + Add Case
              </Button>
            </div>
            {caseFields.map((field, idx) => (
              <div key={field.id} className="border border-gray-100 rounded-lg p-3 mb-2 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Case {idx + 1}</span>
                  {idx > 0 && (
                    <button type="button" onClick={() => removeCase(idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormGroup label="Case Title" required error={(errors.cases?.[idx]?.title)?.message}>
                    <Input {...register(`cases.${idx}.title`)}
                      placeholder="Petitioner v. Respondent" />
                  </FormGroup>
                  <FormGroup label="Case Number">
                    <Input {...register(`cases.${idx}.case_number`)} placeholder="WP/OS/CRL.A ..." />
                  </FormGroup>
                  <FormGroup label="CNR Number">
                    <Input {...register(`cases.${idx}.cnr_number`)} placeholder="TNHC01-000000-2025" />
                  </FormGroup>
                  <FormGroup label="Retainer Fee (₹)">
                    <Input {...register(`cases.${idx}.retainer_fee`)} type="number" placeholder="0" />
                  </FormGroup>
                  <FormGroup label="Court">
                    <Select {...register(`cases.${idx}.court`)}>
                      <option value="">— Select court —</option>
                      {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </FormGroup>
                  <FormGroup label="Case Type">
                    <Select {...register(`cases.${idx}.case_type`)}>
                      <option value="">— Select type —</option>
                      {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </FormGroup>
                </div>
              </div>
            ))}
          </div>

          {/* ── Notes ── */}
          <FormGroup label="Internal Notes">
            <Textarea {...register('notes')} placeholder="Any internal notes about this client..." rows={2} />
          </FormGroup>

        </form>
      </Modal>
    </div>
  )
}
