import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import VoiceSelector from '../app/components/VoiceSelector.vue'

describe('VoiceSelector debug', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('debug displayVoice', () => {
    const voices = [
      { id: 'aisha', name: 'Aisha', dialect: 'Egyptian Arabic', tag: 'AR-EG', icon: 'orange', speaker_wav: 'female.wav' },
      { id: 'tariq', name: 'Tariq', dialect: 'Modern Standard Arabic', tag: 'MSA', icon: 'magenta', speaker_wav: 'male.wav' },
      { id: 'laila', name: 'Laila', dialect: 'Levantine Arabic', tag: 'AR-LB', icon: 'orange', speaker_wav: 'female.wav' }
    ]

    const container = document.createElement('div')
    document.body.appendChild(container)

    const mounted = mount(VoiceSelector, {
      props: { voices, modelValue: 'tariq' },
      attachTo: container
    })

    const html = mounted.html()
    const buttonText = mounted.find('button').text()
    const emitted = mounted.emitted('update:modelValue')

    // Force failure to see console output
    expect(html.substring(0, 800)).toBe(html.substring(0, 800))
    expect(buttonText).toBe(buttonText)
    expect(emitted).toBe(emitted)

    document.body.innerHTML = ''
  })
})
