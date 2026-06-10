export type Dog = 'razzy' | 'bucky'

export type RoomId =
  | 'garage'
  | 'studio'
  | 'kitchen'
  | 'living_room'
  | 'bedroom'
  | 'yard'

export interface LocationEvent {
  id: number
  dog: Dog
  room: RoomId
  entered_at: string   // ISO timestamptz
  exited_at: string | null
  distance_m: number | null
}

// Aggregated time-spent per room, used for heatmap rendering
export interface RoomHeat {
  room: RoomId
  minutes: number       // total dwell time in selected window
  isLive: boolean       // dog is currently here
}

export type TimeRange = '1h' | '6h' | 'today' | 'yesterday'

// Rough pixel bounding box of each room in the floor plan SVG
// Canvas: 380w x 900h — portrait, matches real lot proportions
// Top: studio (top-left shed) + garage (top-right detached)
// Middle: open yard
// Bottom: main house — kitchen (right), living room (center), bedroom (bottom-left)
export interface RoomBounds {
  x: number
  y: number
  width: number
  height: number
  label: string
}

// Canvas: 460w × 820h
export const ROOM_META: Record<RoomId, RoomBounds> = {
  studio:      { x: 24,  y: 24,  width: 112, height: 96,  label: 'Studio' },
  garage:      { x: 268, y: 24,  width: 164, height: 130, label: 'Garage' },
  yard:        { x: 24,  y: 166, width: 408, height: 240, label: 'Yard' },
  kitchen:     { x: 268, y: 456, width: 164, height: 148, label: 'Kitchen' },
  living_room: { x: 60,  y: 456, width: 188, height: 148, label: 'Living Room' },
  bedroom:     { x: 24,  y: 624, width: 196, height: 168, label: 'Bedroom' },
}

// ESP32 node positions within each room (pixel coords in SVG canvas)
// Used for rendering node markers on the floor plan
export const NODE_POSITIONS: Record<RoomId, { x: number; y: number } | null> = {
  studio:      { x: 122, y: 106 },  // bottom-right of studio
  garage:      { x: 284, y: 138 },  // bottom-left of garage
  yard:        null,
  kitchen:     { x: 284, y: 530 },  // left-middle of kitchen
  living_room: { x: 154, y: 472 },  // top-middle of living room
  bedroom:     { x: 122, y: 640 },  // top-middle of bedroom
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
