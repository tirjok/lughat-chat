import { describe, it, expect } from 'vitest'
import { useTimeDisplay } from './useTimeDisplay'

describe('useTimeDisplay', () => {
  const { formatTime } = useTimeDisplay()

  describe('formatTime', () => {
    it('formats zero seconds as "0:00"', () => {
      expect(formatTime(0)).toBe('0:00')
    })

    it('formats seconds less than 60 as "M:SS"', () => {
      expect(formatTime(45)).toBe('0:45')
    })

    it('formats exactly 60 seconds as "1:00"', () => {
      expect(formatTime(60)).toBe('1:00')
    })

    it('formats 65 seconds as "1:05" with zero-padded seconds', () => {
      expect(formatTime(65)).toBe('1:05')
    })

    it('formats 90 seconds as "1:30"', () => {
      expect(formatTime(90)).toBe('1:30')
    })

    it('formats 125 seconds as "2:05"', () => {
      expect(formatTime(125)).toBe('2:05')
    })

    it('formats 3661 seconds as "61:01" (over an hour)', () => {
      expect(formatTime(3661)).toBe('61:01')
    })

    it('returns "0:00" for NaN', () => {
      expect(formatTime(NaN)).toBe('0:00')
    })

    it('returns "0:00" for undefined', () => {
      expect(formatTime(undefined as unknown as number)).toBe('0:00')
    })

    it('returns "0:00" for negative numbers', () => {
      expect(formatTime(-1)).toBe('0:00')
    })

    it('returns "0:00" for null coerced to number', () => {
      expect(formatTime(null as unknown as number)).toBe('0:00')
    })
  })
})
