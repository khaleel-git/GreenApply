export interface CompanyProfile {
  normalizedName: string
  displayName: string
  size?: 'startup' | 'smb' | 'mid' | 'enterprise'
  industry?: string
  techStack?: string[]
  sponsorshipLikelihood: number    // 0.0–1.0
  englishFriendlyScore: number     // 0.0–1.0
  averageResponseDays?: number
  communityReports: number
  lastUpdated: number
}
