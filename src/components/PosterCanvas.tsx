'use client'

import { useEffect, useRef, useCallback } from 'react'

interface PosterCanvasProps {
  name: string
  mobile: string
  selfieUrl: string
  onReady: (dataUrl: string) => void
}

const W = 800
const H = 930

// ─── helpers ───────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ')
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy)
      line = word
      cy += lineH
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, cy)
  return cy
}

// ─── main component ─────────────────────────────────────────────────────────
export default function PosterCanvas({ name, mobile, selfieUrl, onReady }: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = W
    canvas.height = H

    // Wait for fonts
    try { await document.fonts.ready } catch { /* ok */ }

    // ── 1. CREAM BACKGROUND ──────────────────────────────────────────────────
    ctx.fillStyle = '#FFFBEF'
    ctx.fillRect(0, 0, W, H)

    // Outer gold border  12px
    ctx.strokeStyle = '#C8960C'
    ctx.lineWidth = 14
    ctx.strokeRect(7, 7, W - 14, H - 14)
    // Inner thin line
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 2
    ctx.strokeRect(20, 20, W - 40, H - 40)

    // ── 2. TOP TEXT SECTION ──────────────────────────────────────────────────
    // Corner labels
    ctx.fillStyle = '#5D0000'
    ctx.font = '500 13px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('|| હર હર મહાદેવ ||', 28, 42)
    ctx.textAlign = 'right'
    ctx.fillText('|| જય પરશુરામ ||', W - 28, 42)

    // Decorative flower row
    ctx.textAlign = 'center'
    ctx.font = '13px serif'
    ctx.fillStyle = '#C8960C'
    for (let fx = 35; fx < W - 30; fx += 32) ctx.fillText('✿', fx, 58)

    // Main headline line 1
    ctx.fillStyle = '#1A1A8C'
    ctx.font = 'bold 36px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.12)'
    ctx.shadowBlur = 4
    ctx.fillText('હું આવું છું', W / 2, 96)

    // Main headline line 2
    ctx.font = 'bold 27px "Noto Sans Gujarati", sans-serif'
    ctx.fillText('તમે પણ આવો ભગવાનની યાત્રા માં', W / 2, 130)
    ctx.shadowBlur = 0

    // Org info
    ctx.fillStyle = '#5D0000'
    ctx.font = '600 15px "Noto Sans Gujarati", sans-serif'
    ctx.fillText('પાલીવાલ બ્રહ્મ સમાજ પરશુરામ યુવા સેના આયોજિત', W / 2, 158)
    ctx.font = '500 14px "Noto Sans Gujarati", sans-serif'
    ctx.fillText('સમસ્ત બ્રહ્મ સમાજ પ્રેરિત', W / 2, 178)

    // Divider flowers
    ctx.fillStyle = '#C8960C'
    ctx.font = '14px serif'
    for (let fx = 35; fx < W - 30; fx += 32) ctx.fillText('🌸', fx, 197)

    // ── 3. RED TITLE BANNER ──────────────────────────────────────────────────
    const redGrad = ctx.createLinearGradient(22, 200, W - 22, 260)
    redGrad.addColorStop(0, '#5D0000')
    redGrad.addColorStop(0.5, '#9A0000')
    redGrad.addColorStop(1, '#5D0000')
    ctx.fillStyle = redGrad
    ctx.fillRect(22, 200, W - 44, 60)

    ctx.fillStyle = 'white'
    ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 6
    ctx.fillText('ભગવાનશ્રી પરશુરામ જન્મોત્સવ', W / 2, 238)
    ctx.shadowBlur = 0

    // ── 4. PARSHURAM + SHOBHAYATRA SECTION (260-480) ────────────────────────
    // Load + draw Parshuram image on left
    try {
      const pImg = await loadImg('/parshuram.png')
      ctx.drawImage(pImg, 22, 258, 320, 340)
    } catch {
      // Fallback: golden gradient area
      const fbGrad = ctx.createLinearGradient(22, 258, 342, 598)
      fbGrad.addColorStop(0, '#FFF3CD')
      fbGrad.addColorStop(1, '#FFE082')
      ctx.fillStyle = fbGrad
      ctx.fillRect(22, 258, 320, 340)
      ctx.fillStyle = '#C8960C'
      ctx.font = 'bold 100px serif'
      ctx.textAlign = 'center'
      ctx.fillText('ॐ', 182, 440)
    }

    // "Shobhayatra" red pill banner (right of parshuram)
    const pillGrad = ctx.createLinearGradient(330, 270, 330, 355)
    pillGrad.addColorStop(0, '#9A0000')
    pillGrad.addColorStop(1, '#5D0000')
    ctx.fillStyle = pillGrad
    roundRect(ctx, 330, 268, W - 355, 88, 14)
    ctx.fill()

    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 58px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 8
    const pilCx = 330 + (W - 355) / 2
    ctx.fillText('શોભાયાત્રા', pilCx, 334)
    ctx.shadowBlur = 0

    // Small statue image top-right
    try {
      const sImg = await loadImg('/parshuram-statue.png')
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(640, 262, 130, 130, 8)
      ctx.clip()
      ctx.drawImage(sImg, 640, 262, 130, 130)
      ctx.restore()
    } catch {
      // fall through — no statue image, that's ok
    }

    // ── 5. BLUE DATE BANNER ───────────────────────────────────────────────────
    const blueGrad = ctx.createLinearGradient(330, 370, W - 25, 430)
    blueGrad.addColorStop(0, '#003087')
    blueGrad.addColorStop(1, '#1565C0')
    ctx.fillStyle = blueGrad
    roundRect(ctx, 330, 368, W - 355, 56, 8)
    ctx.fill()

    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('તા. ૧૯-૦૪-૨૦૨૬, રવિવાર', pilCx, 404)

    // ── 6. THREE COLUMNS ─────────────────────────────────────────────────────
    const COL_Y = 442
    const cols = [
      {
        title: '•: યાત્રા પ્રસ્થાન :•',
        lines: ['સવારે ૮-૦૦ કલાકે', 'શ્રી સદ્ગુરુ આશ્રમ,', 'કાળિ., ભાવ.'],
      },
      {
        title: '•: યાત્રા સમય :•',
        lines: ['૧૯-૦૪-૨૦૨૬, રવ.', 'સ.8 થી બ.12 સ.'],
      },
      {
        title: '•: યાત્રા વિરામ :•',
        lines: ['બ. ૧૨-૦૦ કલાકે', 'શ્રી શિવ. આ.,', 'અઘ., ભાવ.'],
      },
    ]

    const colW = (W - 44) / 3
    cols.forEach((col, i) => {
      const cx = 22 + i * colW + colW / 2

      // Vertical divider
      if (i > 0) {
        ctx.strokeStyle = '#C8960C'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(22 + i * colW, COL_Y - 6)
        ctx.lineTo(22 + i * colW, COL_Y + 110)
        ctx.stroke()
      }

      ctx.fillStyle = '#8B0000'
      ctx.font = 'bold 12px "Noto Sans Gujarati", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(col.title, cx, COL_Y + 14)

      ctx.fillStyle = '#2C0A00'
      ctx.font = '500 12px "Noto Sans Gujarati", sans-serif'
      col.lines.forEach((line, li) => {
        ctx.fillText(line, cx, COL_Y + 32 + li * 18)
      })
    })

    // ── 7. INVITATION TEXT ────────────────────────────────────────────────────
    const INV_Y = 578
    ctx.fillStyle = '#1A1A8C'
    ctx.font = '600 17px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('સર્વે ભૂદેવ પરિવારોને આ શોભાયાત્રામાં', W / 2, INV_Y)
    ctx.fillText('જોડાવા હાર્દિક આમંત્રણ છે.', W / 2, INV_Y + 22)

    // ── 8. BIG TEXT + SELFIE CIRCLE ──────────────────────────────────────────
    const BIG_Y = 630
    const SELFIE_CX = 680
    const SELFIE_CY = 720
    const SELFIE_R = 95
    const TEXT_MAX_W = 430

    ctx.fillStyle = '#5D0000'
    ctx.font = '600 20px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'left'
    wrapText(ctx, 'ચાલો, ભાવેણામાં પરશુરામ જન્મોત્સવની', 28, BIG_Y, TEXT_MAX_W, 26)

    ctx.fillStyle = '#8B0000'
    ctx.font = 'bold 34px "Noto Sans Gujarati", sans-serif'
    ctx.fillText('ભવ્યાતિભવ્ય', 28, BIG_Y + 56)
    ctx.fillText('ઉજવણીમાં...', 28, BIG_Y + 96)

    // User name
    if (name) {
      ctx.fillStyle = '#D4A017'
      ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif'
      let displayName = name
      while (ctx.measureText(displayName).width > TEXT_MAX_W && displayName.length > 3) {
        displayName = displayName.slice(0, -1)
      }
      if (displayName !== name) displayName += '...'
      ctx.fillText(displayName, 28, BIG_Y + 140)
    }

    // Selfie circle — outer glow
    const glowG = ctx.createRadialGradient(SELFIE_CX, SELFIE_CY, SELFIE_R - 10, SELFIE_CX, SELFIE_CY, SELFIE_R + 25)
    glowG.addColorStop(0, 'rgba(255,180,0,0.4)')
    glowG.addColorStop(1, 'transparent')
    ctx.fillStyle = glowG
    ctx.beginPath()
    ctx.arc(SELFIE_CX, SELFIE_CY, SELFIE_R + 25, 0, Math.PI * 2)
    ctx.fill()

    // Gold ring
    ctx.strokeStyle = '#C8960C'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(SELFIE_CX, SELFIE_CY, SELFIE_R + 4, 0, Math.PI * 2)
    ctx.stroke()

    // Selfie clip
    if (selfieUrl) {
      try {
        const sImg = await loadImg(selfieUrl)
        ctx.save()
        ctx.beginPath()
        ctx.arc(SELFIE_CX, SELFIE_CY, SELFIE_R, 0, Math.PI * 2)
        ctx.clip()
        const sz = SELFIE_R * 2
        const aspect = sImg.width / sImg.height
        let dw = sz, dh = sz, dx = SELFIE_CX - SELFIE_R, dy = SELFIE_CY - SELFIE_R
        if (aspect > 1) { dw = sz * aspect; dx -= (dw - sz) / 2 }
        else { dh = sz / aspect; dy -= (dh - sz) / 2 }
        ctx.drawImage(sImg, dx, dy, dw, dh)
        ctx.restore()
      } catch { drawAvatarFallback(ctx, SELFIE_CX, SELFIE_CY, SELFIE_R) }
    } else {
      drawAvatarFallback(ctx, SELFIE_CX, SELFIE_CY, SELFIE_R)
    }

    // ── 9. YELLOW BOTTOM BAR ─────────────────────────────────────────────────
    const BAR_Y = H - 88
    const barGrad = ctx.createLinearGradient(22, BAR_Y, W - 22, H - 22)
    barGrad.addColorStop(0, '#FFC107')
    barGrad.addColorStop(0.5, '#FFD54F')
    barGrad.addColorStop(1, '#FFC107')
    ctx.fillStyle = barGrad
    ctx.fillRect(22, BAR_Y, W - 44, 64)

    // Bottom bar border
    ctx.strokeStyle = '#C8960C'
    ctx.lineWidth = 2
    ctx.strokeRect(22, BAR_Y, W - 44, 64)

    ctx.fillStyle = '#4A0000'
    ctx.font = 'bold 22px "Noto Sans Gujarati", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('નિ. : પાલી. બ્ર. સ. પ. યુ. સ.', W / 2, BAR_Y + 41)

    // Export
    const url = canvas.toDataURL('image/png')
    onReady(url)
  }, [name, mobile, selfieUrl, onReady])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
      />
    </div>
  )
}

function drawAvatarFallback(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#FFF8E7'
  ctx.fill()
  ctx.strokeStyle = 'rgba(200,150,12,0.4)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#C8960C'
  ctx.font = `${r * 0.7}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🙏', cx, cy)
  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}
