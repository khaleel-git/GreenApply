import { FRESHNESS_MODIFIERS } from '../../constants/scoring'

export function computeFreshnessModifier(postedDate?: string): number {
  if (!postedDate) return 0
  const ageDays = Math.floor((Date.now() - new Date(postedDate).getTime()) / 86_400_000)
  if (ageDays <= FRESHNESS_MODIFIERS.freshDays) return FRESHNESS_MODIFIERS.freshBoost
  if (ageDays <= FRESHNESS_MODIFIERS.normalDays) return 0
  if (ageDays <= FRESHNESS_MODIFIERS.staleThreshold) return FRESHNESS_MODIFIERS.stalePenalty
  return FRESHNESS_MODIFIERS.veryStaleModifier
}

export function getFreshnessLabel(postedDate?: string): { label: string; warning: boolean } {
  if (!postedDate) return { label: '', warning: false }
  const ageDays = Math.floor((Date.now() - new Date(postedDate).getTime()) / 86_400_000)
  if (ageDays === 0) return { label: 'Posted today', warning: false }
  if (ageDays === 1) return { label: 'Posted yesterday', warning: false }
  if (ageDays <= 7) return { label: `Posted ${ageDays} days ago`, warning: false }
  if (ageDays <= 30) return { label: `Posted ${ageDays} days ago`, warning: false }
  if (ageDays <= 60) return { label: `Posted ${ageDays} days ago`, warning: true }
  return { label: `Posted ${ageDays} days ago — may already be filled`, warning: true }
}
