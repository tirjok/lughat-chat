import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import VoiceSelector from '../app/components/VoiceSelector.vue'

function makeMockVoices() {
  return [
    { id: 'aisha', name: 'Aisha', dialect: 'Egyptian Arabic', tag: 'AR-EG', icon: 'orange', speaker_wav: 'female.wav' },
    { id: 'tariq', name: 'Tariq', dialect: 'Modern Standard Arabic', tag: 'MSA', icon: 'magenta', speaker_wav: 'male.wav' }
  ]
}

describe('VoiceSelector animation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('dropdown menu shows with animation classes (transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top) when opened', async () => {
    const container = document.createElement('div')
    container.id = 'test-root'
    document.body.appendChild(container)

    const wrapper = mount(VoiceSelector, {
      props: { voices: makeMockVoices(), modelValue: '' },
      attachTo: container
    })

    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const menu = document.querySelector('[class*="fixed"]')
    expect(menu).not.toBeNull()

    // Should have animation classes from prototype
    const menuClass = menu!.className
    expect(menuClass).toContain('transition-all')
    expect(menuClass).toContain('duration-500')
    expect(menuClass).toContain('origin-top')
  })

  it('dropdown menu is removed from DOM when closed (v-if), re-added when opened', async () => {
    // Animation classes updated to Phase 1: duration-500, ring-based borders
    const container = document.createElement('div')
    container.id = 'test-root'
    document.body.appendChild(container)

    const wrapper = mount(VoiceSelector, {
      props: { voices: makeMockVoices(), modelValue: '' },
      attachTo: container
    })

    // With v-if, menu is NOT in DOM when closed
    const menuBefore = document.querySelector('[class*="fixed"]')
    expect(menuBefore).toBeNull()

    // Open the dropdown
    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await nextTick()

    const menuAfter = document.querySelector('[class*="fixed"]')
    expect(menuAfter).not.toBeNull()

    // The menu should have animation classes when visible
    expect(menuAfter!.className).toContain('transition-all')
    expect(menuAfter!.className).toContain('origin-top')
    expect(menuAfter!.className).toContain('backdrop-blur-xl')
  })

  it('chevron rotates 180deg when dropdown is open', async () => {
    const container = document.createElement('div')
    container.id = 'test-root'
    document.body.appendChild(container)

    const wrapper = mount(VoiceSelector, {
      props: { voices: makeMockVoices(), modelValue: '' },
      attachTo: container
    })

    const trigger = wrapper.find('button')

    // Chevron should NOT have rotate-180 when closed
    const chevron = wrapper.find('.ph-caret-down')
    expect(chevron.classes()).not.toContain('rotate-180')

    // Open the dropdown
    await trigger.trigger('click')
    await nextTick()

    // Chevron should have rotate-180 when open
    const chevronOpen = wrapper.find('.ph-caret-down')
    expect(chevronOpen.classes()).toContain('rotate-180')
  })
})
