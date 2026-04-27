'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate, PAYMENT_MODE_LABELS } from '@/lib/utils'
import { generateReceiptPDF } from '@/lib/pdf'
import {
  PageHeader, SearchInput, Button, Card, Table, Tr, Td,
  Badge, Modal, FormGroup, Input, Select, Textarea, EmptyState
} from '@/components/ui'
import type { ReceiptFormData } from '@/types'

export default function ReceiptsClient({ receipts: initial, clients, tenantId }: {
  receipts: any[]; clients: any[]; tenantId: string
}) {
  const [receipts, setReceipts] = useState(initial)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [watchMode, setWatchMode] = useState('cash')
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReceiptFormData>({
    defaultValues: { receipt_date: new Date().toISOString().split('T')[0], payment_mode: 'cash' },
  })

  const filtered = receipts.filter(r =>
    r.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reference_no?.toLowerCase().includes(search.toLowerCase())
  )

  const onSubmit = async (data: ReceiptFormData) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', session!.user.id).single()

    const { data: receipt, error } = await supabase.from('receipts').insert({
      tenant_id: tenantId,
      client_id: data.client_id,
      receipt_number: '',
      receipt_date: data.receipt_date,
      amount: data.amount,
      payment_mode: data.payment_mode,
      reference_no: data.reference_no,
      bank_name: data.bank_name,
      cheque_date: data.cheque_date || null,
      notes: data.notes,
      allocated_amount: 0,
      created_by: profile?.id,
    }).select().single()

    setSaving(false)
    if (!error) { reset(); setModal(false); router.refresh() }
  }

  const handleDownload = async (receipt: any) => {
    const { data: full } = await supabase.from('receipts').select('*, client:clients(*)').eq('id', receipt.id).single()
    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (full && tenant) generateReceiptPDF(full, tenant)
  }

  const totalReceived   = receipts.reduce((s, r) => s + r.amount, 0)
  const totalAllocated  = receipts.reduce((s, r) => s + r.allocated_amount, 0)
  const totalUnallocated = receipts.reduce((s, r) => s + r.unallocated_amount, 0)

  return (
    <div>
      <PageHeader
        title="Receipts"
        sub="Payments received from clients"
        actions={<Button variant="primary" onClick={() => setModal(true)}>+ Record Receipt</Button>}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Received', value: formatCurrency(totalReceived) },
          { label: 'Applied',        value: formatCurrency(totalAllocated) },
          { label: 'Unallocated',    value: formatCurrency(totalUnallocated) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className="text-base font-bold font-serif text-gray-900 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by receipt #, client, reference..." />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="◆" message="No receipts recorded" action={<Button variant="primary" onClick={() => setModal(true)}>Record first receipt</Button>} />
        ) : (
          <Table headers={['Receipt #','Client','Date','Amount','Mode','Reference','Applied to','Status','']}>
            {filtered.map((r) => (
              <Tr key={r.id}>
                <Td><span className="text-xs font-medium text-navy-600">{r.receipt_number}</span></Td>
                <Td className="text-xs font-medium text-gray-900">{r.client?.name}</Td>
                <Td className="text-xs text-gray-500">{formatDate(r.receipt_date)}</Td>
                <Td className="text-xs font-semibold text-gray-900">{formatCurrency(r.amount)}</Td>
                <Td className="text-xs">{PAYMENT_MODE_LABELS[r.payment_mode] || r.payment_mode}</Td>
                <Td className="text-xs text-gray-500">{r.reference_no || '—'}</Td>
                <Td>
                  <div className="flex gap-1 flex-wrap">
                    {r.allocations?.map((a: any) => (
                      <Badge key={a.id} variant="info">{a.invoice?.invoice_number}</Badge>
                    ))}
                    {!r.allocations?.length && <span className="text-xs text-gray-400">Unallocated</span>}
                  </div>
                </Td>
                <Td>
                  {r.unallocated_amount > 0
                    ? <Badge variant="warn">₹{formatCurrency(r.unallocated_amount)} pending</Badge>
                    : <Badge variant="success">Fully applied</Badge>}
                </Td>
                <Td><Button size="sm" onClick={() => handleDownload(r)}>PDF</Button></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Record Receipt Modal */}
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Record Receipt"
        footer={<>
          <Button onClick={() => { setModal(false); reset() }}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Saving...' : 'Record Receipt'}
          </Button>
        </>}
      >
        <form className="space-y-4">
          <FormGroup label="Client" required error={errors.client_id?.message}>
            <Select {...register('client_id', { required: 'Required' })}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Amount (₹)" required error={errors.amount?.message}>
              <Input {...register('amount', { required: true, valueAsNumber: true, min: 1 })} type="number" placeholder="0.00" />
            </FormGroup>
            <FormGroup label="Receipt Date">
              <Input {...register('receipt_date')} type="date" />
            </FormGroup>
            <FormGroup label="Payment Mode">
              <Select {...register('payment_mode')} onChange={(e) => setWatchMode(e.target.value)}>
                {Object.entries(PAYMENT_MODE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Reference / Cheque No.">
              <Input {...register('reference_no')} placeholder="UTR / Cheque number" />
            </FormGroup>
            {(watchMode === 'cheque') && <>
              <FormGroup label="Bank Name">
                <Input {...register('bank_name')} placeholder="Bank name" />
              </FormGroup>
              <FormGroup label="Cheque Date">
                <Input {...register('cheque_date')} type="date" />
              </FormGroup>
            </>}
          </div>
          <FormGroup label="Notes">
            <Input {...register('notes')} placeholder="Optional note" />
          </FormGroup>
        </form>
      </Modal>
    </div>
  )
}
