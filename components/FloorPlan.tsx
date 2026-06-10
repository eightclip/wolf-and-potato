'use client'

import type { RoomId } from '@/lib/types'
import { SENSORS } from '@/lib/types'

interface LiveSensor { room: RoomId; color: string; emoji: string }

interface Props {
  liveSensors?: LiveSensor[]
  children?: React.ReactNode
}

const W = 480
const H = 480

const INK = '#2e2a24'
const SENSOR_BLUE = '#6c7fc9'
const LABEL = '#574d40'

// ── Hand-drawn path helper ──────────────────────────────────────────────
// Turns a list of points into a gently wobbled path so walls read as
// sketched-by-hand rather than CAD-perfect. Deterministic from `seed`.
function hand(pts: [number, number][], seed: number, close = false): string {
  let s = (seed >>> 0) || 1
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
  const j = (v: number) => v + (rnd() - 0.5) * 2.0
  const P = pts.map(([x, y]) => [j(x), j(y)] as [number, number])
  let d = `M ${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`
  const segs = close ? P.length : P.length - 1
  for (let i = 1; i <= segs; i++) {
    const a = P[(i - 1) % P.length], b = P[i % P.length]
    const mx = (a[0] + b[0]) / 2 + (rnd() - 0.5) * 3.0
    const my = (a[1] + b[1]) / 2 + (rnd() - 0.5) * 3.0
    d += ` Q ${mx.toFixed(1)} ${my.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`
  }
  if (close) d += ' Z'
  return d
}

// Deterministic grass ticks scattered in the open yard band
function buildGrass() {
  const ticks: [number, number][] = []
  let s = 91
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
  for (let i = 0; i < 34; i++) {
    ticks.push([44 + rnd() * 232, 150 + rnd() * 156])
  }
  return ticks
}
const GRASS = buildGrass()

const LABEL_FONT = "'Caveat', 'Bradley Hand', cursive"

export default function FloorPlan({ liveSensors = [], children }: Props) {
  const liveByRoom = new Map<RoomId, LiveSensor[]>()
  for (const ls of liveSensors) {
    const arr = liveByRoom.get(ls.room) ?? []
    arr.push(ls)
    liveByRoom.set(ls.room, arr)
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Paper ── */}
      <rect x="0" y="0" width={W} height={H} fill="#f5f1ea" />

      {/* ── Yard: grass + label (open area, no walls) ── */}
      {GRASS.map(([gx, gy], i) => (
        <line key={`g-${i}`} x1={gx} y1={gy} x2={gx + 4} y2={gy - 6}
          stroke="#9bbf9b" strokeWidth="1.1" opacity="0.5" strokeLinecap="round" />
      ))}

      {/* ── Heat stipple (children) sits under the ink lines ── */}
      {children}

      {/* ── Lot boundary ── */}
      <path d={hand([[20, 20], [460, 20], [460, 460], [20, 460]], 5, true)}
        fill="none" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />

      {/* ── Studio (top-left) ── */}
      <path d={hand([[26, 28], [182, 28], [182, 126], [26, 126]], 11, true)}
        fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* studio doorway notch (right wall) */}
      <path d={hand([[182, 70], [196, 78], [182, 96]], 12)}
        fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />

      {/* ── Garage (top-right, L-shaped) ── */}
      <path d={hand([[300, 46], [456, 46], [456, 200], [372, 200], [372, 120], [300, 120]], 23, true)}
        fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* ── House (bottom) ── */}
      <path d={hand([[66, 330], [424, 330], [424, 452], [66, 452]], 31, true)}
        fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {/* interior walls */}
      <path d={hand([[176, 330], [176, 452]], 33)} fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
      <path d={hand([[308, 330], [308, 452]], 37)} fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
      {/* a couple of doorway gaps drawn as little arcs */}
      <path d="M 230 452 Q 246 438 262 452" fill="none" stroke={INK} strokeWidth="1.3" opacity="0.5" strokeLinecap="round" />

      {/* ── Labels (handwritten) ── */}
      <text x="80" y="66" fontSize="17" fill={LABEL} style={{ fontFamily: LABEL_FONT }}>Studio</text>
      <text x="376" y="86" fontSize="17" fill={LABEL} style={{ fontFamily: LABEL_FONT }}>Garage</text>
      <text x="150" y="250" fontSize="20" fill={LABEL} style={{ fontFamily: LABEL_FONT }}>Yard</text>
      <text x="184" y="356" fontSize="15" fill={LABEL} style={{ fontFamily: LABEL_FONT }}>Living Room</text>
      <text x="340" y="358" fontSize="15" fill={LABEL} style={{ fontFamily: LABEL_FONT }}>Kitchen</text>

      {/* ── Sensors (pulse + emoji when a dog is nearby) ── */}
      {(Object.keys(SENSORS) as RoomId[]).map(room => {
        const s = SENSORS[room]
        const live = liveByRoom.get(room) ?? []
        return (
          <g key={`sensor-${room}`}>
            {/* pulsing rings, one per live dog */}
            {live.map((ls, i) => (
              <circle key={i} cx={s.x} cy={s.y} r="6" fill="none"
                stroke={ls.color} strokeWidth="1.6" opacity="0.6">
                <animate attributeName="r" values="6;19;6" dur="2.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.65;0;0.65" dur="2.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            ))}
            {/* sensor dot */}
            <circle cx={s.x} cy={s.y} r="4.6" fill={SENSOR_BLUE}
              stroke="#f5f1ea" strokeWidth="1.4" opacity={live.length ? 1 : 0.7} />
            {/* dog emoji(s) hovering above a live sensor */}
            {live.map((ls, i) => (
              <text key={`e-${i}`} x={s.x + (i === 0 ? 0 : 13)} y={s.y - 11}
                textAnchor="middle" fontSize="13">{ls.emoji}</text>
            ))}
          </g>
        )
      })}

      {/* North arrow */}
      <text x={W - 22} y={H - 14} textAnchor="end" fontSize="13" fill="#b0a898"
        style={{ fontFamily: LABEL_FONT }}>N ↑</text>
    </svg>
  )
}
