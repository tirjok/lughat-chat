// Health check proxy for dev mode.
// In production, Nginx handles proxying (see nginx.conf).

export default defineEventHandler(async () => {
  const backendUrl = process.env.NODE_ENV === 'docker'
    ? 'http://localhost:9100/health'
    : 'http://localhost:9200/health'

  const response = await $fetch(backendUrl, {
    method: 'GET'
  })

  return response
})
