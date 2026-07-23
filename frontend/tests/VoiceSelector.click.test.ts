import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import VoiceSelector from '../app/components/VoiceSelector.vue'

describe('VoiceSelector click bug', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('clicking the trigger button opens the dropdown', async () => {
    const container = document.createElement('div')
    container.id = 'test-root'
    document.body.appendChild(container)

    const voices = [
      { id: 'aisha', name: 'Aisha', dialect: 'Egyptian Arabic', tag: 'AR-EG', icon: 'orange', speaker_wav: 'female.wav' },
      { id: 'tariq', name: 'Tariq', dialect: 'Modern Standard Arabic', tag: 'MSA', icon: 'magenta', speaker_wav: 'male.wav' }
    ]

    const wrapper = mount(VoiceSelector, {
      props: { voices },
      attachTo: container
    })

    // Get the trigger button and click it
    const trigger = wrapper.find('button')
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()

    // The dropdown is Teleported to body, so find it in the document
    const dropdown = document.querySelector('[class*="fixed"][class*="z-50"]')

    expect(dropdown).not.toBeNull()
  })
})
