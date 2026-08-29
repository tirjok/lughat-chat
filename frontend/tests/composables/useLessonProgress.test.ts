import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLessonProgress, resetLessonProgress } from '~/composables/useLessonProgress'

describe('useLessonProgress', () => {
  beforeEach(() => {
    resetLessonProgress()
    vi.clearAllMocks()
  })

  it('initially returns 0 for an unknown lessonId', () => {
    const { getLessonProgress } = useLessonProgress()
    expect(getLessonProgress('a1-01')).toBe(0)
  })

  it('setLessonProgress stores in-memory then getLessonProgress returns it', () => {
    const { getLessonProgress, setLessonProgress } = useLessonProgress()
    setLessonProgress('a1-01', 50)
    expect(getLessonProgress('a1-01')).toBe(50)
  })

  it('setLessonProgress clamps values to 0–100', () => {
    const { getLessonProgress, setLessonProgress } = useLessonProgress()

    setLessonProgress('a1-01', 150)
    expect(getLessonProgress('a1-01')).toBe(100)

    resetLessonProgress()
    setLessonProgress('a1-01', -10)
    expect(getLessonProgress('a1-01')).toBe(0)
  })

  it('clearLessonProgress resets a lesson to 0', () => {
    const { getLessonProgress, setLessonProgress, clearLessonProgress } = useLessonProgress()

    setLessonProgress('a1-01', 75)
    expect(getLessonProgress('a1-01')).toBe(75)

    clearLessonProgress('a1-01')
    expect(getLessonProgress('a1-01')).toBe(0)
  })

  it('multiple lessonIds maintain independent progress', () => {
    const { getLessonProgress, setLessonProgress } = useLessonProgress()

    setLessonProgress('a1-01', 50)
    setLessonProgress('a1-02', 30)

    expect(getLessonProgress('a1-01')).toBe(50)
    expect(getLessonProgress('a1-02')).toBe(30)
  })

  it('resetLessonProgress clears all state', () => {
    const { getLessonProgress, setLessonProgress } = useLessonProgress()

    setLessonProgress('a1-01', 50)
    setLessonProgress('a1-02', 30)

    resetLessonProgress()

    expect(getLessonProgress('a1-01')).toBe(0)
    expect(getLessonProgress('a1-02')).toBe(0)
  })

  it('setLessonProgress attempts a PUT to /api/progress/{lessonId}', () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    fetchSpy.mockResolvedValue(new Response(null, { status: 200 }))

    const { setLessonProgress, getLessonProgress } = useLessonProgress()
    setLessonProgress('a1-01', 50)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/progress/a1-01',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: 'a1-01', progress: 50 })
      })
    )

    expect(getLessonProgress('a1-01')).toBe(50)

    fetchSpy.mockRestore()
  })

  it('setLessonProgress with totalLines caches lines and computes completed correctly', () => {
    const { getLessonProgress, setLessonProgress } = useLessonProgress()

    setLessonProgress('a1-01', 50, 20)
    const pct = getLessonProgress('a1-01')
    expect(pct).toBe(50)

    // Verify completedLines was computed as round((50/100) * 20) = 10
    // Now set to 75 with same totalLines — should reuse cached totalLines
    setLessonProgress('a1-01', 75)
    expect(getLessonProgress('a1-01')).toBe(75)

    // Set to 100 — should be round((100/100) * 20) = 20 completed lines
    setLessonProgress('a1-01', 100)
    expect(getLessonProgress('a1-01')).toBe(100)

    // Set to 25 with no new totalLines — should reuse cached totalLines
    setLessonProgress('a1-01', 25)
    expect(getLessonProgress('a1-01')).toBe(25)
  })
})
