import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import LessonCompetencies from '~/components/LessonCompetencies.vue'

const COMPETENCIES = [
  'Can read fluently short paragraphs with harakat',
  'Good understanding of basic salutations',
  'Ability to use pronouns correctly'
]

function getWrapper(competencies: string[] = COMPETENCIES, collapsed = false) {
  return shallowMount(LessonCompetencies, {
    props: {
      competencies,
      collapsed
    }
  })
}

// ─── Rendering ──────────────────────────────────────────────────────────

describe('LessonCompetencies | renders collapsible header with arrow icon', () => {
  it('renders a header section with a chevron/arrow icon', () => {
    const wrapper = getWrapper()
    const header = wrapper.get('[data-testid="competencies-header"]')
    expect(header.exists()).toBe(true)
    // Arrow/chevron icon present
    const svg = header.find('svg')
    expect(svg.exists()).toBe(true)
  })

  it('renders one checkbox per competencies[] entry', () => {
    const wrapper = getWrapper()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(3)
  })

  it('renders the correct number of checkboxes for N competencies', () => {
    const wrapper = getWrapper(['A', 'B', 'C', 'D', 'E'])
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(5)
  })

  it('renders no checkboxes when competencies is empty', () => {
    const wrapper = getWrapper([])
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(0)
  })
})

// ─── Counter ────────────────────────────────────────────────────────────

describe('LessonCompetencies | "X of N" counter', () => {
  it('shows "0 of 3" when no competencies are checked', () => {
    const wrapper = getWrapper()
    const counter = wrapper.get('[data-testid="competency-counter"]')
    expect(counter.text()).toContain('0 of 3')
  })

  it('updates counter when a checkbox is toggled checked', async () => {
    const wrapper = getWrapper()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await nextTick()
    const counter = wrapper.get('[data-testid="competency-counter"]')
    expect(counter.text()).toContain('1 of 3')
  })

  it('updates counter when multiple checkboxes are toggled', async () => {
    const wrapper = getWrapper()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await checkboxes[1].setValue(true)
    await nextTick()
    const counter = wrapper.get('[data-testid="competency-counter"]')
    expect(counter.text()).toContain('2 of 3')
  })

  it('decrements counter when a checked checkbox is unchecked', async () => {
    const wrapper = getWrapper()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await nextTick()
    await checkboxes[0].setValue(false)
    await nextTick()
    const counter = wrapper.get('[data-testid="competency-counter"]')
    expect(counter.text()).toContain('0 of 3')
  })
})

// ─── Collapse / Expand ──────────────────────────────────────────────────

describe('LessonCompetencies | collapse / expand', () => {
  it('collapsing hides the checkbox list body', async () => {
    const wrapper = getWrapper()
    const header = wrapper.get('[data-testid="competencies-header"]')
    await header.trigger('click')
    await nextTick()
    const body = wrapper.find('[data-testid="competency-body"]')
    expect(body.exists()).toBe(false)
  })

  it('expanding shows the checkbox list body', async () => {
    const wrapper = getWrapper([], true)
    const header = wrapper.get('[data-testid="competencies-header"]')
    await header.trigger('click')
    await nextTick()
    const body = wrapper.find('[data-testid="competency-body"]')
    expect(body.exists()).toBe(true)
  })

  it('toggles body visibility on repeated header clicks', async () => {
    const wrapper = getWrapper()
    const header = wrapper.get('[data-testid="competencies-header"]')

    // Initially visible
    expect(wrapper.find('[data-testid="competency-body"]').exists()).toBe(true)

    // Collapse
    await header.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="competency-body"]').exists()).toBe(false)

    // Expand again
    await header.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="competency-body"]').exists()).toBe(true)
  })
})

// ─── Props ──────────────────────────────────────────────────────────────

describe('LessonCompetencies | accepts competencies prop', () => {
  it('renders competency labels matching the prop values', () => {
    const custom = ['First competency', 'Second competency']
    const wrapper = getWrapper(custom)
    const labels = wrapper.findAll('[data-testid="competency-label"]')
    expect(labels).toHaveLength(2)
    expect(labels[0].text()).toBe('First competency')
    expect(labels[1].text()).toBe('Second competency')
  })
})

// ─── Emits ──────────────────────────────────────────────────────────────

describe('LessonCompetencies | emits update:checked', () => {
  it('emits update:checked with count 0 on mount', () => {
    const wrapper = getWrapper()
    const emitted = wrapper.emitted('update:checked')
    expect(emitted).toBeDefined()
    expect(emitted).toHaveLength(1)
    expect(emitted![0]).toEqual([0])
  })

  it('emits update:checked with incremented count when a checkbox is checked', async () => {
    const wrapper = getWrapper()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await nextTick()
    const emitted = wrapper.emitted('update:checked')
    expect(emitted).toHaveLength(2) // mount + toggle
    expect(emitted![1]).toEqual([1])
  })

  it('emits update:checked with decremented count when a checkbox is unchecked', async () => {
    const wrapper = getWrapper()
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true)
    await nextTick()
    await checkboxes[0].setValue(false)
    await nextTick()
    const emitted = wrapper.emitted('update:checked')
    expect(emitted![emitted!.length - 1]).toEqual([0])
  })
})

// ─── RTL ────────────────────────────────────────────────────────────────

describe('LessonCompetencies | RTL layout', () => {
  it('applies RTL direction to the component root', () => {
    const wrapper = getWrapper()
    const root = wrapper.element
    expect(root.classList.contains('rtl') || root.getAttribute('dir') === 'rtl').toBe(true)
  })
})
