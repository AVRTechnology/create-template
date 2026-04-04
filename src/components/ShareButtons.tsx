'use client'

interface ShareButtonsProps {
  name: string
  posterDataUrl: string
  /** When false, poster share is disabled (user must fill form first). Copy link always works. */
  shareEnabled: boolean
}

/**
 * Single action: native share sheet with poster image.
 * Phone shows available apps (WhatsApp Status, Facebook, Instagram, others).
 */
export default function ShareButtons({ name, posterDataUrl, shareEnabled }: ShareButtonsProps) {
  const shareTitle = 'ભગવાનશ્રી પરશુરામ જન્મોત્સવ શોભાયાત્રા ૨૦૨૬'
  const pageUrlRaw = typeof window !== 'undefined' ? window.location.href : ''

  const sharePosterImage = async () => {
    if (!shareEnabled) return
    if (!posterDataUrl) {
      alert('પહેલા પોસ્ટર તૈયાર થાય ત્યાં સુધી રાહ જુઓ.')
      return
    }

    if (!navigator.share) {
      alert('આ ફોન/બ્રાઉઝર પર ફોટો શેર સપોર્ટેડ નથી. પોસ્ટર ડાઉનલોડ કરીને ગેલેરીમાંથી શેર કરો.')
      return
    }

    try {
      const blob = await fetch(posterDataUrl).then(r => r.blob())
      const file = new File([blob], 'parshuram-shobhayatra-2026.png', {
        type: blob.type || 'image/png',
      })

      if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
        alert('આ ડિવાઇસ પર ફોટો શેર થઈ શકતું નથી. પોસ્ટર ડાઉનલોડ કરીને ગેલેરીમાંથી શેર કરો.')
        return
      }

      await navigator.share({
        files: [file],
        title: name.trim() ? `${name.trim()} — ${shareTitle}` : shareTitle,
      })
    } catch (err) {
      const e = err as { name?: string }
      if (e?.name === 'AbortError') return
      alert('ફોટો શેર થયો નહીં. પોસ્ટર ડાઉનલોડ કરીને ગેલેરીમાંથી શેર કરો.')
    }
  }

  const copyAppLink = async () => {
    if (!pageUrlRaw) return

    try {
      await navigator.clipboard.writeText(pageUrlRaw)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = pageUrlRaw
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {
        alert('લિંક કૉપી થઈ શકી નહીં.')
        return
      }
    }

    alert('એપ લિંક કૉપી થઈ ગઈ — હવે જ્યાં ઇચ્છો ત્યાં પેસ્ટ કરી શકો છો.')
  }

  return (
    <div className="share-section">
      <p className="share-title">📢 પોસ્ટર શૅર કરો</p>
      <p className="share-sub">
        <strong className="share-sub-apps">વોટ્સએપ સ્ટેટસ</strong>
        {' · '}
        <strong className="share-sub-apps">ફેસબુક</strong>
        {' · '}
        <strong className="share-sub-apps">ઇન્સ્ટાગ્રામ</strong>
        <span className="share-sub-extra"> — પ્ર. સ્ટેટસ મૂકો</span>
      </p>

      <button
        type="button"
        className={`share-single-btn${!shareEnabled ? ' share-single-btn-disabled' : ''}`}
        onClick={sharePosterImage}
        disabled={!shareEnabled}
        aria-disabled={!shareEnabled}
        title={shareEnabled ? undefined : 'પહેલા નામ (૩૦–૪૦ અક્ષર), ફોટો અને મોબાઇલ ભરો'}
      >
        <span className="share-single-icon" aria-hidden>📤</span>
        <span className="share-single-label">સ્ટેટસ / સોશિયલ મીડિયા પર શેર કરો</span>
      </button>

      <button type="button" className="share-copy-link-btn" onClick={copyAppLink}>
        📋 એપ લિંક કૉપી કરો
      </button>
    </div>
  )
}
