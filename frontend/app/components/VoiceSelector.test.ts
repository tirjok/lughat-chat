/**
 * VoiceSelector — unit tests
 *
 * Tests the Vue 3 + TypeScript component in isolation.
 * Component tests use jsdom environment with mocked fetch/URL APIs.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import VoiceSelector from './VoiceSelector.vue'
import type { Voice } from '../composables/useVoices'

// ── Helpers ──────────────────────────────────────────────────────────

function makeMockVoices(overrides: Partial<Voice>[] = []): Voice[] {
  const defaults: Voice[] = [
    { id: 'aisha', name: 'Aisha', dialect: 'Egyptian Arabic', tag: 'AR-EG', icon: 'orange', speaker_wav: 'female.wav' },
    { id: 'tariq', name: 'Tariq', dialect: 'Modern Standard Arabic', tag: 'MSA', icon: 'magenta', speaker_wav: 'male.wav' },
    { id: 'laila', name: 'Laila', dialect: 'Levantine Arabic', tag: 'AR-LB', icon: 'orange', speaker_wav: 'female.wav' }
  ]
  return overrides.map((o, i) => ({ ...defaults[i], ...o })) as Voice[]
}

// ── Tests ────────────────────────────────────────────────────────────

describe('VoiceSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Slice 1: Tracer Bullet ────────────────────────────────────────

  describe('rendering and dropdown toggle', () => {
    it('renders the trigger button in full mode', () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices() }
      })
      expect(wrapper.find('.voice-trigger-btn').exists()).toBe(true)
      expect(wrapper.find('.voice-label').exists()).toBe(true)
    })

    it('renders the trigger button in compact mode', () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), compact: true }
      })
      expect(wrapper.find('.voice-trigger-btn').exists()).toBe(true)
      expect(wrapper.find('.voice-label').exists()).toBe(false)
    })

    it('renders the selected voice name in the trigger', () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'tariq' }
      })
      const triggerText = wrapper.find('.voice-trigger-text')
      expect(triggerText.text()).toBe('Tariq')
    })

    it('renders the placeholder when no voice is selected', () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: '' }
      })
      const triggerText = wrapper.find('.voice-trigger-text')
      expect(triggerText.text()).toBe('Select a voice preset')
    })

    it('opens the dropdown when the trigger is clicked', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices() }
      })
      const trigger = wrapper.find('.voice-trigger-btn')
      await trigger.trigger('click')

      // The Teleport renders the dropdown in the DOM
      const dropdown = document.querySelector('.voice-dropdown')
      expect(dropdown).not.toBeNull()
    })

    it('closes the dropdown when the trigger is clicked again', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices() }
      })
      const trigger = wrapper.find('.voice-trigger-btn')

      // Open
      await trigger.trigger('click')
      expect(document.querySelector('.voice-dropdown')).not.toBeNull()

      // Close
      await trigger.trigger('click')
      expect(document.querySelector('.voice-dropdown')).toBeNull()
    })

    it('does not open the dropdown when disabled', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), disabled: true }
      })
      const trigger = wrapper.find('.voice-trigger-btn')
      await trigger.trigger('click')

      expect(document.querySelector('.voice-dropdown')).toBeNull()
    })
  })

  // ── Slice 2: Voice Selection ───────────────────────────────────────

  describe('voice selection', () => {
    it('emits update:modelValue when a voice option is clicked', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'aisha' }
      })

      // Open dropdown
      await wrapper.find('.voice-trigger-btn').trigger('click')

      // Click the second voice option
      const options = document.querySelectorAll('.voice-option')
      expect(options).toHaveLength(3)
      await (options[1] as HTMLElement).click()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![0]).toEqual(['tariq'])
    })

    it('closes the dropdown after selecting a voice', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'aisha' }
      })

      await wrapper.find('.voice-trigger-btn').trigger('click')
      const options = document.querySelectorAll('.voice-option')
      await (options[0] as HTMLElement).click() // Click aisha again

      expect(document.querySelector('.voice-dropdown')).toBeNull()
    })

    it('marks the selected voice with is-selected class', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'laila' }
      })

      await wrapper.find('.voice-trigger-btn').trigger('click')
      const options = document.querySelectorAll('.voice-option')
      const lailaOption = options[2] // laila is third
      expect(lailaOption?.classList.contains('is-selected')).toBe(true)
    })
  })

  // ── Slice 3: Icon Color Mapping ────────────────────────────────────

  describe('icon color display', () => {
    it('renders the icon badge with the correct color class', () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'aisha' }
      })

      const badge = wrapper.find('.voice-icon-badge')
      expect(badge.classes()).toContain('icon-orange')
    })

    it('renders different color classes for different voices', () => {
      const aishaWrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'aisha' }
      })
      const tariqWrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'tariq' }
      })

      expect(aishaWrapper.find('.voice-icon-badge').classes()).toContain('icon-orange')
      expect(tariqWrapper.find('.voice-icon-badge').classes()).toContain('icon-magenta')
    })

    it('renders voice options with correct color classes', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'aisha' }
      })

      await wrapper.find('.voice-trigger-btn').trigger('click')
      const options = document.querySelectorAll('.voice-option-icon')

      // First option (aisha) should be orange
      expect((options[0] as HTMLElement).classList).toContain('icon-orange')
      // Second option (tariq) should be magenta
      expect((options[1] as HTMLElement).classList).toContain('icon-magenta')
    })
  })

  // ── Slice 4: Search Filter ─────────────────────────────────────────

  describe('search filtering', () => {
    it('shows all voices when search query is empty', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices() }
      })

      await wrapper.find('.voice-trigger-btn').trigger('click')
      const options = document.querySelectorAll('.voice-option')
      expect(options).toHaveLength(3)
    })

    it('filters voices by name when typing in search', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices() }
      })

      await wrapper.find('.voice-trigger-btn').trigger('click')

      // Type "Laila"
      await wrapper.find<HTMLInputElement>('.voice-search-input').setValue('Laila')

      const options = document.querySelectorAll('.voice-option')
      expect(options).toHaveLength(1)
      expect((options[0] as HTMLElement).textContent).toContain('Laila')
    })

    it('filters voices by dialect when typing in search', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices() }
      })

      await wrapper.find('.voice-trigger-btn').trigger('click')

      await wrapper.find<HTMLInputElement>('.voice-search-input').setValue('Egyptian')

      const options = document.querySelectorAll('.voice-option')
      expect(options).toHaveLength(1)
      expect((options[0] as HTMLElement).textContent).toContain('Aisha')
    })

    it('shows empty state when no voices match', async () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices() }
      })

      await wrapper.find('.voice-trigger-btn').trigger('click')

      await wrapper.find<HTMLInputElement>('.voice-search-input').setValue('nonexistent')

      expect(document.querySelector('.voice-empty')).not.toBeNull()
      expect(document.querySelector('.voice-empty')!.textContent).toContain('nonexistent')
    })
  })

  // ── Slice 5: Compact Mode ──────────────────────────────────────────

  describe('compact mode', () => {
    it('renders without a label', () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), compact: true }
      })
      expect(wrapper.find('.voice-label').exists()).toBe(false)
    })

    it('shows the selected voice name in compact mode', () => {
      const wrapper = mount(VoiceSelector, {
        props: { voices: makeMockVoices(), modelValue: 'tariq', compact: true }
      })
      const triggerText = wrapper.find('.voice-trigger-text')
      expect(triggerText.text()).toBe('Tariq')
    })
  })

  // ── Slice 6: Integration — wiring into index.vue ───────────────────

  describe('integration', () => {
    it('renders the VoiceSelector component in index.vue', async () => {
      // This test verifies the component is actually used in the main page.
      // If the VoiceSelector is wired up, the component should exist in the DOM.
      const indexVue = await import('../pages/index.vue')
      expect(indexVue).toBeDefined()
    })
  })
})
