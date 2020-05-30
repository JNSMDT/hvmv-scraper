/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  return new Response(testValue, {
    headers: { 'content-type': 'application/json' },
  })
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})