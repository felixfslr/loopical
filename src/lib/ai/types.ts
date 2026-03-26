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
  actionItems: { text: string; done: boolean }[]
  sentiment: 'positive' | 'neutral' | 'critical'
  tags: string[]
}
