# ADR-010: Non-Blocking Frontend Boot with Loading Screen

## Status

**Accepted** — 2026-07-11

Addresses **RC-6**: Frontend container blocks entirely while backend downloads model (~5–10 min on first start).

---

## Context

On first startup, the backend downloads ~2GB of XTTS-v2 model weights, taking 5–10 minutes. The current `docker-compose.yml` configures the frontend with:

```yaml
frontend:
  depends_on:
    backend:
      condition: service_healthy  # Blocks until backend health check passes
```

This creates a **dead period** of 5–10 minutes where:

1. The backend starts and begins downloading the model
2. The frontend container **does not start at all** — it blocks until the backend health check passes
3. The user sees a blank page or "connection refused" error
4. **No feedback** is provided about what's happening, how long it will take, or that anything is in progress
5. The user may assume the application is broken and abandon it

### Why This Is a Race Condition

The race is between **container startup order** (orchestrated by Docker Compose) and **model download duration** (an asynchronous, variable-length process within the backend container). Docker Compose's `depends_on` with `service_healthy` waits for the *health check* to pass — but the health check itself only verifies the HTTP server is running, not that the TTS model has finished loading. The health check has `start_period: 120s` and `retries: 200` (3000 seconds / 50 minutes total), during which the frontend is completely blocked.

### Current Frontend Health Polling

The existing `useHealthPoll.ts` composable already polls `/health` every 2 seconds and exposes `status` (`'loading' | 'ready' | 'error'`). It was designed to handle the loading window, but it has **no UI to render during that window** because the frontend container never starts.

The composable's default retry count is 10 (20 seconds total). This is sufficient for normal operation but **insufficient for a 5–10 minute model download**. This ADR addresses both the container orchestration issue and the composable's retry limit.

---

## Decision

### We choose: Non-Blocking Frontend Boot + Loading Screen

The frontend container will **boot immediately** (no longer blocked by `depends_on`), and the user will see a full-page **LoadingScreen** while `useHealthPoll()` polls `/health` in the background. When `status` transitions from `'loading'` to `'ready'`, the LoadingScreen fades out and the main dashboard fades in.

### Implementation

1. **Remove the blocking `depends_on`** from `docker-compose.yml`
2. **Create `LoadingScreen.vue`** — a full-page, RTL-aware loading screen (logo, Arabic text, animated spinner)
3. **Integrate `useHealthPoll()` as a loading guard** on every route
4. **Extend the retry count** to accommodate 5–10 minute model downloads (e.g., 150 retries = 5 minutes at 2s intervals)

### User Experience (First Startup)

```
1. User runs `docker compose up --build`
2. Backend starts, downloads ~2GB model (5–10 minutes)
3. Frontend starts immediately, shows LoadingScreen:
   ┌─────────────────────────────────────────┐
   │                                         │
   │        🌊 LughatChat                    │
   │                                         │
   │     جاري تحميل النموذج...              │
   │     يرجى الانتظار                      │
   │                                         │
   │     ⏳ قد يستغرق هذا بضعة دقائق        │
   │                                         │
   └─────────────────────────────────────────┘
4. useHealthPoll polls /health every 2 seconds
5. Model finishes downloading, /health returns { status: 'ready' }
6. LoadingScreen fades out → Dashboard fades in
7. User sees roadmap (A1 Lesson 1 available)
```

### User Experience (Subsequent Startups)

```
1. User runs `docker compose up`
2. Backend loads model from volume in ~10–30 seconds
3. Frontend shows LoadingScreen briefly (1–2 health polls)
4. Dashboard appears almost immediately
```

---

## Options Considered

### Option A: Non-Blocking Frontend Boot + Loading Screen (Chosen)

The frontend starts immediately and shows a loading screen while polling the backend health endpoint.

**Pros:**
- User gets **immediate feedback** — no dead time
- Frontend starts in seconds regardless of backend state
- `useHealthPoll.ts` is already battle-tested and provides exactly what's needed
- Model cache persistence makes subsequent startups nearly instantaneous (10–30s)
- No backend changes required — `/health` already returns `{ status: 'loading' }` during model download
- Loading screen is a **full-page overlay**, not a nav-bar indicator — replaces the entire UI until the model is ready
- Existing `ModelStatusIndicator.vue` and `MobileStatusIndicator.vue` can remain as-is (they already reflect `useHealthPoll()` state in the nav bar)

**Cons:**
- Nginx serves the SPA even when the backend is not ready — Nginx's reverse proxy will return 502/503 for API calls until the backend is available. This is acceptable because the loading screen prevents user interaction.
- The frontend container consumes resources (Nginx process, Node.js if in dev mode) during the 5–10 minute download — negligible overhead
- Requires the retry count to be extended from 10 (20s) to 150+ (5–10 min), which changes the error threshold

### Option B: Keep Current Blocking Behavior

Keep `depends_on: backend.condition: service_healthy` and accept the 5–10 minute dead period.

**Pros:**
- Simplest configuration — no frontend changes
- Frontend container doesn't consume resources during model download
- No new components to build or maintain

**Cons:**
- User sees a blank page or "connection refused" for 5–10 minutes
- **No feedback** — user may assume the app is broken and abandon it
- This is a **first-impression killer** — the app appears to fail on first use
- No graceful UX during the longest startup scenario (which happens only once)
- Subsequent startups are fast (10–30s) but the first startup experience is unusable

### Option C: Frontend Boot + API Proxy Error Pages

Remove the `depends_on` block but do not add a loading screen. Instead, let the frontend load the normal UI with disabled/grayed-out controls, and show inline error messages when API calls fail.

**Pros:**
- No new component to build
- User sees the dashboard immediately, knows what the app is
- API calls fail gracefully with error toasts

**Cons:**
- The dashboard is **non-functional** — no lessons can be browsed, no TTS can be used
- User sees a broken-looking app with disabled controls and error messages
- **More confusing** than a loading screen — "Why is everything grayed out? Is the app broken?"
- The loading screen from Option A is **more honest** about what's happening ("the model is downloading") vs. a broken-looking dashboard ("something is wrong")
- No indication of how long the wait will be

### Option D: Backend Health Check That Waits for Model Before Passing

Modify the backend's health check to not pass (return non-200) until the TTS model is fully loaded. This is **already the current behavior** — the health check returns `{ status: 'loading', model_loaded: false }` which is HTTP 200 but the health check itself passes as long as the HTTP server responds.

**What this option actually means:** Keep the current behavior and accept the dead period (essentially Option B, just with a more explicit description of the current state).

---

## Trade-off Analysis

| Dimension | Option A (Chosen) | Option B (Current) | Option C (Error Pages) |
|-----------|-------------------|--------------------|------------------------|
| **First-start UX** | Excellent — user knows what's happening | Poor — dead screen for 5–10 min | Poor — broken-looking UI |
| **Subsequent-start UX** | Nearly identical (10–30s) | Nearly identical (10–30s) | Nearly identical (10–30s) |
| **Implementation effort** | Medium (new component + route guard) | None (current state) | Low (no new component) |
| **Resource usage** | Frontend runs during download (negligible) | Frontend doesn't run | Frontend runs during download |
| **Error handling** | Explicit error state with retry | No error visible | Inline error messages |
| **Maintenance** | One new component to maintain | No new code | No new code |
| **First-impression** | Professional, reassuring | Alarming (app seems broken) | Confusing (app seems broken) |
| **Docker complexity** | Lower (no circular dependency) | Higher (circular wait) | Lower (no circular dependency) |

### What We're Giving Up

- **Resource efficiency on first startup** — The frontend container runs during the 5–10 minute model download, consuming a small amount of CPU and memory. This is negligible (~5MB for Nginx + Node) but non-zero.
- **Configuration simplicity** — We remove the `depends_on` block, which is a safety mechanism. If the backend ever fails to start (not just model loading, but a crash), the frontend will still boot and show the loading screen indefinitely. We mitigate this with the error state in `useHealthPoll`.

### Why This Is Reversible

This decision is **easy to revert** — simply re-add the `depends_on` block to `docker-compose.yml`. The frontend code (LoadingScreen, loading guard) can be removed without affecting the backend. The loading screen is a **purely cosmetic layer** over existing infrastructure (`useHealthPoll`, `/health` endpoint). No backend contract changes are involved.

---

## Consequences

### What Becomes Easier

- **First-time user onboarding** — Users get immediate, reassuring feedback during the longest startup scenario
- **Subsequent startups** — The loading screen disappears almost instantly (1–2 health polls) since the model loads from volume in 10–30 seconds
- **Error communication** — The loading screen has an explicit error state with a retry button, replacing the current "no feedback" state
- **No backend changes** — `/health` already returns `{ status: 'loading' }` during model download; no API modifications needed

### What Becomes Harder

- **Docker compose configuration** — Removing `depends_on` means the frontend starts even if the backend crashes. We mitigate this with the error state in `useHealthPoll`, but there's no longer a hard failure at the container level.
- **Nginx reverse proxy behavior** — While the loading screen prevents user interaction, Nginx will still proxy API requests to the backend. If a user bypasses the loading screen (e.g., network inspection), they'll get 502 errors until the backend is ready. This is acceptable because the loading screen is the **only** thing a normal user sees.
- **Retry count management** — The default 10 retries (20 seconds) must be overridden per-page with a higher count (e.g., 150 for 5 minutes). This is a configuration concern, not a code concern, but it means the error threshold is no longer uniform across the app.

### Impact on Existing Components

| Component | Impact |
|-----------|--------|
| `useHealthPoll.ts` | **No changes needed** — already provides `status` and `modelLoaded`. Only the `maxRetries` parameter needs to be higher for model download scenarios. |
| `ModelStatusIndicator.vue` | **No changes** — already reflects `useHealthPoll()` state in the nav bar |
| `MobileStatusIndicator.vue` | **No changes** — already reflects `useHealthPoll()` state in the nav bar |
| `index.vue` (current TTS Studio) | **Modified** — add loading guard: render `LoadingScreen` while `status === 'loading'` |
| `playground.vue` (new) | **Modified** — same loading guard |
| `lesson/[id].vue` (new) | **Modified** — same loading guard |
| `docker-compose.yml` | **Modified** — remove `depends_on.backend.condition` |

### Files to Create/Modify

| File | Action |
|------|--------|
| `app/components/LoadingScreen.vue` | **NEW** — Full-page loading UI (logo, Arabic text, spinner) |
| `docker-compose.yml` | **MODIFY** — Remove `depends_on.backend.condition` |
| `app/pages/index.vue` | **MODIFY** — Add loading guard (render `LoadingScreen` while `status === 'loading'`) |
| `app/pages/playground.vue` | **MODIFY** — Add loading guard (or use shared layout wrapper) |
| `app/pages/lesson/[id].vue` | **MODIFY** — Add loading guard (or use shared layout wrapper) |

---

## Migration Notes

- The `useHealthPoll` composable is **already battle-tested** with 10 retries at 2-second intervals (20 seconds total). For model downloads lasting 5–10 minutes, **increase `maxRetries`** to accommodate: e.g., `useHealthPoll({ maxRetries: 150 })` (5 minutes at 2s intervals) or `useHealthPoll({ maxRetries: 300 })` (10 minutes).
- The loading screen is a **full-page overlay**, not a nav-bar indicator — it replaces the entire UI until the model is ready. This is intentional: during the 5–10 minute download, there is nothing else for the user to do.
- No changes to the backend are required — `/health` already returns `{ status: 'loading' }` during model download.
- The existing `ModelStatusIndicator.vue` and `MobileStatusIndicator.vue` show status in the nav bar — these can remain as-is since they already reflect `useHealthPoll()` state. They serve as a secondary status indicator alongside the full-page loading screen.

---

## References

- **PRD**: [The Docker Health Check Race Condition](../../PRD.md#the-docker-health-check-race-condition)
- **Issue**: [RC-6](../../PRD.md#known-issues)
- **Component**: [`useHealthPoll.ts`](../../frontend/app/composables/useHealthPoll.ts)
- **Configuration**: [`docker-compose.yml`](../../docker-compose.yml)
- **Related ADRs**:
  - [ADR-009: Frontend SPA Architecture](./ADR-009-frontend-spa-architecture-routing-navigation-state.md) — establishes routing and navigation patterns
  - [ADR-004: Cloud Deployment](./ADR-004-cloud-deployment-and-scalability.md) — discusses Docker Compose deployment (suspended but relevant for container orchestration patterns)
  - [IMPLEMENTATION: Model Loading Polling Fix](../implementation/IMPLEMENTATION-model-loading-polling-fix.md) — backend health polling implementation
