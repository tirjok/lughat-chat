import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DownloadButton from '../app/components/DownloadButton.vue'

describe('DownloadButton', () => {
  it('emits click when clicked', async () => {
    const onClick = vi.fn()
    const wrapper = mount(DownloadButton, {
      props: { onClick }
    })

    await wrapper.find('button').trigger('click')

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  describe('Issue 21: aria-labels on icon buttons', () => {
    it('has aria-label="Download audio"', () => {
      const wrapper = mount(DownloadButton, {
        props: { onClick: vi.fn() }
      })

      expect(wrapper.find('button').attributes('aria-label')).toBe('Download audio')
    })
  })
})
