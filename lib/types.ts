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

// Each data room maps to one of the blue sensor dots in John's hand-drawn lot
// sketch (public/lot-sketch.png). Coords are in the 480×360 floor-plan canvas
// (the 1200×900 image scaled by 0.4). Mapping confirmed by John: office sensor
// lives in the Studio, yard sensor lives by the Garage.
export const SENSORS: Record<RoomId, { x: number; y: number; label: string }> = {
  office:      { x: 152, y: 76,  label: 'Studio' },
  yard:        { x: 225, y: 158, label: 'Garage' },
  living_room: { x: 233, y: 300, label: 'Living Room' },
  kitchen:     { x: 270, y: 318, label: 'Kitchen' },
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
