'use client'

import type { RoomId } from '@/lib/types'
import { ROOM_META } from '@/lib/types'

interface Props {
  activeRoom?: RoomId | null
  children?: React.ReactNode
}

// Hand-drawn-feel constants: slight wobble on room corners via filter
const WOBBLE_FILTER = `
  <filter id="wobble" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="turbulence" baseFrequency="0.025" numOctaves="2" seed="3" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
`

const CANVAS_W = 740
const CANVAS_H = 640

export default function FloorPlan({ children }: Props) {
  const rooms = ROOM_META

  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      className="w-full h-full"
      style={{ fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive" }}
    >
      <defs dangerouslySetInnerHTML={{ __html: WOBBLE_FILTER }} />

      {/* Outer house outline */}
      <rect
        x="10" y="10" width="720" height="510"
        fill="#fefce8"
        stroke="#92400e"
        strokeWidth="3"
        rx="4"
        filter="url(#wobble)"
        opacity="0.4"
      />

      {/* Yard (outdoors — different fill) */}
      <rect
        x={rooms.yard.x} y={rooms.yard.y}
        width={rooms.yard.width} height={rooms.yard.height}
        fill="#d1fae5"
        stroke="#065f46"
        strokeWidth="2"
        strokeDasharray="6 3"
        rx="4"
        filter="url(#wobble)"
      />

      {/* Indoor rooms */}
      {(['garage', 'studio', 'kitchen', 'living_room', 'bedroom'] as RoomId[]).map(id => {
        const r = rooms[id]
        return (
          <rect
            key={id}
            x={r.x} y={r.y}
            width={r.width} height={r.height}
            fill="#fffbeb"
            stroke="#78716c"
            strokeWidth="1.5"
            rx="3"
            filter="url(#wobble)"
          />
        )
      })}

      {/* Room labels */}
      {(Object.entries(rooms) as [RoomId, typeof rooms[RoomId]][]).map(([id, r]) => (
        <text
          key={`label-${id}`}
          x={r.x + r.width / 2}
          y={r.y + r.height / 2 + 5}
          textAnchor="middle"
          fontSize={id === 'living_room' ? 15 : 13}
          fill="#57534e"
          opacity="0.7"
        >
          {r.label}
        </text>
      ))}

      {/* Cute compass rose in yard */}
      <text x="680" y="540" fontSize="11" fill="#065f46" opacity="0.5">🌿 yard</text>

      {/* Door indicators (small arcs) */}
      {/* garage → exterior */}
      <path d="M 20 200 Q 40 200 40 220" fill="none" stroke="#92400e" strokeWidth="1.5" opacity="0.5"/>
      {/* kitchen → living_room */}
      <path d="M 500 260 Q 500 280 520 280" fill="none" stroke="#78716c" strokeWidth="1.5" opacity="0.5"/>
      {/* living_room → yard */}
      <path d="M 240 480 Q 240 500 260 500" fill="none" stroke="#78716c" strokeWidth="1.5" opacity="0.5"/>

      {/* Heat overlay and live indicators rendered by children */}
      {children}
    </svg>
  )
}
