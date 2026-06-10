export type Dog = 'razzy' | 'bucky'

// Data rooms = the four ESPresense sensor names the bridge writes.
export type RoomId =
  | 'kitchen'
  | 'living_room'
  | 'office'
  | 'yard'

export interface LocationEvent {
  id: number
  dog: Dog
  room: RoomId
  entered_at: string   // ISO timestamptz — when this dot was sampled
  exited_at: string | null
  distance_m: number | null
}

// Per-room heat. `count` = number of sample dots (≈ minutes at 1/min).
// `avgDistance` = mean signal distance in metres; drives how tight/loose the
// stipple cloud sits around the sensor (close signal = tight, far = diffuse).
export interface RoomHeat {
  room: RoomId
  count: number
  avgDistance: number
  isLive: boolean
}

export type TimeRange = '1h' | '6h' | 'today' | 'yesterday'

// Each data room maps to one physical sensor on the drawn lot, with its pixel
// position on the 480×480 floor-plan canvas and the label to show.
// Mapping confirmed by John: office sensor lives in the Studio, yard sensor
// lives by the Garage.
export const SENSORS: Record<RoomId, { x: number; y: number; label: string }> = {
  office:      { x: 150, y: 104, label: 'Studio' },
  yard:        { x: 396, y: 104, label: 'Garage' },
  living_room: { x: 244, y: 404, label: 'Living Room' },
  kitchen:     { x: 372, y: 416, label: 'Kitchen' },
}

export const DOG_META: Record<Dog, { label: string; emoji: string; color: string; heatColor: string }> = {
  razzy: {
    label: 'Razzy',
    emoji: '🐺',
    color: '#60a5fa',       // blue-400
    heatColor: '96, 165, 250',  // RGB for CSS rgba()
  },
  bucky: {
    label: 'Bucky',
    emoji: '🥔',
    color: '#fb923c',       // orange-400
    heatColor: '251, 146, 60',  // RGB for CSS rgba()
  },
}
