# ISSUE-007: Update nuxt.config.ts routeRules for New Pages

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Prerequisites; ADR-002, RC-5)
**Dependencies:** None (configuration change only)
**Scope:** Frontend config (`frontend/nuxt.config.ts`)

---

## Problem

Current `nuxt.config.ts` prerenders only `/`:

```ts
routeRules: {
  '/': { prerender: true }
}
```

New pages (`/dashboard`, `/dashboard/level/**`) are NOT prerendered. This is the correct tradeoff per ADR-002 (RC-5): dynamic pages are slower to load but show real data. However, the config must be explicitly updated to document and enforce this.

## Acceptance Criteria

### AC-1: routeRules explicitly excludes new pages from prerender
- `nuxt.config.ts` `routeRules` explicitly excludes `/dashboard` and `/dashboard/level/**` from prerendering
- Option A: Use `prerender: false` for explicit exclusion
- Option B: Omit them (Nuxt defaults to no prerender) — but explicit is clearer
- The config clearly documents which routes are prerendered and which are dynamic

### AC-2: Nginx SPA fallback handles all new routes (no config change needed)
- `nginx.conf` SPA fallback (`try_files $uri $uri/ /index.html`) already handles all new routes (verified per RC-4)
- No nginx.conf changes required
- Direct navigation to `/dashboard`, `/dashboard/level/a1`, `/dashboard/level/a1/1` returns `index.html` (SPA shell)

### AC-3: Dev proxy handles new routes
- `nitro.devProxy` in `nuxt.config.ts` proxies `/api/*` and `/health` to backend (already configured, no change needed)
- New pages can call API endpoints during development without CORS issues

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-07: Direct URL navigation | All new routes return SPA shell (nginx confirms) |

## ADR References

- **ADR-002** (Multi-Page SPA Routing): Defines prerender tradeoff — prerendered pages load faster but can't show live progress; dynamic pages are slower but show real data (RC-5)
- **RC-4**: Nginx SPA fallback already handles all new routes — confirmed, no config change needed
- **RC-5**: `routeRules` only prerenders `/` — confirmed correct per ADR

## Files

- `frontend/nuxt.config.ts` (modified — routeRules)
- `frontend/nginx.conf` (no change needed — verified per RC-4)
