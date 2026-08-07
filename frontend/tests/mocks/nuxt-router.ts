import type { RouteLocationNormalizedLoaded, NavigationGuardNext } from 'vue-router'

const routeState: { params: Record<string, string>; path: string } = {
  params: { level: 'a1', lesson: '1' },
  path: '/dashboard/level/a1/1'
}

export function useRoute() {
  return { ...routeState, record: { components: {} } } as RouteLocationNormalizedLoaded
}

export function useRouter() {
  return { push: () => Promise.resolve(undefined) }
}

export function useLink() {
  return {}
}

export function onBeforeRouteLeave(_guard: NavigationGuardNext) {
  // no-op
}

export function useLink() {
  return {}
}
