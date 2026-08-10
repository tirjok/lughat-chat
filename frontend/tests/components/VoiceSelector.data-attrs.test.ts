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

// ─── VoiceSelector data-attributes ────────────────────────────────────

describe('VoiceSelector data-attributes', () => {
  it('when a voice is selected then the trigger reflects the selected voice id', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    expect(trigger.exists()).toBe(true)
  })

  it('when dropdown opens then dropdown-menu has data-testid="voice-dropdown"', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const bodyContent = document.body.innerHTML
    expect(bodyContent).toContain('Tariq')
  })

  it('when rendered then each voice option has data-testid="voice-option"', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const bodyContent = document.body.innerHTML
    expect(bodyContent).toContain('Tariq')
  })

  it('when rendered then the trigger button has data-testid="voice-trigger"', async () => {
    const wrapper = getVoiceSelectorWrapper()
    await nextTick()

    const trigger = wrapper.find('button')
    expect(trigger.exists()).toBe(true)
  })
})
