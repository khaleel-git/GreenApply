import type { DegreeLevel } from '../../types/profile'

// ─── Degree level detection ───────────────────────────────────────────────────

const DEGREE_PATTERNS: Array<{ pattern: RegExp; level: DegreeLevel }> = [
  { pattern: /\b(b\.?sc\.?|b\.?eng\.?|b\.?a\.?|bachelor|bachelorstudium)\b/i, level: 'bachelor_student' },
  { pattern: /\b(m\.?sc\.?|m\.?eng\.?|m\.?a\.?|master|masterstudium)\b/i,    level: 'master_student' },
  { pattern: /\b(doktor|ph\.?d\.?|dissertation|promotion)\b/i,                level: 'phd_student' },
]

export function detectDegreeHint(text: string): DegreeLevel | undefined {
  for (const { pattern, level } of DEGREE_PATTERNS) {
    if (pattern.test(text)) return level
  }
  return undefined
}

// ─── University detection ─────────────────────────────────────────────────────

export function detectUniversity(text: string): string | undefined {
  const lines = text.split('\n').map(l => l.trim())
  // University name typically appears in the first 40 lines
  for (const line of lines.slice(0, 40)) {
    if (line.length < 5 || line.length > 100) continue
    if (/\b(universit[äy]t?|technische\s*hochschule|hochschule|fachhochschule|university|institute\s*of\s*technology)\b/i.test(line)) {
      return line.replace(/^[^A-Za-zÄÖÜäöü]+/, '').trim()
    }
  }
  return undefined
}

// ─── Course extraction ────────────────────────────────────────────────────────

const NOISE_LINES = /\b(matrikelnummer|matrikel-nr|student.?id|geburtsdatum|date\s*of\s*birth|name\s*:|email|adresse|address|tel\s*:|fax|seite\s*\d|page\s*\d|stand\s*:|issued|datum|immatrikulation|zeugnisdatum|unterschrift|signature|siegel|stamp|rector|rektor|dean|dekan)\b/i

const GRADE_SUFFIX = /\s+([1-5][.,]\d{1,2}|[A-D][+-]?|sehr\s+gut|gut|befriedigend|ausreichend|bestanden|passed|fail|nicht\s+bestanden)\s*$/i

const ECTS_PATTERN = /\s+\d+[.,]?\d*\s*(ECTS|LP|CP|SWS|credits?)\b/gi

// Minimum word count and length for something to qualify as a course name
function looksLikeCourse(s: string): boolean {
  if (s.length < 8 || s.length > 110) return false
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length < 2) return false
  // Reject lines that are mostly numbers
  const digitRatio = (s.match(/\d/g)?.length ?? 0) / s.length
  if (digitRatio > 0.4) return false
  // Reject obvious header/footer patterns
  if (NOISE_LINES.test(s)) return false
  // Must start with a letter (not a digit or symbol)
  if (!/^[A-Za-zÄÖÜäöüß]/.test(s)) return false
  return true
}

export function extractCoursesFromText(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const courses: string[] = []
  const seen = new Set<string>()

  for (const rawLine of lines) {
    // Remove ECTS/credit info and trailing grades to isolate the course name
    let line = rawLine
      .replace(ECTS_PATTERN, '')
      .replace(GRADE_SUFFIX, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    // Also try to strip leading codes like "IV 2023-WS" or "12345"
    line = line.replace(/^[A-Z0-9-]{2,10}\s+/g, '').trim()

    if (!looksLikeCourse(line)) continue

    const key = line.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      courses.push(line)
    }
  }

  return courses.slice(0, 80)  // cap at 80 to avoid bloat
}

// ─── Field of study detection ─────────────────────────────────────────────────

const FIELD_PATTERNS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /\b(informatik|computer\s*science|software\s*engineering)\b/i,             field: 'Computer Science' },
  { pattern: /\b(data\s*science|data\s*engineering|data\s*analytics)\b/i,               field: 'Data Science' },
  { pattern: /\b(elektrotechnik|electrical\s*engineering|electronic)\b/i,               field: 'Electrical Engineering' },
  { pattern: /\b(maschinenbau|mechanical\s*engineering)\b/i,                            field: 'Mechanical Engineering' },
  { pattern: /\b(werkstoffwissenschaft|materials?\s*science|materialwissenschaft)\b/i,  field: 'Materials Science' },
  { pattern: /\b(physik|physics)\b/i,                                                   field: 'Physics' },
  { pattern: /\b(mathematik|mathematics|applied\s*math)\b/i,                           field: 'Mathematics' },
  { pattern: /\b(chemie|chemistry)\b/i,                                                 field: 'Chemistry' },
  { pattern: /\b(biologie|biology|bioinformatik|bioinformatics)\b/i,                   field: 'Biology' },
  { pattern: /\b(wirtschaftsinformatik|information\s*systems|business\s*informatics)\b/i, field: 'Business Informatics' },
  { pattern: /\b(betriebswirtschaft|business\s*administration|bwl)\b/i,                field: 'Business Administration' },
  { pattern: /\b(erneuerbare\s*energien|renewable\s*energy|energy\s*engineering)\b/i,  field: 'Renewable Energy Engineering' },
  { pattern: /\b(luft.?\s*raumfahrt|aerospace|aeronautical)\b/i,                       field: 'Aerospace Engineering' },
  { pattern: /\b(bauingenieur|civil\s*engineering)\b/i,                                 field: 'Civil Engineering' },
  { pattern: /\b(wirtschaftsingenieur|industrial\s*engineering)\b/i,                   field: 'Industrial Engineering' },
  { pattern: /\b(medizin|medicine|medical)\b/i,                                         field: 'Medicine' },
  { pattern: /\b(psychologie|psychology)\b/i,                                           field: 'Psychology' },
  { pattern: /\b(humanities|geisteswissenschaft|kulturwissenschaft)\b/i,               field: 'Humanities' },
]

export function detectFieldOfStudy(text: string): string | undefined {
  for (const { pattern, field } of FIELD_PATTERNS) {
    if (pattern.test(text)) return field
  }
  return undefined
}

// ─── Certification extraction ─────────────────────────────────────────────────

const CERT_PLATFORMS = /\b(coursera|udemy|edx|linkedin\s+learning|pluralsight|datacamp|udacity|codecademy|google|aws|amazon|microsoft|azure|oracle|cisco|comptia|pmi|scrum|salesforce|tableau|futurelearn|harvard|stanford|deeplearning\.?ai)\b/i

const CERT_TITLE_PATTERNS: RegExp[] = [
  /certificate\s+(?:of\s+)?(?:completion|achievement|attendance|participation|proficiency|excellence)\s+in\s+(.+)/i,
  /certified\s+(.{5,100})/i,
  /certification\s+in\s+(.+)/i,
  /has\s+(?:successfully\s+)?completed\s+(.{5,120})/i,
  /awarded\s+(?:to\s+\S+\s+for\s+)?(.{5,120})/i,
  /this\s+is\s+to\s+certify\s+that\s+\S+\s+has\s+completed\s+(.+)/i,
]

export function extractCertificationsFromText(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const certs: string[] = []
  const seen = new Set<string>()

  function add(s: string) {
    const clean = s.replace(/\s{2,}/g, ' ').trim()
    if (clean.length < 6 || clean.length > 150) return
    const key = clean.toLowerCase()
    if (!seen.has(key)) { seen.add(key); certs.push(clean) }
  }

  // Look for structured title patterns in first 40 lines
  for (const line of lines.slice(0, 40)) {
    for (const pat of CERT_TITLE_PATTERNS) {
      const m = line.match(pat)
      if (m?.[1]) { add(m[1]); break }
    }
  }

  // If nothing found, look near platform mentions
  if (certs.length === 0) {
    for (let i = 0; i < Math.min(lines.length, 60); i++) {
      if (!CERT_PLATFORMS.test(lines[i])) continue
      for (let j = Math.max(0, i - 4); j <= Math.min(lines.length - 1, i + 4); j++) {
        const nearby = lines[j]
        if (nearby.length > 8 && nearby.length < 150 && !CERT_PLATFORMS.test(nearby) && !/^\d/.test(nearby)) {
          add(nearby)
        }
      }
      break
    }
  }

  // Fallback: first meaningful line in the document as the cert name
  if (certs.length === 0) {
    for (const line of lines.slice(0, 15)) {
      if (line.length >= 10 && line.length <= 150 && /[a-zA-Z]/.test(line)) {
        add(line)
        break
      }
    }
  }

  return certs
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export interface TranscriptParseResult {
  courses: string[]
  certifications: string[]
  university?: string
  degreeHint?: DegreeLevel
  fieldOfStudy?: string
}

export function parseTranscript(rawText: string): TranscriptParseResult {
  return {
    courses: extractCoursesFromText(rawText),
    certifications: extractCertificationsFromText(rawText),
    university: detectUniversity(rawText),
    degreeHint: detectDegreeHint(rawText),
    fieldOfStudy: detectFieldOfStudy(rawText),
  }
}
