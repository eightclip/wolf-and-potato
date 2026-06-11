import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wolf & Potato',
  description: 'Where are Razzy and Bucky right now?',
}

export const viewport: Viewport = {
  themeColor: '#0d0b09',
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
