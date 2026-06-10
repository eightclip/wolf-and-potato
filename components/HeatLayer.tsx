'use client'

import { SENSORS, DOG_META } from '@/lib/types'
import { heatOpacity } from '@/lib/heatmap'
import type { RoomHeat, Dog } from '@/lib/types'

interface Props {
  dog: Dog
  heat: RoomHeat[]
  visible: boolean
}

interface Dot { x: number; y: number; r: number; opacity: number }

// Fine ink-stipple cloud centred on a sensor. Density rises with `intensity`
// (time spent); `spread` comes from signal distance, so a dog right on the
// sensor makes a tight dense knot and a far/weak signal makes a soft wide haze.
function buildStipple(
  cx: number, cy: number,
  spread: number,
  intensity: number,   // 0–1
  seed: number,
): Dot[] {
  const dots: Dot[] = []
  const count = Math.floor(70 + intensity * 640)

  let s = seed >>> 0
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2
    const wobble = 0.74 + 0.20 * Math.sin(angle * 3 + seed) + 0.10 * Math.sin(angle * 7 - seed * 0.5)
    const radialT = Math.pow(rand(), 0.6)        // center-weighted
    const px = cx + Math.cos(angle) * spread * wobble * radialT
    const py = cy + Math.sin(angle) * spread * wobble * radialT

    const falloff = Math.max(0, 1 - radialT)
    const r = 0.5 + rand() * 0.6 + falloff * intensity * 0.8
    const opacity = (0.10 + falloff * 0.5) * (0.45 + 0.55 * intensity)

    dots.push({ x: px, y: py, r, opacity })
  }
  return dots
}

export default function HeatLayer({ dog, heat, visible }: Props) {
  if (!visible) return null

  const meta = DOG_META[dog]
  const maxCount = Math.max(1, ...heat.map(h => h.count))

  return (
    <>
      {heat.map(({ room, count, avgDistance, isLive }) => {
        const opacity = heatOpacity(count, maxCount)
        if (opacity === 0) return null

        const s = SENSORS[room]
        // tight when the dog is on top of the sensor, wide when the signal is far
        const spread = Math.min(78, 12 + avgDistance * 6.5)

        const stipple = buildStipple(
          s.x, s.y, spread, opacity,
          dog.charCodeAt(0) * 131 + room.charCodeAt(0) * 17 + room.length * 7,
        )

        return (
          <g key={`${dog}-${room}`} style={{ mixBlendMode: 'multiply' }}>
            {stipple.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r}
                fill={`rgb(${meta.heatColor})`} opacity={d.opacity} />
            ))}
            {/* faint anchor glow on the live sensor's cloud */}
            {isLive && (
              <circle cx={s.x} cy={s.y} r={Math.max(8, spread * 0.4)}
                fill={`rgb(${meta.heatColor})`} opacity={0.10} />
            )}
          </g>
        )
      })}
    </>
  )
}
