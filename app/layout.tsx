import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wolf & Potato',
  description: 'Where are Razzy and Bucky right now?',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
