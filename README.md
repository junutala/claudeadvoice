# LexLedger Pro — Advocate Billing SaaS

A professional, multi-tenant billing and case management platform for Indian advocates.
Built with **Next.js 14 · Supabase · TypeScript · Tailwind CSS**.

---

## 🗂 Project Structure

```
lexledger/
├── src/
│   ├── app/
│   │   ├── login/                  # Auth page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Sidebar + auth guard
│   │   │   ├── page.tsx            # Dashboard home
│   │   │   ├── clients/            # Client & case management
│   │   │   ├── invoices/           # Invoice generation + PDF
│   │   │   ├── receipts/           # Receipt recording + PDF
│   │   │   ├── apply/              # Apply receipts to invoices
│   │   │   ├── expenses/           # OPE expense tracking
│   │   │   ├── causelist/          # eCourts cause list search
│   │   │   ├── hearings/           # Next hearing dates
│   │   │   └── superadmin/         # Tenant management
│   │   └── api/
│   │       ├── clients/route.ts
│   │       ├── invoices/route.ts
│   │       ├── receipts/route.ts
│   │       ├── expenses/route.ts
│   │       └── courts/route.ts     # eCourts proxy
│   ├── components/
│   │   ├── ui/index.tsx            # All reusable components
│   │   └── layout/                 # Sidebar, MobileNav
│   ├── lib/
│   │   ├── supabase/               # Client + server helpers
│   │   ├── utils.ts                # Formatting, constants
│   │   ├── pdf.ts                  # Invoice + receipt PDF gen
│   │   └── ecourts.ts              # eCourts API (mock → live)
│   └── types/index.ts              # All TypeScript types
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Complete DB schema
```

---

## 🚀 Setup Instructions

### 1. Clone and install
```bash
cd lexledger
npm install
```

### 2. Create a Supabase project
- Go to [supabase.com](https://supabase.com) → New project
- Copy your **Project URL** and **Anon Key** from Settings → API

### 3. Configure environment
```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and keys
```

### 4. Run the database migration
```bash
# In Supabase dashboard → SQL Editor, paste and run:
# supabase/migrations/001_initial_schema.sql
```

Or with Supabase CLI:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 5. Create the first superadmin user
In Supabase dashboard → Authentication → Add user:
- Email: `admin@yourfirm.in`
- Password: (your choice)

Then in SQL Editor:
```sql
UPDATE profiles
SET role = 'superadmin',
    tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'admin@yourfirm.in';
```

### 6. Run the development server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔑 Key Features

| Module | Feature |
|--------|---------|
| **Clients** | Multi-case clients, CNR tracking, court details |
| **Invoices** | Auto-numbered, line items, GST, PDF download |
| **Receipts** | All payment modes, PDF receipts |
| **Apply Receipts** | Visual allocation, partial payments |
| **OPE/Expenses** | Per-client, billable flag, invoice linkage |
| **Cause List** | eCourts search, order download |
| **Hearings** | Next date tracking, week/month view |
| **Super Admin** | Tenant onboarding, plan management, user seats |

---

## 🏗 Multi-Tenancy

Row Level Security (RLS) is enforced at the database level:
- Every table has `tenant_id`
- RLS policies use `current_tenant_id()` function
- Superadmin bypasses via `is_superadmin()`
- Invoice and receipt numbers are auto-generated per tenant

---

## 📄 PDF Generation

PDFs are generated client-side using **jsPDF + AutoTable**:
- `src/lib/pdf.ts` → `generateInvoicePDF(invoice, tenant)`
- `src/lib/pdf.ts` → `generateReceiptPDF(receipt, tenant)`

No server needed — downloads directly in browser.

---

## ⚖️ eCourts API Integration

Currently using **mock data** from `src/lib/ecourts.ts`.

To enable live data:
1. Get API key from [ecourtsindia.com/api/pricing](https://ecourtsindia.com/api/pricing)
2. Add to `.env.local`: `ECOURTS_API_KEY=your_key`
3. Uncomment the real API calls in `src/lib/ecourts.ts`

---

## 🚢 Deployment (Vercel — recommended)

```bash
npm install -g vercel
vercel --prod
# Add environment variables in Vercel dashboard
```

---

## 💰 Cost Estimate (Monthly)

| Service | Free tier | Paid |
|---------|-----------|------|
| Supabase | Up to 500MB + 50,000 MAU | $25/mo Pro |
| Vercel | Hobby: free | $20/mo Pro |
| eCourts API | Check pricing | Per plan |
| **Total** | **Free to start** | **~$45/mo** |

---

## 📱 Mobile

Fully responsive:
- Sidebar hidden on mobile → hamburger drawer via `MobileNav`
- Grid layouts collapse to single column
- Tables scroll horizontally

---

## 🔐 Security

- Supabase RLS enforces tenant isolation at DB level
- All API routes verify session before queries
- Superadmin-only pages redirect non-admin users
- Passwords never stored in app — Supabase Auth handles all auth
# LexLedger Pro - Mon Apr 27 04:36:16 UTC 2026
