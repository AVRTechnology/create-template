'use client'

import { useState, useRef } from 'react'
import PosterCanvas from '@/components/PosterCanvas'
import ShareButtons from '@/components/ShareButtons'

export default function Home() {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [posterDataUrl, setPosterDataUrl] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('ફોટો 5MB કરતા ઓછો હોવો જોઈએ'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => setSelfiePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('કૃપया તમારું નામ દાખલ કરો'); return }
    if (!mobile.trim() || mobile.length < 10) { setError('કૃપया માન્ય મોબાઇલ નંબર દાખલ કરો'); return }
    if (!selfiePreview) { setError('કૃપા કરી તમારો ફોટો અપલોડ કરો'); return }
    setError('')
    setLoading(true)
    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), mobile: mobile.trim(), timestamp: new Date().toISOString() }),
      })
    } catch { /* non-fatal */ }
    setLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div className="header-om">ॐ</div>
        <h1 className="header-title">ભગ.શ્રી. પ. જ. શોભાયાત્રા ૨૦૨૬</h1>
        <p className="header-sub">|| જય પરશુરામ || • ૧૯ એપ્રિ. ૨૦૨૬, રવિ. ||</p>
      </header>

      {/* Main - Preview card FIRST, Form card SECOND */}
      <main className="page-wrapper">

        {/* ─── CARD 1: LIVE POSTER PREVIEW ─── */}
        <div className="card">
          <div className="card-header">
            <span className="card-header-icon">🖼️</span>
            <span className="card-header-title">તમારું પોસ્ટર (લાઇવ પ્રિવ્યૂ)</span>
            <span className="card-header-badge">LIVE</span>
          </div>
          <div className="card-body">
            <div className="live-badge">
              <span className="live-dot" />
              ફોર્મ ભરવાથી પ્રિવ્યૂ તરત અપડેટ થાય છે
            </div>
            <div className="preview-canvas-wrap">
              <PosterCanvas
                name={name}
                mobile={mobile}
                selfieUrl={selfiePreview || ''}
                onReady={setPosterDataUrl}
              />
            </div>

            {/* Download + Share always visible when poster has data */}
            {posterDataUrl && (
              <div className="preview-actions">
                <a
                  href={posterDataUrl}
                  download={`parshuram-shobhayatra-${(name || 'poster').replace(/\s+/g, '-')}.png`}
                  className="btn-download"
                >
                  ⬇️ પોસ્ટર ડાઉનલોડ કરો (ગૅલેરીમાં સેવ)
                </a>
                <ShareButtons name={name} posterDataUrl={posterDataUrl} />
              </div>
            )}
          </div>
        </div>

        {/* ─── CARD 2: INPUT FORM ─── */}
        <div className="card form-card-wrap">
          <div className="card-header">
            <span className="card-header-icon">✍️</span>
            <span className="card-header-title">તમારી માહિતી ભરો</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: 18, lineHeight: 1.5 }}>
              નીચે તમારી માહિતી ભરો — પ્રિવ્યૂ ઉપર આપોઆપ અપડેટ થઈ જશે! 🎨
            </p>

            {/* Selfie */}
            <div className="form-field">
              <label className="form-label">📸 તમારો ફોટો *</label>
              <div
                className="selfie-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                {selfiePreview ? (
                  <div className="selfie-preview-wrap">
                    <img src={selfiePreview} alt="preview" className="selfie-preview-img" />
                    <button className="selfie-change-btn" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>✎</button>
                  </div>
                ) : (
                  <>
                    <span className="upload-icon">🤳</span>
                    <p className="upload-text">ક્લિક કરો - ફોટો અપલોડ કરો</p>
                    <p className="upload-hint">JPG, PNG • મહ. 5MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
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
                placeholder="તમારું પૂરું નામ લખો"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={40}
              />
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
              {loading ? '⏳ સેવ કરી રહ્યા છીએ...' : '✅ નોંધણી કરો & ડાઉનલોડ કરો'}
            </button>

            <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.72rem', marginTop: 12 }}>
              🔒 તમારી માહિતી સુરક્ષિત છે. ફક્ત શોભાયાત્રા રેકોર્ડ માટે.
            </p>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-main">⚔️ જય પરશુરામ 🙏</div>
        <p>ભગ.શ્રી. પ. જ. શોભાયાત્રા ૨૦૨૬ | શૅર કરો & સંદેશ ફેલાવો</p>
      </footer>
    </div>
  )
}
