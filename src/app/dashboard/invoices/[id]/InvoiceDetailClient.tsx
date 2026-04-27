'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, PAYMENT_MODE_LABELS } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/pdf'
import { Card, CardHeader, CardTitle, CardBody, Badge, StatusBadge, Button } from '@/components/ui'

export default function InvoiceDetailClient({ invoice, tenant }: { invoice: any; tenant: any }) {
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDownloadPDF = () => generateInvoicePDF(invoice, tenant)

  const handleMarkSent = async () => {
    setSending(true)
    await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoice.id)
    setSending(false)
    router.refresh()
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice?')) return
    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', invoice.id)
    router.push('/dashboard/invoices')
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <Link href="/dashboard/invoices" className="hover:text-navy-600">Invoices</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">{invoice.invoice_number}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Invoice preview */}
        <div className="md:col-span-2">
          <Card>
            {/* Invoice header */}
            <div className="bg-navy-600 rounded-t-lg p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-serif font-bold text-lg">{tenant?.firm_name || tenant?.name}</p>
                  <p className="text-white/60 text-xs mt-0.5">{tenant?.email}</p>
                  {tenant?.phone && <p className="text-white/60 text-xs">{tenant?.phone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white text-2xl font-bold font-serif">INVOICE</p>
                  <p className="text-white/80 text-sm mt-0.5">{invoice.invoice_number}</p>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            </div>

            <CardBody>
              {/* Bill To / Details */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Bill To</p>
                  <p className="text-sm font-semibold text-gray-900">{invoice.client?.name}</p>
                  {invoice.client?.email && <p className="text-xs text-gray-500 mt-0.5">{invoice.client.email}</p>}
                  {invoice.client?.phone && <p className="text-xs text-gray-500">{invoice.client.phone}</p>}
                  {invoice.client?.address && <p className="text-xs text-gray-500 mt-1">{invoice.client.address}</p>}
                  {invoice.client?.gstin && <p className="text-xs text-gray-500 mt-1">GSTIN: {invoice.client.gstin}</p>}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Invoice Details</p>
                  {[
                    ['Invoice No.', invoice.invoice_number],
                    ['Date', formatDate(invoice.invoice_date)],
                    ['Due Date', formatDate(invoice.due_date)],
                    ...(invoice.case ? [['Matter', invoice.case.title?.slice(0, 30)]] : []),
                    ...(invoice.case?.case_number ? [['Case No.', invoice.case.case_number]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2 text-xs mb-1">
                      <span className="text-gray-500 w-20 flex-shrink-0">{label}:</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Line items */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-navy-600 text-white grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide">
                  <span className="col-span-1">#</span>
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>
                {invoice.items?.map((item: any, i: number) => (
                  <div key={item.id} className={`grid grid-cols-12 gap-2 px-3 py-2.5 text-xs ${i % 2 === 1 ? 'bg-gray-50' : ''} border-t border-gray-100`}>
                    <span className="col-span-1 text-gray-400">{i + 1}</span>
                    <span className="col-span-5 text-gray-800">{item.description}</span>
                    <span className="col-span-2 text-right text-gray-600">{item.quantity}</span>
                    <span className="col-span-2 text-right text-gray-600">{formatCurrency(item.rate)}</span>
                    <span className="col-span-2 text-right font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-4">
                <div className="w-52 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.gst_rate > 0 && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>GST ({invoice.gst_rate}%)</span><span>{formatCurrency(invoice.gst_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>Total</span><span>{formatCurrency(invoice.total_amount)}</span>
                  </div>
                  {invoice.paid_amount > 0 && <>
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Amount Paid</span><span>−{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-red-600 border-t border-gray-200 pt-1.5">
                      <span>Balance Due</span><span>{formatCurrency(invoice.balance_amount)}</span>
                    </div>
                  </>}
                </div>
              </div>

              {/* Bank details */}
              {tenant?.bank_account && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1.5">Bank Details</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {[
                      ['Bank', tenant.bank_name], ['Account', tenant.bank_account],
                      ['IFSC', tenant.bank_ifsc], ['Branch', tenant.bank_branch],
                    ].map(([label, value]) => value ? (
                      <div key={label} className="flex gap-2 text-xs">
                        <span className="text-amber-600 w-14">{label}:</span>
                        <span className="font-medium text-amber-900">{value}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(invoice.notes || tenant?.invoice_notes) && (
                <p className="text-xs text-gray-400 italic">{invoice.notes || tenant?.invoice_notes}</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Actions sidebar */}
        <div className="flex flex-col gap-3">
          {/* Actions */}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardBody className="flex flex-col gap-2">
              <Button variant="primary" className="w-full justify-center" onClick={handleDownloadPDF}>
                ↓ Download PDF
              </Button>
              {invoice.status === 'draft' && (
                <Button variant="secondary" className="w-full justify-center" onClick={handleMarkSent} disabled={sending}>
                  {sending ? 'Updating...' : '✓ Mark as Sent'}
                </Button>
              )}
              {['pending','partial','overdue'].includes(invoice.status) && (
                <Link href="/dashboard/apply" className="w-full">
                  <Button variant="ghost" className="w-full justify-center">Apply Receipt →</Button>
                </Link>
              )}
              {!['paid','cancelled'].includes(invoice.status) && (
                <Button variant="danger" className="w-full justify-center" onClick={handleCancel}>
                  Cancel Invoice
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader><CardTitle>Payment Status</CardTitle></CardHeader>
            <CardBody>
              <div className="flex justify-between items-center mb-2">
                <StatusBadge status={invoice.status} />
                <span className="text-xs text-gray-500">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-2 mb-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (invoice.paid_amount / invoice.total_amount) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Paid {formatCurrency(invoice.paid_amount)}</span>
                <span>of {formatCurrency(invoice.total_amount)}</span>
              </div>
            </CardBody>
          </Card>

          {/* Payment history */}
          {invoice.allocations?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payments Applied</CardTitle></CardHeader>
              <CardBody className="p-0">
                {invoice.allocations.map((a: any) => (
                  <div key={a.id} className="px-4 py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-xs font-medium text-gray-900">{a.receipt?.receipt_number}</span>
                      <span className="text-xs font-semibold text-green-600">{formatCurrency(a.amount)}</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-gray-400">{formatDate(a.receipt?.receipt_date)}</span>
                      <span className="text-[10px] text-gray-400">{PAYMENT_MODE_LABELS[a.receipt?.payment_mode]}</span>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'Invoice Created',  date: invoice.created_at, done: true },
                  { label: 'Invoice Sent',     date: invoice.sent_at, done: !!invoice.sent_at },
                  { label: 'Payment Received', date: invoice.paid_at, done: !!invoice.paid_at },
                ].map(({ label, date, done }) => (
                  <div key={label} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <div>
                      <p className="text-xs font-medium text-gray-700">{label}</p>
                      {date && <p className="text-[10px] text-gray-400">{formatDate(date)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
