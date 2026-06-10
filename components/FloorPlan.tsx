'use client'

import type { RoomId } from '@/lib/types'
import { ROOM_META, NODE_POSITIONS } from '@/lib/types'

interface Props {
  activeRoom?: RoomId | null
  children?: React.ReactNode
}

const W = 460
const H = 640

// House shell (contains living room, kitchen, office)
const SHELL = { x: 24, y: 40, w: 412, h: 300 }

// Background dot-grid stipple — uniform across canvas
const DOT_SPACING = 16
const DOT_R = 0.85
function buildDotGrid() {
  const dots: { x: number; y: number }[] = []
  for (let x = DOT_SPACING; x < W; x += DOT_SPACING) {
    for (let y = DOT_SPACING; y < H; y += DOT_SPACING) {
      dots.push({ x, y })
    }
  }
  return dots
}
const DOT_GRID = buildDotGrid()

// Deterministic scatter of grass ticks inside the yard
const YARD = ROOM_META.yard
function buildGrass() {
  const ticks: [number, number][] = []
  let s = 7
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  for (let i = 0; i < 48; i++) {
    ticks.push([
      YARD.x + 16 + rand() * (YARD.width - 32),
      YARD.y + 18 + rand() * (YARD.height - 34),
    ])
  }
  return ticks
}
const GRASS = buildGrass()

const ROOMS: RoomId[] = ['living_room', 'kitchen', 'office', 'yard']

export default function FloorPlan({ activeRoom, children }: Props) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
    >
      <defs>
        <clipPath id="lot-clip">
          <rect x="14" y="14" width={W - 28} height={H - 28} rx="3" />
        </clipPath>
      </defs>

      {/* ── Canvas bg ── */}
      <rect x="0" y="0" width={W} height={H} fill="#f5f1ea" />

      {/* ── Background dot stipple ── */}
      <g clipPath="url(#lot-clip)" opacity="0.14">
        {DOT_GRID.map(({ x, y }) => (
          <circle key={`d-${x}-${y}`} cx={x} cy={y} r={DOT_R} fill="#3d3830" />
        ))}
      </g>

      {/* ── Lot boundary ── */}
      <rect
        x="14" y="14" width={W - 28} height={H - 28}
        fill="none" stroke="#c5bdb0" strokeWidth="1" rx="3"
      />

      {/* ══════════════
          YARD (outdoor)
          ══════════════ */}
      <rect
        x={YARD.x} y={YARD.y} width={YARD.width} height={YARD.height}
        fill="rgba(245,241,234,0.15)" stroke="#7a9e7a" strokeWidth="1"
        strokeDasharray="4 3" rx="1"
      />
      {GRASS.map(([gx, gy], i) => (
        <line key={`g-${i}`} x1={gx} y1={gy} x2={gx + 4} y2={gy - 6}
          stroke="#8ac28a" strokeWidth="0.8" opacity="0.45"
        />
      ))}

      {/* ══════════════
          MAIN HOUSE
          ══════════════ */}
      {/* Outer shell */}
      <rect
        x={SHELL.x} y={SHELL.y} width={SHELL.w} height={SHELL.h}
        fill="rgba(245,241,234,0.25)" stroke="#b3a48f" strokeWidth="1.1" rx="2"
      />
      {/* Vertical wall: living room | (kitchen+office) */}
      <line x1="224" y1={SHELL.y} x2="224" y2={SHELL.y + SHELL.h} stroke="#c4b6a1" strokeWidth="0.9" />
      {/* Horizontal wall: kitchen | office */}
      <line x1="224" y1="190" x2={SHELL.x + SHELL.w} y2="190" stroke="#c4b6a1" strokeWidth="0.9" />

      {/* Interior doorways (gaps in the walls) */}
      <rect x="222" y="96"  width="4" height="26" fill="#f5f1ea" />
      <rect x="222" y="250" width="4" height="26" fill="#f5f1ea" />

      {/* Back door: house → yard */}
      <rect x="110" y={SHELL.y + SHELL.h - 2} width="30" height="4" fill="#f5f1ea" />
      <path d={`M 110 ${SHELL.y + SHELL.h} Q 110 ${SHELL.y + SHELL.h + 16} 140 ${SHELL.y + SHELL.h + 16}`}
        fill="none" stroke="#7a7068" strokeWidth="1" opacity="0.4"
      />

      {/* Kitchen counter hint */}
      <rect
        x={ROOM_META.kitchen.x + ROOM_META.kitchen.width - 16} y={ROOM_META.kitchen.y + 14}
        width="8" height={ROOM_META.kitchen.height - 28}
        fill="#ddd8d0" stroke="#a09585" strokeWidth="0.7" opacity="0.6"
      />

      {/* ══════════════
          HEAT / CHILDREN
          ══════════════ */}
      {children}

      {/* ══════════════
          GHOST LABELS
          ══════════════ */}
      {ROOMS.map(room => {
        const b = ROOM_META[room]
        const on = activeRoom === room
        const isYard = room === 'yard'
        return (
          <text key={`label-${room}`}
            x={b.x + b.width / 2} y={b.y + b.height / 2 + 4}
            textAnchor="middle" fontSize="8" letterSpacing="2.5"
            fill={on ? '#2a2218' : (isYard ? '#7a9e7a' : '#8a8078')}
            opacity={on ? 0.9 : (isYard ? 0.45 : 0.55)}>
            {b.label.toUpperCase()}
          </text>
        )
      })}

      {/* ══════════════
          ESP32 SENSORS
          ══════════════ */}
      {ROOMS.map(room => {
        const n = NODE_POSITIONS[room]
        return (
          <g key={`node-${room}`} opacity="0.35">
            <circle cx={n.x} cy={n.y} r="4.5" fill="none" stroke="#5a56a0" strokeWidth="1.2" />
            <circle cx={n.x} cy={n.y} r="1.5" fill="#5a56a0" />
          </g>
        )
      })}

      {/* Lot edge labels */}
      <text x="18" y={H - 10} fontSize="7.5" fill="#b0a898" letterSpacing="1.5" opacity="0.6">
        LOT
      </text>
      <text x={W - 18} y={H - 10} textAnchor="end" fontSize="7.5" fill="#b0a898" letterSpacing="1" opacity="0.6">
        N ↑
      </text>
    </svg>
  )
}
