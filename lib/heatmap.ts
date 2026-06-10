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
 * Given raw sample dots (already filtered to a dog + time window), count how
 * many dots landed in each room. With 1-dot-per-minute sampling this count is
 * effectively "minutes spent there."
 */
export function computeHeat(events: LocationEvent[], liveRoom: RoomId | null): RoomHeat[] {
  const counts: Partial<Record<RoomId, number>> = {}
  const distSum: Partial<Record<RoomId, number>> = {}

  for (const ev of events) {
    const room = ev.room as RoomId
    counts[room] = (counts[room] ?? 0) + 1
    distSum[room] = (distSum[room] ?? 0) + (ev.distance_m ?? 0)
  }

  const allRooms: RoomId[] = ['kitchen', 'living_room', 'office', 'yard']
  return allRooms.map(room => {
    const count = counts[room] ?? 0
    return {
      room,
      count,
      avgDistance: count ? (distSum[room] ?? 0) / count : 0,
      isLive: room === liveRoom,
    }
  })
}

/**
 * Returns an opacity value 0–0.85 for a dot count, using a sqrt scale
 * so even a few dots show up a little.
 */
export function heatOpacity(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0
  return Math.min(0.85, 0.12 + 0.73 * Math.sqrt(count / maxCount))
}
