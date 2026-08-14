import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
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

// ─── VoiceSelector click bug ──────────────────────────────────────────

describe('VoiceSelector click bug', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('when a voice option is clicked then update:modelValue emits the selected voice id', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const bodyContent = document.body.innerHTML
    expect(bodyContent).toContain('Tariq')
  })

  it('when the trigger button is clicked then the dropdown opens and voice options render', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const bodyContent = document.body.innerHTML
    expect(bodyContent).toContain('Tariq')
  })
})
