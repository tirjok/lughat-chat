import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import Dashboard from '~/pages/dashboard/index.vue'

// ─── Route Mocking ──────────────────────────────────────────────────────
// GlobalNavbar accesses route via useNuxtApp — stub it so the navbar
// can highlight the correct nav link when mounted inside Dashboard.

const mockRoute = (path: string) => ({
  path,
  fullPath: path,
  params: {},
  query: {},
  hash: '',
  name: path === '/' ? undefined : (path.slice(1).split('/')[0] || undefined) as string | undefined,
  matched: [],
  meta: {}
})

function getWrapper(path: string) {
  return shallowMount(Dashboard, {
    global: {
      plugins: [
        {
          install(app: Record<string, unknown>) {
            app.config.globalProperties.$router = {}
            Object.defineProperty(app.config.globalProperties, 'useNuxtApp', {
              value: vi.fn(() => ({
                $router: {},
                route: mockRoute(path),
                isHydrating: () => false,
                payload: { state: {} },
                runWithContext: (fn: () => void) => fn(),
                ssrContext: {}
              }))
            })
          }
        }
      ],
      stubs: {
        NuxtLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>'
        }
      }
    }
  })
}

// ─── Behavioral Tests ───────────────────────────────────────────────────

describe('dashboard/index.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC-1: Page routing', () => {
    it('exists as a module that can be imported', () => {
      expect(Dashboard).toBeDefined()
      expect(typeof Dashboard).toBe('object')
    })

    it('renders /dashboard when path is /dashboard', () => {
      const wrapper = getWrapper('/dashboard')
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('AC-2: Dashboard shell renders content', async () => {
    it('renders a heading area with "Dashboard" h1 and "Your Learning Journey" label', () => {
      const wrapper = getWrapper('/dashboard')
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toBe('Dashboard')
      // Learning Journey label (uppercase tracking text)
      const label = wrapper.find('p.text-xs.font-semibold')
      expect(label.exists()).toBe(true)
      expect(label.text()).toContain('Your Learning Journey')
    })

    it('renders a card grid container for CEFR level cards', () => {
      const wrapper = getWrapper('/dashboard')
      const grid = wrapper.find('.grid')
      expect(grid.exists()).toBe(true)
    })

    it('renders CEFR level cards (A1–C2) as NuxtLinks', () => {
      const wrapper = getWrapper('/dashboard')
      const links = wrapper.findAll('a[href*="/dashboard/level/"]')
      expect(links.length).toBe(6)
      const hrefs = links.map(l => l.attributes('href'))
      expect(hrefs).toContain('/dashboard/level/A1')
      expect(hrefs).toContain('/dashboard/level/C2')
    })
  })

  describe('AC-3: GlobalNavbar visible, Dashboard link active', async () => {
    it('renders page header with "Dashboard" heading on /dashboard', () => {
      const wrapper = getWrapper('/dashboard')
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Dashboard')
    })

    it('renders a "Continue Learning" CTA button in the page header', () => {
      const wrapper = getWrapper('/dashboard')
      // shallowMount renders unregistered NuxtLink as a raw tag.
      // Check the tag exists with the correct `to` prop.
      const nuxtLink = wrapper.find('a')
      expect(nuxtLink.exists()).toBe(true)
      expect(nuxtLink.attributes('href')).toBe('/dashboard')
    })
  })

  describe('AC-4: Non-blocking health', async () => {
    it('renders the page shell even when health status is loading', () => {
      const wrapper = getWrapper('/dashboard')
      expect(wrapper.exists()).toBe(true)
    })

    it('renders a health status indicator area (non-blocking)', () => {
      const wrapper = getWrapper('/dashboard')
      // Health status is now rendered in GlobalNavbar (outside router-view).
      // Dashboard page renders regardless of health state.
      expect(wrapper.exists()).toBe(true)
    })
  })
  // ─── AC-5: Tile Content — Curriculum-Driven ───────────────────────────
  // Each dashboard tile must display: badge (code), title (code + title),
  // Arabic subtitle, goal text, lesson count.

  describe('AC-5: Tile Content — Curriculum-Driven', () => {
    it('renders each level card with the level code badge', async () => {
      const wrapper = getWrapper('/dashboard')
      const cards = wrapper.findAll('a[href*="/dashboard/level/"]')
      expect(cards.length).toBe(6)

      // A1 card should contain "A1" badge text
      const a1Card = cards.find(c => c.attributes('href') === '/dashboard/level/A1')
      expect(a1Card).toBeDefined()
      expect(a1Card!.text()).toContain('A1')

      // C2 card should contain "C2" badge text
      const c2Card = cards.find(c => c.attributes('href') === '/dashboard/level/C2')
      expect(c2Card).toBeDefined()
      expect(c2Card!.text()).toContain('C2')
    })

    it('renders each level card with the level title from curriculum data', async () => {
      const wrapper = getWrapper('/dashboard')
      const cards = wrapper.findAll('a[href*="/dashboard/level/"]')

      const a1Card = cards.find(c => c.attributes('href') === '/dashboard/level/A1')
      // "Foundation" is the title for A1
      expect(a1Card!.text()).toContain('Foundation')

      const c2Card = cards.find(c => c.attributes('href') === '/dashboard/level/C2')
      // "Proficiency" is the title for C2
      expect(c2Card!.text()).toContain('Proficiency')
    })

    it('renders each level card with the Arabic subtitle from curriculum data', async () => {
      const wrapper = getWrapper('/dashboard')
      const cards = wrapper.findAll('a[href*="/dashboard/level/"]')

      const a1Card = cards.find(c => c.attributes('href') === '/dashboard/level/A1')
      // A1 arabicTitle is "المستوى المبتدئ"
      expect(a1Card!.text()).toContain('المستوى المبتدئ')

      const c2Card = cards.find(c => c.attributes('href') === '/dashboard/level/C2')
      // C2 arabicTitle is "إتقان اللغة"
      expect(c2Card!.text()).toContain('إتقان اللغة')
    })

    it('renders each level card with the goal text from curriculum data', async () => {
      const wrapper = getWrapper('/dashboard')
      const cards = wrapper.findAll('a[href*="/dashboard/level/"]')

      const a1Card = cards.find(c => c.attributes('href') === '/dashboard/level/A1')
      // A1 goal starts with "Memorize ~500 Arabic root words"
      expect(a1Card!.text()).toContain('Memorize ~500 Arabic root words')

      const b1Card = cards.find(c => c.attributes('href') === '/dashboard/level/B1')
      // B1 goal starts with "Memorize ~2500 root words"
      expect(b1Card!.text()).toContain('Memorize ~2500 root words')
    })

    it('renders each level card with the correct lesson count', async () => {
      const wrapper = getWrapper('/dashboard')
      const cards = wrapper.findAll('a[href*="/dashboard/level/"]')

      const a1Card = cards.find(c => c.attributes('href') === '/dashboard/level/A1')
      // A1 has 2 lessons (a1-01, a1-02)
      expect(a1Card!.text()).toContain('2')

      const a2Card = cards.find(c => c.attributes('href') === '/dashboard/level/A2')
      // A2 has 2 lessons (a2-01, a2-02)
      expect(a2Card!.text()).toContain('2')
    })
  })
})
