export const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1'

export const NIM_MODELS = {
  scoreExplainer: 'meta/llama-3.1-8b-instruct',
  jobExtractorFallback: 'meta/llama-3.1-8b-instruct',
  coverLetter: 'meta/llama-3.3-70b-instruct',
  resumeParser: 'nvidia/llama-3.3-nemotron-super-49b-v1',
  embeddings: 'baai/bge-m3',
} as const

export const TOKEN_BUDGETS = {
  jobExtraction: { maxInput: 4096, maxOutput: 512 },
  scoreExplanation: { maxInput: 2048, maxOutput: 256 },
  coverLetter: { maxInput: 6144, maxOutput: 1500 },
  resumeParsing: { maxInput: 6144, maxOutput: 512 },
} as const

export const JOB_DESCRIPTION_MAX_CHARS = 3000
export const RESUME_RAW_MAX_CHARS = 4000
