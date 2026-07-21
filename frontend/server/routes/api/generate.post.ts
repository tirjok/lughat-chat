// API proxy for TTS synthesis endpoint in dev mode.
// In production, Nginx handles proxying (see nginx.conf).

export default defineEventHandler(async (event) => {
  const backendUrl = process.env.NODE_ENV === 'docker'
    ? 'http://localhost:9100/api/generate'
    : 'http://localhost:9200/api/generate'

  const body = await readBody(event)

  const response = await $fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })

  // Return the raw response (audio blob) as-is
  return response
})
