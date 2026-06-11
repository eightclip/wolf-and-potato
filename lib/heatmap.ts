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

// Heat memory: each sample's contribution halves every HALF_LIFE_MIN minutes,
// so a room glows brighter the longer a dog stays and visibly cools once
// they move on. With continuous occupancy the decayed sum converges to
// ~HALF_LIFE_MIN / ln(2) ≈ 130, so full glow ≈ a long settled-in stay.
const HALF_LIFE_MIN = 90

/**
 * Given raw sample dots (already filtered to a dog + time window), compute
 * per-room heat. `count` is raw dots (≈ minutes, used for stats); `heat` is
 * the recency-decayed sum relative to `now` (the playhead during replay),
 * which drives the glow. Distance is recency-weighted too, so the pool's
 * tightness tracks where the dog has been *lately*.
 */
export function computeHeat(events: LocationEvent[], liveRoom: RoomId | null, now: number): RoomHeat[] {
  const counts: Partial<Record<RoomId, number>> = {}
  const heatSum: Partial<Record<RoomId, number>> = {}
  const distSum: Partial<Record<RoomId, number>> = {}
  const weightSum: Partial<Record<RoomId, number>> = {}

  for (const ev of events) {
    const room = ev.room as RoomId
    const ageMin = Math.max(0, (now - new Date(ev.entered_at).getTime()) / 60_000)
    const w = Math.pow(0.5, ageMin / HALF_LIFE_MIN)
    counts[room] = (counts[room] ?? 0) + 1
    heatSum[room] = (heatSum[room] ?? 0) + w
    distSum[room] = (distSum[room] ?? 0) + (ev.distance_m ?? 0) * w
    weightSum[room] = (weightSum[room] ?? 0) + w
  }

  const allRooms: RoomId[] = ['kitchen', 'living_room', 'office', 'yard']
  return allRooms.map(room => {
    const count = counts[room] ?? 0
    const w = weightSum[room] ?? 0
    return {
      room,
      count,
      heat: heatSum[room] ?? 0,
      avgDistance: w > 0 ? (distSum[room] ?? 0) / w : 0,
      isLive: room === liveRoom,
    }
  })
}
