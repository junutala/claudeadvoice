import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'
import type { Invoice, Tenant } from '@/types'

export async function generateInvoicePDF(invoice: Invoice, tenant: Tenant): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 15
  const contentW = pageW - margin * 2

  // ── Header bar ──────────────────────────────────────────
  doc.setFillColor(44, 74, 110) // navy-600
  doc.rect(0, 0, pageW, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(tenant.firm_name || tenant.name, margin, 15)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(tenant.email, margin, 21)
  if (tenant.phone) doc.text(tenant.phone, margin, 26)

  // Invoice label (right)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageW - margin, 15, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.invoice_number, pageW - margin, 22, { align: 'right' })

  // ── Status badge ────────────────────────────────────────
  if (invoice.status === 'paid') {
    doc.setFillColor(45, 106, 79)
    doc.roundedRect(pageW - margin - 28, 25, 28, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PAID', pageW - margin - 14, 30, { align: 'center' })
  } else if (invoice.status === 'overdue') {
    doc.setFillColor(155, 28, 28)
    doc.roundedRect(pageW - margin - 35, 25, 35, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('OVERDUE', pageW - margin - 17.5, 30, { align: 'center' })
  }

  doc.setTextColor(30, 30, 30)

  // ── Bill To / Invoice Details ────────────────────────────
  let y = 45

  doc.setFillColor(247, 246, 243)
  doc.rect(margin, y, contentW / 2 - 5, 38, 'F')
  doc.rect(pageW / 2 + 5, y, contentW / 2 - 5, 38, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('BILL TO', margin + 4, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.text(invoice.client?.name || '', margin + 4, y + 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  if (invoice.client?.email) doc.text(invoice.client.email, margin + 4, y + 19)
  if (invoice.client?.phone) doc.text(invoice.client.phone, margin + 4, y + 24)
  if (invoice.client?.address) {
    const addr = doc.splitTextToSize(invoice.client.address, contentW / 2 - 15)
    doc.text(addr, margin + 4, y + 30)
  }

  // Invoice details (right box)
  const rx = pageW / 2 + 9
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('INVOICE DETAILS', rx, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  const details = [
    ['Invoice No:', invoice.invoice_number],
    ['Date:', formatDate(invoice.invoice_date)],
    ['Due Date:', formatDate(invoice.due_date)],
    ...(invoice.case ? [['Matter:', invoice.case.title.slice(0, 30)]] : []),
  ]
  details.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, rx, y + 13 + i * 6)
    doc.setFont('helvetica', 'normal')
    doc.text(value, rx + 25, y + 13 + i * 6)
  })

  y += 45

  // ── Line Items Table ─────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)']],
    body: (invoice.items || []).map((item, idx) => [
      idx + 1,
      item.description,
      item.quantity,
      formatCurrency(item.rate),
      formatCurrency(item.amount),
    ]),
    headStyles: {
      fillColor: [44, 74, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
    alternateRowStyles: { fillColor: [247, 246, 243] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
  })

  // ── Totals ───────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 5

  const totalsX = pageW - margin - 70
  let ty = finalY

  const addTotalRow = (label: string, value: string, bold = false, line = false) => {
    if (line) {
      doc.setDrawColor(200, 200, 200)
      doc.line(totalsX, ty - 1, pageW - margin, ty - 1)
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 10 : 9)
    doc.setTextColor(bold ? 30 : 80, bold ? 30 : 80, bold ? 30 : 80)
    doc.text(label, totalsX, ty)
    doc.text(value, pageW - margin, ty, { align: 'right' })
    ty += 6
  }

  addTotalRow('Subtotal:', formatCurrency(invoice.subtotal))
  if (invoice.gst_rate > 0)
    addTotalRow(`GST (${invoice.gst_rate}%):`, formatCurrency(invoice.gst_amount))
  addTotalRow('TOTAL:', formatCurrency(invoice.total_amount), true, true)
  if (invoice.paid_amount > 0) {
    addTotalRow('Amount Paid:', formatCurrency(invoice.paid_amount))
    addTotalRow('Balance Due:', formatCurrency(invoice.balance_amount), true, true)
  }

  // ── Bank Details ─────────────────────────────────────────
  if (tenant.bank_account) {
    ty += 4
    doc.setFillColor(240, 237, 232)
    doc.rect(margin, ty, contentW / 2, 28, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(44, 74, 110)
    doc.text('BANK DETAILS', margin + 4, ty + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    const bankLines = [
      `Bank: ${tenant.bank_name || ''}`,
      `A/C: ${tenant.bank_account}`,
      `IFSC: ${tenant.bank_ifsc || ''}`,
      `Branch: ${tenant.bank_branch || ''}`,
    ]
    bankLines.forEach((line, i) => doc.text(line, margin + 4, ty + 12 + i * 4))
    ty += 32
  }

  // ── Notes / Terms ────────────────────────────────────────
  if (invoice.notes || tenant.invoice_notes) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    const notesText = doc.splitTextToSize(invoice.notes || tenant.invoice_notes || '', contentW)
    doc.text(notesText, margin, ty + 6)
  }

  // ── Footer ───────────────────────────────────────────────
  const pageH = 297
  doc.setFillColor(44, 74, 110)
  doc.rect(0, pageH - 12, pageW, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${tenant.firm_name || tenant.name}  ·  ${tenant.email}  ·  Powered by LexLedger Pro`,
    pageW / 2,
    pageH - 5,
    { align: 'center' }
  )

  // Save
  doc.save(`${invoice.invoice_number}.pdf`)
}

export async function generateReceiptPDF(receipt: any, tenant: Tenant): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 15

  doc.setFillColor(44, 74, 110)
  doc.rect(0, 0, pageW, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(tenant.firm_name || tenant.name, margin, 13)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(tenant.email, margin, 19)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('RECEIPT', pageW - margin, 13, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(receipt.receipt_number, pageW - margin, 20, { align: 'right' })

  doc.setTextColor(30, 30, 30)
  let y = 40

  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, margin + 45, y)
    y += 7
  }

  row('Received From:', receipt.client?.name || '')
  row('Date:', formatDate(receipt.receipt_date))
  row('Amount:', formatCurrency(receipt.amount))
  row('Payment Mode:', receipt.payment_mode.toUpperCase())
  if (receipt.reference_no) row('Reference No.:', receipt.reference_no)
  if (receipt.notes) row('Notes:', receipt.notes)

  // Big amount box
  y += 5
  doc.setFillColor(240, 237, 232)
  doc.roundedRect(margin, y, pageW - margin * 2, 22, 4, 4, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(44, 74, 110)
  doc.text('Amount Received', pageW / 2, y + 9, { align: 'center' })
  doc.setFontSize(20)
  doc.text(formatCurrency(receipt.amount), pageW / 2, y + 18, { align: 'center' })

  doc.save(`${receipt.receipt_number}.pdf`)
}
