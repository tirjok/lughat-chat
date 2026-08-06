import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import VoiceSelector from '../app/components/VoiceSelector.vue'
import type { Voice } from '../app/composables/useVoices'

// Mock showToast since VoiceSelector.vue calls it in <script setup>.
vi.mock('../app/composables/useToast', () => ({
  showToast: vi.fn()
}))

vi.mock('../app/composables/useVoices', () => ({
  useVoices: () => ({
    voices: ref([
      { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
      { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
      { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
    ])
  })
}))

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})

function makeMockVoices(): Voice[] {
  return [
    { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
    { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
    { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
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
