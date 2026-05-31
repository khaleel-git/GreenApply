import { CONFIDENCE_THRESHOLD } from '../../constants/scoring'
import type { ExtractionResult } from '../../types'

export interface ConfidenceReport {
  overallConfident: boolean
  lowFields: Array<keyof ExtractionResult['confidence']>
}

export function assessConfidence(confidence: ExtractionResult['confidence']): ConfidenceReport {
  const criticalFields: Array<keyof ExtractionResult['confidence']> = ['languages', 'visa', 'employmentType']
  const lowFields = (Object.entries(confidence) as Array<[keyof ExtractionResult['confidence'], number]>)
    .filter(([, v]) => v < CONFIDENCE_THRESHOLD)
    .map(([k]) => k)

  const criticalLow = criticalFields.some(f => confidence[f] < CONFIDENCE_THRESHOLD)

  return {
    overallConfident: !criticalLow,
    lowFields,
  }
}
