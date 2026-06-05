import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import App from '../app/app.vue'

let mockUseHead: ReturnType<typeof vi.fn>
let mockUseSeoMeta: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockUseHead = vi.fn()
  mockUseSeoMeta = vi.fn()
  ;(globalThis as Record<string, unknown>).useHead = mockUseHead
  ;(globalThis as Record<string, unknown>).useSeoMeta = mockUseSeoMeta
})

describe('app.vue — dark theme meta tags', () => {
  it('sets theme-color meta tag for dark mode with #0f172a', () => {
    mount(App)

    expect(mockUseHead).toHaveBeenCalled()
    const headConfig = mockUseHead.mock.calls[0][0]

    expect(headConfig.meta).toContainEqual(
      expect.objectContaining({
        name: 'theme-color',
        content: '#0f172a',
        media: '(prefers-color-scheme: dark)'
      })
    )
  })

  it('sets theme-color meta tag for light mode with #ffffff', () => {
    mount(App)

    expect(mockUseHead).toHaveBeenCalled()
    const headConfig = mockUseHead.mock.calls[0][0]

    expect(headConfig.meta).toContainEqual(
      expect.objectContaining({
        name: 'theme-color',
        content: '#ffffff',
        media: '(prefers-color-scheme: light)'
      })
    )
  })

  it('sets viewport-fit=cover in the viewport meta tag', () => {
    mount(App)

    expect(mockUseHead).toHaveBeenCalled()
    const headConfig = mockUseHead.mock.calls[0][0]

    expect(headConfig.meta).toContainEqual(
      expect.objectContaining({
        name: 'viewport',
        content: expect.stringContaining('viewport-fit=cover')
      })
    )
  })

  it('sets color-scheme to dark light on html element', () => {
    mount(App)

    expect(mockUseHead).toHaveBeenCalled()
    const headConfig = mockUseHead.mock.calls[0][0]

    expect(headConfig.htmlAttrs).toHaveProperty('colorScheme', 'dark light')
  })
})
