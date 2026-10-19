import { ApiError } from '@/lib/api'
import type { DemoCommand, DemoRoom } from './types'

async function request(path: string, body: object, signal?: AbortSignal): Promise<DemoRoom> {
  let response: Response
  try {
    response = await fetch(`/api/demo/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
        : AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ApiError('Connection lost. Check your connection and retry.', 0)
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 404
        ? 'Room not found or expired. Check the code or create a new demo.'
        : response.status === 409
          ? 'The demo changed. Review the latest update and try again.'
          : 'Could not save the demo. Please try again.',
      response.status,
    )
  }
  return response.json() as Promise<DemoRoom>
}
export const createRoom = () => request('create', {})
export const readRoom = (room: string, signal?: AbortSignal) => request('read', { room }, signal)
export const updateRoom = (room: DemoRoom, command: DemoCommand) =>
  request('update', { room: room.room, revision: room.revision, command })
