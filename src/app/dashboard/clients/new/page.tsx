export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'

// /clients/new redirects to /clients and opens the modal via query param
export default function ClientsNewPage() {
  redirect('/dashboard/clients?new=1')
}
