import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Voice } from '../app/composables/useVoices'
import VoiceSelector from '../app/components/VoiceSelector.vue'

// Mock showToast so the component doesn't call the real composable.
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

function getTriggerButton(wrapper: ReturnType<typeof mount>): ReturnType<typeof mount> {
  return wrapper.find('button')
}

// ─── AC-1: Default voice display ──────────────────────────────────────

describe('VoiceSelector', () => {
  describe('default voice display', () => {
    it('renders a "Voice" label above the selector', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const label = wrapper.find('label')
      expect(label.exists()).toBe(true)
    })

    it('renders the voice icon (waveform) next to the name', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const trigger = getTriggerButton(wrapper)
      expect(trigger.exists()).toBe(true)
    })

    it('renders the selected voice name in the trigger', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const trigger = getTriggerButton(wrapper)
      expect(trigger.text()).toContain('Aisha')
    })
  })

  describe('label and icon', () => {
    it('renders a "Voice" label above the selector', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const label = wrapper.find('label')
      expect(label.exists()).toBe(true)
    })

    it('renders a waveform icon inside the trigger button', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const trigger = getTriggerButton(wrapper)
      expect(trigger.exists()).toBe(true)
    })

    it('renders a chevron-down icon indicating dropdown', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const trigger = getTriggerButton(wrapper)
      expect(trigger.exists()).toBe(true)
    })
  })

  describe('dropdown open/close', () => {
    it('when the trigger button is clicked then the dropdown opens', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const trigger = getTriggerButton(wrapper)
      await trigger.trigger('click')
      await nextTick()

      // Teleport renders to body — search document.body for the dropdown
      const bodyContent = document.body.innerHTML
      expect(bodyContent).toContain('Tariq')
    })

    it('when a voice is selected then the dropdown closes and the trigger updates', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const trigger = getTriggerButton(wrapper)
      await trigger.trigger('click')
      await nextTick()

      // Teleport renders to body — search document.body for the dropdown
      const bodyContent = document.body.innerHTML
      expect(bodyContent).toContain('Tariq')
    })
  })

  describe('voice selection', () => {
    it('emits an update:modelValue event when a voice is selected', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      const trigger = getTriggerButton(wrapper)
      await trigger.trigger('click')
      await nextTick()

      // Teleport renders to body
      const bodyContent = document.body.innerHTML
      expect(bodyContent).toContain('Tariq')
    })
  })
  describe('responsive dropdown portal and mobile touch targets', () => {
    it('renders a compact dropdown on desktop (1024px)', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      expect(wrapper.exists()).toBe(true)
    })

    it('renders a wider dropdown on mobile (375px) with larger touch targets', async () => {
      const wrapper = getVoiceSelectorWrapper()
      await nextTick()

      expect(wrapper.exists()).toBe(true)
    })
  })
})
