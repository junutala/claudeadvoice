'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PageHeader, Button, Card, CardHeader, CardTitle, CardBody, StatusBadge, Badge } from '@/components/ui'

export default function ApplyClient({ receipts, invoices, tenantId }: {
  receipts: any[]; invoices: any[]; tenantId: string
}) {
  const [selReceipt, setSelReceipt]   = useState<any>(null)
  const [selInvoice, setSelInvoice]   = useState<any>(null)
  const [applyAmount, setApplyAmount] = useState<number>(0)
  const [applying, setApplying]       = useState(false)
  const [msg, setMsg]                 = useState('')
  const router = useRouter()
  const supabase = createClient()

  const relevantInvoices = selReceipt
    ? invoices.filter(i => i.client_id === selReceipt.client?.id)
    : invoices

  const maxApply = selReceipt && selInvoice
    ? Math.min(selReceipt.unallocated_amount, selInvoice.balance_amount)
    : 0

  const handleApply = async () => {
    if (!selReceipt || !selInvoice || applyAmount <= 0) return
    setApplying(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', session!.user.id).single()

    const { error } = await supabase.from('receipt_allocations').insert({
      tenant_id: tenantId,
      receipt_id: selReceipt.id,
      invoice_id: selInvoice.id,
      amount: applyAmount,
      allocated_by: profile?.id,
    })

    setApplying(false)
    if (!error) {
      setMsg(`✓ ₹${formatCurrency(applyAmount)} applied from ${selReceipt.receipt_number} to ${selInvoice.invoice_number}`)
      setSelReceipt(null); setSelInvoice(null); setApplyAmount(0)
      router.refresh()
    } else {
      setMsg('Error: ' + error.message)
    }
  }

  return (
    <div>
      <PageHeader title="Apply Receipts" sub="Allocate payments to outstanding invoices" />

      {msg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{msg}
          <button className="ml-2 text-green-500 hover:text-green-700" onClick={() => setMsg('')}>✕</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Unallocated Receipts */}
        <Card>
          <CardHeader>
            <CardTitle>Unallocated Receipts</CardTitle>
            <Badge variant="warn">{receipts.length} pending</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {receipts.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">All receipts are fully allocated</p>
            ) : receipts.map(r => (
              <div
                key={r.id}
                onClick={() => { setSelReceipt(selReceipt?.id === r.id ? null : r); setSelInvoice(null); setApplyAmount(0) }}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${selReceipt?.id === r.id ? 'bg-navy-50 border-l-2 border-l-navy-500' : 'hover:bg-gray-50'}`}
              >
                <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ borderColor: selReceipt?.id === r.id ? '#2c4a6e' : '#d1d5db', background: selReceipt?.id === r.id ? '#2c4a6e' : 'white' }}>
                  {selReceipt?.id === r.id && <span className="text-white text-[8px]">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{r.receipt_number} · {r.client?.name}</p>
                  <p className="text-[10px] text-gray-500">{r.payment_mode.toUpperCase()} · {formatDate(r.receipt_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold font-serif text-gray-900">{formatCurrency(r.unallocated_amount)}</p>
                  <p className="text-[10px] text-gray-400">of {formatCurrency(r.amount)}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Outstanding Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selReceipt ? `Invoices — ${selReceipt.client?.name}` : 'Outstanding Invoices'}
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {!selReceipt ? (
              <p className="text-center text-xs text-gray-400 py-8">← Select a receipt first</p>
            ) : relevantInvoices.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">No outstanding invoices for this client</p>
            ) : relevantInvoices.map(inv => (
              <div
                key={inv.id}
                onClick={() => { setSelInvoice(selInvoice?.id === inv.id ? null : inv); setApplyAmount(Math.min(selReceipt.unallocated_amount, inv.balance_amount)) }}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${selInvoice?.id === inv.id ? 'bg-navy-50 border-l-2 border-l-navy-500' : 'hover:bg-gray-50'}`}
              >
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: selInvoice?.id === inv.id ? '#2c4a6e' : '#d1d5db' }}>
                  {selInvoice?.id === inv.id && <div className="w-2 h-2 rounded-full bg-navy-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{inv.invoice_number}</p>
                  <p className="text-[10px] text-gray-500">Due {formatDate(inv.due_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold font-serif text-gray-900">{formatCurrency(inv.balance_amount)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Apply panel */}
      {selReceipt && selInvoice && (
        <Card className="mt-4">
          <CardBody>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-xs text-gray-600">
                <span className="font-semibold">Receipt:</span> {selReceipt.receipt_number} · <span className="font-semibold text-green-700">{formatCurrency(selReceipt.unallocated_amount)} available</span>
              </div>
              <div className="text-xs text-gray-600">→</div>
              <div className="text-xs text-gray-600">
                <span className="font-semibold">Invoice:</span> {selInvoice.invoice_number} · <span className="font-semibold text-red-600">{formatCurrency(selInvoice.balance_amount)} due</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs font-medium text-gray-700">Apply amount (₹)</label>
                <input
                  type="number" value={applyAmount} min={0} max={maxApply} step={0.01}
                  onChange={e => setApplyAmount(Math.min(parseFloat(e.target.value) || 0, maxApply))}
                  className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-navy-500"
                />
                <Button variant="primary" onClick={handleApply} disabled={applying || applyAmount <= 0}>
                  {applying ? 'Applying...' : 'Apply →'}
                </Button>
              </div>
            </div>
            {applyAmount < selInvoice.balance_amount && applyAmount > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                Partial payment — remaining balance will be {formatCurrency(selInvoice.balance_amount - applyAmount)}
              </p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
