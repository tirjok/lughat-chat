import { shallowRef } from 'vue'

interface StoredProgress {
  completedLines: number
  totalLines: number
  pct: number
}

const sharedProgress = shallowRef<Record<string, StoredProgress>>({})

export const useLessonProgress = () => {
  function _getLessonProgress(lessonId: string): number {
    const data = sharedProgress.value?.[lessonId]
    if (!data) return 0
    if (data.totalLines > 0) return Math.round((data.completedLines / data.totalLines) * 100)
    return Math.round(data.pct)
  }

  function _setLessonProgress(
    lessonId: string,
    pct: number,
    totalLines?: number
  ): void {
    const clamped = Math.max(0, Math.min(100, pct))

    if (!sharedProgress.value?.[lessonId]) {
      sharedProgress.value![lessonId] = {
        completedLines: 0,
        totalLines: totalLines ?? 0,
        pct: clamped
      }
    }

    const entry = sharedProgress.value![lessonId]
    entry.pct = clamped
    if (entry.totalLines > 0) {
      entry.completedLines = Math.round((clamped / 100) * entry.totalLines)
    }

    fetch('/api/progress/' + encodeURIComponent(lessonId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, progress: Math.round(clamped) })
    }).catch(() => { /* silently ignore */ })
  }

  function _clearLessonProgress(lessonId: string): void {
    const entry = sharedProgress.value?.[lessonId]
    if (entry) {
      entry.pct = 0
      entry.completedLines = 0
      entry.totalLines = 0
    }
  }
  return { getLessonProgress: _getLessonProgress, setLessonProgress: _setLessonProgress, clearLessonProgress: _clearLessonProgress }
}
export const resetLessonProgress = () => {
  Object.keys(sharedProgress.value).forEach((key) => {
    const entry = sharedProgress.value[key]
    if (entry) {
      entry.pct = 0
      entry.completedLines = 0
      entry.totalLines = 0
    }
  })
}
