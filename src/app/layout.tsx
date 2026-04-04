import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ભગવાનશ્રી પરશુરામ જન્મોત્સવ શોભાયાત્રા ૨૦૨૬',
  description: 'પ. બ્ર. સ. ૨૦૨૬ - ​તા. ૧૯-૦૪-૨૦૨૬, રવિવાર - તમારું પોસ્ટર બનાવો અને શૅર કરો!',
  icons: {
    icon: '/om-favicon.png',
    apple: '/om-favicon.png',
  },
  openGraph: {
    title: 'ભગ.શ્રી. પ. જ. ‍શોભાયાત્રા ૨૦૨૬ 🙏',
    description: 'હું આ શોભાયત્રામાં સામેલ છું! તમે પણ આવો!',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="gu">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700;900&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
