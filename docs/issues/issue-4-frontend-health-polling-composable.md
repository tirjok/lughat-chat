# Issue 4: Frontend Health Polling Composable

## What to build

Create a Nuxt composable that polls the backend `/health` endpoint every 2 seconds and exposes reactive model loading status. This composable is the foundation for all frontend loading states.

After this is complete, any component can import the composable and react to model status changes (`loading` → `ready` → `error`).

## Acceptance criteria

- [ ] Composable polls `/health` endpoint every 2 seconds
- [ ] Exposes reactive `status` ref with values: `'loading' | 'ready' | 'error'`
- [ ] Exposes reactive `modelLoaded` boolean derived from status
- [ ] Handles network errors gracefully (keeps polling on failure)
- [ ] Stops polling when status is `'ready'` or `'error'` (no unnecessary requests)
- [ ] Returns clean API: `{ status, modelLoaded }`
- [ ] Works with relative URLs (Nginx proxy routing)

## Blocked by

- Issue 2: Backend API Foundation — FastAPI Endpoints & Health Check
