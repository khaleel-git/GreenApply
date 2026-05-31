export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
