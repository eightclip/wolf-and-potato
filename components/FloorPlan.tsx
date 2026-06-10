'use client'

import type { RoomId } from '@/lib/types'
import { SENSORS } from '@/lib/types'

interface LiveSensor { room: RoomId; color: string; emoji: string }

interface Props {
  liveSensors?: LiveSensor[]
  children?: React.ReactNode
}

// 4:3 canvas matching the lot-sketch.png image (1200×900 scaled to 480×360)
const W = 480
const H = 360

export default function FloorPlan({ liveSensors = [], children }: Props) {
  const liveByRoom = new Map<RoomId, LiveSensor[]>()
  for (const ls of liveSensors) {
    const arr = liveByRoom.get(ls.room) ?? []
    arr.push(ls)
    liveByRoom.set(ls.room, arr)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Paper, so the sketch's white blends away under multiply */}
      <rect x="0" y="0" width={W} height={H} fill="#f5f1ea" />

      {/* John's hand-drawn lot sketch as the map base */}
      <image
        href="/lot-sketch.png"
        x="0" y="0" width={W} height={H}
        preserveAspectRatio="xMidYMid meet"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Heat stipple, anchored on the sensor dots */}
      {children}

      {/* Pulsing rings + emoji on a sensor when a dog is live there */}
      {(Object.keys(SENSORS) as RoomId[]).map(room => {
        const s = SENSORS[room]
        const live = liveByRoom.get(room) ?? []
        if (!live.length) return null
        return (
          <g key={`pulse-${room}`}>
            {live.map((ls, i) => (
              <circle key={i} cx={s.x} cy={s.y} r="5" fill="none"
                stroke={ls.color} strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" values="5;17;5" dur="2.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            ))}
            {live.map((ls, i) => (
              <text key={`e-${i}`} x={s.x + (i === 0 ? 0 : 12)} y={s.y - 9}
                textAnchor="middle" fontSize="12">{ls.emoji}</text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
