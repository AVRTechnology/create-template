'use client'

import { useEffect, useRef, useCallback } from 'react'

interface PosterCanvasProps {
  name: string
  mobile: string
  selfieUrl: string
  onReady: (dataUrl: string) => void
}

export default function PosterCanvas({ name, mobile, selfieUrl, onReady }: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const drawPoster = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 500
    const H = 700
    canvas.width = W
    canvas.height = H

    // --- Background gradient ---
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, '#FF6B00')
    bg.addColorStop(0.4, '#CC3300')
    bg.addColorStop(0.7, '#8B0000')
    bg.addColorStop(1, '#3D0000')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // --- Diamond pattern overlay ---
    ctx.save()
    ctx.globalAlpha = 0.07
    ctx.fillStyle = '#FFD700'
    for (let x = 0; x < W; x += 60) {
      for (let y = 0; y < H; y += 60) {
        ctx.beginPath()
        ctx.moveTo(x + 30, y)
        ctx.lineTo(x + 60, y + 30)
        ctx.lineTo(x + 30, y + 60)
        ctx.lineTo(x, y + 30)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.restore()

    // --- Top decorative border ---
    ctx.save()
    const topGrad = ctx.createLinearGradient(0, 0, W, 0)
    topGrad.addColorStop(0, 'transparent')
    topGrad.addColorStop(0.5, '#FFD700')
    topGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, W, 4)
    ctx.fillRect(0, 8, W, 2)
    ctx.restore()

    // --- OM symbol ---
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 180px serif'
    ctx.textAlign = 'center'
    ctx.fillText('ॐ', W / 2, 250)
    ctx.restore()

    // --- Title ---
    ctx.save()
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 36px serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 10
    ctx.fillText('परशुराम शोभायात्रा', W / 2, 52)
    ctx.restore()

    // --- Sub title ---
    ctx.save()
    ctx.fillStyle = '#FFE082'
    ctx.font = '500 14px Poppins, sans-serif'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '4px'
    ctx.fillText('PARSHURAM SHOBHAYATRA 2025', W / 2, 76)
    ctx.restore()

    // --- Gold divider line ---
    ctx.save()
    const divGrad = ctx.createLinearGradient(0, 0, W, 0)
    divGrad.addColorStop(0, 'transparent')
    divGrad.addColorStop(0.5, '#FFD700')
    divGrad.addColorStop(1, 'transparent')
    ctx.strokeStyle = divGrad
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(40, 90)
    ctx.lineTo(W - 40, 90)
    ctx.stroke()
    ctx.restore()

    // --- Selfie circle ---
    const CIRCLE_X = W / 2
    const CIRCLE_Y = 240
    const CIRCLE_R = 105

    // Outer glow ring
    ctx.save()
    const glowGrad = ctx.createRadialGradient(CIRCLE_X, CIRCLE_Y, CIRCLE_R - 20, CIRCLE_X, CIRCLE_Y, CIRCLE_R + 30)
    glowGrad.addColorStop(0, 'rgba(255, 165, 0, 0.5)')
    glowGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_R + 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Gold border
    ctx.save()
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_R + 5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Inner ring
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_R + 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Selfie image clipped to circle
    try {
      const img = await loadImage(selfieUrl)
      ctx.save()
      ctx.beginPath()
      ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_R, 0, Math.PI * 2)
      ctx.clip()
      const size = CIRCLE_R * 2
      const sx = CIRCLE_X - CIRCLE_R
      const sy = CIRCLE_Y - CIRCLE_R

      // Cover crop
      const imgAspect = img.width / img.height
      let drawW = size, drawH = size
      let drawX = sx, drawY = sy
      if (imgAspect > 1) {
        drawH = size
        drawW = size * imgAspect
        drawX = sx - (drawW - size) / 2
      } else {
        drawW = size
        drawH = size / imgAspect
        drawY = sy - (drawH - size) / 2
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
      ctx.restore()
    } catch {
      // Fallback avatar
      ctx.save()
      ctx.beginPath()
      ctx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_R, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fill()
      ctx.fillStyle = 'white'
      ctx.font = '80px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🙏', CIRCLE_X, CIRCLE_Y)
      ctx.restore()
    }

    // --- Bottom overlay gradient ---
    const bottomGrad = ctx.createLinearGradient(0, 380, 0, H)
    bottomGrad.addColorStop(0, 'transparent')
    bottomGrad.addColorStop(0.4, 'rgba(0,0,0,0.7)')
    bottomGrad.addColorStop(1, 'rgba(0,0,0,0.95)')
    ctx.fillStyle = bottomGrad
    ctx.fillRect(0, 380, W, H - 380)

    // --- "I am joining" banner ---
    ctx.save()
    ctx.fillStyle = 'rgba(255, 107, 0, 0.9)'
    roundRect(ctx, 60, 380, W - 120, 48, 8)
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 18px Poppins, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('🚩 मैं परशुराम शोभायात्रा में सम्मिलित हो रहा हूँ 🚩', W / 2, 411)
    ctx.restore()

    // Smaller: "I am joining Parshuram Yatra"
    ctx.save()
    ctx.fillStyle = '#FFE082'
    ctx.font = '500 13px Poppins, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('I AM JOINING PARSHURAM SHOBHAYATRA', W / 2, 448)
    ctx.restore()

    // --- Name ---
    ctx.save()
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 32px Poppins, serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 8
    // Truncate long names
    let displayName = name
    while (ctx.measureText(displayName).width > W - 80 && displayName.length > 5) {
      displayName = displayName.slice(0, -1)
    }
    if (displayName !== name) displayName += '...'
    ctx.fillText(displayName, W / 2, 510)
    ctx.restore()

    // --- Mobile ---
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '500 18px Poppins, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`📱 ${mobile}`, W / 2, 545)
    ctx.restore()

    // --- Decorative divider ---
    ctx.save()
    const midDivGrad = ctx.createLinearGradient(0, 0, W, 0)
    midDivGrad.addColorStop(0, 'transparent')
    midDivGrad.addColorStop(0.5, 'rgba(255,215,0,0.5)')
    midDivGrad.addColorStop(1, 'transparent')
    ctx.strokeStyle = midDivGrad
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(60, 565)
    ctx.lineTo(W - 60, 565)
    ctx.stroke()
    ctx.restore()

    // --- Jai Parshuram ---
    ctx.save()
    ctx.fillStyle = '#FF8C00'
    ctx.font = 'bold 24px serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚔️ जय परशुराम ⚔️', W / 2, 600)
    ctx.restore()

    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '12px Poppins, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Parshuram Shobhayatra 2025', W / 2, 624)
    ctx.restore()

    // --- Bottom gold border ---
    ctx.save()
    const botGrad = ctx.createLinearGradient(0, 0, W, 0)
    botGrad.addColorStop(0, 'transparent')
    botGrad.addColorStop(0.5, '#FFD700')
    botGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = botGrad
    ctx.fillRect(0, H - 4, W, 4)
    ctx.fillRect(0, H - 8, W, 2)
    ctx.restore()

    // Export
    const dataUrl = canvas.toDataURL('image/png')
    onReady(dataUrl)
  }, [name, mobile, selfieUrl, onReady])

  useEffect(() => {
    drawPoster()
  }, [drawPoster])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        }}
      />
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
