'use client'

import { ROOM_META, DOG_META } from '@/lib/types'
import { heatOpacity } from '@/lib/heatmap'
import type { RoomHeat, Dog } from '@/lib/types'

interface Props {
  dog: Dog
  heat: RoomHeat[]
  visible: boolean
}

interface Dot { x: number; y: number; r: number; opacity: number }

// Fine ink-stipple cloud for one room. Dense, small dots that cluster toward
// the center and thin out at the edges — pointillist, not a fuzzy blob. The
// outline is gently modulated so it reads organic rather than a perfect disc.
function buildStipple(
  cx: number, cy: number,
  rx: number, ry: number,
  intensity: number,   // 0–1
  seed: number,
): Dot[] {
  const dots: Dot[] = []
  const count = Math.floor(90 + intensity * 700)

  let s = seed >>> 0
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2
    // low-frequency wobble so the cloud edge isn't a clean circle
    const wobble = 0.74 + 0.20 * Math.sin(angle * 3 + seed) + 0.10 * Math.sin(angle * 7 - seed * 0.5)
    // center-weighted radius, but fills most of the room
    const radialT = Math.pow(rand(), 0.6)
    const px = cx + Math.cos(angle) * rx * wobble * radialT
    const py = cy + Math.sin(angle) * ry * wobble * radialT

    const falloff = Math.max(0, 1 - radialT)     // 1 at center → 0 at edge
    const r = 0.5 + rand() * 0.65 + falloff * intensity * 0.85
    const opacity = (0.10 + falloff * 0.52) * (0.45 + 0.55 * intensity)

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
      {heat.map(({ room, count, isLive }) => {
        const bounds = ROOM_META[room]
        const opacity = heatOpacity(count, maxCount)
        if (opacity === 0 && !isLive) return null

        const cx = bounds.x + bounds.width / 2
        const cy = bounds.y + bounds.height / 2
        const rx = bounds.width * 0.5
        const ry = bounds.height * 0.5

        const stipple = opacity > 0
          ? buildStipple(cx, cy, rx, ry, opacity,
              dog.charCodeAt(0) * 131 + room.charCodeAt(0) * 17 + room.length * 7)
          : []

        return (
          <g key={`${dog}-${room}`} style={{ mixBlendMode: 'multiply' }}>
            {stipple.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r}
                fill={`rgb(${meta.heatColor})`} opacity={d.opacity} />
            ))}

            {/* Live pulse + emoji */}
            {isLive && (
              <>
                <circle cx={cx} cy={cy} r={16} fill="none"
                  stroke={meta.color} strokeWidth="1.5" opacity="0.4">
                  <animate attributeName="r" values="10;22;10" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r={4.5} fill={meta.color} opacity="0.9" />
                <text x={cx} y={cy - 14} textAnchor="middle" fontSize="14">
                  {meta.emoji}
                </text>
              </>
            )}
          </g>
        )
      })}
    </>
  )
}
