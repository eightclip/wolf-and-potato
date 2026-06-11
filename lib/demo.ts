import type { Dog, LocationEvent, RoomId } from './types'

// Synthesized "plausible day" data, used only when Supabase env vars are
// missing (local dev / previews). Deterministic per minute so the heat map
// and timeline look identical across re-renders.

interface Block { room: RoomId; from: number; to: number } // minutes from midnight

const SCHEDULES: Record<Dog, Block[]> = {
  razzy: [
    { room: 'office',      from: 6.5 * 60,  to: 9 * 60 },
    { room: 'kitchen',     from: 9 * 60,    to: 9.5 * 60 },
    { room: 'yard',        from: 9.5 * 60,  to: 12 * 60 },
    { room: 'office',      from: 12 * 60,   to: 15 * 60 },
    { room: 'yard',        from: 15 * 60,   to: 17 * 60 },
    { room: 'living_room', from: 17 * 60,   to: 22 * 60 },
  ],
  bucky: [
    { room: 'living_room', from: 6.5 * 60,  to: 10 * 60 },
    { room: 'kitchen',     from: 10 * 60,   to: 11 * 60 },
    { room: 'yard',        from: 11 * 60,   to: 13 * 60 },
    { room: 'living_room', from: 13 * 60,   to: 18 * 60 },
    { room: 'kitchen',     from: 18 * 60,   to: 19 * 60 },
    { room: 'living_room', from: 19 * 60,   to: 22 * 60 },
  ],
}

const ROOMS: RoomId[] = ['kitchen', 'living_room', 'office', 'yard']
const BASE_DIST: Record<RoomId, number> = {
  office: 1.2, yard: 3.4, living_room: 1.8, kitchen: 1.3,
}

// Cheap deterministic hash → [0, 1)
function rand(n: number): number {
  let s = (n * 1664525 + 1013904223) >>> 0
  s ^= s >>> 13
  s = (s * 1664525 + 1013904223) >>> 0
  return s / 0xffffffff
}

function roomAt(dog: Dog, minute: number, dayKey: number): RoomId | null {
  const block = SCHEDULES[dog].find(b => minute >= b.from && minute < b.to)
  if (!block) return null
  // Occasional wander to another room, so the timeline has texture
  const seed = dayKey * 7919 + minute * 31 + (dog === 'razzy' ? 1 : 2)
  if (rand(seed) < 0.05) {
    return ROOMS[Math.floor(rand(seed + 1) * ROOMS.length)]
  }
  return block.room
}

function genDay(dayOffset: 0 | -1, now: Date, startId: number): LocationEvent[] {
  const day = new Date(now)
  day.setDate(day.getDate() + dayOffset)
  day.setHours(0, 0, 0, 0)
  const dayKey = Math.floor(day.getTime() / 86_400_000)

  const lastMinute = dayOffset === 0
    ? Math.min(22 * 60, Math.floor((now.getTime() - day.getTime()) / 60_000))
    : 22 * 60

  const events: LocationEvent[] = []
  let id = startId
  for (const dog of ['razzy', 'bucky'] as Dog[]) {
    for (let m = Math.floor(6.5 * 60); m <= lastMinute; m++) {
      const room = roomAt(dog, m, dayKey)
      if (!room) continue
      const seed = dayKey * 104729 + m * 17 + (dog === 'razzy' ? 3 : 5)
      events.push({
        id: id++,
        dog,
        room,
        entered_at: new Date(day.getTime() + m * 60_000).toISOString(),
        exited_at: null,
        distance_m: BASE_DIST[room] + rand(seed) * 1.6,
      })
    }
  }
  return events
}

export function getDemoEvents(start: Date, end: Date): LocationEvent[] {
  const now = new Date()
  const all = [...genDay(-1, now, 0), ...genDay(0, now, 100_000)]
  const s = start.getTime()
  const e = end.getTime()
  return all
    .filter(ev => {
      const t = new Date(ev.entered_at).getTime()
      return t >= s && t <= e
    })
    .sort((a, b) => a.entered_at.localeCompare(b.entered_at))
}
