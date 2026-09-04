import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LessonActivities from '~/components/lesson/LessonActivities.vue'
import type { SectionDefinition } from '~/data/curriculum'

function makeActivitySection(): SectionDefinition {
  return {
    name: 'Activities',
    type: 'activity',
    content: {
      type: 'fill-blank',
      prompt: 'أكمل الجملة',
      answer: 'أنا طالب'
    },
    _lessonId: 'a1-01',
    get items(): never[] { return [] }
  }
}

function getWrapper(section: SectionDefinition = makeActivitySection()) {
  return shallowMount(LessonActivities, {
    props: { section }
  })
}

describe('LessonActivities', () => {
  it('renders a placeholder card with "Content coming soon" message matching the active section name', () => {
    const wrapper = getWrapper()
    const message = wrapper.find('[data-testid="coming-soon-message"]')
    expect(message.exists()).toBe(true)
    expect(message.text()).toContain('Activities')
    expect(message.text()).toContain('coming soon')
  })

  it('renders the fallback card when section type is activity but no Phase 2 content is implemented', () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(0)
  })

  it('renders the fallback card with RTL direction for Arabic text', () => {
    const wrapper = getWrapper()
    const message = wrapper.find('[data-testid="coming-soon-message"]')
    expect(message.attributes('dir')).toBe('rtl')
  })
})
