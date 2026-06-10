export type Dog = 'razzy' | 'bucky'

// The four rooms we actually have ESPresense sensors in.
export type RoomId =
  | 'kitchen'
  | 'living_room'
  | 'office'
  | 'yard'

export interface LocationEvent {
  id: number
  dog: Dog
  room: RoomId
  entered_at: string   // ISO timestamptz — the moment this dot was sampled
  exited_at: string | null
  distance_m: number | null
}

// Per-room heat for the map. With 1-dot-per-minute sampling, `count` is the
// number of sample dots in the window, which ≈ minutes the dog spent there.
export interface RoomHeat {
  room: RoomId
  count: number         // sample dots in the selected window
  isLive: boolean       // dog is currently here
}

export type TimeRange = '1h' | '6h' | 'today' | 'yesterday'

// Pixel bounding box of each room in the floor plan SVG.
// Canvas: 460w × 640h — portrait.
// House across the top (living room left, kitchen top-right, office bottom-right),
// open yard below. Only rooms with a real sensor are drawn.
export interface RoomBounds {
  x: number
  y: number
  width: number
  height: number
  label: string
}

export const ROOM_META: Record<RoomId, RoomBounds> = {
  living_room: { x: 24,  y: 40,  width: 200, height: 300, label: 'Living Room' },
  kitchen:     { x: 224, y: 40,  width: 212, height: 150, label: 'Kitchen' },
  office:      { x: 224, y: 190, width: 212, height: 150, label: 'Office' },
  yard:        { x: 24,  y: 372, width: 412, height: 236, label: 'Yard' },
}

// ESP32 sensor positions within each room (pixel coords in the SVG canvas).
// Placed off-center so they don't sit under the room labels.
export const NODE_POSITIONS: Record<RoomId, { x: number; y: number }> = {
  living_room: { x: 60,  y: 304 },
  kitchen:     { x: 392, y: 64  },
  office:      { x: 392, y: 214 },
  yard:        { x: 150, y: 432 },
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
