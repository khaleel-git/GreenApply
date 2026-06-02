// Languages we recognise. `rx` is matched globally to find every mention; the
// extractor then inspects a small window around each mention for a level or a
// fluency/requirement signal. Keeping the language match separate from the level
// match is what lets us catch "Good German skills (at least B2 …)" — where the
// level does not sit immediately after the language name.
export const LANGUAGE_DEFS: { canonical: string; rx: RegExp }[] = [
  // "Deutsch" alone is NOT matched (nav/language-switcher false positives).
  // High-confidence locution phrases ("auf Deutsch", "fließend Deutsch", …) are
  // exceptions — they are unambiguous requirement signals even without a compound.
  { canonical: 'German',  rx: /\b(?:German|Deutsch(?:kenntnisse|sprachkenntnisse)|deutschen?\s+Sprache(?:kenntnisse)?|auf\s+Deutsch|in\s+(?:German|Deutsch)|flie(?:ß|ss)end(?:e[rnms]?)?\s+Deutsch(?:kenntnisse)?|Deutsch\s+(?:in\s+Wort\s+und\s+Schrift|als\s+Muttersprache|und\s+Englisch)|(?:verhandlungs|business)[-\s]?sicher(?:e[rnms]?)?\s+(?:auf\s+)?Deutsch)\b/gi },
  { canonical: 'English', rx: /\b(?:English|Englisch(?:kenntnisse)?|auf\s+Englisch|in\s+English|flie(?:ß|ss)end(?:e[rnms]?)?\s+Englisch(?:kenntnisse)?|Englisch\s+(?:in\s+Wort\s+und\s+Schrift|als\s+Muttersprache|und\s+Deutsch)|Deutsch\s+und\s+Englisch)\b/gi },
  { canonical: 'French',  rx: /\b(?:French|Französisch|Franzoesisch)\b/gi },
  { canonical: 'Spanish', rx: /\b(?:Spanish|Spanisch)\b/gi },
]

// Signals looked for in the window around a language mention.
export const CEFR_LEVEL_RE = /\b(C2|C1|B2|B1|A2|A1)\b/i
export const NATIVE_LEVEL_RE = /\b(native|mother\s*tongue|Muttersprach(?:e|ler(?:in)?)?)\b/i
export const FLUENT_LEVEL_RE = /\b(fluent|fließend|fliessend|flüssig[e]?|verhandlungssicher|business[-\s]?fluent|proficient|proficiency|excellent\s+command)\b/i
// A requirement is present even without an explicit level (defaults to B2).
export const LANG_REQUIRED_CTX_RE = /\b(required|requirement|mandatory|erforderlich|Voraussetzung|necessary|notwendig|essential|vorausgesetzt|zwingend|very\s+good|good\s+(?:command|knowledge|skills)|sehr\s+gute[rnms]?|sehr\s+sichere|sichere\s+Kenntnis(?:se)?|gute[rnms]?\s+Kenntnisse|Wort\s+und\s+Schrift|written\s+and\s+spoken|spoken\s+and\s+written|in\s+German|in\s+Deutsch|auf\s+Deutsch|working\s+language|Arbeitssprache)\b/i
// Strong language-competency phrasing, especially for bilingual requirements.
export const LANG_COMMUNICATION_CTX_RE = /\b(schriftlich|mündlich|muedlich|kommunizier(?:en|st|t|en|st)|kommunikation|verstehen|sprechen|Schrift|writing|spoken|communicate(?:s|d|ing)?|correspond(?:ence|ing)?|communicating)\b/i
// Marks a language as nice-to-have rather than a hard requirement.
export const LANG_OPTIONAL_CTX_RE = /\b(nice\s+to\s+have|of\s+advantage|an\s+advantage|a\s+plus|von\s+Vorteil|wünschenswert|wuenschenswert|optional|bonus|preferred|ideally|idealerweise)\b/i

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
  '/job-description/', '/job-description-deg/', '/job-description-eng/',
  '/job-postings', '/job-posting',   // TU Berlin & similar portals
]
