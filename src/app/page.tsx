'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import PosterCanvas from '@/components/PosterCanvas'
import ShareButtons from '@/components/ShareButtons'

export default function Home() {
  const [step, setStep] = useState<'form' | 'poster'>('form')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [posterDataUrl, setPosterDataUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB')
      return
    }
    setError('')
    setSelfieFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setSelfiePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!mobile.trim() || mobile.length < 10) { setError('Please enter a valid mobile number'); return }
    if (!selfiePreview) { setError('Please upload your selfie photo'); return }
    setError('')
    setLoading(true)

    try {
      // Save to Google Sheets
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          selfieBase64: selfiePreview,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (e) {
      // Continue even if save fails
      console.error(e)
    }

    setLoading(false)
    setStep('poster')
  }

  const handleReset = () => {
    setStep('form')
    setName('')
    setMobile('')
    setSelfiePreview(null)
    setSelfieFile(null)
    setPosterDataUrl('')
    setError('')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* Header */}
      <header className="hero-bg" style={{ padding: '32px 16px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="om-symbol">ॐ</div>
          <h1 className="title-devanagari" style={{
            fontSize: 'clamp(1.6rem, 5vw, 2.8rem)',
            color: 'white',
            fontWeight: 700,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            margin: '8px 0 4px',
            lineHeight: 1.2
          }}>
            परशुराम शोभायात्रा
          </h1>
          <p className="title-english" style={{
            color: '#FFD700',
            fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            textShadow: '0 1px 6px rgba(0,0,0,0.4)'
          }}>
            Parshuram Shobhayatra 2025
          </p>
          <div style={{
            display: 'inline-block',
            marginTop: 12,
            background: 'rgba(255,215,0,0.2)',
            border: '1px solid rgba(255,215,0,0.5)',
            borderRadius: 99,
            padding: '4px 20px',
            color: '#FFE082',
            fontSize: '0.85rem'
          }}>
            🙏 Create Your Poster &amp; Share
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 48px' }}>
        {step === 'form' && (
          <div className="form-card" style={{ padding: '32px 24px', marginTop: -24, position: 'relative', zIndex: 10 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
              Join the Shobhayatra 🚩
            </h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 28 }}>
              Fill in your details, get a personalized poster and share with everyone!
            </p>

            {/* Selfie Upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: 'var(--dark)' }}>
                📸 Your Selfie Photo *
              </label>
              <div
                className="selfie-upload"
                onClick={() => fileInputRef.current?.click()}
                style={{ position: 'relative' }}
              >
                {selfiePreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={selfiePreview}
                      alt="Preview"
                      style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid #FFB74D' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 4, right: 4,
                      background: 'var(--saffron)', borderRadius: '50%',
                      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.8rem', cursor: 'pointer'
                    }}>✎</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>🤳</div>
                    <p style={{ color: 'var(--saffron)', fontWeight: 600 }}>Click to upload your selfie</p>
                    <p style={{ color: '#999', fontSize: '0.8rem', marginTop: 4 }}>JPG, PNG up to 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleSelfieChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: 'var(--dark)' }}>
                👤 Full Name *
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* Mobile */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: 'var(--dark)' }}>
                📱 Mobile Number *
              </label>
              <input
                className="input-field"
                type="tel"
                placeholder="Enter your mobile number"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>

            {error && (
              <div style={{
                background: '#FFF3F3', border: '1px solid #FFCDD2', borderRadius: 10,
                padding: '10px 16px', color: '#C62828', fontSize: '0.9rem', marginBottom: 16
              }}>
                ⚠️ {error}
              </div>
            )}

            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Creating Your Poster...' : '🎨 Create My Poster →'}
            </button>

            <p style={{ textAlign: 'center', color: '#999', fontSize: '0.75rem', marginTop: 16 }}>
              🔒 Your data is safe. We only use it for Shobhayatra records.
            </p>
          </div>
        )}

        {step === 'poster' && (
          <div style={{ textAlign: 'center' }}>
            <div className="form-card" style={{ padding: '24px', marginTop: -24, position: 'relative', zIndex: 10 }}>
              <div style={{
                background: 'linear-gradient(135deg, #FFF8E1, #FFF3C4)',
                border: '2px solid #FFD700',
                borderRadius: 12,
                padding: '10px 16px',
                marginBottom: 20,
                display: 'inline-block'
              }}>
                <span style={{ color: 'var(--deep-saffron)', fontWeight: 700, fontSize: '1rem' }}>
                  🎉 Your Poster is Ready!
                </span>
              </div>

              {/* Poster */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <PosterCanvas
                  name={name}
                  mobile={mobile}
                  selfieUrl={selfiePreview || ''}
                  onReady={setPosterDataUrl}
                />
              </div>

              {/* Download Button */}
              {posterDataUrl && (
                <a
                  href={posterDataUrl}
                  download={`parshuram-yatra-${name.replace(/\s+/g, '-')}.png`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #1B5E20, #2E7D32)',
                    color: 'white',
                    padding: '14px 28px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: '1rem',
                    textDecoration: 'none',
                    marginBottom: 16,
                    boxShadow: '0 4px 20px rgba(27, 94, 32, 0.3)',
                    transition: 'transform 0.2s',
                  }}
                >
                  ⬇️ Download Poster (Save to Gallery)
                </a>
              )}

              {/* Share Buttons */}
              <ShareButtons
                name={name}
                posterDataUrl={posterDataUrl}
              />

              {/* Back button */}
              <button
                onClick={handleReset}
                style={{
                  marginTop: 20,
                  background: 'transparent',
                  border: '2px solid #ddd',
                  borderRadius: 10,
                  padding: '10px 24px',
                  color: '#666',
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                ← Make Another Poster
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px 16px',
        background: '#3D0000',
        color: '#FFB74D',
        fontSize: '0.85rem'
      }}>
        <div className="title-devanagari" style={{ fontSize: '1.5rem', color: '#FFD700', marginBottom: 4 }}>
          जय परशुराम 🙏
        </div>
        <p>Parshuram Shobhayatra 2025 | Share &amp; Spread the Message</p>
      </footer>
    </div>
  )
}
