import { NextRequest, NextResponse } from 'next/server'

// This route saves data to Google Sheets using Apps Script Web App URL
// Set GOOGLE_SHEET_URL in your .env.local file

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, mobile, selfieBase64, timestamp } = body

    if (!name || !mobile) {
      return NextResponse.json({ error: 'Name and mobile required' }, { status: 400 })
    }

    const sheetUrl = process.env.GOOGLE_SHEET_URL

    if (sheetUrl) {
      // Send to Google Sheets via Apps Script
      try {
        await fetch(sheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            mobile,
            selfieBase64: selfieBase64 ? selfieBase64.substring(0, 100) + '...' : 'no-photo',
            timestamp: timestamp || new Date().toISOString(),
          }),
        })
      } catch (sheetError) {
        console.error('Sheet save error (non-fatal):', sheetError)
        // Don't fail the whole request if sheet fails
      }
    } else {
      console.log('No GOOGLE_SHEET_URL set. Data:', { name, mobile, timestamp })
    }

    return NextResponse.json({ success: true, message: 'Registration saved!' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
