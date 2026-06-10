'use client'

import type { RoomId } from '@/lib/types'

interface Props {
  activeRoom?: RoomId | null
  children?: React.ReactNode
}

// Wider canvas, more breathing room between zones
const W = 460
const H = 820

// Dot-grid stipple — uniform across canvas
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

// Room layout scaled to new canvas
// Real lot: studio top-left shed, garage top-right detached,
// yard open middle, house bottom (kitchen right, living center, bedroom bottom-left)
const ROOMS = {
  studio:      { x: 24,  y: 24,  w: 112, h: 96  },
  garage:      { x: 268, y: 24,  w: 164, h: 130 },
  yard:        { x: 24,  y: 166, w: 408, h: 240 },
  living_room: { x: 60,  y: 456, w: 188, h: 148 },
  kitchen:     { x: 268, y: 456, w: 164, h: 148 },
  bedroom:     { x: 24,  y: 624, w: 196, h: 168 },
}

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
          OUTBUILDINGS
          ══════════════ */}

      {/* Studio */}
      <rect
        x={ROOMS.studio.x} y={ROOMS.studio.y}
        width={ROOMS.studio.w} height={ROOMS.studio.h}
        fill="rgba(245,241,234,0.5)" stroke="#7a7068" strokeWidth="1.5" rx="1"
      />
      {/* Shed ridge */}
      <line
        x1={ROOMS.studio.x + 10} y1={ROOMS.studio.y + 2}
        x2={ROOMS.studio.x + ROOMS.studio.w - 10} y2={ROOMS.studio.y + 2}
        stroke="#7a7068" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.45"
      />
      {/* Bushes */}
      {[18, 32, 46].map(bx => (
        <ellipse key={bx} cx={bx} cy={ROOMS.studio.y - 5}
          rx="7" ry="5" fill="#a3d9a5" stroke="#6dc26f" strokeWidth="0.7" opacity="0.5"
        />
      ))}

      {/* Garage */}
      <rect
        x={ROOMS.garage.x} y={ROOMS.garage.y}
        width={ROOMS.garage.w} height={ROOMS.garage.h}
        fill="rgba(245,241,234,0.5)" stroke="#7a7068" strokeWidth="1.5" rx="1"
      />
      {/* Garage door */}
      <rect
        x={ROOMS.garage.x + 20} y={ROOMS.garage.y + ROOMS.garage.h - 24}
        width={ROOMS.garage.w - 40} height={20}
        fill="none" stroke="#7a7068" strokeWidth="0.9" opacity="0.4"
      />
      {[0, 6, 12].map(o => (
        <line key={o}
          x1={ROOMS.garage.x + 20} y1={ROOMS.garage.y + ROOMS.garage.h - 24 + o + 3}
          x2={ROOMS.garage.x + ROOMS.garage.w - 20} y2={ROOMS.garage.y + ROOMS.garage.h - 24 + o + 3}
          stroke="#7a7068" strokeWidth="0.5" opacity="0.3"
        />
      ))}

      {/* Yard */}
      <rect
        x={ROOMS.yard.x} y={ROOMS.yard.y}
        width={ROOMS.yard.w} height={ROOMS.yard.h}
        fill="rgba(245,241,234,0.15)" stroke="#7a9e7a" strokeWidth="1"
        strokeDasharray="4 3" rx="1"
      />
      {/* Grass ticks */}
      {([
        [40,188],[80,200],[130,185],[185,198],[240,188],[295,200],[350,188],[410,198],
        [55,228],[110,240],[165,225],[220,238],[278,228],[335,240],[395,226],
        [42,268],[95,280],[155,268],[210,278],[268,265],[325,278],[388,268],
        [60,308],[118,320],[175,308],[232,318],[290,308],[348,320],[405,308],
        [48,348],[105,360],[162,347],[220,358],[278,348],[336,360],[395,348],
      ] as [number,number][]).map(([gx,gy]) => (
        <line key={`g-${gx}-${gy}`}
          x1={gx} y1={gy} x2={gx+4} y2={gy-6}
          stroke="#8ac28a" strokeWidth="0.8" opacity="0.45"
        />
      ))}

      {/* Driveway strip */}
      <rect x="204" y="152" width="92" height="20"
        fill="#e8e3db" stroke="none" opacity="0.6"
      />

      {/* ══════════════
          MAIN HOUSE
          ══════════════ */}

      {/* Outer shell */}
      <rect
        x="24" y="444"
        width="408" height="356"
        fill="rgba(245,241,234,0.4)" stroke="#3d3830" strokeWidth="2" rx="2"
      />

      {/* Vertical wall: living / kitchen */}
      <line x1="268" y1="444" x2="268" y2="608" stroke="#7a7068" strokeWidth="1.5" />
      {/* Horizontal wall: upper / bedroom */}
      <line x1="24" y1="608" x2="432" y2="608" stroke="#7a7068" strokeWidth="1.5" />
      {/* Bedroom right wall */}
      <line x1="220" y1="608" x2="220" y2="800" stroke="#7a7068" strokeWidth="1.5" />

      {/* Kitchen counter hint */}
      <rect
        x={ROOMS.kitchen.x + ROOMS.kitchen.w - 12} y={ROOMS.kitchen.y + 12}
        width="8" height={ROOMS.kitchen.h - 24}
        fill="#ddd8d0" stroke="#a09585" strokeWidth="0.7" opacity="0.6"
      />

      {/* Front door */}
      <rect x="210" y="442" width="28" height="6" fill="#f5f1ea" />
      <path d="M 210 447 Q 210 434 224 434 Q 238 434 238 447"
        fill="none" stroke="#3d3830" strokeWidth="1.2" opacity="0.45"
      />
      {/* Bedroom door */}
      <rect x="200" y="606" width="24" height="6" fill="#f5f1ea" />
      <path d="M 200 609 Q 200 592 218 592"
        fill="none" stroke="#7a7068" strokeWidth="1" opacity="0.45"
      />
      {/* Kitchen door */}
      <rect x="266" y="536" width="6" height="22" fill="#f5f1ea" />
      <path d="M 268 536 Q 268 518 286 518"
        fill="none" stroke="#7a7068" strokeWidth="1" opacity="0.45"
      />

      {/* ══════════════
          HEAT / CHILDREN
          ══════════════ */}
      {children}

      {/* ══════════════
          GHOST LABELS
          ══════════════ */}
      {/* Studio */}
      <text x={ROOMS.studio.x + ROOMS.studio.w/2} y={ROOMS.studio.y + ROOMS.studio.h/2 + 4}
        textAnchor="middle" fontSize="8" letterSpacing="2.5"
        fill={activeRoom === 'studio' ? '#2a2218' : '#8a8078'} opacity={activeRoom === 'studio' ? 0.9 : 0.55}>
        STUDIO
      </text>
      {/* Garage */}
      <text x={ROOMS.garage.x + ROOMS.garage.w/2} y={ROOMS.garage.y + ROOMS.garage.h/2 + 4}
        textAnchor="middle" fontSize="8" letterSpacing="2.5"
        fill={activeRoom === 'garage' ? '#2a2218' : '#8a8078'} opacity={activeRoom === 'garage' ? 0.9 : 0.55}>
        GARAGE
      </text>
      {/* Yard */}
      <text x={ROOMS.yard.x + ROOMS.yard.w/2} y={ROOMS.yard.y + ROOMS.yard.h/2 + 4}
        textAnchor="middle" fontSize="8" letterSpacing="2.5"
        fill={activeRoom === 'yard' ? '#2a2218' : '#7a9e7a'} opacity={activeRoom === 'yard' ? 0.9 : 0.45}>
        YARD
      </text>
      {/* Living Room */}
      <text x={ROOMS.living_room.x + ROOMS.living_room.w/2} y={ROOMS.living_room.y + ROOMS.living_room.h/2 + 4}
        textAnchor="middle" fontSize="8" letterSpacing="2.5"
        fill={activeRoom === 'living_room' ? '#2a2218' : '#8a8078'} opacity={activeRoom === 'living_room' ? 0.9 : 0.55}>
        LIVING ROOM
      </text>
      {/* Kitchen */}
      <text x={ROOMS.kitchen.x + ROOMS.kitchen.w/2} y={ROOMS.kitchen.y + ROOMS.kitchen.h/2 + 4}
        textAnchor="middle" fontSize="8" letterSpacing="2.5"
        fill={activeRoom === 'kitchen' ? '#2a2218' : '#8a8078'} opacity={activeRoom === 'kitchen' ? 0.9 : 0.55}>
        KITCHEN
      </text>
      {/* Bedroom */}
      <text x={ROOMS.bedroom.x + ROOMS.bedroom.w/2} y={ROOMS.bedroom.y + ROOMS.bedroom.h/2 + 4}
        textAnchor="middle" fontSize="8" letterSpacing="2.5"
        fill={activeRoom === 'bedroom' ? '#2a2218' : '#8a8078'} opacity={activeRoom === 'bedroom' ? 0.9 : 0.55}>
        BEDROOM
      </text>

      {/* ══════════════
          ESP32 NODES
          ══════════════ */}
      {/* Studio: bottom-right */}
      <g opacity="0.35">
        <circle cx={ROOMS.studio.x + ROOMS.studio.w - 14} cy={ROOMS.studio.y + ROOMS.studio.h - 14} r="4.5"
          fill="none" stroke="#5a56a0" strokeWidth="1.2" />
        <circle cx={ROOMS.studio.x + ROOMS.studio.w - 14} cy={ROOMS.studio.y + ROOMS.studio.h - 14} r="1.5"
          fill="#5a56a0" />
      </g>
      {/* Garage: bottom-left */}
      <g opacity="0.35">
        <circle cx={ROOMS.garage.x + 16} cy={ROOMS.garage.y + ROOMS.garage.h - 16} r="4.5"
          fill="none" stroke="#5a56a0" strokeWidth="1.2" />
        <circle cx={ROOMS.garage.x + 16} cy={ROOMS.garage.y + ROOMS.garage.h - 16} r="1.5"
          fill="#5a56a0" />
      </g>
      {/* Living room: top-middle */}
      <g opacity="0.35">
        <circle cx={ROOMS.living_room.x + ROOMS.living_room.w/2} cy={ROOMS.living_room.y + 16} r="4.5"
          fill="none" stroke="#5a56a0" strokeWidth="1.2" />
        <circle cx={ROOMS.living_room.x + ROOMS.living_room.w/2} cy={ROOMS.living_room.y + 16} r="1.5"
          fill="#5a56a0" />
      </g>
      {/* Kitchen: left-middle */}
      <g opacity="0.35">
        <circle cx={ROOMS.kitchen.x + 16} cy={ROOMS.kitchen.y + ROOMS.kitchen.h/2} r="4.5"
          fill="none" stroke="#5a56a0" strokeWidth="1.2" />
        <circle cx={ROOMS.kitchen.x + 16} cy={ROOMS.kitchen.y + ROOMS.kitchen.h/2} r="1.5"
          fill="#5a56a0" />
      </g>
      {/* Bedroom: top-middle */}
      <g opacity="0.35">
        <circle cx={ROOMS.bedroom.x + ROOMS.bedroom.w/2} cy={ROOMS.bedroom.y + 16} r="4.5"
          fill="none" stroke="#5a56a0" strokeWidth="1.2" />
        <circle cx={ROOMS.bedroom.x + ROOMS.bedroom.w/2} cy={ROOMS.bedroom.y + 16} r="1.5"
          fill="#5a56a0" />
      </g>

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
