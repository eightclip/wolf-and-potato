import type { LocationEvent, RoomHeat, RoomId, TimeRange } from './types'

export function getWindowStart(range: TimeRange): Date {
  const now = new Date()
  if (range === '1h') {
    return new Date(now.getTime() - 60 * 60 * 1000)
  }
  if (range === '6h') {
    return new Date(now.getTime() - 6 * 60 * 60 * 1000)
  }
  if (range === 'today') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // yesterday
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWindowEnd(range: TimeRange): Date {
  if (range === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    d.setHours(23, 59, 59, 999)
    return d
  }
  return new Date()
}

/**
 * Given raw location events (already filtered to a dog + time window),
 * compute how many minutes were spent in each room.
 */
export function computeHeat(events: LocationEvent[], liveRoom: RoomId | null): RoomHeat[] {
  const now = Date.now()
  const minutes: Partial<Record<RoomId, number>> = {}

  for (const ev of events) {
    const entered = new Date(ev.entered_at).getTime()
    const exited = ev.exited_at ? new Date(ev.exited_at).getTime() : now
    const dwell = Math.max(0, (exited - entered) / 60_000)
    const room = ev.room as RoomId
    minutes[room] = (minutes[room] ?? 0) + dwell
  }

  const allRooms: RoomId[] = ['garage', 'studio', 'kitchen', 'living_room', 'bedroom', 'yard']
  return allRooms.map(room => ({
    room,
    minutes: minutes[room] ?? 0,
    isLive: room === liveRoom,
  }))
}

/**
 * Returns an opacity value 0–0.85 for a heat score, using a sqrt scale
 * so even small dwell times show up a little.
 */
export function heatOpacity(minutes: number, maxMinutes: number): number {
  if (minutes === 0 || maxMinutes === 0) return 0
  return Math.min(0.85, 0.12 + 0.73 * Math.sqrt(minutes / maxMinutes))
}
