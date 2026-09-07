import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Sans_JP } from 'next/font/google'
import './globals.css'

// If your Next.js version's font catalogue doesn't have IBM_Plex_Sans_JP
// under that exact export name, swap it for Noto_Sans_JP as a fallback —
// same idea (a CJK companion to the Latin face), slightly different shape.
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
})

const plexSansJP = IBM_Plex_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans-jp',
})

export const metadata: Metadata = {
  title: 'tabsy',
  description: 'Invoice reminders that keep tabs, so you don\'t have to.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexSansJP.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
