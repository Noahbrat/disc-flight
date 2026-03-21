import { describe, it, expect } from 'vitest'
import { parseDiscSpec } from '../parse'

describe('parseDiscSpec', () => {
  it('parses bare flight numbers', () => {
    const result = parseDiscSpec('12/5/-1/3')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ speed: 12, glide: 5, turn: -1, fade: 3 })
  })

  it('parses flight numbers with color', () => {
    const result = parseDiscSpec('12/5/-1/3:red')
    expect(result[0]).toEqual({ speed: 12, glide: 5, turn: -1, fade: 3, color: 'red' })
  })

  it('parses label + flight numbers', () => {
    const result = parseDiscSpec('Destroyer:12/5/-1/3')
    expect(result[0]).toEqual({ speed: 12, glide: 5, turn: -1, fade: 3, label: 'Destroyer' })
  })

  it('parses label + flight numbers + color', () => {
    const result = parseDiscSpec('Destroyer:12/5/-1/3:#ff0000')
    expect(result[0]).toEqual({
      speed: 12, glide: 5, turn: -1, fade: 3,
      label: 'Destroyer', color: '#ff0000',
    })
  })

  it('parses multiple discs', () => {
    const result = parseDiscSpec('Destroyer:12/5/-1/3:red,Buzzz:5/4/-1/1:green')
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('Destroyer')
    expect(result[0].color).toBe('red')
    expect(result[1].label).toBe('Buzzz')
    expect(result[1].speed).toBe(5)
  })

  it('handles mixed formats in multi-disc spec', () => {
    const result = parseDiscSpec('12/5/-1/3,Buzzz:5/4/-1/1:green')
    expect(result).toHaveLength(2)
    expect(result[0].label).toBeUndefined()
    expect(result[1].label).toBe('Buzzz')
  })

  it('throws on empty spec', () => {
    expect(() => parseDiscSpec('')).toThrow('No disc specs provided')
  })

  it('throws on missing flight numbers', () => {
    expect(() => parseDiscSpec('Destroyer:red')).toThrow('no flight numbers found')
  })

  it('handles negative turn values', () => {
    const result = parseDiscSpec('6/5/-3/1')
    expect(result[0].turn).toBe(-3)
  })

  it('handles whitespace around commas', () => {
    const result = parseDiscSpec('12/5/-1/3 , 5/4/-1/1')
    expect(result).toHaveLength(2)
  })
})
