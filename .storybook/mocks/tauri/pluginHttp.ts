export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined' && window.fetch) {
    return window.fetch(input, init)
  }
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
}
