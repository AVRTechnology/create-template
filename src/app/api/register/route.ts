import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// This route saves data to Google Sheets using Apps Script Web App URL
// Set GOOGLE_SHEET_URL in your .env.local file

const MAX_SELFIE_BYTES = 3 * 1024 * 1024

/** 10-digit mobile only (India-style); used as stable Cloudinary public_id suffix. */
function normalizeMobileDigits(input: string): string | null {
  const d = String(input || '').replace(/\D/g, '')
  if (d.length !== 10) return null
  return d
}

/**
 * Parse public_id from a typical Cloudinary delivery URL (no heavy transforms).
 * Example: .../upload/v123/folder/m_9876543210.jpg → folder/m_9876543210
 */
function extractPublicIdFromCloudinaryUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('res.cloudinary.com')) return null
    const m = u.pathname.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/i)
    if (!m?.[1]) return null
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
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

async function uploadToCloudinary(params: { selfieDataUrl: string; mobileDigits: string }) {
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
  const ext = extensionFromMime(parsed.mimeType)
  /** One asset per mobile — overwrite replaces this user's previous image only. */
  const publicId = `m_${params.mobileDigits}`

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

  const fullPublicId = (uploadData.public_id as string) || `${folder}/${publicId}`

  return {
    selfieUrl: uploadData.secure_url as string,
    fileName: `${publicId}.${uploadData.format || ext}`,
    publicId: fullPublicId,
  }
}

/** Remove a previous Cloudinary image by public_id (only when it differs from the new asset). */
async function destroyCloudinaryAsset(publicId: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return

  const ts = Math.floor(Date.now() / 1000)
  const signaturePayload = `public_id=${publicId}&timestamp=${ts}${apiSecret}`
  const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex')

  const formData = new FormData()
  formData.append('public_id', publicId)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(ts))
  formData.append('signature', signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json()
  if (!response.ok && data?.result !== 'not found') {
    console.warn('Cloudinary destroy:', data?.error?.message || JSON.stringify(data))
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

    const mobileDigits = normalizeMobileDigits(mobile)
    if (!mobileDigits) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number required' }, { status: 400 })
    }

    const normalizedTimestamp = timestamp || new Date().toISOString()
    const recordId = createRecordId(normalizedTimestamp)

    const { selfieUrl, fileName, publicId: newPublicIdRaw } = await uploadToCloudinary({
      selfieDataUrl: selfieBase64,
      mobileDigits,
    })
    /** Same extraction as previousImageUrl so folder/path quirks do not false-trigger destroy. */
    const newPublicIdForCompare = extractPublicIdFromCloudinaryUrl(selfieUrl) || newPublicIdRaw

    let sheetResult: {
      schemaVersion?: number
      action?: string
      recordId?: string
      previousImageUrl?: string
    } | null = null

    try {
      sheetResult = await sendToSheet({
        action: 'upsert',
        recordId,
        name: String(name).trim(),
        mobile: mobileDigits,
        selfieUrl,
      })
      const ok =
        sheetResult &&
        sheetResult.schemaVersion === 2 &&
        (sheetResult.action === 'add' || sheetResult.action === 'update')
      if (!ok) {
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

    const previousImageUrl =
      typeof sheetResult?.previousImageUrl === 'string' ? sheetResult.previousImageUrl : ''
    if (previousImageUrl && sheetResult?.action === 'update') {
      const oldPublicId = extractPublicIdFromCloudinaryUrl(previousImageUrl)
      if (oldPublicId && oldPublicId !== newPublicIdForCompare) {
        try {
          await destroyCloudinaryAsset(oldPublicId)
        } catch (destroyErr) {
          console.error('Could not remove previous image from Cloudinary:', destroyErr)
        }
      }
    }

    const finalRecordId = typeof sheetResult?.recordId === 'string' ? sheetResult.recordId : recordId

    return NextResponse.json({
      success: true,
      message: sheetResult?.action === 'update' ? 'Registration updated!' : 'Registration saved!',
      recordId: finalRecordId,
      selfieUrl,
      fileName,
      updated: sheetResult?.action === 'update',
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
