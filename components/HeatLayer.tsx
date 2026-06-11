'use client'

import { SENSORS, DOG_META } from '@/lib/types'
import type { RoomHeat, Dog, RoomId } from '@/lib/types'

interface Props {
  dog: Dog
  heat: RoomHeat[]
  visible: boolean
}

// Clip kitchen + living room heat to their rooms so the glow doesn't bleed
// through the walls. (Coords in the 480×576 canvas; edges sit on the walls
// in lot-sketch.png.) Open areas spread freely.
const ROOM_CLIP: Partial<Record<RoomId, { x: number; y: number; w: number; h: number }>> = {
  living_room: { x: 148, y: 372, w: 166, h: 152 },
  kitchen:     { x: 314, y: 372, w: 112, h: 152 },
}

// Decayed heat needed for full intensity. The decayed sum saturates around
// ~130 for continuous occupancy (90-min half-life), so 85 means a settled-in
// stay reaches full glow in roughly an hour and a half — and a room cools
// back down a couple of hours after the dog moves on.
const FILL = 85

interface Blob { x: number; y: number; r: number; o: number; dur: number }
interface Ember { x: number; y: number; r: number; o: number; dur: number; delay: number }

function seededRand(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
}

// A few offset, overlapping soft discs read as one organic pool of light
// once the turbulence filter roughs up their edges.
function buildBlobs(cx: number, cy: number, spread: number, intensity: number, seed: number): Blob[] {
  const rand = seededRand(seed)
  const blobs: Blob[] = []
  const n = 4
  for (let i = 0; i < n; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * spread * 0.42
    blobs.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: spread * (0.45 + rand() * 0.4),
      o: 0.35 + intensity * 0.45 + rand() * 0.1,
      dur: 5 + rand() * 4,
    })
  }
  return blobs
}

function buildEmbers(cx: number, cy: number, spread: number, intensity: number, seed: number): Ember[] {
  const rand = seededRand(seed * 31 + 7)
  const n = Math.round(intensity * 14)
  const embers: Ember[] = []
  for (let i = 0; i < n; i++) {
    const angle = rand() * Math.PI * 2
    const dist = Math.pow(rand(), 0.7) * spread * 0.8
    embers.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: 0.7 + rand() * 0.9,
      o: 0.3 + rand() * 0.45,
      dur: 4.5 + rand() * 4.5,
      delay: rand() * 6,
    })
  }
  return embers
}

export default function HeatLayer({ dog, heat, visible }: Props) {
  if (!visible) return null

  const meta = DOG_META[dog]
  const grad = `url(#grad-${dog})`

  return (
    <>
      {heat.map(({ room, heat: decayed, avgDistance, isLive }) => {
        // Fully cooled rooms disappear (avoids ghost embers at opacity ~0)
        if (decayed < 0.5) return null

        const intensity = Math.min(1, decayed / FILL)
        const s = SENSORS[room]
        // Pool size grows with built-up heat and loosens with signal distance,
        // so a long stay visibly spreads — and shrinks back as it cools.
        const reach = Math.min(120, 30 + avgDistance * 10)
        const spread = reach * (0.45 + 0.55 * Math.sqrt(intensity))
        const seed = dog.charCodeAt(0) * 131 + room.charCodeAt(0) * 17 + room.length * 7

        const blobs = buildBlobs(s.x, s.y, spread, intensity, seed)
        const embers = buildEmbers(s.x, s.y, spread, intensity, seed)

        const clip = ROOM_CLIP[room]
        const clipId = `clip-${dog}-${room}`

        const inner = (
          <>
            {/* Wide organic pool */}
            <g filter="url(#heat-distort)" opacity={0.22 + intensity * 0.78}>
              {blobs.map((b, i) => (
                <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={grad} opacity={b.o}>
                  <animate
                    attributeName="r"
                    values={`${b.r};${b.r * 1.14};${b.r}`}
                    dur={`${b.dur}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>

            {/* Hot core over the sensor */}
            <circle
              cx={s.x} cy={s.y}
              r={Math.max(9, spread * 0.3)}
              fill={grad}
              opacity={0.18 + intensity * 0.68}
              filter="url(#heat-core)"
            >
              <animate
                attributeName="opacity"
                values={`${0.18 + intensity * 0.68};${0.12 + intensity * 0.52};${0.18 + intensity * 0.68}`}
                dur="4.8s"
                repeatCount="indefinite"
              />
            </circle>
            {isLive && (
              <circle cx={s.x} cy={s.y} r={Math.max(12, spread * 0.4)}
                fill={grad} opacity={0.3} filter="url(#heat-core)" />
            )}

            {/* Embers drifting up out of the warmth */}
            {embers.map((e, i) => (
              <circle
                key={`em-${i}`}
                className="ember"
                cx={e.x} cy={e.y} r={e.r}
                fill={`rgb(${meta.heatColor})`}
                style={{
                  '--eo': e.o,
                  '--ed': `${e.dur}s`,
                  '--edl': `${e.delay}s`,
                } as React.CSSProperties}
              />
            ))}
          </>
        )

        return (
          <g key={`${dog}-${room}`} style={{ mixBlendMode: 'screen' }}>
            {clip && (
              <clipPath id={clipId}>
                <rect x={clip.x} y={clip.y} width={clip.w} height={clip.h} rx="4" />
              </clipPath>
            )}
            {clip ? <g clipPath={`url(#${clipId})`}>{inner}</g> : inner}
          </g>
        )
      })}
    </>
  )
}
