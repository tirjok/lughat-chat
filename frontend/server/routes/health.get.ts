// Health check proxy for dev mode.
// In production, Nginx handles proxying (see nginx.conf).

export default defineEventHandler(async () => {
  const backendUrl = 'http://backend-dev:8000/health'

  const response = await $fetch(backendUrl, {
    method: 'GET'
  })

  return response
})
