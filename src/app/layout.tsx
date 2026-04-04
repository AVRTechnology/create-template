import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parshuram Shobhayatra - Join Us!',
  description: 'Create your Parshuram Shobhayatra poster and share it with friends!',
  openGraph: {
    title: 'Parshuram Shobhayatra 🙏',
    description: 'I am joining Parshuram Shobhayatra! Join me!',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  )
}
