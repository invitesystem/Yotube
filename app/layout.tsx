import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Вечная комната просмотра',
  description: 'Приватный кинозал для друзей',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <div className="aurora">
          <span />
          <span />
          <span />
        </div>
        {children}
      </body>
    </html>
  )
}
