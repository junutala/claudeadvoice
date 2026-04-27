'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { formatCurrency, formatDate, EXPENSE_TYPE_LABELS } from '@/lib/utils'
import {
  PageHeader, SearchInput, Button, Card, Table, Tr, Td,
  Badge, Modal, FormGroup, Input, Select, Textarea, EmptyState, StatCard
} from '@/components/ui'
import type { ExpenseFormData } from '@/types'

const EXPENSE_COLORS: Record<string, string> = {
  court_fee: '#2c4a6e', stamp_duty: '#8a6e3e', travel: '#2d6a4f',
  typing: '#b45309', photocopies: '#6b7280', filing: '#7c3aed', misc: '#9b1c1c',
}

export default function ExpensesClient({ expenses: initial, clients, tenantId }: {
  expenses: any[]; clients: any[]; tenantId: string
}) {
  const [expenses, setExpenses] = useState(initial)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [watchClient, setWatchClient] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ExpenseFormData>({
    defaultValues: { expense_date: new Date().toISOString().split('T')[0], expense_type: 'court_fee', is_billable: true },
  })

  const filtered = expenses.filter(e =>
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    EXPENSE_TYPE_LABELS[e.expense_type]?.toLowerCase().includes(search.toLowerCase())
  )

  const totalOPE       = expenses.reduce((s, e) => s + e.amount, 0)
  const totalBillable  = expenses.filter(e => e.is_billable && e.invoice_id).reduce((s, e) => s + e.amount, 0)
  const totalUnbilled  = expenses.filter(e => e.is_billable && !e.invoice_id).reduce((s, e) => s + e.amount, 0)

  const selectedClientCases = clients.find(c => c.id === watchClient)?.cases || []

  const onSubmit = async (data: ExpenseFormData) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', session!.user.id).single()

    const { error } = await supabase.from('expenses').insert({
      tenant_id: tenantId,
      client_id: data.client_id || null,
      case_id: data.case_id || null,
      expense_date: data.expense_date,
      expense_type: data.expense_type,
      description: data.description,
      amount: data.amount,
      is_billable: data.is_billable,
      notes: data.notes,
      created_by: profile?.id,
    })

    setSaving(false)
    if (!error) { reset(); setModal(false); router.refresh() }
  }

  return (
    <div>
      <PageHeader
        title="OPE / Expenses"
        sub="Out-of-pocket expenses by matter"
        actions={<Button variant="primary" onClick={() => setModal(true)}>+ Record Expense</Button>}
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Total OPE" value={formatCurrency(totalOPE)} sub="All time" />
        <StatCard label="Invoiced" value={formatCurrency(totalBillable)} sub="Billed to clients" trend="up" />
        <StatCard label="Unbilled" value={formatCurrency(totalUnbilled)} sub="Pending invoice" trend="down" />
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search expenses..." />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="▲" message="No expenses recorded" action={<Button variant="primary" onClick={() => setModal(true)}>Record first expense</Button>} />
        ) : (
          <Table headers={['Date','Type','Description','Client / Case','Amount','Billable','Status']}>
            {filtered.map((e) => (
              <Tr key={e.id}>
                <Td className="text-xs text-gray-500">{formatDate(e.expense_date)}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: EXPENSE_COLORS[e.expense_type] || '#888' }} />
                    <span className="text-xs">{EXPENSE_TYPE_LABELS[e.expense_type]}</span>
                  </div>
                </Td>
                <Td className="text-xs text-gray-700 max-w-[160px] truncate">{e.description}</Td>
                <Td>
                  <p className="text-xs font-medium text-gray-900">{e.client?.name || '—'}</p>
                  {e.case && <p className="text-[10px] text-gray-500">{e.case.case_number}</p>}
                </Td>
                <Td className="text-xs font-semibold">{formatCurrency(e.amount)}</Td>
                <Td><Badge variant={e.is_billable ? 'success' : 'neutral'}>{e.is_billable ? 'Yes' : 'No'}</Badge></Td>
                <Td>
                  {!e.is_billable ? <Badge variant="neutral">Office</Badge>
                    : e.invoice_id ? <Badge variant="success">Invoiced · {e.invoice?.invoice_number}</Badge>
                    : <Badge variant="warn">Pending</Badge>}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Record Out-of-Pocket Expense"
        footer={<>
          <Button onClick={() => { setModal(false); reset() }}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Expense'}
          </Button>
        </>}
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Expense Type">
              <Select {...register('expense_type')}>
                {Object.entries(EXPENSE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Date">
              <Input {...register('expense_date')} type="date" />
            </FormGroup>
          </div>

          <FormGroup label="Description" required error={errors.description?.message}>
            <Input {...register('description', { required: 'Required' })} placeholder="Brief description" />
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Amount (₹)" required error={errors.amount?.message}>
              <Input {...register('amount', { required: true, valueAsNumber: true, min: 0.01 })} type="number" placeholder="0.00" step="0.01" />
            </FormGroup>
            <FormGroup label="Assign to Client">
              <Select {...register('client_id')} onChange={e => setWatchClient(e.target.value)}>
                <option value="">— None (office) —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormGroup>
          </div>

          {selectedClientCases.length > 0 && (
            <FormGroup label="Assign to Case">
              <Select {...register('case_id')}>
                <option value="">— Select case —</option>
                {selectedClientCases.map((c: any) => <option key={c.id} value={c.id}>{c.case_number} · {c.title}</option>)}
              </Select>
            </FormGroup>
          )}

          <FormGroup label="Billable to Client?">
            <Select {...register('is_billable')}>
              <option value="true">Yes — include in next invoice</option>
              <option value="false">No — office expense</option>
            </Select>
          </FormGroup>

          <FormGroup label="Notes">
            <Input {...register('notes')} placeholder="Optional note" />
          </FormGroup>
        </form>
      </Modal>
    </div>
  )
}
