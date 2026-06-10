'use client'

import { ROOM_META, DOG_META } from '@/lib/types'
import { heatOpacity } from '@/lib/heatmap'
import type { RoomHeat, Dog } from '@/lib/types'

interface Props {
  dog: Dog
  heat: RoomHeat[]
  visible: boolean
}

// Generate stipple dots for a room heat zone.
// Dots are denser + larger toward the center, sparse at edges.
function buildStipple(
  cx: number, cy: number,
  rx: number, ry: number,
  intensity: number,  // 0–1
  seed: number
): { x: number; y: number; r: number; opacity: number }[] {
  const dots: { x: number; y: number; r: number; opacity: number }[] = []
  // More dots = higher intensity
  const count = Math.floor(60 + intensity * 220)

  // Simple deterministic pseudo-random from seed
  let s = seed
  function rand() {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }

  for (let i = 0; i < count; i++) {
    // Polar coords with gaussian-ish radial falloff
    const angle = rand() * Math.PI * 2
    // bias toward center: sqrt of uniform = more center weight
    const radialT = Math.sqrt(rand())
    const px = cx + Math.cos(angle) * rx * radialT
    const py = cy + Math.sin(angle) * ry * radialT

    // Distance from center (0=center, 1=edge)
    const dx = (px - cx) / rx
    const dy = (py - cy) / ry
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Dot size + opacity fall off toward edges
    const falloff = Math.max(0, 1 - dist)
    const dotR = 0.8 + falloff * intensity * 2.2
    const dotOpacity = (0.08 + falloff * 0.55) * intensity

    dots.push({ x: px, y: py, r: dotR, opacity: dotOpacity })
  }
  return dots
}

export default function HeatLayer({ dog, heat, visible }: Props) {
  if (!visible) return null

  const meta = DOG_META[dog]
  const maxMinutes = Math.max(1, ...heat.map(h => h.minutes))
  const gradId = `heat-grad-${dog}`

  return (
    <>
      <defs>
        {/* Radial gradient definition — reused per room via transform */}
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={`rgb(${meta.heatColor})`} stopOpacity="1" />
          <stop offset="45%"  stopColor={`rgb(${meta.heatColor})`} stopOpacity="0.6" />
          <stop offset="75%"  stopColor={`rgb(${meta.heatColor})`} stopOpacity="0.2" />
          <stop offset="100%" stopColor={`rgb(${meta.heatColor})`} stopOpacity="0" />
        </radialGradient>
      </defs>

      {heat.map(({ room, minutes, isLive }) => {
        const bounds = ROOM_META[room]
        const opacity = heatOpacity(minutes, maxMinutes)
        const intensity = opacity  // same 0–1 scale

        if (opacity === 0 && !isLive) return null

        const cx = bounds.x + bounds.width / 2
        const cy = bounds.y + bounds.height / 2
        // Blob is slightly larger than the room so it bleeds past walls naturally
        const rx = bounds.width * 0.52
        const ry = bounds.height * 0.52

        const stippleDots = buildStipple(
          cx, cy, rx, ry, intensity,
          // deterministic seed per dog+room
          dog.charCodeAt(0) * 31 + room.charCodeAt(0) * 17
        )

        return (
          <g key={`${dog}-${room}`} style={{ mixBlendMode: 'multiply' }}>
            {/* Soft radial blob — the "Contexts" reference vibe */}
            {opacity > 0 && (
              <ellipse
                cx={cx} cy={cy}
                rx={rx * 1.1} ry={ry * 1.1}
                fill={`url(#${gradId})`}
                opacity={opacity * 0.55}
              />
            )}

            {/* Dot stipple layer */}
            {stippleDots.map((d, i) => (
              <circle
                key={i}
                cx={d.x} cy={d.y}
                r={d.r}
                fill={`rgb(${meta.heatColor})`}
                opacity={d.opacity}
              />
            ))}

            {/* Live pulse ring + emoji */}
            {isLive && (
              <>
                <circle cx={cx} cy={cy} r={16} fill="none"
                  stroke={meta.color} strokeWidth="1.5" opacity="0.4"
                >
                  <animate attributeName="r" values="10;22;10" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={cx} cy={cy} r={5}
                  fill={meta.color} opacity="0.9"
                />
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
