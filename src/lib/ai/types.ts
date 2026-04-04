export interface WordTimestamp {
  word: string
  start: number
  end: number
}

export interface TranscriptionResult {
  transcript: string
  wordTimestamps: WordTimestamp[]
  languageCode: string | null
}

export interface AnalysisResult {
  summary: string
  actionItems: { text: string; done: boolean; priority?: 'high' | 'medium' | 'low' }[]
  sentiment: 'positive' | 'neutral' | 'critical'
  tags: string[]
  /** 1-5 severity rating (1 = minor, 5 = critical blocker) */
  severity?: number
  /** Estimated effort to address: 'quick_fix' | 'medium' | 'major' */
  effortEstimate?: 'quick_fix' | 'medium' | 'major'
  /** Usability issue category if applicable */
  usabilityCategory?: 'navigation' | 'layout' | 'readability' | 'interaction' | 'performance' | 'accessibility' | null
  /** Specific UI elements referenced in the feedback */
  uiElementReferences?: string[]
}
