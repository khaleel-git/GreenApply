import type { ExtractionResult } from '../../types'
import { CONFIDENCE_THRESHOLD } from '../../constants/scoring'

interface Props {
  visa: ExtractionResult['visa']
  confidence: ExtractionResult['confidence']
}

export function ConfidenceCaveat({ visa, confidence }: Props) {
  if (confidence.visa >= CONFIDENCE_THRESHOLD || visa.value !== 'unknown') return null

  return (
    <div style={{
      fontSize: 11, color: '#6b7280', padding: '6px 10px',
      background: '#f9fafb', borderRadius: 6,
      border: '1px solid #e5e7eb',
    }}>
      <span style={{ color: '#9ca3af' }}>⚠ </span>
      Visa policy unknown — low confidence. Verify on job page.
    </div>
  )
}
