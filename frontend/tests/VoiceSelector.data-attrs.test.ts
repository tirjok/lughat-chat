import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import VoiceSelector from '../app/components/VoiceSelector.vue'

function makeMockVoices() {
  return [
    { id: 'aisha', name: 'Aisha', dialect: 'Egyptian Arabic', tag: 'AR-EG', icon: 'orange', speaker_wav: 'female.wav' },
    { id: 'tariq', name: 'Tariq', dialect: 'Modern Standard Arabic', tag: 'MSA', icon: 'magenta', speaker_wav: 'male.wav' },
    { id: 'laila', name: 'Laila', dialect: 'Levantine Arabic', tag: 'AR-LB', icon: 'orange', speaker_wav: 'female.wav' }
  ]
}

describe('VoiceSelector data attributes', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('voice options have data-voice attribute matching voice id', async () => {
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

    const options = document.querySelectorAll('.voice-option')
    expect(options.length).toBe(3)

    // Each option should have data-voice matching its voice id
    const aishaOption = document.querySelector('[data-voice="aisha"]')
    expect(aishaOption).not.toBeNull()

    const tariqOption = document.querySelector('[data-voice="tariq"]')
    expect(tariqOption).not.toBeNull()

    const lailaOption = document.querySelector('[data-voice="laila"]')
    expect(lailaOption).not.toBeNull()
  })

  it('voice options have data-name attribute matching voice name', async () => {
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

    const aishaOption = document.querySelector('[data-name="Aisha"]')
    expect(aishaOption).not.toBeNull()

    const tariqOption = document.querySelector('[data-name="Tariq"]')
    expect(tariqOption).not.toBeNull()

    const lailaOption = document.querySelector('[data-name="Laila"]')
    expect(lailaOption).not.toBeNull()
  })

  it('voice options have data-tag attribute matching voice dialect tag', async () => {
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

    expect(document.querySelector('[data-tag="AR-EG"]')).not.toBeNull()
    expect(document.querySelector('[data-tag="MSA"]')).not.toBeNull()
    expect(document.querySelector('[data-tag="AR-LB"]')).not.toBeNull()
  })

  it('voice options have data-color attribute matching voice color class', async () => {
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

    // Aisha and Laila are orange, Tariq is magenta
    expect(document.querySelector('[data-color="text-gold"]')).not.toBeNull()
    expect(document.querySelector('[data-color="text-ink-dim"]')).not.toBeNull()
  })
})
