'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm, useFieldArray } from 'react-hook-form'
import { formatCurrency, formatDate, EXPENSE_TYPE_LABELS, PAYMENT_MODE_LABELS, COURTS, CASE_TYPES } from '@/lib/utils'
import {
  Card, CardHeader, CardTitle, CardBody, Badge, StatusBadge,
  Tabs, Table, Tr, Td, HearingChip, Button, Avatar,
  Modal, FormGroup, Input, Select, Textarea
} from '@/components/ui'

const PHONE_RE = /^[6-9]\d{9}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ClientDetailClient({ client, cases, invoices, receipts, expenses, hearings, contacts, plans, tenantId }: {
  client: any; cases: any[]; invoices: any[]; receipts: any[]
  expenses: any[]; hearings: any[]; contacts: any[]; plans: any[]; tenantId: string
}) {
  const [tab, setTab]             = useState('Overview')
  const [caseModal, setCaseModal] = useState(false)
  const [contactModal, setContactModal] = useState(false)
  const [planModal, setPlanModal] = useState(false)
  const [editContact, setEditContact] = useState<any>(null)
  const [editPlan, setEditPlan]   = useState<any>(null)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Case form
  const caseForm = useForm({ defaultValues: { title:'', case_number:'', cnr_number:'', court:'', case_type:'', retainer_fee:'' } })

  // Contact form
  const contactForm = useForm<{ name:string; designation:string; email:string; phone:string; is_primary:boolean }>({
    defaultValues: { name:'', designation:'', email:'', phone:'', is_primary:false }
  })

  // Plan form
  const planForm = useForm<{ plan_name:string; description:string; fee_amount:string; fee_type:string; start_date:string; end_date:string }>({
    defaultValues: { plan_name:'', description:'', fee_amount:'', fee_type:'fixed', start_date:'', end_date:'' }
  })

  const totalBilled      = invoices.reduce((s,i) => s + i.total_amount, 0)
  const totalPaid        = invoices.reduce((s,i) => s + i.paid_amount, 0)
  const totalOutstanding = invoices.reduce((s,i) => s + i.balance_amount, 0)
  const unbilledOPE      = expenses.filter(e => e.is_billable && !e.invoice_id).reduce((s,e) => s + e.amount, 0)

  // Save new case
  const saveCase = async (data: any) => {
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('cases').insert({
      tenant_id: tenantId, client_id: client.id,
      title: data.title, case_number: data.case_number || null,
      cnr_number: data.cnr_number || null, court: data.court || null,
      case_type: data.case_type || null, retainer_fee: parseFloat(data.retainer_fee) || 0,
    })
    if (error) { setSaveError(error.message); setSaving(false); return }
    setSaving(false); setCaseModal(false); caseForm.reset(); router.refresh()
  }

  // Save contact
  const saveContact = async (data: any) => {
    setSaving(true); setSaveError('')
    if (editContact) {
      await supabase.from('client_contacts').update({
        name: data.name, designation: data.designation, email: data.email, phone: data.phone, is_primary: data.is_primary
      }).eq('id', editContact.id)
    } else {
      await supabase.from('client_contacts').insert({
        tenant_id: tenantId, client_id: client.id,
        name: data.name, designation: data.designation || null,
        email: data.email || null, phone: data.phone || null, is_primary: data.is_primary
      })
    }
    setSaving(false); setContactModal(false); setEditContact(null); contactForm.reset(); router.refresh()
  }

  // Save plan
  const savePlan = async (data: any) => {
    setSaving(true); setSaveError('')
    if (editPlan) {
      await supabase.from('plans').update({
        plan_name: data.plan_name, description: data.description,
        fee_amount: parseFloat(data.fee_amount) || 0, fee_type: data.fee_type,
        start_date: data.start_date || null, end_date: data.end_date || null,
      }).eq('id', editPlan.id)
    } else {
      await supabase.from('plans').insert({
        tenant_id: tenantId, client_id: client.id,
        plan_name: data.plan_name, description: data.description || null,
        fee_amount: parseFloat(data.fee_amount) || 0, fee_type: data.fee_type,
        start_date: data.start_date || null, end_date: data.end_date || null,
      })
    }
    setSaving(false); setPlanModal(false); setEditPlan(null); planForm.reset(); router.refresh()
  }

  // Update client account details
  const accountForm = useForm({ defaultValues: {
    name: client.name, email: client.email || '', phone: client.phone || '',
    address: client.address || '', city: client.city || '', state: client.state || '',
    pincode: client.pincode || '', pan: client.pan || '', gstin: client.gstin || '', notes: client.notes || ''
  }})
  const [accountSaved, setAccountSaved] = useState(false)
  const saveAccount = async (data: any) => {
    setSaving(true)
    await supabase.from('clients').update({
      name: data.name, email: data.email || null, phone: data.phone || null,
      address: data.address || null, city: data.city || null, state: data.state || null,
      pincode: data.pincode || null, pan: data.pan || null, gstin: data.gstin || null, notes: data.notes || null,
    }).eq('id', client.id)
    setSaving(false); setAccountSaved(true); setTimeout(() => setAccountSaved(false), 3000); router.refresh()
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <Link href="/dashboard/clients" className="hover:text-navy-600">Clients</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">{client.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar name={client.name} size="lg" />
          <div>
            <h1 className="text-lg font-serif font-bold text-gray-900">{client.name}</h1>
            <div className="flex gap-3 mt-0.5 flex-wrap">
              {client.email && <span className="text-xs text-gray-500">✉ {client.email}</span>}
              {client.phone && <span className="text-xs text-gray-500">📞 {client.phone}</span>}
              {client.pan   && <span className="text-xs text-gray-500">PAN: {client.pan}</span>}
            </div>
            {client.address && <p className="text-xs text-gray-400 mt-0.5">{client.address}{client.city ? `, ${client.city}` : ''}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => setCaseModal(true)}>+ Case</Button>
          <Button size="sm" variant="ghost" onClick={() => setContactModal(true)}>+ Contact</Button>
          <Button size="sm" variant="ghost" onClick={() => setPlanModal(true)}>+ Plan</Button>
          <Link href={`/dashboard/invoices?client=${client.id}`}>
            <Button size="sm" variant="primary">+ Invoice</Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label:'Total Billed',  value: formatCurrency(totalBilled),      color:'text-gray-900' },
          { label:'Total Paid',    value: formatCurrency(totalPaid),         color:'text-green-600' },
          { label:'Outstanding',   value: formatCurrency(totalOutstanding),  color: totalOutstanding>0?'text-red-600':'text-green-600' },
          { label:'Unbilled OPE',  value: formatCurrency(unbilledOPE),       color: unbilledOPE>0?'text-amber-600':'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className={`text-base font-bold font-serif mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs tabs={['Overview','Cases','Contacts','Plans','Invoices','Receipts','Expenses','Account']} active={tab} onChange={setTab} />

      {/* ── OVERVIEW ── */}
      {tab === 'Overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Cases ({cases.length})</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setCaseModal(true)}>+ Add</Button>
            </CardHeader>
            <CardBody className="p-0">
              {cases.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No cases on file</p>
                : cases.map((c,i) => (
                  <div key={c.id} className={`px-4 py-3 ${i<cases.length-1?'border-b border-gray-100':''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{c.title}</p>
                        <p className="text-[10px] text-gray-500">{c.case_number} · {c.court}</p>
                      </div>
                      <Badge variant={c.is_active?'info':'neutral'}>{c.is_active?'Active':'Disposed'}</Badge>
                    </div>
                    {c.next_hearing && <div className="mt-1"><HearingChip date={`Next: ${formatDate(c.next_hearing)}`} /></div>}
                  </div>
                ))
              }
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Contacts ({contacts.length})</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setContactModal(true)}>+ Add</Button>
            </CardHeader>
            <CardBody className="p-0">
              {contacts.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No contacts on file</p>
                : contacts.map((c,i) => (
                  <div key={c.id} className={`px-4 py-3 flex items-center justify-between ${i<contacts.length-1?'border-b border-gray-100':''}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-900">{c.name}</p>
                        {c.is_primary && <Badge variant="gold">Primary</Badge>}
                      </div>
                      {c.designation && <p className="text-[10px] text-gray-500">{c.designation}</p>}
                      {c.phone && <p className="text-[10px] text-gray-500">📞 {c.phone}</p>}
                      {c.email && <p className="text-[10px] text-gray-500">✉ {c.email}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setEditContact(c); contactForm.reset(c); setContactModal(true) }}>Edit</Button>
                  </div>
                ))
              }
            </CardBody>
          </Card>
          {hearings.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Upcoming Hearings</CardTitle></CardHeader>
              <CardBody className="p-0">
                {hearings.map((h,i) => (
                  <div key={h.id} className={`px-4 py-3 ${i<hearings.length-1?'border-b border-gray-100':''}`}>
                    <p className="text-xs font-semibold text-gray-900">{h.case?.title}</p>
                    <p className="text-[10px] text-gray-500">{h.case?.court}</p>
                    <div className="mt-1"><HearingChip date={formatDate(h.hearing_date)} /></div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* ── CASES ── */}
      {tab === 'Cases' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button variant="primary" onClick={() => setCaseModal(true)}>+ Add Case</Button>
          </div>
          <Card>
            {cases.length === 0
              ? <div className="text-center py-10 text-xs text-gray-400">No cases — click Add Case above</div>
              : <Table headers={['Title','Case No.','Court','Type','Retainer','Next Hearing','Status']}>
                {cases.map(c => (
                  <Tr key={c.id}>
                    <Td><p className="text-xs font-medium text-gray-900 max-w-[150px] truncate">{c.title}</p></Td>
                    <Td className="text-xs">{c.case_number||'—'}</Td>
                    <Td className="text-xs max-w-[100px] truncate">{c.court||'—'}</Td>
                    <Td className="text-xs">{c.case_type||'—'}</Td>
                    <Td className="text-xs">{c.retainer_fee>0?formatCurrency(c.retainer_fee):'—'}</Td>
                    <Td>{c.next_hearing?<HearingChip date={formatDate(c.next_hearing)}/>:<span className="text-xs text-gray-400">—</span>}</Td>
                    <Td><Badge variant={c.is_active?'info':'neutral'}>{c.is_active?'Active':'Disposed'}</Badge></Td>
                  </Tr>
                ))}
              </Table>
            }
          </Card>
        </div>
      )}

      {/* ── CONTACTS ── */}
      {tab === 'Contacts' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button variant="primary" onClick={() => { setEditContact(null); contactForm.reset({ name:'',designation:'',email:'',phone:'',is_primary:false }); setContactModal(true) }}>
              + Add Contact
            </Button>
          </div>
          <Card>
            {contacts.length === 0
              ? <div className="text-center py-10 text-xs text-gray-400">No contacts — click Add Contact above</div>
              : <Table headers={['Name','Designation','Phone','Email','Primary','']}>
                {contacts.map(c => (
                  <Tr key={c.id}>
                    <Td className="text-xs font-medium text-gray-900">{c.name}</Td>
                    <Td className="text-xs">{c.designation||'—'}</Td>
                    <Td className="text-xs">{c.phone||'—'}</Td>
                    <Td className="text-xs">{c.email||'—'}</Td>
                    <Td>{c.is_primary?<Badge variant="gold">Primary</Badge>:<span className="text-xs text-gray-400">—</span>}</Td>
                    <Td>
                      <Button size="sm" onClick={() => { setEditContact(c); contactForm.reset(c); setContactModal(true) }}>Edit</Button>
                    </Td>
                  </Tr>
                ))}
              </Table>
            }
          </Card>
        </div>
      )}

      {/* ── PLANS ── */}
      {tab === 'Plans' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button variant="primary" onClick={() => { setEditPlan(null); planForm.reset(); setPlanModal(true) }}>+ Create Plan</Button>
          </div>
          {plans.length === 0
            ? <Card><div className="text-center py-10 text-xs text-gray-400">No plans created — click Create Plan above</div></Card>
            : <div className="space-y-3">
              {plans.map(p => (
                <Card key={p.id}>
                  <CardHeader>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.plan_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.fee_type} · {formatCurrency(p.fee_amount)}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant={p.is_active?'success':'neutral'}>{p.is_active?'Active':'Inactive'}</Badge>
                      <Button size="sm" onClick={() => { setEditPlan(p); planForm.reset({ ...p, fee_amount: String(p.fee_amount) }); setPlanModal(true) }}>Edit</Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {p.description && <p className="text-xs text-gray-600 mb-2">{p.description}</p>}
                    <div className="flex gap-6 text-xs text-gray-500">
                      {p.start_date && <span>Start: {formatDate(p.start_date)}</span>}
                      {p.end_date   && <span>End: {formatDate(p.end_date)}</span>}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          }
        </div>
      )}

      {/* ── INVOICES ── */}
      {tab === 'Invoices' && (
        <Card>
          {invoices.length === 0
            ? <div className="text-center py-10 text-xs text-gray-400">No invoices raised</div>
            : <Table headers={['Invoice #','Date','Due','Amount','Paid','Balance','Status']}>
              {invoices.map(inv => (
                <Tr key={inv.id} onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>
                  <Td><span className="text-xs font-medium text-navy-600">{inv.invoice_number}</span></Td>
                  <Td className="text-xs text-gray-500">{formatDate(inv.invoice_date)}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(inv.due_date)}</Td>
                  <Td className="text-xs font-semibold">{formatCurrency(inv.total_amount)}</Td>
                  <Td className="text-xs text-green-600">{formatCurrency(inv.paid_amount)}</Td>
                  <Td><span className={`text-xs font-semibold ${inv.balance_amount>0?'text-red-600':'text-green-600'}`}>{formatCurrency(inv.balance_amount)}</span></Td>
                  <Td><StatusBadge status={inv.status}/></Td>
                </Tr>
              ))}
            </Table>
          }
        </Card>
      )}

      {/* ── RECEIPTS ── */}
      {tab === 'Receipts' && (
        <Card>
          {receipts.length === 0
            ? <div className="text-center py-10 text-xs text-gray-400">No receipts recorded</div>
            : <Table headers={['Receipt #','Date','Amount','Mode','Reference','Applied To']}>
              {receipts.map(r => (
                <Tr key={r.id}>
                  <Td className="text-xs font-medium text-navy-600">{r.receipt_number}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(r.receipt_date)}</Td>
                  <Td className="text-xs font-semibold">{formatCurrency(r.amount)}</Td>
                  <Td className="text-xs">{PAYMENT_MODE_LABELS[r.payment_mode]}</Td>
                  <Td className="text-xs text-gray-500">{r.reference_no||'—'}</Td>
                  <Td>{r.allocations?.length>0
                    ? r.allocations.map((a:any) => <Badge key={a.id} variant="info">{a.invoice?.invoice_number}</Badge>)
                    : <span className="text-xs text-amber-600">Unallocated</span>}
                  </Td>
                </Tr>
              ))}
            </Table>
          }
        </Card>
      )}

      {/* ── EXPENSES ── */}
      {tab === 'Expenses' && (
        <Card>
          {expenses.length === 0
            ? <div className="text-center py-10 text-xs text-gray-400">No expenses recorded</div>
            : <Table headers={['Date','Type','Description','Amount','Billable','Invoiced']}>
              {expenses.map(e => (
                <Tr key={e.id}>
                  <Td className="text-xs text-gray-500">{formatDate(e.expense_date)}</Td>
                  <Td className="text-xs">{EXPENSE_TYPE_LABELS[e.expense_type]}</Td>
                  <Td className="text-xs text-gray-700 max-w-[150px] truncate">{e.description}</Td>
                  <Td className="text-xs font-semibold">{formatCurrency(e.amount)}</Td>
                  <Td><Badge variant={e.is_billable?'success':'neutral'}>{e.is_billable?'Yes':'No'}</Badge></Td>
                  <Td>{e.invoice_id?<Badge variant="success">{e.invoice?.invoice_number}</Badge>:e.is_billable?<Badge variant="warn">Pending</Badge>:<span className="text-xs text-gray-400">N/A</span>}</Td>
                </Tr>
              ))}
            </Table>
          }
        </Card>
      )}

      {/* ── ACCOUNT ── */}
      {tab === 'Account' && (
        <Card>
          <CardHeader><CardTitle>Client Account Details</CardTitle></CardHeader>
          <CardBody>
            {accountSaved && <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">✓ Account details saved</div>}
            <form onSubmit={accountForm.handleSubmit(saveAccount)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="Client / Firm Name" required>
                  <Input {...accountForm.register('name', { required: true })} />
                </FormGroup>
                <FormGroup label="Email" error={accountForm.formState.errors.email?.message}>
                  <Input {...accountForm.register('email', { validate: v => !v || EMAIL_RE.test(v) || 'Invalid email' })} type="email" />
                </FormGroup>
                <FormGroup label="Phone" error={accountForm.formState.errors.phone?.message}>
                  <Input {...accountForm.register('phone', { validate: v => !v || PHONE_RE.test(v.replace(/\s/g,'')) || 'Enter valid 10-digit mobile' })} />
                </FormGroup>
                <FormGroup label="PAN">
                  <Input {...accountForm.register('pan')} placeholder="ABCDE1234F" maxLength={10} />
                </FormGroup>
                <FormGroup label="GSTIN">
                  <Input {...accountForm.register('gstin')} placeholder="33AAAAA0000A1Z5" />
                </FormGroup>
              </div>
              <FormGroup label="Address">
                <Textarea {...accountForm.register('address')} rows={2} />
              </FormGroup>
              <div className="grid grid-cols-3 gap-3">
                <FormGroup label="City"><Input {...accountForm.register('city')} /></FormGroup>
                <FormGroup label="State"><Input {...accountForm.register('state')} /></FormGroup>
                <FormGroup label="Pincode"><Input {...accountForm.register('pincode')} maxLength={6} /></FormGroup>
              </div>
              <FormGroup label="Internal Notes">
                <Textarea {...accountForm.register('notes')} rows={2} />
              </FormGroup>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Account Details'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ── Add Case Modal ── */}
      <Modal open={caseModal} onClose={() => { setCaseModal(false); caseForm.reset() }} title="Add Case / Matter"
        footer={<>
          <Button onClick={() => { setCaseModal(false); caseForm.reset() }}>Cancel</Button>
          <Button variant="primary" onClick={caseForm.handleSubmit(saveCase)} disabled={saving}>{saving?'Saving...':'Save Case'}</Button>
        </>}>
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Case Title" required error={caseForm.formState.errors.title?.message}>
              <Input {...caseForm.register('title', { required: 'Required' })} placeholder="Petitioner v. Respondent" />
            </FormGroup>
            <FormGroup label="Case Number">
              <Input {...caseForm.register('case_number')} placeholder="WP/OS/CRL.A ..." />
            </FormGroup>
            <FormGroup label="CNR Number">
              <Input {...caseForm.register('cnr_number')} placeholder="TNHC01-000000-2025" />
            </FormGroup>
            <FormGroup label="Retainer Fee (₹)">
              <Input {...caseForm.register('retainer_fee')} type="number" placeholder="0" />
            </FormGroup>
            <FormGroup label="Court">
              <Select {...caseForm.register('court')}>
                <option value="">— Select —</option>
                {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Case Type">
              <Select {...caseForm.register('case_type')}>
                <option value="">— Select —</option>
                {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormGroup>
          </div>
        </form>
      </Modal>

      {/* ── Add/Edit Contact Modal ── */}
      <Modal open={contactModal} onClose={() => { setContactModal(false); setEditContact(null); contactForm.reset() }}
        title={editContact ? 'Edit Contact' : 'Add Contact'}
        footer={<>
          <Button onClick={() => { setContactModal(false); setEditContact(null); contactForm.reset() }}>Cancel</Button>
          <Button variant="primary" onClick={contactForm.handleSubmit(saveContact)} disabled={saving}>{saving?'Saving...':'Save Contact'}</Button>
        </>}>
        <form className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Contact Name" required error={contactForm.formState.errors.name?.message}>
              <Input {...contactForm.register('name', { required: 'Required' })} placeholder="Full name" />
            </FormGroup>
            <FormGroup label="Designation">
              <Input {...contactForm.register('designation')} placeholder="Director / Partner" />
            </FormGroup>
            <FormGroup label="Mobile" error={contactForm.formState.errors.phone?.message}>
              <Input {...contactForm.register('phone', { validate: v => !v || PHONE_RE.test(v.replace(/\s/g,'')) || 'Enter valid 10-digit mobile' })}
                placeholder="98XXXXXXXX" maxLength={10} />
            </FormGroup>
            <FormGroup label="Email" error={contactForm.formState.errors.email?.message}>
              <Input {...contactForm.register('email', { validate: v => !v || EMAIL_RE.test(v) || 'Invalid email' })}
                type="email" placeholder="contact@email.com" />
            </FormGroup>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_primary" {...contactForm.register('is_primary')} className="w-4 h-4" />
            <label htmlFor="is_primary" className="text-xs font-medium text-gray-700">Set as Primary Contact</label>
          </div>
        </form>
      </Modal>

      {/* ── Add/Edit Plan Modal ── */}
      <Modal open={planModal} onClose={() => { setPlanModal(false); setEditPlan(null); planForm.reset() }}
        title={editPlan ? 'Edit Plan' : 'Create Service Plan'}
        footer={<>
          <Button onClick={() => { setPlanModal(false); setEditPlan(null); planForm.reset() }}>Cancel</Button>
          <Button variant="primary" onClick={planForm.handleSubmit(savePlan)} disabled={saving}>{saving?'Saving...':'Save Plan'}</Button>
        </>}>
        <form className="space-y-3">
          <FormGroup label="Plan Name" required error={planForm.formState.errors.plan_name?.message}>
            <Input {...planForm.register('plan_name', { required: 'Required' })} placeholder="e.g. Monthly Retainer, Project Fee" />
          </FormGroup>
          <FormGroup label="Description">
            <Textarea {...planForm.register('description')} placeholder="Scope of work, responsibilities included..." rows={3} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Fee Amount (₹)">
              <Input {...planForm.register('fee_amount')} type="number" placeholder="0" />
            </FormGroup>
            <FormGroup label="Fee Type">
              <Select {...planForm.register('fee_type')}>
                <option value="fixed">Fixed</option>
                <option value="monthly">Monthly Retainer</option>
                <option value="hourly">Hourly</option>
                <option value="retainer">Annual Retainer</option>
              </Select>
            </FormGroup>
            <FormGroup label="Start Date">
              <Input {...planForm.register('start_date')} type="date" />
            </FormGroup>
            <FormGroup label="End Date">
              <Input {...planForm.register('end_date')} type="date" />
            </FormGroup>
          </div>
        </form>
      </Modal>

    </div>
  )
}
