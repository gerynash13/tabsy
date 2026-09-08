import { redirect } from 'next/navigation'

// Middleware already keeps unauthenticated visitors at /login.
export default function Home() {
  redirect('/dashboard')
}
