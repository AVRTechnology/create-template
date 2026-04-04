'use client'

import { useState, useRef, useEffect, type CSSProperties } from 'react'
import PosterCanvas from '@/components/PosterCanvas'
import ShareButtons from '@/components/ShareButtons'
import { getPosterTemplate, posterTemplates, type PosterTemplateId } from '@/lib/posterTemplates'

const MAX_SELFIE_BYTES = 3 * 1024 * 1024
/** Full name (e.g. surname + name) — length must stay in this range for poster + download. */
const NAME_MIN = 30
const NAME_MAX = 40

function isValidNameLength(value: string) {
  const t = value.trim()
  return t.length >= NAME_MIN && t.length <= NAME_MAX
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}

function imageElementFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

async function compressIfNeeded(file: File): Promise<string> {
  if (file.size <= MAX_SELFIE_BYTES) {
    return fileToDataUrl(file)
  }

  const sourceDataUrl = await fileToDataUrl(file)
  const img = await imageElementFromDataUrl(sourceDataUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  const maxDimension = 1600
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  let quality = 0.9
  let compressed = canvas.toDataURL('image/jpeg', quality)
  while (quality >= 0.5) {
    const bytes = Math.ceil((compressed.length - 'data:image/jpeg;base64,'.length) * 3 / 4)
    if (bytes <= MAX_SELFIE_BYTES) {
      return compressed
    }
    quality -= 0.1
    compressed = canvas.toDataURL('image/jpeg', quality)
  }

  throw new Error('Image is too large. Please choose a smaller photo.')
}

export default function Home() {
  const [templateId, setTemplateId] = useState<PosterTemplateId>('page-1')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [posterDataUrl, setPosterDataUrl] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selfiePickerOpen, setSelfiePickerOpen] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const selectedTemplate = getPosterTemplate(templateId)
  const themeVars = {
    '--template-primary': selectedTemplate.primaryColor,
    '--template-secondary': selectedTemplate.secondaryColor,
  } as CSSProperties
  const isFormValid = Boolean(
    isValidNameLength(name) && mobile.trim().length === 10 && selfiePreview
  )

  const handleSelfieChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setSelfiePickerOpen(false)

    try {
      const selfieDataUrl = await compressIfNeeded(file)
      setSelfiePreview(selfieDataUrl)
    } catch (err) {
      setSelfiePreview(null)
      setError(err instanceof Error ? err.message : 'ફોટો પ્રોસેસ કરવામાં સમસ્યા આવી')
    }
  }

  useEffect(() => {
    if (!selfiePickerOpen) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setSelfiePickerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selfiePickerOpen])

  useEffect(() => {
    if (!selfiePickerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [selfiePickerOpen])

  const openSelfiePicker = () => setSelfiePickerOpen(true)

  /** Keep click in same user-gesture tick so mobile browsers allow the file picker. */
  const pickFromCamera = () => {
    cameraInputRef.current?.click()
    setSelfiePickerOpen(false)
  }

  const pickFromGallery = () => {
    galleryInputRef.current?.click()
    setSelfiePickerOpen(false)
  }

  const downloadPoster = () => {
    if (!posterDataUrl) return

    const link = document.createElement('a')
    link.href = posterDataUrl
    link.download = `parshuram-shobhayatra-${(name || 'poster').trim().replace(/\s+/g, '-')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('કૃપા કરી તમારું નામ દાખલ કરો'); return }
    if (!isValidNameLength(name)) {
      setError(`પૂરું નામ ${NAME_MIN} થી ${NAME_MAX} અક્ષર વચ્ચે લખો (શ્રીનામ + નામ).`)
      return
    }
    if (!mobile.trim() || mobile.length < 10) { setError('કૃપા કરી માન્ય મોબાઇલ નંબર દાખલ કરો'); return }
    if (!selfiePreview) { setError('કૃપા કરી તમારો ફોટો અપલોડ કરો'); return }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          selfieBase64: selfiePreview,
          timestamp: new Date().toISOString(),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'નોંધણી સેવ થઈ નહીં, ફરી પ્રયાસ કરો')
      }

      downloadPoster()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'નોંધણી કરવામાં સમસ્યા આવી')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={themeVars}>
      {/* Header */}
      <header className="app-header">
        <div className="header-om">ॐ</div>
        <h1 className="header-title">ભગવાનશ્રી પરશુરામ જન્મોત્સવ શોભાયાત્રા ૨૦૨૬</h1>
        <p className="header-sub">|| જય પરશુરામ || • ૧૯ એપ્રિ. ૨૦૨૬, રવિ. ||</p>
      </header>

      {/* Main: form first on mobile; desktop grid order keeps preview left */}
      <main className="page-wrapper">

        {/* ─── CARD 1: INPUT FORM ─── */}
        <div className="card form-card-wrap">
          <div className="card-header">
            <span className="card-header-icon">✍️</span>
            <span className="card-header-title">તમારી માહિતી ભરો</span>
          </div>
          <div className="card-body">
            <div className="form-field">
              <label className="form-label">🎨 પોસ્ટર ટેમ્પલેટ *</label>
              <div className="template-grid" role="radiogroup" aria-label="Poster template">
                {posterTemplates.map(template => {
                  const checked = template.id === templateId

                  return (
                    <label
                      key={template.id}
                      className={`template-option${checked ? ' template-option-active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="poster-template"
                        value={template.id}
                        checked={checked}
                        onChange={() => setTemplateId(template.id)}
                      />
                      <img
                        src={template.image.src}
                        alt={template.label}
                        className="template-option-image"
                      />
                      <span className="template-option-meta">
                        <span className="template-option-title">{template.label}</span>
                        <span className="template-option-subtitle">{template.subtitle}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Selfie */}
            <div className="form-field">
              <label className="form-label">📸 તમારો ફોટો *</label>
              <div className="selfie-upload-area" onClick={openSelfiePicker}>
                {selfiePreview ? (
                  <div className="selfie-preview-wrap">
                    <img src={selfiePreview} alt="preview" className="selfie-preview-img" />
                    <button
                      type="button"
                      className="selfie-change-btn"
                      onClick={e => {
                        e.stopPropagation()
                        openSelfiePicker()
                      }}
                    >
                      ✎
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="upload-icon">🤳</span>
                    <p className="upload-text">ક્લિક કરો - ફોટો અપલોડ કરો</p>
                    <p className="upload-hint">JPG, PNG • મહ. 3MB (મોટું હોય તો auto-compress)</p>
                  </>
                )}
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleSelfieChange}
                style={{ display: 'none' }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelfieChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* Name */}
            <div className="form-field">
              <label className="form-label">👤 પૂરું નામ *</label>
              <input
                className="form-input"
                type="text"
                placeholder={`પૂરું નામ (${NAME_MIN}–${NAME_MAX} અક્ષર)`}
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={NAME_MAX}
                minLength={NAME_MIN}
                aria-invalid={name.trim().length > 0 && !isValidNameLength(name)}
              />
              {name.trim().length > 0 && !isValidNameLength(name) && (
                <p className="field-hint field-hint-warn">
                  શ્રીનામ સહિત પૂરું નામ — {NAME_MIN} થી {NAME_MAX} અક્ષર
                </p>
              )}
            </div>

            {/* Mobile */}
            <div className="form-field">
              <label className="form-label">📱 મોબાઇલ નંબર *</label>
              <input
                className="form-input"
                type="tel"
                placeholder="તમારો 10 આંકનો મોબાઇલ નંબર"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>

            {error && <div className="error-box">⚠️ {error}</div>}

            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? '⏳ પોસ્ટર તૈયાર થઈ રહ્યું છે...' : isFormValid ? '⬇️ પોસ્ટર ડાઉનલોડ કરો' : '✅ માહિતી ભરો અને આગળ વધો'}
            </button>

            <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.72rem', marginTop: 12 }}>
              🔒 તમારી માહિતી સુરક્ષિત છે. ફક્ત શોભાયાત્રા રેકોર્ડ માટે.
            </p>
          </div>
        </div>

        {/* ─── CARD 2: POSTER PREVIEW ─── */}
        <div className="card card-preview">
          <div className="card-header">
            <span className="card-header-icon">🖼️</span>
            <span className="card-header-title">પોસ્ટર પ્રિવ્યૂ</span>
          </div>
          <div className="card-body">
            <div className="live-badge">પ્રિવ્યૂ</div>
            <div className="preview-canvas-wrap">
              <PosterCanvas
                templateId={templateId}
                name={name}
                selfieUrl={selfiePreview || ''}
                onReady={setPosterDataUrl}
              />
            </div>

            {posterDataUrl && (
              <div className="preview-actions">
                {isFormValid ? (
                  <a
                    href={posterDataUrl}
                    download={`parshuram-shobhayatra-${(name || 'poster').trim().replace(/\s+/g, '-')}.png`}
                    className="btn-download"
                  >
                    ⬇️ પોસ્ટર ડાઉનલોડ કરો અને ગેલેરીમાં સેવ કરો
                  </a>
                ) : (
                  <span className="btn-download btn-download-disabled" role="status" title="પહેલા ફોર્મ ભરો">
                    ⬇️ પોસ્ટર ડાઉનલોડ કરો અને ગેલેરીમાં સેવ કરો
                  </span>
                )}
                <ShareButtons
                  name={name}
                  posterDataUrl={posterDataUrl}
                  shareEnabled={isFormValid}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {selfiePickerOpen && (
        <div
          className="selfie-picker-backdrop"
          onClick={() => setSelfiePickerOpen(false)}
          role="presentation"
        >
          <div
            className="selfie-picker-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="selfie-picker-heading"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="selfie-picker-dismiss"
              onClick={() => setSelfiePickerOpen(false)}
              aria-label="બંધ કરો"
            >
              ×
            </button>
            <h2 id="selfie-picker-heading" className="selfie-picker-title">
              ફોટો કેવી રીતે ઉમેરશો?
            </h2>
            <p className="selfie-picker-sub">કેમેરો અથવા ગેલેરી — તમારી પસંદ</p>
            <div className="selfie-picker-grid">
              <button type="button" className="selfie-picker-card selfie-picker-card-camera" onClick={pickFromCamera}>
                <span className="selfie-picker-card-icon" aria-hidden>📷</span>
                <span className="selfie-picker-card-label">સેલ્ફી / કેમેરો</span>
                <span className="selfie-picker-card-hint">હમણાં ફોટો લો</span>
              </button>
              <button type="button" className="selfie-picker-card selfie-picker-card-gallery" onClick={pickFromGallery}>
                <span className="selfie-picker-card-icon" aria-hidden>🖼️</span>
                <span className="selfie-picker-card-label">ગેલેરી / ફાઇલો</span>
                <span className="selfie-picker-card-hint">સાચવેલો ફોટો પસંદ કરો</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-main">⚔️ જય પરશુરામ 🙏</div>
        <p>ભગવાનશ્રી પરશુરામ જન્મોત્સવ શોભાયાત્રા ૨૦૨૬ | શૅર કરો & સંદેશ ફેલાવો</p>
      </footer>
    </div>
  )
}
