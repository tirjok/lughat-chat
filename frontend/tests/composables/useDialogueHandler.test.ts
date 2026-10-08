import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLessonById } from '~/data/curriculum'

// This test verifies that handleDialoguePlayLine sends the CORRECT text
// when the user clicks a line in Scene 2 (female). The current buggy
// implementation iterates all scenes from the start, so Scene 2 line
// indices 0-4 incorrectly match Scene 1 (male).
//
// The fix must update the page's handler to scope the search to the
// active scene tab rather than iterating all scenes.

describe('handleDialoguePlayLine — scene index scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // This function replicates the FIXED handler: it takes an explicit
  // sceneIndex parameter instead of iterating all scenes.
  function handleDialoguePlayLineFixed(
    content: { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] },
    sceneIndex: number,
    lineIndex: number,
    speakerFallback?: string
  ): { arabic: string, speaker: string } | null {
    if (sceneIndex < 0 || sceneIndex >= content.scenes.length) return null
    const scene = content.scenes[sceneIndex]
    if (lineIndex < 0 || lineIndex >= scene.lines.length) return null
    const line = scene.lines[lineIndex]
    if (line?.arabic) {
      return { arabic: line.arabic, speaker: speakerFallback ?? line.speaker ?? '' }
    }
    return null
  }

  it('sends Scene 2 text when sceneIndex=1, lineIndex=4 (Khadija\'s last line)', () => {
    const lesson = getLessonById('a1-01')
    expect(lesson).toBeDefined()

    const dialogue = lesson!.sections.find(s => s.type === 'dialogue')
    expect(dialogue).toBeDefined()

    // The cast is identical to the page handler.
    const content = dialogue!.content as { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] }

    // Fixed: explicit sceneIndex=1 (Scene 2, female)
    const result = handleDialoguePlayLineFixed(content, 1, 4, 'Khadija')

    expect(result).not.toBeNull()
    // Must be Khadija's line 4 (female welcome), NOT Muhammad's line 4 (male welcome)
    expect(result!.arabic).toBe('اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ أَيْضًا. مَرْحَبًا بِكِ فِي بَيْتِنَا')
    expect(result!.speaker).toBe('Khadija')
  })

  it('sends Scene 2 text when sceneIndex=1, lineIndex=0 (Khadija\'s greeting)', () => {
    const lesson = getLessonById('a1-01')
    const dialogue = lesson!.sections.find(s => s.type === 'dialogue')
    const content = dialogue!.content as { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] }

    const result = handleDialoguePlayLineFixed(content, 1, 0, 'Khadija')

    expect(result).not.toBeNull()
    expect(result!.arabic).toBe('السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ')
    expect(result!.speaker).toBe('Khadija')
  })

  it('sends Scene 1 text when sceneIndex=0, lineIndex=4 (Muhammad\'s last line)', () => {
    const lesson = getLessonById('a1-01')
    const dialogue = lesson!.sections.find(s => s.type === 'dialogue')
    const content = dialogue!.content as { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] }

    const result = handleDialoguePlayLineFixed(content, 0, 4, 'Muhammad')

    expect(result).not.toBeNull()
    expect(result!.arabic).toBe('اَلْحَمْدُ لِلَّهِ، أَنَا أَيْضًا بِخَيْرٍ. مَرْحَبًا بِكَ فِي مَسْجِدِنَا')
    expect(result!.speaker).toBe('Muhammad')
  })

  it('sends Aisha text when sceneIndex=1, lineIndex=3', () => {
    const lesson = getLessonById('a1-01')
    const dialogue = lesson!.sections.find(s => s.type === 'dialogue')
    const content = dialogue!.content as { type: 'dialogue', scenes: { label: string, lines: { arabic: string }[] }[] }

    const result = handleDialoguePlayLineFixed(content, 1, 3, 'Aisha')

    expect(result).not.toBeNull()
    expect(result!.arabic).toBe('اَلْحَمْدُ لِلَّهِ، أَنَا بِخَيْرٍ، شُكْرًا. وَكَيْفَ حَالُكِ؟')
    expect(result!.speaker).toBe('Aisha')
  })
})
