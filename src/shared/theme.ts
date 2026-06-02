export type Theme = 'light' | 'dark'

export interface ThemeColors {
  bg: string
  bgSecondary: string
  bgTertiary: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  shadow: string
  inputBg: string
  inputBorder: string
}

export const LIGHT: ThemeColors = {
  bg:            '#ffffff',
  bgSecondary:   '#f9fafb',
  bgTertiary:    '#f3f4f6',
  text:          '#111827',
  textSecondary: '#374151',
  textMuted:     '#6b7280',
  border:        '#e5e7eb',
  shadow:        '0 4px 24px rgba(0,0,0,0.12)',
  inputBg:       '#ffffff',
  inputBorder:   '#d1d5db',
}

export const DARK: ThemeColors = {
  bg:            '#1e2533',
  bgSecondary:   '#151d2b',
  bgTertiary:    '#253044',
  text:          '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted:     '#94a3b8',
  border:        '#2d3f57',
  shadow:        '0 4px 24px rgba(0,0,0,0.5)',
  inputBg:       '#253044',
  inputBorder:   '#3d5066',
}

export function themeColors(t: Theme): ThemeColors {
  return t === 'dark' ? DARK : LIGHT
}
