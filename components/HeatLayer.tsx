'use client'

import { SENSORS, DOG_META } from '@/lib/types'
import type { RoomHeat, Dog, RoomId } from '@/lib/types'

interface Props {
  dog: Dog
  heat: RoomHeat[]
  visible: boolean
}

interface Dot { x: number; y: number; r: number; opacity: number }

// Clip kitchen + living room stipple to their rooms so the clouds don't bleed
// into each other or the yard as they spread. (Coords in the 480×576 canvas;
// edges sit on the walls in lot-sketch.png.) Open areas spread freely.
const ROOM_CLIP: Partial<Record<RoomId, { x: number; y: number; w: number; h: number }>> = {
  living_room: { x: 148, y: 372, w: 166, h: 152 },
  kitchen:     { x: 314, y: 372, w: 112, h: 152 },
}

// Sample dots needed for a room to reach full density. At 1 dot/min that's
// ~2 hours, so the heat visibly builds up over the day instead of maxing out
// relative to whichever room is busiest.
const FILL = 120

function buildStipple(
  cx: number, cy: number,
  spread: number,
  intensity: number,   // 0–1, absolute fill
  seed: number,
): Dot[] {
  const dots: Dot[] = []
  const count = Math.floor(40 + intensity * 780)

  let s = seed >>> 0
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2
    const wobble = 0.78 + 0.18 * Math.sin(angle * 3 + seed) + 0.10 * Math.sin(angle * 7 - seed * 0.5)
    const radialT = Math.pow(rand(), 0.62)
    const px = cx + Math.cos(angle) * spread * wobble * radialT
    const py = cy + Math.sin(angle) * spread * wobble * radialT

    const falloff = Math.max(0, 1 - radialT)
    const r = 0.55 + rand() * 0.65 + falloff * intensity * 0.85
    const opacity = (0.11 + falloff * 0.5) * (0.5 + 0.5 * intensity)

    dots.push({ x: px, y: py, r, opacity })
  }
  return dots
}

export default function HeatLayer({ dog, heat, visible }: Props) {
  if (!visible) return null

  const meta = DOG_META[dog]

  return (
    <>
      {heat.map(({ room, count, avgDistance, isLive }) => {
        if (count <= 0) return null

        const intensity = Math.min(1, count / FILL)
        const s = SENSORS[room]
        // wider than before, still tighter when the signal is close
        const spread = Math.min(128, 28 + avgDistance * 10)

        const stipple = buildStipple(
          s.x, s.y, spread, intensity,
          dog.charCodeAt(0) * 131 + room.charCodeAt(0) * 17 + room.length * 7,
        )

        const clip = ROOM_CLIP[room]
        const clipId = `clip-${dog}-${room}`

        const inner = (
          <>
            {stipple.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r}
                fill={`rgb(${meta.heatColor})`} opacity={d.opacity} />
            ))}
            {isLive && (
              <circle cx={s.x} cy={s.y} r={Math.max(8, spread * 0.32)}
                fill={`rgb(${meta.heatColor})`} opacity={0.10} />
            )}
          </>
        )

        return (
          <g key={`${dog}-${room}`} style={{ mixBlendMode: 'multiply' }}>
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
