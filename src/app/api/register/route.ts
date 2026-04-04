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

function createRecordId(timestamp: string) {
  const parsed = Date.parse(timestamp)
  const epochMs = Number.isFinite(parsed) ? parsed : Date.now()
  return `rec_${epochMs}`
}

async function sendToSheet(payload: Record<string, unknown>) {
  const sheetUrl = process.env.GOOGLE_SHEET_URL
  if (!sheetUrl) {
    throw new Error('GOOGLE_SHEET_URL is not configured')
  }

  const sheetResponse = await fetch(sheetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const responseText = await sheetResponse.text()
  let parsed: any = null
  try {
    parsed = responseText ? JSON.parse(responseText) : null
  } catch {
    // Keep parsed as null for non-JSON script responses.
  }

  if (!sheetResponse.ok) {
    throw new Error(`Sheet responded with ${sheetResponse.status}`)
  }
  if (parsed && parsed.success === false) {
    throw new Error(parsed.error || 'Apps Script returned failure')
  }

  return parsed
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
    const recordId = createRecordId(normalizedTimestamp)
    const { selfieUrl, fileName } = await uploadToCloudinary({
      selfieDataUrl: selfieBase64,
      name,
      timestamp: normalizedTimestamp,
    })

    try {
      const sheetResult = await sendToSheet({
        action: 'add',
        recordId,
        name,
        mobile,
        selfieUrl,
      })
      if (!sheetResult || sheetResult.schemaVersion !== 2 || sheetResult.action !== 'add') {
        throw new Error('Apps Script deployment is outdated. Please redeploy latest script.')
      }
    } catch (sheetError) {
      console.error('Sheet save error:', sheetError)
      const message =
        sheetError instanceof Error && sheetError.message.includes('outdated')
          ? 'Apps Script is outdated. Redeploy latest Apps Script web app.'
          : 'Could not save to Google Sheet'
      return NextResponse.json({ error: message }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      message: 'Registration saved!',
      recordId,
      selfieUrl,
      fileName,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const recordId = body?.recordId

    if (!recordId || typeof recordId !== 'string') {
      return NextResponse.json({ error: 'recordId is required' }, { status: 400 })
    }

    try {
      const sheetResult = await sendToSheet({ action: 'delete', recordId })
      if (!sheetResult || sheetResult.schemaVersion !== 2 || sheetResult.action !== 'delete') {
        throw new Error('Apps Script deployment is outdated. Please redeploy latest script.')
      }
      return NextResponse.json({
        success: true,
        message: 'Record deleted',
        recordId,
        ...(sheetResult || {}),
      })
    } catch (sheetError) {
      console.error('Sheet delete error:', sheetError)
      const message =
        sheetError instanceof Error && sheetError.message.includes('outdated')
          ? 'Apps Script is outdated. Redeploy latest Apps Script web app.'
          : 'Could not delete from Google Sheet'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error) {
    console.error('API Delete Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
