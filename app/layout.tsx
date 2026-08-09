
import type { Metadata } from 'next'
import { Roboto_Condensed } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { DeviceGuard } from '@/components/device-guard'

const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-roboto-condensed',
})

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
    <html lang="es" className={robotoCondensed.variable}>
      <body className={`${robotoCondensed.className} antialiased`}>
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

