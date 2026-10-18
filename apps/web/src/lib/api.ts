export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(
  path: string,
  body: object,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 422
        ? 'Please check your player details and try again.'
        : 'The server could not complete the request. Please try again.',
      response.status,
    )
  }
  return response.json() as Promise<T>
}
