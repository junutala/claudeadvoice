'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm, useFieldArray } from 'react-hook-form'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/pdf'
import {
  PageHeader, SearchInput, Button, Card, Table, Tr, Td,
  StatusBadge, Tabs, Modal, FormGroup, Input, Select, Textarea, EmptyState
} from '@/components/ui'
import type { InvoiceFormData } from '@/types'

const TABS = ['All', 'Draft', 'Pending', 'Partial', 'Overdue', 'Paid']

export default function InvoicesClient({ invoices: initial, clients, tenantId }: {
  invoices: any[]; clients: any[]; tenantId: string
}) {
  const [invoices, setInvoices] = useState(initial)
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [cases, setCases]       = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, watch, control, reset, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    defaultValues: {
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      gst_rate: 0,
      items: [{ description: '', quantity: 1, rate: 0 }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchItems   = watch('items')
  const watchGST     = watch('gst_rate')
  const watchClient  = watch('client_id')

  useEffect(() => {
    if (watchClient) {
      supabase.from('cases').select('id, title, case_number').eq('client_id', watchClient).eq('is_active', true)
        .then(({ data }) => setCases(data || []))
    }
  }, [watchClient])

  const subtotal   = watchItems.reduce((s, item) => s + (item.quantity || 0) * (item.rate || 0), 0)
  const gstAmount  = subtotal * (watchGST || 0) / 100
  const total      = subtotal + gstAmount

  const filtered = invoices
    .filter(i => tab === 'All' || i.status === tab.toLowerCase())
    .filter(i =>
      i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.client?.name?.toLowerCase().includes(search.toLowerCase())
    )

  const onSubmit = async (data: InvoiceFormData) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', session!.user.id).single()

    const { data: inv, error } = await supabase.from('invoices').insert({
      tenant_id: tenantId,
      client_id: data.client_id,
      case_id: data.case_id || null,
      invoice_number: '',
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      status: 'pending',
      subtotal,
      gst_rate: data.gst_rate,
      gst_amount: gstAmount,
      total_amount: total,
      paid_amount: 0,
      notes: data.notes,
      terms: data.terms,
      created_by: profile?.id,
    }).select().single()

    if (!error && inv) {
      await supabase.from('invoice_items').insert(
        data.items.map((item, i) => ({
          invoice_id: inv.id,
          tenant_id: tenantId,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          sort_order: i,
        }))
      )
      reset()
      setModal(false)
      router.refresh()
    }
    setSaving(false)
  }

  const handleDownloadPDF = async (invoice: any) => {
    const { data: full } = await supabase
      .from('invoices').select('*, client:clients(*), case:cases(*), items:invoice_items(*)')
      .eq('id', invoice.id).single()
    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (full && tenant) generateInvoicePDF(full, tenant)
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        sub="Fee notes and billing"
        actions={<Button variant="primary" onClick={() => setModal(true)}>+ New Invoice</Button>}
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="flex gap-2 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by invoice # or client..." />
        <Button variant="ghost">Export CSV</Button>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="◈" message="No invoices found" action={<Button variant="primary" onClick={() => setModal(true)}>Create first invoice</Button>} />
        ) : (
          <Table headers={['Invoice #','Client','Date','Due','Total','Paid','Balance','Status','']}>
            {filtered.map((inv) => (
              <Tr key={inv.id}>
                <Td><span className="text-navy-600 text-xs font-medium cursor-pointer hover:underline" onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>{inv.invoice_number}</span></Td>
                <Td><p className="text-xs font-medium text-gray-900">{inv.client?.name}</p><p className="text-[10px] text-gray-500">{inv.case?.case_number}</p></Td>
                <Td className="text-xs text-gray-500">{formatDate(inv.invoice_date)}</Td>
                <Td className="text-xs text-gray-500">{formatDate(inv.due_date)}</Td>
                <Td className="text-xs font-semibold">{formatCurrency(inv.total_amount)}</Td>
                <Td className="text-xs text-green-600">{formatCurrency(inv.paid_amount)}</Td>
                <Td><span className={`text-xs font-semibold ${inv.balance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(inv.balance_amount)}</span></Td>
                <Td><StatusBadge status={inv.status} /></Td>
                <Td><Button size="sm" onClick={() => handleDownloadPDF(inv)}>PDF</Button></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Create Invoice Modal */}
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Create Invoice" wide
        footer={<>
          <Button onClick={() => { setModal(false); reset() }}>Cancel</Button>
          <Button variant="secondary" onClick={handleSubmit(d => { setValue('gst_rate', d.gst_rate); onSubmit({ ...d }) })}>Save Draft</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Creating...' : 'Generate Invoice'}
          </Button>
        </>}
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Client" required error={errors.client_id?.message}>
              <Select {...register('client_id', { required: 'Required' })}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Matter / Case">
              <Select {...register('case_id')}>
                <option value="">— Select matter —</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} – {c.title?.slice(0,30)}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Invoice Date">
              <Input {...register('invoice_date')} type="date" />
            </FormGroup>
            <FormGroup label="Due Date">
              <Input {...register('due_date')} type="date" />
            </FormGroup>
          </div>

          {/* Line items */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 grid grid-cols-12 gap-2 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-3 text-right">Rate (₹)</span>
              <span className="col-span-1 text-right">Amt</span>
              <span className="col-span-1"></span>
            </div>
            {fields.map((field, idx) => (
              <div key={field.id} className="px-3 py-2 grid grid-cols-12 gap-2 border-t border-gray-100 items-center">
                <div className="col-span-5">
                  <Input {...register(`items.${idx}.description`, { required: true })} placeholder="Professional fee..." />
                </div>
                <div className="col-span-2">
                  <Input {...register(`items.${idx}.quantity`, { valueAsNumber: true })} type="number" min="1" step="0.5" />
                </div>
                <div className="col-span-3">
                  <Input {...register(`items.${idx}.rate`, { valueAsNumber: true })} type="number" min="0" placeholder="0" />
                </div>
                <div className="col-span-1 text-xs text-right font-medium text-gray-700">
                  {formatCurrency((watchItems[idx]?.quantity || 0) * (watchItems[idx]?.rate || 0))}
                </div>
                <div className="col-span-1 text-center">
                  {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-500 text-sm">✕</button>}
                </div>
              </div>
            ))}
            <div className="px-3 py-2 border-t border-gray-100">
              <button type="button" onClick={() => append({ description: '', quantity: 1, rate: 0 })}
                className="text-xs text-navy-600 hover:underline">+ Add line item</button>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between items-center gap-2 text-gray-600">
                <span>GST</span>
                <div className="flex items-center gap-1">
                  <Select {...register('gst_rate', { valueAsNumber: true })} className="w-20 py-0.5 text-xs">
                    <option value={0}>0%</option>
                    <option value={18}>18%</option>
                  </Select>
                  <span>{formatCurrency(gstAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <FormGroup label="Notes / Bank Details">
            <Textarea {...register('notes')} placeholder="Bank details, payment instructions..." />
          </FormGroup>
        </form>
      </Modal>
    </div>
  )
}
