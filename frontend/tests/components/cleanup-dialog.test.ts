import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import CleanupDialog from '../app/components/CleanupDialog.vue'

// ─── beforeEach / afterEach ───────────────────────────────────────
let wrapper: VueWrapper

beforeEach(() => {
  wrapper = mount(CleanupDialog, {
    props: { visible: true }
  })
})

afterEach(() => {
  wrapper.unmount()
})

// ─── AC-3: Accessible confirmation dialog ──────────────────────────

describe('CleanupDialog.vue — accessible confirmation dialog (AC-3)', () => {
  it('When visible is true then dialog renders with ARIA attributes', async () => {
    const dialog = wrapper.find('[data-cleanup-dialog]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBeTruthy()
  })

  it('When visible is true then it contains the confirmation message', () => {
    const dialog = wrapper.find('[data-cleanup-dialog]')
    expect(dialog.text()).toContain('A synthesis is in progress')
  })

  it('When visible is true then it has "Clean & Leave" and "Stay" buttons', () => {
    const cleanLeaveBtn = wrapper.find('[data-cleanup-action="clean"]')
    const stayBtn = wrapper.find('[data-cleanup-action="stay"]')
    expect(cleanLeaveBtn.exists()).toBe(true)
  })
  it('When visible is false then dialog is not rendered', async () => {
    await wrapper.setProps({ visible: false })
    await nextTick()
    const dialog = wrapper.find('[data-cleanup-dialog]')
    expect(dialog.exists()).toBe(false)
  })
})

// ─── AC-4: "Clean & Leave" button behavior ─────────────────────────

describe('CleanupDialog.vue — "Clean & Leave" button (AC-4)', () => {
  it('When "Clean & Leave" is clicked then cleanup event is emitted', async () => {
    const cleanLeaveBtn = wrapper.find('[data-cleanup-action="clean"]')
    await cleanLeaveBtn.trigger('click')
    expect(wrapper.emitted('cleanup')).toHaveLength(1)
  })
})

// ─── AC-5: "Stay" button behavior ──────────────────────────────────

describe('CleanupDialog.vue — "Stay" button (AC-5)', () => {
  it('When "Stay" is clicked then stay event is emitted', async () => {
    const stayBtn = wrapper.find('[data-cleanup-action="stay"]')
    await stayBtn.trigger('click')
    expect(wrapper.emitted('stay')).toHaveLength(1)
  })
})
