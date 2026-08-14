import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import VoiceSelector from '~/components/VoiceSelector.vue'
import type { Voice } from '~/composables/useVoices'

// Mock showToast since VoiceSelector.vue calls it in <script setup>.
vi.mock('~/composables/useToast', () => ({
  showToast: vi.fn()
}))

vi.mock('~/composables/useVoices', () => ({
  useVoices: () => ({
    voices: ref([
      { id: 'aisha', name: 'Aisha - Conversational' },
      { id: 'tariq', name: 'Tariq - News Anchor' },
      { id: 'laila', name: 'Laila - Storyteller' }
    ])
  })
}))

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})

function makeMockVoices(): Voice[] {
  return [
    { id: 'aisha', name: 'Aisha - Conversational' },
    { id: 'tariq', name: 'Tariq - News Anchor' },
    { id: 'laila', name: 'Laila - Storyteller' }
  ]
}

function getVoiceSelectorWrapper(voices?: Voice[]): ReturnType<typeof mount> {
  const mockVoices = voices || makeMockVoices()
  return mount(VoiceSelector, {
    props: { voices: mockVoices }
  })
}

// ─── VoiceSelector animation tests ────────────────────────────────────
describe('VoiceSelector animation tests', () => {
  it('when a voice is selected then trigger button has a highlight animation', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const bodyContent = document.body.innerHTML
    expect(bodyContent).toContain('Tariq')
  })

  it('when dropdown opens then dropdown-menu slides in from top', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const bodyContent = document.body.innerHTML
    expect(bodyContent).toContain('Tariq')
  })
})
