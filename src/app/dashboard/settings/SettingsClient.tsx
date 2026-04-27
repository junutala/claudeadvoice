'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { COURTS } from '@/lib/utils'
import {
  PageHeader, Tabs, Card, CardHeader, CardTitle, CardBody,
  Button, FormGroup, Input, Select, Textarea, Badge
} from '@/components/ui'

export default function SettingsClient({ profile, tenant }: { profile: any; tenant: any }) {
  const [tab, setTab]     = useState('Firm Profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register: regFirm, handleSubmit: handleFirm } = useForm({
    defaultValues: {
      name: tenant.name || '', firm_name: tenant.firm_name || '',
      bar_council_no: tenant.bar_council_no || '', phone: tenant.phone || '',
      address: tenant.address || '', city: tenant.city || '', state: tenant.state || '',
      gstin: tenant.gstin || '', pan: tenant.pan || '',
      primary_court: tenant.primary_court || 'Madras High Court',
    },
  })

  const { register: regBank, handleSubmit: handleBank } = useForm({
    defaultValues: {
      bank_name: tenant.bank_name || '', bank_account: tenant.bank_account || '',
      bank_ifsc: tenant.bank_ifsc || '', bank_branch: tenant.bank_branch || '',
    },
  })

  const { register: regInv, handleSubmit: handleInv } = useForm({
    defaultValues: {
      invoice_prefix: tenant.invoice_prefix || 'INV',
      receipt_prefix: tenant.receipt_prefix || 'RCP',
      invoice_notes: tenant.invoice_notes || 'Payment due within 30 days.',
    },
  })

  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd } = useForm<{ current: string; newpwd: string; confirm: string }>()

  const save = async (data: any) => {
    setSaving(true)
    await supabase.from('tenants').update(data).eq('id', tenant.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const changePwd = async (data: any) => {
    if (data.newpwd !== data.confirm) { alert('Passwords do not match'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: data.newpwd })
    setSaving(false)
    if (error) alert(error.message)
    else { alert('Password updated successfully'); resetPwd() }
  }

  return (
    <div>
      <PageHeader title="Settings" sub="Firm profile and preferences" />

      {saved && (
        <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
          ✓ Settings saved successfully
        </div>
      )}

      <Tabs tabs={['Firm Profile','Bank Details','Invoice Settings','Account']} active={tab} onChange={setTab} />

      {/* FIRM PROFILE */}
      {tab === 'Firm Profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Firm / Advocate Profile</CardTitle>
            <Badge variant={tenant.plan === 'enterprise' ? 'success' : tenant.plan === 'professional' ? 'gold' : 'info'}>
              {tenant.plan?.charAt(0).toUpperCase() + tenant.plan?.slice(1)} Plan
            </Badge>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleFirm(save)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="Advocate Name">
                  <Input {...regFirm('name')} placeholder="Full legal name" />
                </FormGroup>
                <FormGroup label="Firm / Chamber Name">
                  <Input {...regFirm('firm_name')} placeholder="M/s XYZ Law Associates" />
                </FormGroup>
                <FormGroup label="Bar Council No.">
                  <Input {...regFirm('bar_council_no')} placeholder="TN/XXXXX/YYYY" />
                </FormGroup>
                <FormGroup label="Phone">
                  <Input {...regFirm('phone')} placeholder="+91 XXXXX XXXXX" />
                </FormGroup>
                <FormGroup label="PAN">
                  <Input {...regFirm('pan')} placeholder="ABCDE1234F" />
                </FormGroup>
                <FormGroup label="GSTIN">
                  <Input {...regFirm('gstin')} placeholder="33AAAAA0000A1Z5" />
                </FormGroup>
                <FormGroup label="Primary Court">
                  <Select {...regFirm('primary_court')}>
                    {COURTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormGroup>
              </div>
              <FormGroup label="Office Address">
                <Textarea {...regFirm('address')} placeholder="Chamber / Office address" />
              </FormGroup>
              <div className="grid grid-cols-3 gap-3">
                <FormGroup label="City"><Input {...regFirm('city')} placeholder="Chennai" /></FormGroup>
                <FormGroup label="State"><Input {...regFirm('state')} placeholder="Tamil Nadu" /></FormGroup>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* BANK DETAILS */}
      {tab === 'Bank Details' && (
        <Card>
          <CardHeader><CardTitle>Bank Account Details</CardTitle></CardHeader>
          <CardBody>
            <p className="text-xs text-gray-500 mb-4">These details will appear on every invoice for client payment.</p>
            <form onSubmit={handleBank(save)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="Bank Name">
                  <Input {...regBank('bank_name')} placeholder="HDFC Bank / State Bank of India" />
                </FormGroup>
                <FormGroup label="Account Number">
                  <Input {...regBank('bank_account')} placeholder="XXXXXXXXXX" />
                </FormGroup>
                <FormGroup label="IFSC Code">
                  <Input {...regBank('bank_ifsc')} placeholder="HDFC0001234" />
                </FormGroup>
                <FormGroup label="Branch">
                  <Input {...regBank('bank_branch')} placeholder="Anna Salai, Chennai" />
                </FormGroup>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Bank Details'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* INVOICE SETTINGS */}
      {tab === 'Invoice Settings' && (
        <Card>
          <CardHeader><CardTitle>Invoice & Receipt Preferences</CardTitle></CardHeader>
          <CardBody>
            <form onSubmit={handleInv(save)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="Invoice Number Prefix">
                  <Input {...regInv('invoice_prefix')} placeholder="INV" />
                  <p className="text-[10px] text-gray-400 mt-1">e.g. INV → INV-0001, INV-0002...</p>
                </FormGroup>
                <FormGroup label="Receipt Number Prefix">
                  <Input {...regInv('receipt_prefix')} placeholder="RCP" />
                  <p className="text-[10px] text-gray-400 mt-1">e.g. RCP → RCP-0001, RCP-0002...</p>
                </FormGroup>
              </div>
              <FormGroup label="Default Invoice Notes / Payment Terms">
                <Textarea {...regInv('invoice_notes')} placeholder="Payment terms, UPI ID, or any default note to appear on all invoices..." />
              </FormGroup>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>Current sequence:</strong> Next invoice will be <strong>{tenant.invoice_prefix}-{String(tenant.next_invoice_no).padStart(4,'0')}</strong>
                {' '}· Next receipt: <strong>{tenant.receipt_prefix}-{String(tenant.next_receipt_no).padStart(4,'0')}</strong>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Preferences'}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ACCOUNT */}
      {tab === 'Account' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Name', profile?.full_name], ['Email', profile?.email],
                  ['Role', profile?.role], ['Plan', tenant?.plan],
                  ['Max Users', tenant?.max_users], ['Status', tenant?.is_active ? 'Active' : 'Inactive'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-gray-500">{label}</p>
                    <p className="font-medium text-gray-900 capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <CardBody>
              <form onSubmit={handlePwd(changePwd)} className="space-y-3">
                <FormGroup label="New Password">
                  <Input {...regPwd('newpwd', { minLength: 8 })} type="password" placeholder="Min 8 characters" />
                </FormGroup>
                <FormGroup label="Confirm Password">
                  <Input {...regPwd('confirm')} type="password" placeholder="Repeat password" />
                </FormGroup>
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" disabled={saving}>Update Password</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
