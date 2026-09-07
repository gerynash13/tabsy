import { redirect } from 'next/navigation'

// Middleware already keeps unauthenticated visitors at /login, so hitting
// "/" while signed in just lands you on the invoice list for now —
// there's no dashboard yet, that's Week 3.
export default function Home() {
  redirect('/invoices')
}
