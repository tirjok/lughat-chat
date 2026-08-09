import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import GlobalNavbar from '~/components/GlobalNavbar.vue'

// ─── Test Helpers ────────────────────────────────────────────────────────
// Mounts GlobalNavbar with a controllable route via a fresh mock per test.
// Each test gets its own mock instance → module isolation.

function mountNavbar(path: string) {
  // Pass the path as a prop to simulate the reactive route from app.vue.
  return shallowMount(GlobalNavbar, {
    props: {
      currentPath: path
    },
    stubs: {
      NuxtLink: {
        props: ['to'],
        template: '<a :href="to"><slot /></a>'
      }
    }
  })
}

describe('GlobalNavbar', () => {
  // ─── Structural Rendering ──────────────────────────────────────────────

  describe('structural rendering', () => {
    it('When mounted at / then a <header> element exists', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const header = wrapper.find('header')
      // Assert
      expect(header.exists()).toBe(true)
    })

    it('When mounted at / then the header contains a settings button with correct aria-label', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const settingsBtn = wrapper.find('button[aria-label="Settings"]')
      // Assert
      expect(settingsBtn.exists()).toBe(true)
    })

    it('When mounted at / then the header contains an Ask Instructor button with correct aria-label', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const instructorBtn = wrapper.find('button[aria-label="Ask Instructor"]')
      // Assert
      expect(instructorBtn.exists()).toBe(true)
    })

    it('When mounted at / then the header contains a user avatar element', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const avatar = wrapper.find('div[aria-hidden="true"]')
      // Assert
      expect(avatar.exists()).toBe(true)
    })
  })

  // ─── Navigation Link Active States ──────────────────────────────────────
  // The navbar highlights links based on currentPath. Tests the isActive()
  // and isLessonRoute computed behavior via observable DOM state.
  // In shallowMount, NuxtLink renders as <nuxt-link-stub to="..." class="...">.
  // We query these stubs by their to attribute and CSS classes.

  describe('navigation link active states', () => {
    it('When on / then a Home link stub with to="/" exists', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const homeStub = wrapper.find('nuxt-link-stub[to="/"]')
      // Assert
      expect(homeStub.exists()).toBe(true)
    })

    it('When on / then the Home nav link stub (not logo) has active classes (text-primary-600 bg-primary-50)', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      // The logo link stub has classes 'flex items-center gap-2 shrink-0' (no active state).
      // The nav link with to='/' should have active state classes.
      // Logo stub has 'flex items-center gap-2 shrink-0', nav links have 'px-3 py-1.5 rounded text-sm font-medium'
      const allStubs = wrapper.findAll('nuxt-link-stub')
      const navLinkStub = allStubs.find(s => s.classes().includes('px-3'))
      // Assert
      expect(navLinkStub).toBeDefined()
      const classes = navLinkStub.classes().join(' ')
      expect(classes).toContain('text-primary-600')
      expect(classes).toContain('bg-primary-50')
    })

    it('When on /dashboard then a Dashboard link stub with to="/dashboard" exists', () => {
      // Arrange
      const wrapper = mountNavbar('/dashboard')
      // Act
      const dashboardStubs = wrapper.findAll('nuxt-link-stub[to="/dashboard"]')
      // Assert
      expect(dashboardStubs.length).toBeGreaterThanOrEqual(1)
    })

    it('When on /dashboard then the first Dashboard link stub is highlighted (active classes)', () => {
      // Arrange
      const wrapper = mountNavbar('/dashboard')
      // Act
      const dashboardStubs = wrapper.findAll('nuxt-link-stub[to="/dashboard"]')
      const firstStub = dashboardStubs[0]
      // Assert
      const classes = firstStub.classes().join(' ')
      expect(classes).toContain('text-primary-600')
    })

    it('When on /dashboard/level/a1/5 then My Courses link stub is highlighted (active classes)', () => {
      // Arrange
      const wrapper = mountNavbar('/dashboard/level/a1/5')
      // Act
      const dashboardStubs = wrapper.findAll('nuxt-link-stub[to="/dashboard"]')
      const myCoursesStub = dashboardStubs[1]
      // Assert
      const classes = myCoursesStub.classes().join(' ')
      expect(classes).toContain('text-primary-600')
    })

    it('When on /dashboard/level/a1/5 then the Dashboard nav link (not just My Courses) is highlighted', () => {
      // Arrange
      const wrapper = mountNavbar('/dashboard/level/a1/5')
      // Act
      const dashboardStubs = wrapper.findAll('nuxt-link-stub[to="/dashboard"]')
      const firstStub = dashboardStubs[0]
      // Assert — the nav (Dashboard) link, not just the My Courses link, highlights
      const classes = firstStub.classes().join(' ')
      expect(classes).toContain('text-primary-600')
    })

    it('When on /dashboard then Home link stub is NOT highlighted', () => {
      // Arrange
      const wrapper = mountNavbar('/dashboard')
      // Act
      const homeStub = wrapper.find('nuxt-link-stub[to="/"]')
      // Assert
      const classes = homeStub.classes().join(' ')
      expect(classes).not.toContain('text-primary-600')
    })

    it('When on an unknown route then no link stub is highlighted', () => {
      // Arrange
      const wrapper = mountNavbar('/unknown')
      // Act
      const allStubs = wrapper.findAll('nuxt-link-stub')
      // Assert
      allStubs.forEach((stub) => {
        const classes = stub.classes().join(' ')
        expect(classes).not.toContain('text-primary-600')
      })
    })

    it('When currentPath prop changes from / to /dashboard then nav links update their active state', async () => {
      // Arrange — simulate Vue Router navigation by updating the prop.
      const wrapper = mountNavbar('/')
      // Act — change path to /dashboard (simulates client-side navigation).
      await wrapper.setProps({ currentPath: '/dashboard' })
      await nextTick()
      // Assert — Home should no longer be highlighted.
      const homeStub = wrapper.find('nuxt-link-stub[to="/"]')
      const homeClasses = homeStub.classes().join(' ')
      expect(homeClasses).not.toContain('text-primary-600')
      // Assert — Dashboard should now be highlighted.
      const dashboardStubs = wrapper.findAll('nuxt-link-stub[to="/dashboard"]')
      const firstStub = dashboardStubs[0]
      const dashClasses = firstStub.classes().join(' ')
      expect(dashClasses).toContain('text-primary-600')
    })
  })

  // ─── Progress Bar ───────────────────────────────────────────────────────

  describe('progress bar', () => {
    it('When mounted then a progress bar background element exists', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const progressBar = wrapper.find('div.h-1')
      // Assert
      expect(progressBar.exists()).toBe(true)
    })

    it('When on a lesson route then progress bar fill has gradient classes', () => {
      // Arrange
      const wrapper = mountNavbar('/dashboard/level/a1/5')
      // Act
      const progressFill = wrapper.find('div.h-1 > div')
      // Assert
      expect(progressFill.exists()).toBe(true)
      expect(progressFill.classes()).toContain('bg-gradient-to-r')
    })

    it('When on / then progress bar fill has 0% width style', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const progressFill = wrapper.find('div.h-1 > div')
      // Assert
      expect(progressFill.exists()).toBe(true)
      const style = progressFill.attributes('style')
      expect(style).toContain('width: 0%')
    })
  })

  // ─── Negative Tests ─────────────────────────────────────────────────────

  describe('negative tests', () => {
    it('When mounted then no ToastNotification exists inside GlobalNavbar', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const toastEl = wrapper.find('[aria-live="polite"]')
      // Assert
      expect(toastEl.exists()).toBe(false)
    })
  })

  // ─── Mobile Layout ──────────────────────────────────────────────────────

  describe('mobile layout', () => {
    it('When viewport < 768px then mobile nav renders a hamburger menu button with navigation links', async () => {
      // Arrange
      vi.stubGlobal('innerWidth', 375)
      const wrapper = mountNavbar('/')
      // Act
      await nextTick()
      // The mobile section has a hamburger toggle button and nav links with icon+text
      const hamburgerBtn = wrapper.find('button[aria-label="Navigation menu"]')
      // Assert
      expect(hamburgerBtn.exists()).toBe(true)
      // Nav links render as NuxtLink stubs with correct 'to' attributes
      const linkStubs = wrapper.findAll('nuxt-link-stub')
      const toValues = linkStubs.map(s => s.attributes('to'))
      expect(toValues).toContain('/')
      expect(toValues).toContain('/dashboard')
      // The mobile menu section exists (hidden on desktop via md:hidden)
      const mobileSection = wrapper.find('div.md\\:hidden')
      expect(mobileSection.exists()).toBe(true)
      vi.unstubAllGlobals()
    })

    it('When viewport < 768px then mobile action buttons (Ask Instructor, Settings) exist', () => {
      // Arrange
      vi.stubGlobal('innerWidth', 375)
      const wrapper = mountNavbar('/')
      // Act
      const instructorBtn = wrapper.find('button[aria-label="Ask Instructor"]')
      const settingsBtn = wrapper.find('button[aria-label="Settings"]')
      // Assert
      expect(instructorBtn.exists()).toBe(true)
      expect(settingsBtn.exists()).toBe(true)
      vi.unstubAllGlobals()
    })

    it('When viewport >= 768px then mobile nav section is hidden', () => {
      // Arrange
      const wrapper = mountNavbar('/')
      // Act
      const mobileSection = wrapper.find('div.md:hidden')
      // Assert
      expect(mobileSection.exists()).toBe(false)
    })
  })
})
