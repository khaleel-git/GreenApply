export const LANGUAGE_PATTERNS: RegExp[] = [
  /\b(German|Deutsch|Deutschkenntnisse)\s*(C2|C1|B2|B1|A2|A1|native|Muttersprachler|fließend|fluent|verhandlungssicher)\b/i,
  /\b(English|Englisch)\s*(C2|C1|B2|B1|native|fluent|proficient|business)\b/i,
  /\b(French|Französisch)\s*(C2|C1|B2|native|fluent)\b/i,
  /\b(Spanish|Spanisch)\s*(C2|C1|B2|native|fluent)\b/i,
  /(German|Deutsch(kenntnisse)?)\s+(?:ist\s+)?(?:erforderlich|required|mandatory|Voraussetzung)/i,
  /(?:Sprache|language)\s*(?:requirements?|Anforderungen?):?\s*(German|Deutsch|English|Englisch)/i,
]

export const VISA_PATTERNS: Array<{ pattern: RegExp; result: boolean | 'unknown' }> = [
  { pattern: /visa\s*sponsorship\s*(is\s*)?(not\s*)?(available|provided|offered|possible)/i, result: false },
  { pattern: /we\s*(do not|don.t|cannot|are unable to)\s*sponsor/i, result: false },
  { pattern: /no\s*(visa\s*)?sponsorship/i, result: false },
  { pattern: /we\s*(offer|provide|support|can\s+offer)\s*visa\s*sponsorship/i, result: true },
  { pattern: /sponsorship\s*(is\s*)?(available|possible|provided)/i, result: true },
  { pattern: /authorized?\s*to\s*work\s*in\s*(germany|deutschland|the\s*eu)\b/i, result: false },
  { pattern: /current(ly)?\s*(valid\s*)?(work\s*permit|work\s*authorization|Arbeitserlaubnis)\s*(required|needed)/i, result: false },
  { pattern: /EU\s*(citizen|citizenship|national|work\s*permit)\s*required/i, result: false },
  { pattern: /must\s*(already\s*)?have\s*(a\s*)?(valid\s*)?(work\s*permit|right\s*to\s*work)/i, result: false },
  { pattern: /no\s*relocation\s*support/i, result: 'unknown' },
  { pattern: /Arbeitserlaubnis\s*(erforderlich|required|notwendig)/i, result: false },
  { pattern: /Aufenthaltstitel|Niederlassungserlaubnis/i, result: false },
]

export const EMPLOYMENT_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\b(Werkstudent(in)?|Working[\s-]Student|Studentische[\s]Hilfskraft|Student[\s]Assistant|HiWi)\b/i, type: 'werkstudent' },
  { pattern: /\b(Internship|Praktikum|Pflichtpraktikum|Praktikant(in)?|Intern)\b/i, type: 'internship' },
  { pattern: /\b(Thesis|Bachelor[\s-]?arbeit|Master[\s-]?arbeit|Abschlussarbeit|Diplomarbeit)\b/i, type: 'thesis' },
  { pattern: /\b(Full[\s-]?Time|Vollzeit|Vollzeitstelle)\b/i, type: 'full-time' },
  { pattern: /\b(Part[\s-]?Time|Teilzeit|Teilzeitstelle)\b/i, type: 'part-time' },
  { pattern: /\b(Freelance|Freiberuflich|Freiberufler|Contract|Contractor)\b/i, type: 'freelance' },
]

export const EXPERIENCE_PATTERNS: Array<{ pattern: RegExp; groupIndex: number }> = [
  { pattern: /(\d+)\+?\s*(?:years?|Jahre?)\s*(?:of\s*)?(?:professional\s*)?(?:experience|Erfahrung)/i, groupIndex: 1 },
  { pattern: /(?:minimum|mindestens|at\s*least)\s*(\d+)\s*(?:years?|Jahre?)/i, groupIndex: 1 },
  { pattern: /(\d+)[–\-]\d+\s*(?:years?|Jahre?)\s*(?:of\s*)?(?:experience|Erfahrung)/i, groupIndex: 1 },
  { pattern: /(\d+)\s*(?:years?|Jahre?)\+?\s*(?:of\s*)?(?:relevant\s*)?(?:experience|Erfahrung)/i, groupIndex: 1 },
]

export const SALARY_PATTERNS: RegExp[] = [
  /(?:salary|compensation|Gehalt|Vergütung)[:\s]*(?:€|EUR|USD|\$)?\s*(\d[\d,\.]+)\s*(?:–|-)\s*(\d[\d,\.]+)\s*(?:€|EUR|USD|\$)?(?:\s*(?:per|\/|pro)\s*(year|month|annum|Jahr|Monat|p\.?a\.?))?/i,
  /(?:€|EUR)\s*(\d[\d,\.]+)(?:\s*(?:–|-)\s*(\d[\d,\.]+))?(?:\s*(?:per|\/|pro)\s*(year|month|Jahr|Monat|p\.?a\.?))?/i,
  /(\d[\d,\.]+)\s*(?:–|-)\s*(\d[\d,\.]+)\s*(?:€|EUR)(?:\s*(?:per|\/|pro)\s*(year|month|Jahr|Monat|p\.?a\.?))?/i,
]

export const REMOTE_PATTERNS: Array<{ pattern: RegExp; value: boolean | 'hybrid' }> = [
  { pattern: /\b(fully?\s*remote|100%\s*remote|remote[\s-]first|remote\s*work|home\s*office\s*possible)\b/i, value: true },
  { pattern: /\b(hybrid|teilweise\s*remote|remote[\s-]optional|2[\s-]days?\s*remote)\b/i, value: 'hybrid' },
  { pattern: /\b(on[\s-]?site|onsite|in[\s-]?office|vor\s*Ort|Präsenz(pflicht)?|kein\s*home[\s-]?office)\b/i, value: false },
]

export const JOB_URL_PATTERNS = [
  '/jobs/', '/job/', '/careers/', '/career/', '/karriere/', '/stellenangebote/',
  '/vacancies/', '/vacancy/', '/position/', '/positions/', '/offres/', '/offre/',
  '/hiring/', '/work-with-us/', '/join-us/', '/opening/', '/openings/',
  '/stellenanzeige/', '/jobangebote/',
]
