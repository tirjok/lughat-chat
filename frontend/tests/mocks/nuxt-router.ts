import type { RouteLocationNormalizedLoaded, NavigationGuardNext } from 'vue-router'

const routeState: { params: Record<string, string>, path: string } = {
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

// Stores the callback passed to onBeforeRouteLeave so tests can invoke it.
let _leaveCallback: NavigationGuardNext | null = null

export function onBeforeRouteLeave(guard: NavigationGuardNext) {
  _leaveCallback = guard
}

// Tests can retrieve the registered leave handler for functional testing.
export function getRegisteredLeaveHandler(): NavigationGuardNext | null {
  return _leaveCallback
}
