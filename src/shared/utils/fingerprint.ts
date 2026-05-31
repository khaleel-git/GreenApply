export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(m\/?f\/?d\)|\(w\/?m\/?d\)|\(d\/?f\/?m\)|\(all\s*genders?\)/gi, '')
    .replace(/\b(senior|junior|lead|principal|staff|associate|intern)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fingerprintJob(company: string, title: string, location: string): Promise<string> {
  const input = `${company.toLowerCase().trim()}|${normalizeTitle(title)}|${location.toLowerCase().trim()}`
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}
