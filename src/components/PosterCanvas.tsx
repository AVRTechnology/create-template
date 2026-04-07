'use client'

import { useEffect, useRef } from 'react'

import {
  POSTER_DESIGN_SIZE,
  getPosterTemplate,
  type PosterTemplate,
  type PosterTemplateId,
} from '@/lib/posterTemplates'

interface PosterCanvasProps {
  templateId: PosterTemplateId
  name: string
  selfieUrl: string
  onReady: (dataUrl: string) => void
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

function loadImg(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return cached

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      imageCache.delete(src)
      reject(new Error(`Failed to load image: ${src}`))
    }
    img.src = src
  })

  imageCache.set(src, promise)
  return promise
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex

  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const NAME_START_SIZE = 34   // design-space px, max font for name
const NAME_MIN_SINGLE = 24   // design-space px, min before wrapping
const NAME_WRAP_SIZE = 28    // design-space px when word-wrapping
const NAME_LINE_H = 36       // design-space px line-height for wrapped text

function wrapWords(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawTextFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  startSize: number,
  minSize: number,
  color: string
) {
  let size = startSize
  while (size >= minSize) {
    ctx.font = `800 ${Math.round(size)}px "Noto Sans Gujarati", sans-serif`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 2
  }

  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const targetAspect = width / height
  const imageAspect = img.width / img.height

  let drawWidth = width
  let drawHeight = height
  let drawX = x
  let drawY = y

  if (imageAspect > targetAspect) {
    drawHeight = height
    drawWidth = height * imageAspect
    drawX = x - (drawWidth - width) / 2
  } else {
    drawWidth = width
    drawHeight = width / imageAspect
    drawY = y - (drawHeight - height) / 2
  }

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
}

async function drawSelfie(
  ctx: CanvasRenderingContext2D,
  selfieUrl: string,
  templateId: PosterTemplateId,
  scaleX: number,
  scaleY: number,
  /** Design-space px: nudge photo right when name is long (stays inside canvas) */
  selfieCxOffsetDesign: number
) {
  const template = getPosterTemplate(templateId)
  const cxDesign = Math.min(
    POSTER_DESIGN_SIZE.width - template.selfie.radius - 8,
    Math.max(template.selfie.radius + 8, template.selfie.cx + selfieCxOffsetDesign)
  )
  const cx = cxDesign * scaleX
  const cy = template.selfie.cy * scaleY
  const radius = template.selfie.radius * Math.min(scaleX, scaleY)

  ctx.save()
  ctx.fillStyle = hexToRgba(template.primaryColor, 0.18)
  ctx.beginPath()
  ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = template.primaryColor
  ctx.lineWidth = 6 * Math.min(scaleX, scaleY)
  ctx.beginPath()
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = template.secondaryColor
  ctx.lineWidth = 3 * Math.min(scaleX, scaleY)
  ctx.beginPath()
  ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2)
  ctx.stroke()

  if (!selfieUrl) {
    ctx.fillStyle = template.primaryColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    drawTextFit(
      ctx,
      'તમારો ફોટો',
      cx,
      cy,
      radius * 1.45,
      28 * Math.min(scaleX, scaleY),
      16 * Math.min(scaleX, scaleY),
      template.primaryColor
    )
    ctx.textBaseline = 'alphabetic'
    return
  }

  const selfie = await loadImg(selfieUrl)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2)
  ctx.clip()
  drawImageCover(ctx, selfie, cx - radius, cy - radius, radius * 2, radius * 2)
  ctx.restore()
}

/**
 * Wider name badge when text is long; keep inside banner, left of selfie.
 * Long names: first shrink font (34→24px design), then word-wrap to 2 lines.
 */
function layoutNameBox(
  ctx: CanvasRenderingContext2D,
  template: PosterTemplate,
  name: string
): { boxX: number; boxY: number; boxW: number; boxH: number; radius: number; lines: string[]; fontSize: number; selfieCxOffsetDesign: number } {
  const { nameBox: nb, selfie } = template
  const label = (name.trim() || 'તમારું નામ').slice(0, 40)
  const maxRight = selfie.cx - selfie.radius - 14
  const minLeft = 215
  const pad = 28
  const textMaxW = maxRight - nb.x - pad

  // Phase 1: shrink font from NAME_START_SIZE down to NAME_MIN_SINGLE for single line
  let fontSize = NAME_START_SIZE
  while (fontSize > NAME_MIN_SINGLE) {
    ctx.font = `800 ${fontSize}px "Noto Sans Gujarati", sans-serif`
    if (ctx.measureText(label).width <= textMaxW) break
    fontSize -= 2
  }
  ctx.font = `800 ${fontSize}px "Noto Sans Gujarati", sans-serif`

  if (ctx.measureText(label).width <= textMaxW) {
    // Fits on single line — size the box snugly
    const minFontWidth = ctx.measureText(label).width + pad
    let boxW = Math.max(nb.width, Math.min(minFontWidth, maxRight - nb.x))
    let boxX = nb.x
    if (boxX + boxW > maxRight) boxX = Math.max(minLeft, maxRight - boxW)
    boxW = Math.min(boxW, maxRight - boxX)
    boxX = Math.max(minLeft, Math.min(boxX, maxRight - boxW))
    return {
      boxX, boxY: nb.y, boxW, boxH: nb.height,
      radius: nb.radius, lines: [label], fontSize,
      selfieCxOffsetDesign: label.length >= 26 ? 8 : 0,
    }
  }

  // Phase 2: word-wrap to 2 lines at NAME_WRAP_SIZE
  fontSize = NAME_WRAP_SIZE
  ctx.font = `800 ${fontSize}px "Noto Sans Gujarati", sans-serif`
  const lines = wrapWords(ctx, label, textMaxW).slice(0, 2)
  const boxH = NAME_LINE_H * 2 + 20   // two lines + vertical padding

  return {
    boxX: nb.x, boxY: nb.y,
    boxW: Math.min(maxRight - nb.x, maxRight - minLeft),
    boxH,
    radius: nb.radius, lines, fontSize,
    selfieCxOffsetDesign: 8,
  }
}

function drawNameBox(
  ctx: CanvasRenderingContext2D,
  template: PosterTemplate,
  layout: { boxX: number; boxY: number; boxW: number; boxH: number; radius: number; lines: string[]; fontSize: number },
  scaleX: number,
  scaleY: number
) {
  const scale = Math.min(scaleX, scaleY)
  const { nameBox } = template
  const x = layout.boxX * scaleX
  const y = layout.boxY * scaleY
  const width = layout.boxW * scaleX
  const height = layout.boxH * scaleY
  const radius = layout.radius * scale

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)'
  ctx.shadowBlur = 18 * scale
  ctx.fillStyle = hexToRgba(template.primaryColor, 0.94)
  roundRect(ctx, x, y, width, height, radius)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = template.secondaryColor
  ctx.lineWidth = 4 * scale
  roundRect(ctx, x, y, width, height, radius)
  ctx.stroke()

  const { lines, fontSize } = layout
  const fontPx = Math.round(fontSize * scale)
  ctx.font = `800 ${fontPx}px "Noto Sans Gujarati", sans-serif`
  ctx.fillStyle = nameBox.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const cx = x + width / 2 + 6 * scale
  if (lines.length === 1) {
    ctx.fillText(lines[0], cx, y + height / 2 + 4 * scale)
  } else {
    // Two lines: space evenly inside the box
    const lineH = NAME_LINE_H * scale
    const totalH = lines.length * lineH
    const startY = y + height / 2 - totalH / 2 + lineH / 2
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cx, startY + i * lineH + 4 * scale)
    }
  }

  ctx.textBaseline = 'alphabetic'
}

export default function PosterCanvas({ templateId, name, selfieUrl, onReady }: PosterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let active = true

    const renderPoster = async () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const template = getPosterTemplate(templateId)
      const background = await loadImg(template.image.src)
      if (!active) return

      const width = background.naturalWidth || template.image.width || POSTER_DESIGN_SIZE.width
      const height = background.naturalHeight || template.image.height || POSTER_DESIGN_SIZE.height
      canvas.width = width
      canvas.height = height

      try {
        await document.fonts.ready
      } catch {
        // Ignore font readiness issues and render with available fallback fonts.
      }

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(background, 0, 0, width, height)

      const scaleX = width / POSTER_DESIGN_SIZE.width
      const scaleY = height / POSTER_DESIGN_SIZE.height

      const layout = layoutNameBox(ctx, template, name)
      drawNameBox(ctx, template, layout, scaleX, scaleY)
      await drawSelfie(ctx, selfieUrl, templateId, scaleX, scaleY, layout.selfieCxOffsetDesign)

      if (!active) return
      onReady(canvas.toDataURL('image/png'))
    }

    renderPoster().catch(() => {
      if (active) onReady('')
    })

    return () => {
      active = false
    }
  }, [name, onReady, selfieUrl, templateId])

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
      />
    </div>
  )
}
