'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { formatDate, daysDiff } from '@/lib/utils'
import {
  PageHeader, Button, Card, CardHeader, CardTitle, CardBody,
  Tabs, Badge, Modal, FormGroup, Input, Select, Textarea, HearingChip
} from '@/components/ui'

interface HearingFormData {
  case_id: string
  hearing_date: string
  court_hall: string
  item_no: string
  judge_name: string
  purpose: string
  notes: string
  source: string
}

export default function HearingsClient({ upcoming, past, cases, tenantId }: {
  upcoming: any[]; past: any[]; cases: any[]; tenantId: string
}) {
  const [tab, setTab]       = useState('Upcoming')
  const [modal, setModal]   = useState(false)
  const [saving, setSaving] = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HearingFormData>({
    defaultValues: {
      case_id: '', hearing_date: new Date().toISOString().split('T')[0],
      court_hall: '', item_no: '', judge_name: '', purpose: '', notes: '', source: 'manual',
    },
  })

  const onSubmit = async (data: HearingFormData) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', session!.user.id).single()

    await supabase.from('hearings').insert({
      tenant_id: tenantId,
      case_id:      data.case_id,
      hearing_date: data.hearing_date,
      court_hall:   data.court_hall   || null,
      item_no:      data.item_no      ? parseInt(data.item_no) : null,
      judge_name:   data.judge_name   || null,
      purpose:      data.purpose      || null,
      notes:        data.notes        || null,
      source: 'manual',
      created_by: profile?.id,
    })

    await supabase.from('cases').update({ next_hearing: data.hearing_date }).eq('id', data.case_id)

    setSaving(false)
    reset()
    setModal(false)
    router.refresh()
  }

  const thisWeek  = upcoming.filter(h => daysDiff(h.hearing_date) <= 7)
  const nextMonth = upcoming.filter(h => daysDiff(h.hearing_date) > 7 && daysDiff(h.hearing_date) <= 30)
  const later     = upcoming.filter(h => daysDiff(h.hearing_date) > 30)

  const HearingCard = ({ h }: { h: any }) => {
    const diff = daysDiff(h.hearing_date)
    return (
      <div className="px-4 py-3 border-b border-gray-100 last:border-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{h.case?.title}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{h.case?.case_number} · {h.case?.court}</p>
            <p className="text-[10px] text-gray-500">Client: {h.case?.client?.name}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <HearingChip date={formatDate(h.hearing_date)} />
              {h.court_hall && <span className="text-[10px] text-gray-500">Hall: {h.court_hall}</span>}
              {h.item_no    && <Badge variant="neutral">Item #{h.item_no}</Badge>}
              {h.purpose    && <Badge variant="info">{h.purpose}</Badge>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`text-xs font-semibold ${diff <= 2 ? 'text-red-600' : diff <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
              {diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${diff}d`}
            </span>
          </div>
        </div>
        {h.notes && <p className="text-[10px] text-gray-500 mt-1.5 italic">{h.notes}</p>}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Next Hearing Dates"
        sub="Track upcoming court dates"
        actions={<>
          <Button variant="ghost">Sync eCourts</Button>
          <Button variant="primary" onClick={() => setModal(true)}>+ Add Hearing</Button>
        </>}
      />

      <Tabs tabs={['Upcoming','Past']} active={tab} onChange={setTab} />

      {tab === 'Upcoming' ? (
        <div className="space-y-4">
          {upcoming.length === 0 ? (
            <Card><CardBody><p className="text-center text-xs text-gray-400 py-6">No upcoming hearings</p></CardBody></Card>
          ) : (
            <>
              {thisWeek.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>This Week ({thisWeek.length})</CardTitle></CardHeader>
                  {thisWeek.map(h => <HearingCard key={h.id} h={h} />)}
                </Card>
              )}
              {nextMonth.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Next 30 Days ({nextMonth.length})</CardTitle></CardHeader>
                  {nextMonth.map(h => <HearingCard key={h.id} h={h} />)}
                </Card>
              )}
              {later.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Later ({later.length})</CardTitle></CardHeader>
                  {later.map(h => <HearingCard key={h.id} h={h} />)}
                </Card>
              )}
            </>
          )}
        </div>
      ) : (
        <Card>
          {past.length === 0
            ? <CardBody><p className="text-center text-xs text-gray-400 py-6">No past hearings</p></CardBody>
            : past.map(h => (
              <div key={h.id} className="px-4 py-3 border-b border-gray-100 last:border-0 opacity-70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{h.case?.title}</p>
                    <p className="text-[10px] text-gray-500">{h.case?.case_number} · {formatDate(h.hearing_date)}</p>
                  </div>
                  <div className="flex gap-2">
                    {h.outcome  && <Badge variant="neutral">{h.outcome}</Badge>}
                    {h.next_date && <HearingChip date={formatDate(h.next_date)} />}
                  </div>
                </div>
              </div>
            ))
          }
        </Card>
      )}

      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Add Hearing Date"
        footer={<>
          <Button onClick={() => { setModal(false); reset() }}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Hearing'}
          </Button>
        </>}
      >
        <form className="space-y-4">
          <FormGroup label="Case / Matter" required error={errors.case_id?.message}>
            <Select {...register('case_id', { required: 'Required' })}>
              <option value="">— Select case —</option>
              {cases.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.case_number ? `${c.case_number} · ` : ''}{c.title} ({(c.client as any)?.name})
                </option>
              ))}
            </Select>
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Hearing Date" required>
              <Input {...register('hearing_date', { required: true })} type="date" />
            </FormGroup>
            <FormGroup label="Court Hall / Room">
              <Input {...register('court_hall')} placeholder="Hall 2, Room 5..." />
            </FormGroup>
            <FormGroup label="Item No.">
              <Input {...register('item_no')} type="number" placeholder="14" />
            </FormGroup>
            <FormGroup label="Purpose">
              <Select {...register('purpose')}>
                <option value="">— Select —</option>
                {['Admission','Hearing','Arguments','Orders','Filing','Counter','Rejoinder','Judgment'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </FormGroup>
          </div>
          <FormGroup label="Judge / Bench">
            <Input {...register('judge_name')} placeholder="Hon. Justice..." />
          </FormGroup>
          <FormGroup label="Notes">
            <Textarea {...register('notes')} placeholder="Reminders, documents to bring..." />
          </FormGroup>
        </form>
      </Modal>
    </div>
  )
}
