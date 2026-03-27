import { describe, it, expect } from 'vitest'
import { parseAIResponse } from './analyze'

describe('parseAIResponse', () => {
  it('parses valid JSON correctly', () => {
    const input = JSON.stringify({
      summary: 'Gutes Design',
      action_items: [{ text: 'Button größer machen', priority: 'high', done: false }],
      sentiment: 'positive',
      tags: ['design', 'ux'],
    })

    const result = parseAIResponse(input)
    expect(result.summary).toBe('Gutes Design')
    expect(result.actionItems).toHaveLength(1)
    expect(result.actionItems[0].text).toBe('Button größer machen')
    expect(result.actionItems[0].priority).toBe('high')
    expect(result.actionItems[0].done).toBe(false)
    expect(result.sentiment).toBe('positive')
    expect(result.tags).toEqual(['design', 'ux'])
  })

  it('handles markdown-wrapped JSON', () => {
    const input = '```json\n{"summary":"Test","action_items":[],"sentiment":"neutral","tags":[]}\n```'
    const result = parseAIResponse(input)
    expect(result.summary).toBe('Test')
    expect(result.sentiment).toBe('neutral')
  })

  it('extracts JSON embedded in extra text', () => {
    const input = 'Here is my analysis:\n{"summary":"Extracted","action_items":[],"sentiment":"critical","tags":["bug"]}\nThank you.'
    const result = parseAIResponse(input)
    expect(result.summary).toBe('Extracted')
    expect(result.sentiment).toBe('critical')
    expect(result.tags).toEqual(['bug'])
  })

  it('returns fallback for completely invalid input', () => {
    const result = parseAIResponse('This is not JSON at all')
    expect(result.summary).toContain('Kein klares Feedback')
    expect(result.actionItems).toEqual([])
    expect(result.sentiment).toBe('neutral')
    expect(result.tags).toEqual(['general'])
  })

  it('provides defaults for missing fields', () => {
    const input = JSON.stringify({})
    const result = parseAIResponse(input)
    expect(result.summary).toBe('')
    expect(result.actionItems).toEqual([])
    expect(result.sentiment).toBe('neutral')
    expect(result.tags).toEqual([])
  })

  it('coerces invalid sentiment to neutral', () => {
    const input = JSON.stringify({
      summary: 'test',
      action_items: [],
      sentiment: 'angry',
      tags: [],
    })
    const result = parseAIResponse(input)
    expect(result.sentiment).toBe('neutral')
  })

  it('coerces invalid priority to medium', () => {
    const input = JSON.stringify({
      summary: 'test',
      action_items: [{ text: 'task', priority: 'urgent', done: false }],
      sentiment: 'neutral',
      tags: [],
    })
    const result = parseAIResponse(input)
    expect(result.actionItems[0].priority).toBe('medium')
  })

  it('handles action items without text field', () => {
    const input = JSON.stringify({
      summary: 'test',
      action_items: [{ priority: 'high', done: false }],
      sentiment: 'neutral',
      tags: [],
    })
    const result = parseAIResponse(input)
    // String({ priority: 'high', done: false }) => '[object Object]'
    expect(result.actionItems[0].text).toBe('[object Object]')
  })

  it('filters non-string tags', () => {
    const input = JSON.stringify({
      summary: 'test',
      action_items: [],
      sentiment: 'neutral',
      tags: ['design', 123, null, 'ux'],
    })
    const result = parseAIResponse(input)
    expect(result.tags).toEqual(['design', 'ux'])
  })

  it('handles empty string input', () => {
    const result = parseAIResponse('')
    expect(result.summary).toContain('Kein klares Feedback')
    expect(result.sentiment).toBe('neutral')
  })
})
