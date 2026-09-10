
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { DeviceGuard } from '@/components/device-guard'

export const metadata: Metadata = {
  title: 'B.&.D.S.C',
  description: 'Aplicación completa para gestión de préstamos y cobranza',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
        <Providers>
          <DeviceGuard>
            {children}
          </DeviceGuard>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

