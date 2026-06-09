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

// Rough pixel bounding box of each room in the floor plan SVG (1000x600 canvas)
export interface RoomBounds {
  x: number
  y: number
  width: number
  height: number
  label: string
}

export const ROOM_META: Record<RoomId, RoomBounds> = {
  garage:      { x: 20,  y: 20,  width: 200, height: 220, label: 'Garage' },
  studio:      { x: 240, y: 20,  width: 240, height: 220, label: 'Studio' },
  kitchen:     { x: 500, y: 20,  width: 220, height: 220, label: 'Kitchen' },
  living_room: { x: 20,  y: 260, width: 460, height: 220, label: 'Living Room' },
  bedroom:     { x: 500, y: 260, width: 220, height: 220, label: 'Bedroom' },
  yard:        { x: 20,  y: 500, width: 700, height: 120, label: 'Yard' },
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
