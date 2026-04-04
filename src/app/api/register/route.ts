import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// This route saves data to Google Sheets using Apps Script Web App URL
// Set GOOGLE_SHEET_URL in your .env.local file

const MAX_SELFIE_BYTES = 3 * 1024 * 1024

function sanitizeName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'user'
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

function extensionFromMime(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}

async function uploadToCloudinary(params: {
  selfieDataUrl: string
  name: string
  timestamp: string
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const folder = process.env.CLOUDINARY_FOLDER || 'parshuram-yatra'

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary env vars missing')
  }

  const parsed = parseDataUrl(params.selfieDataUrl)
  if (!parsed) {
    throw new Error('Invalid selfie image format')
  }

  const selfieBuffer = Buffer.from(parsed.base64, 'base64')
  if (selfieBuffer.length > MAX_SELFIE_BYTES) {
    throw new Error('Selfie must be <= 3MB after compression')
  }

  const ts = Math.floor(Date.now() / 1000)
  const safeName = sanitizeName(params.name)
  const timePart = params.timestamp.replace(/[:.]/g, '-')
  const ext = extensionFromMime(parsed.mimeType)
  const baseFileName = `${safeName}_${timePart}`
  const publicId = baseFileName

  const signaturePayload = `folder=${folder}&overwrite=true&public_id=${publicId}&timestamp=${ts}${apiSecret}`
  const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex')

  const formData = new FormData()
  formData.append('file', params.selfieDataUrl)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(ts))
  formData.append('folder', folder)
  formData.append('public_id', publicId)
  formData.append('signature', signature)
  formData.append('resource_type', 'image')
  formData.append('overwrite', 'true')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  const uploadData = await response.json()
  if (!response.ok || !uploadData.secure_url) {
    throw new Error(uploadData?.error?.message || 'Cloudinary upload failed')
  }

  return {
    selfieUrl: uploadData.secure_url as string,
    fileName: `${baseFileName}.${uploadData.format || ext}`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, mobile, selfieBase64, timestamp } = body

    if (!name || !mobile) {
      return NextResponse.json({ error: 'Name and mobile required' }, { status: 400 })
    }

    if (!selfieBase64) {
      return NextResponse.json({ error: 'Selfie is required' }, { status: 400 })
    }

    const normalizedTimestamp = timestamp || new Date().toISOString()
    const { selfieUrl, fileName } = await uploadToCloudinary({
      selfieDataUrl: selfieBase64,
      name,
      timestamp: normalizedTimestamp,
    })

    const sheetUrl = process.env.GOOGLE_SHEET_URL

    if (sheetUrl) {
      // Send to Google Sheets via Apps Script
      try {
        const sheetResponse = await fetch(sheetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            mobile,
            selfieUrl,
            fileName,
            timestamp: normalizedTimestamp,
          }),
        })
        if (!sheetResponse.ok) {
          throw new Error(`Sheet responded with ${sheetResponse.status}`)
        }
      } catch (sheetError) {
        console.error('Sheet save error:', sheetError)
        return NextResponse.json({ error: 'Could not save to Google Sheet' }, { status: 502 })
      }
    } else {
      return NextResponse.json({ error: 'GOOGLE_SHEET_URL is not configured' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Registration saved!',
      selfieUrl,
      fileName,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
