import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LexLedger Pro — Advocate Billing Suite',
  description: 'Professional billing and case management for Indian advocates',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
