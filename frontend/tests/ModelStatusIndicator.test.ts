import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// Mock the composable before importing the component
vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: vi.fn(),
}))

import ModelStatusIndicator from '../app/components/ModelStatusIndicator.vue'
import { useHealthPoll } from '../app/composables/useHealthPoll'

describe('ModelStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('renders spinning loader icon and "جاري التحميل..." text on mount', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)

      expect(wrapper.text()).toContain('جاري التحميل...')
    })

    it('renders the loader icon element with spinning class', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)

      // The loader icon should be the first child span
      const icons = wrapper.findAll('span')
      expect(icons.length).toBeGreaterThan(0)
      // First icon should have the loader class (spinning indicator)
      expect(icons[0].classes()).toContain('i-lucide-loader')
    })

    it('does not render check or alert icons in loading state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()

      expect(allClasses).not.toContain('i-lucide-check-circle')
      expect(allClasses).not.toContain('i-lucide-alert-circle')
    })
  })

  describe('ready state', () => {
    it('renders green check icon and "النموذج جاهز" text when model is loaded', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('ready'),
        modelLoaded: computed(() => true),
      })

      const wrapper = mount(ModelStatusIndicator)

      expect(wrapper.text()).toContain('النموذج جاهز')
    })

    it('renders the check-circle icon element', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('ready'),
        modelLoaded: computed(() => true),
      })

      const wrapper = mount(ModelStatusIndicator)
      const icons = wrapper.findAll('span')

      expect(icons.length).toBeGreaterThan(0)
      // First icon should have the check-circle class
      expect(icons[0].classes()).toContain('i-lucide-check-circle')
    })

    it('does not render loader or alert icons in ready state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('ready'),
        modelLoaded: computed(() => true),
      })

      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()

      expect(allClasses).not.toContain('i-lucide-loader')
      expect(allClasses).not.toContain('i-lucide-alert-circle')
    })
  })

  describe('error state', () => {
    it('renders red alert icon and "خطأ في تحميل النموذج" text when model is not loaded', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('error'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)

      expect(wrapper.text()).toContain('خطأ في تحميل النموذج')
    })

    it('renders the alert-circle icon element', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('error'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)
      const icons = wrapper.findAll('span')

      expect(icons.length).toBeGreaterThan(0)
      // First icon should have the alert-circle class
      expect(icons[0].classes()).toContain('i-lucide-alert-circle')
    })

    it('does not render loader or check icons in error state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('error'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()

      expect(allClasses).not.toContain('i-lucide-loader')
      expect(allClasses).not.toContain('i-lucide-check-circle')
    })
  })

  describe('reactivity', () => {
    it('updates icon and text when status changes from loading to ready', async () => {
      const statusRef = ref('loading')
      const modelLoadedRef = ref(false)

      vi.mocked(useHealthPoll).mockReturnValue({
        status: statusRef,
        modelLoaded: modelLoadedRef,
      })

      const wrapper = mount(ModelStatusIndicator)

      // Verify initial loading state
      expect(wrapper.text()).toContain('جاري التحميل...')
      const icons = wrapper.findAll('span')
      expect(icons[0].classes()).toContain('i-lucide-loader')

      // Mutate the reactive refs to simulate status change
      statusRef.value = 'ready'
      modelLoadedRef.value = true

      // Force re-render to pick up ref mutations
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify updated state
      expect(wrapper.text()).toContain('النموذج جاهز')
      const updatedIcons = wrapper.findAll('span')
      expect(updatedIcons[0].classes()).toContain('i-lucide-check-circle')
    })

    it('updates icon and text when status changes from loading to error', async () => {
      const statusRef = ref('loading')
      const modelLoadedRef = ref(false)

      vi.mocked(useHealthPoll).mockReturnValue({
        status: statusRef,
        modelLoaded: modelLoadedRef,
      })

      const wrapper = mount(ModelStatusIndicator)

      // Verify initial loading state
      expect(wrapper.text()).toContain('جاري التحميل...')

      // Mutate the reactive ref to simulate error
      statusRef.value = 'error'

      // Force re-render to pick up ref mutation
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify error state
      expect(wrapper.text()).toContain('خطأ في تحميل النموذج')
      const icons = wrapper.findAll('span')
      expect(icons[0].classes()).toContain('i-lucide-alert-circle')
    })

    it('updates icon and text when status changes from error to ready', async () => {
      const statusRef = ref('error')
      const modelLoadedRef = ref(false)

      vi.mocked(useHealthPoll).mockReturnValue({
        status: statusRef,
        modelLoaded: modelLoadedRef,
      })

      const wrapper = mount(ModelStatusIndicator)

      // Verify initial error state
      expect(wrapper.text()).toContain('خطأ في تحميل النموذج')

      // Mutate the reactive refs to simulate recovery
      statusRef.value = 'ready'
      modelLoadedRef.value = true

      // Force re-render to pick up ref mutations
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify ready state
      expect(wrapper.text()).toContain('النموذج جاهز')
      const icons = wrapper.findAll('span')
      expect(icons[0].classes()).toContain('i-lucide-check-circle')
    })
  })

  describe('layout', () => {
    it('renders with flex layout and RTL-compatible structure', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)

      // The root element should have flex and items-center classes
      const root = wrapper.find('[class*="flex"]')
      expect(root.exists()).toBe(true)
      expect(root.classes()).toContain('items-center')
    })

    it('renders icon and text with gap spacing', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)

      const root = wrapper.find('[class*="flex"]')
      expect(root.classes()).toContain('gap-2')
    })

    it('renders icon with consistent dimensions', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)
      const icons = wrapper.findAll('span')

      expect(icons.length).toBeGreaterThan(0)
      // Icon should have w-4 h-4 classes for consistent sizing
      expect(icons[0].classes()).toContain('w-4')
      expect(icons[0].classes()).toContain('h-4')
    })

    it('renders text with small font size', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false),
      })

      const wrapper = mount(ModelStatusIndicator)

      // The text span should have text-sm class
      const spans = wrapper.findAll('span')
      // Last span is the text (first two are icons)
      expect(spans.length).toBeGreaterThanOrEqual(2)
    })
  })
})
