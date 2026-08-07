import type { NuxtApp } from 'nuxt/app'

// Mutable state for tests to switch between route scenarios.
let _routeState: { params: Record<string, string>, path: string } = {
  params: { level: 'a1', lesson: '1' },
  path: '/dashboard/level/a1/1'
}

export function useNuxtApp(): NuxtApp {
  const vueApp = {
    config: { globalProperties: {} },
    mount: () => vueApp,
    unmount: () => {},
    provider: {}
  } as unknown as NuxtApp['vueApp']
  return {
    vueApp,
    ssrContext: {},
    payload: { state: {} },
    runWithContext: (fn: () => void) => fn(),
    route: {
      params: { ..._routeState.params },
      path: _routeState.path,
      fullPath: _routeState.path,
      query: {},
      hash: '',
      name: 'lesson' as string | undefined,
      matched: [],
      meta: {}
    }
  } as unknown as NuxtApp
}

export function setMockRouteState(state: { params: Record<string, string>, path: string }) {
  _routeState = state
}
