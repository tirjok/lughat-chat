// Catch-all API proxy for dev mode.
// In production, Nginx handles proxying (see nginx.conf).
// This server route is compiled by Nitro at build time, but the
// $fetch call resolves the backend URL at request time since
// it uses the hardcoded container service name.

export default defineEventHandler(async (event) => {
  const backendUrl = `http://backend-dev:8000${event.path}`

  const body = await readBody(event).catch(() => undefined)

  const response = await $fetch(backendUrl, {
    method: event.method,
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })

  return response
})
