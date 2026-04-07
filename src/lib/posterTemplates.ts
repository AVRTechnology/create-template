import type { StaticImageData } from 'next/image'

import page1 from '@/assets/images/page_1.png'
import page2 from '@/assets/images/page_2.png'

export type PosterTemplateId = 'page-1' | 'page-2'

export const POSTER_DESIGN_SIZE = {
  width: 1024,
  height: 1024,
} as const

type NameBoxConfig = {
  x: number
  y: number
  width: number
  height: number
  radius: number
  textColor: string
}

type SelfieConfig = {
  cx: number
  cy: number
  radius: number
}

export interface PosterTemplate {
  id: PosterTemplateId
  label: string
  subtitle: string
  image: StaticImageData
  primaryColor: string
  secondaryColor: string
  nameBox: NameBoxConfig
  selfie: SelfieConfig
}

export const posterTemplates: PosterTemplate[] = [
  {
    id: 'page-1',
    label: 'Template 1',
    subtitle: 'Classic blue',
    image: page1,
    primaryColor: '#D52227',
    secondaryColor: '#0B5C95',
    nameBox: {
      x: 336,
      y: 776,
      width: 360,
      height: 68,
      radius: 16,
      textColor: '#FFFFFF',
    },
    selfie: {
      cx: 858,
      cy: 821,
      radius: 106,
    },
  },
  {
    id: 'page-2',
    label: 'Template 2',
    subtitle: 'Golden special',
    image: page2,
    primaryColor: '#7B2F10',
    secondaryColor: '#F9D414',
    nameBox: {
      x: 330,
      y: 802,
      width: 378,
      height: 72,
      radius: 18,
      textColor: '#FFFFFF',
    },
    selfie: {
      cx: 858,
      cy: 832,
      radius: 108,
    },
  },
]

export function getPosterTemplate(id: PosterTemplateId) {
  return posterTemplates.find(template => template.id === id) ?? posterTemplates[0]
}
