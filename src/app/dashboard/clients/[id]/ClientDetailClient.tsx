'use client'
import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate, EXPENSE_TYPE_LABELS, PAYMENT_MODE_LABELS } from '@/lib/utils'
import {
  Card, CardHeader, CardTitle, CardBody, Badge, StatusBadge,
  Tabs, Table, Tr, Td, HearingChip, Button, Avatar
} from '@/components/ui'

export default function ClientDetailClient({ client, cases, invoices, receipts, expenses, hearings, tenantId }: {
  client: any; cases: any[]; invoices: any[]; receipts: any[]
  expenses: any[]; hearings: any[]; tenantId: string
}) {
  const [tab, setTab] = useState('Overview')

  const totalBilled      = invoices.reduce((s, i) => s + i.total_amount, 0)
  const totalPaid        = invoices.reduce((s, i) => s + i.paid_amount, 0)
  const totalOutstanding = invoices.reduce((s, i) => s + i.balance_amount, 0)
  const totalOPE         = expenses.reduce((s, e) => s + e.amount, 0)
  const unbilledOPE      = expenses.filter(e => e.is_billable && !e.invoice_id).reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <Link href="/dashboard/clients" className="hover:text-navy-600">Clients</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">{client.name}</span>
      </div>

      {/* Client header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar name={client.name} size="lg" />
          <div>
            <h1 className="text-lg font-serif font-bold text-gray-900">{client.name}</h1>
            <div className="flex gap-3 mt-1 flex-wrap">
              {client.email && <span className="text-xs text-gray-500">✉ {client.email}</span>}
              {client.phone && <span className="text-xs text-gray-500">📞 {client.phone}</span>}
              {client.pan && <span className="text-xs text-gray-500">PAN: {client.pan}</span>}
            </div>
            {client.address && <p className="text-xs text-gray-400 mt-0.5">{client.address}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/invoices?client=${client.id}`}>
            <Button variant="secondary" size="sm">+ Invoice</Button>
          </Link>
          <Link href={`/dashboard/receipts?client=${client.id}`}>
            <Button variant="ghost" size="sm">+ Receipt</Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Billed',    value: formatCurrency(totalBilled),      color: 'text-gray-900' },
          { label: 'Total Paid',      value: formatCurrency(totalPaid),         color: 'text-green-600' },
          { label: 'Outstanding',     value: formatCurrency(totalOutstanding),  color: totalOutstanding > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Unbilled OPE',    value: formatCurrency(unbilledOPE),       color: unbilledOPE > 0 ? 'text-amber-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className={`text-base font-bold font-serif mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs tabs={['Overview','Cases','Invoices','Receipts','Expenses']} active={tab} onChange={setTab} />

      {/* OVERVIEW TAB */}
      {tab === 'Overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Cases summary */}
          <Card>
            <CardHeader>
              <CardTitle>Cases ({cases.length})</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {cases.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No cases on file</p>
                : cases.map((c, i) => (
                  <div key={c.id} className={`px-4 py-3 ${i < cases.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{c.title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{c.case_number} · {c.court}</p>
                        <p className="text-[10px] text-gray-500">{c.case_type} · {c.stage || 'Hearing'}</p>
                      </div>
                      <Badge variant={c.is_active ? 'info' : 'neutral'}>{c.is_active ? 'Active' : 'Disposed'}</Badge>
                    </div>
                    {c.next_hearing && (
                      <div className="mt-1.5">
                        <HearingChip date={`Next: ${formatDate(c.next_hearing)}`} />
                      </div>
                    )}
                  </div>
                ))
              }
            </CardBody>
          </Card>

          {/* Upcoming hearings */}
          <Card>
            <CardHeader><CardTitle>Upcoming Hearings</CardTitle></CardHeader>
            <CardBody className="p-0">
              {hearings.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No upcoming hearings</p>
                : hearings.map((h, i) => (
                  <div key={h.id} className={`px-4 py-3 ${i < hearings.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <p className="text-xs font-semibold text-gray-900">{h.case?.title}</p>
                    <p className="text-[10px] text-gray-500">{h.case?.court} · Item #{h.item_no || '—'}</p>
                    <div className="mt-1.5 flex gap-2">
                      <HearingChip date={formatDate(h.hearing_date)} />
                      {h.purpose && <Badge variant="neutral">{h.purpose}</Badge>}
                    </div>
                  </div>
                ))
              }
            </CardBody>
          </Card>

          {/* Recent invoice */}
          {invoices[0] && (
            <Card>
              <CardHeader><CardTitle>Latest Invoice</CardTitle></CardHeader>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-600">{invoices[0].invoice_number}</p>
                    <p className="text-xs text-gray-500">{formatDate(invoices[0].invoice_date)} · Due {formatDate(invoices[0].due_date)}</p>
                  </div>
                  <StatusBadge status={invoices[0].status} />
                </div>
                <div className="space-y-1">
                  {invoices[0].items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-xs text-gray-600">
                      <span className="truncate flex-1">{item.description}</span>
                      <span className="font-medium ml-4">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 mt-3 pt-2 flex justify-between">
                  <span className="text-xs font-semibold">Total</span>
                  <span className="text-sm font-bold font-serif">{formatCurrency(invoices[0].total_amount)}</span>
                </div>
                {invoices[0].balance_amount > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Balance</span>
                    <span className="text-xs font-semibold text-red-600">{formatCurrency(invoices[0].balance_amount)}</span>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* CASES TAB */}
      {tab === 'Cases' && (
        <Card>
          {cases.length === 0
            ? <div className="text-center py-10 text-xs text-gray-400">No cases found</div>
            : <Table headers={['Case Title','Number','Court','Type','Stage','Retainer','Next Hearing','Status']}>
              {cases.map(c => (
                <Tr key={c.id}>
                  <Td><p className="text-xs font-medium text-gray-900 max-w-[150px] truncate">{c.title}</p></Td>
                  <Td className="text-xs text-gray-600">{c.case_number || '—'}</Td>
                  <Td className="text-xs text-gray-600 max-w-[100px] truncate">{c.court || '—'}</Td>
                  <Td className="text-xs">{c.case_type || '—'}</Td>
                  <Td className="text-xs">{c.stage || '—'}</Td>
                  <Td className="text-xs font-medium">{c.retainer_fee > 0 ? formatCurrency(c.retainer_fee) : '—'}</Td>
                  <Td>{c.next_hearing ? <HearingChip date={formatDate(c.next_hearing)} /> : <span className="text-xs text-gray-400">—</span>}</Td>
                  <Td><Badge variant={c.is_active ? 'info' : 'neutral'}>{c.is_active ? 'Active' : 'Disposed'}</Badge></Td>
                </Tr>
              ))}
            </Table>
          }
        </Card>
      )}

      {/* INVOICES TAB */}
      {tab === 'Invoices' && (
        <Card>
          {invoices.length === 0
            ? <div className="text-center py-10 text-xs text-gray-400">No invoices raised</div>
            : <Table headers={['Invoice #','Date','Due','Amount','Paid','Balance','Status']}>
              {invoices.map(inv => (
                <Tr key={inv.id}>
                  <Td><span className="text-xs font-medium text-navy-600">{inv.invoice_number}</span></Td>
                  <Td className="text-xs text-gray-500">{formatDate(inv.invoice_date)}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(inv.due_date)}</Td>
                  <Td className="text-xs font-semibold">{formatCurrency(inv.total_amount)}</Td>
                  <Td className="text-xs text-green-600">{formatCurrency(inv.paid_amount)}</Td>
                  <Td><span className={`text-xs font-semibold ${inv.balance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(inv.balance_amount)}</span></Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                </Tr>
              ))}
            </Table>
          }
        </Card>
      )}

      {/* RECEIPTS TAB */}
      {tab === 'Receipts' && (
        <Card>
          {receipts.length === 0
            ? <div className="text-center py-10 text-xs text-gray-400">No receipts recorded</div>
            : <Table headers={['Receipt #','Date','Amount','Mode','Reference','Applied To']}>
              {receipts.map(r => (
                <Tr key={r.id}>
                  <Td><span className="text-xs font-medium text-navy-600">{r.receipt_number}</span></Td>
                  <Td className="text-xs text-gray-500">{formatDate(r.receipt_date)}</Td>
                  <Td className="text-xs font-semibold">{formatCurrency(r.amount)}</Td>
                  <Td className="text-xs">{PAYMENT_MODE_LABELS[r.payment_mode]}</Td>
                  <Td className="text-xs text-gray-500">{r.reference_no || '—'}</Td>
                  <Td>
                    <div className="flex gap-1 flex-wrap">
                      {r.allocations?.map((a: any) => (
                        <Badge key={a.id} variant="info">{a.invoice?.invoice_number}</Badge>
                      ))}
                      {!r.allocations?.length && <span className="text-xs text-amber-600">Unallocated</span>}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>
          }
        </Card>
      )}

      {/* EXPENSES TAB */}
      {tab === 'Expenses' && (
        <Card>
          {expenses.length === 0
            ? <div className="text-center py-10 text-xs text-gray-400">No expenses recorded</div>
            : <Table headers={['Date','Type','Description','Amount','Billable','Invoiced']}>
              {expenses.map(e => (
                <Tr key={e.id}>
                  <Td className="text-xs text-gray-500">{formatDate(e.expense_date)}</Td>
                  <Td className="text-xs">{EXPENSE_TYPE_LABELS[e.expense_type]}</Td>
                  <Td className="text-xs text-gray-700 max-w-[160px] truncate">{e.description}</Td>
                  <Td className="text-xs font-semibold">{formatCurrency(e.amount)}</Td>
                  <Td><Badge variant={e.is_billable ? 'success' : 'neutral'}>{e.is_billable ? 'Yes' : 'No'}</Badge></Td>
                  <Td>
                    {e.invoice_id
                      ? <Badge variant="success">{e.invoice?.invoice_number}</Badge>
                      : e.is_billable
                      ? <Badge variant="warn">Pending</Badge>
                      : <span className="text-xs text-gray-400">N/A</span>}
                  </Td>
                </Tr>
              ))}
            </Table>
          }
        </Card>
      )}
    </div>
  )
}
