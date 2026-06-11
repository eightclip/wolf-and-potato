'use client'

import type { RoomId } from '@/lib/types'
import { SENSORS, DOG_META } from '@/lib/types'

interface LiveSensor { dog: string; room: RoomId; color: string; emoji: string }

interface Props {
  liveSensors?: LiveSensor[]
  children?: React.ReactNode
}

// Canvas matching the cropped lot-sketch.png (1500×1799 → 480×576)
const W = 480
const H = 576

export default function FloorPlan({ liveSensors = [], children }: Props) {
  const liveByRoom = new Map<RoomId, LiveSensor[]>()
  for (const ls of liveSensors) {
    const arr = liveByRoom.get(ls.room) ?? []
    arr.push(ls)
    liveByRoom.set(ls.room, arr)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full block">
      <defs>
        {/* Per-dog heat gradients — each blob's bounding box gets its own */}
        <radialGradient id="grad-razzy">
          <stop offset="0%" stopColor={`rgb(${DOG_META.razzy.heatColor})`} stopOpacity="0.85" />
          <stop offset="45%" stopColor={`rgb(${DOG_META.razzy.heatColor})`} stopOpacity="0.35" />
          <stop offset="100%" stopColor={`rgb(${DOG_META.razzy.heatColor})`} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="grad-bucky">
          <stop offset="0%" stopColor={`rgb(${DOG_META.bucky.heatColor})`} stopOpacity="0.85" />
          <stop offset="45%" stopColor={`rgb(${DOG_META.bucky.heatColor})`} stopOpacity="0.35" />
          <stop offset="100%" stopColor={`rgb(${DOG_META.bucky.heatColor})`} stopOpacity="0" />
        </radialGradient>

        {/* Organic heat: rough up the edges with noise, then soften */}
        <filter id="heat-distort" x="-60%" y="-60%" width="220%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" />
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="heat-core" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" />
        </filter>

        {/* Faint center light under the map, dark vignette over it */}
        <radialGradient id="bg-glow" cx="0.5" cy="0.42" r="0.8">
          <stop offset="0%" stopColor="#272019" />
          <stop offset="100%" stopColor="#13100d" />
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>

        {/* Film grain so the dark field doesn't band */}
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0" />
        </filter>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill="url(#bg-glow)" />

      {/* Heat sits UNDER the linework — light beneath the ink */}
      {children}

      {/* John's hand-drawn lot sketch, inverted to chalk lines on the dark field */}
      <image
        href="/lot-sketch.png"
        x="0" y="0" width={W} height={H}
        preserveAspectRatio="xMidYMid meet"
        style={{ filter: 'invert(1)', mixBlendMode: 'screen', opacity: 0.82 }}
      />

      {/* Resting sensor marks */}
      {(Object.keys(SENSORS) as RoomId[]).map(room => {
        const s = SENSORS[room]
        return (
          <g key={`sensor-${room}`} opacity="0.4">
            <circle cx={s.x} cy={s.y} r="4.5" fill="none" stroke="#e7e2da" strokeWidth="0.6" opacity="0.5" />
            <circle cx={s.x} cy={s.y} r="1.6" fill="#e7e2da" />
          </g>
        )
      })}

      {/* Radar rings on sensors with a live dog */}
      {(Object.keys(SENSORS) as RoomId[]).map(room => {
        const s = SENSORS[room]
        const live = liveByRoom.get(room) ?? []
        if (!live.length) return null
        return (
          <g key={`pulse-${room}`}>
            {live.map((ls, i) => (
              <g key={i}>
                <circle cx={s.x} cy={s.y} r="10" fill={ls.color} opacity="0.18" filter="url(#heat-core)" />
                <circle cx={s.x} cy={s.y} r="5" fill="none" stroke={ls.color} strokeWidth="1.3" opacity="0.7">
                  <animate attributeName="r" values="5;20;5" dur="2.6s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0;0.7" dur="2.6s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={s.x} cy={s.y} r="2.6" fill="#fff" stroke={ls.color} strokeWidth="1.2" />
              </g>
            ))}
          </g>
        )
      })}

      {/* The dogs themselves — big emoji that glide between rooms as they move.
          Keyed by dog (not room) so the CSS transform transition makes them
          walk across the map instead of teleporting. */}
      {liveSensors.map(ls => {
        const s = SENSORS[ls.room]
        const sharing = liveSensors.some(o => o.dog !== ls.dog && o.room === ls.room)
        const dx = sharing ? (ls.dog === 'razzy' ? -17 : 17) : 0
        return (
          <g
            key={ls.dog}
            style={{
              transform: `translate(${s.x + dx}px, ${s.y}px)`,
              transition: 'transform 1.4s cubic-bezier(0.45, 0, 0.25, 1)',
            }}
          >
            <g className="bob">
              <text
                textAnchor="middle"
                y="-13"
                fontSize="30"
                style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 10px ${ls.color}66)` }}
              >
                {ls.emoji}
              </text>
            </g>
          </g>
        )
      })}

      {/* Vignette + grain on top */}
      <rect x="0" y="0" width={W} height={H} fill="url(#vignette)" pointerEvents="none" />
      <rect x="0" y="0" width={W} height={H} filter="url(#grain)" opacity="0.5" pointerEvents="none" />
    </svg>
  )
}
