'use client'

import { useRef, useCallback } from 'react'
import type { Dog, LocationEvent } from '@/lib/types'
import { DOG_META } from '@/lib/types'

interface Props {
  events: LocationEvent[]
  start: number
  end: number
  playhead: number | null   // null = live (now)
  playing: boolean
  visible: Record<Dog, boolean>
  onScrub: (t: number) => void
  onPlayToggle: () => void
  onLive: () => void
}

const W = 480
const H = 56
const BINS = 96
const PAD = 8

function fmtTime(t: number): string {
  return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function Timeline({
  events, start, end, playhead, playing, visible, onScrub, onPlayToggle, onLive,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const span = Math.max(1, end - start)
  const innerW = W - PAD * 2

  // Bin activity per dog
  const bins: Record<Dog, number[]> = {
    razzy: new Array(BINS).fill(0),
    bucky: new Array(BINS).fill(0),
  }
  for (const ev of events) {
    const t = new Date(ev.entered_at).getTime()
    const i = Math.min(BINS - 1, Math.max(0, Math.floor(((t - start) / span) * BINS)))
    bins[ev.dog][i]++
  }
  const maxBin = Math.max(1, ...bins.razzy, ...bins.bucky)

  const headT = playhead ?? end
  const headX = PAD + ((headT - start) / span) * innerW

  const scrubFromEvent = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onScrub(start + frac * span)
  }, [onScrub, start, span])

  const rows: { dog: Dog; y: number }[] = [
    { dog: 'razzy', y: 14 },
    { dog: 'bucky', y: 32 },
  ]
  const barW = innerW / BINS

  // Tick labels: start / quarter points / end
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => fmtTime(start + f * span))

  return (
    <div className="select-none">
      {/* Transport row */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onPlayToggle}
          aria-label={playing ? 'Pause replay' : 'Replay the day'}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          style={{
            background: playing ? '#e7e2da' : 'rgba(255,255,255,0.08)',
            color: playing ? '#13100d' : '#e7e2da',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          {playing ? (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="0" width="3" height="10" rx="0.8" />
              <rect x="6" y="0" width="3" height="10" rx="0.8" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 0.8 L9.2 5 L2 9.2 Z" />
            </svg>
          )}
        </button>

        <span className="mono text-[11px] tracking-[0.18em] uppercase text-stone-400">
          {playhead === null ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" />
              live · {fmtTime(end)}
            </span>
          ) : (
            <span className="text-stone-200">{playing ? 'replaying' : 'scrubbing'} · {fmtTime(headT)}</span>
          )}
        </span>

        {playhead !== null && (
          <button
            onClick={onLive}
            className="mono ml-auto text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            style={{
              color: '#34d399',
              border: '1px solid rgba(52,211,153,0.35)',
              background: 'rgba(52,211,153,0.08)',
            }}
          >
            ● live
          </button>
        )}
      </div>

      {/* Activity strip */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block cursor-crosshair touch-none"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          scrubFromEvent(e)
        }}
        onPointerMove={e => { if (e.buttons & 1) scrubFromEvent(e) }}
      >
        {/* Track */}
        <rect x={PAD} y="6" width={innerW} height="44" rx="6" fill="rgba(255,255,255,0.04)" />

        {rows.map(({ dog, y }) =>
          visible[dog] && bins[dog].map((count, i) => {
            if (count === 0) return null
            const op = 0.18 + 0.82 * Math.sqrt(count / maxBin)
            return (
              <rect
                key={`${dog}-${i}`}
                x={PAD + i * barW + 0.4}
                y={y}
                width={Math.max(0.8, barW - 0.8)}
                height="10"
                rx="1"
                fill={DOG_META[dog].color}
                opacity={op}
              />
            )
          })
        )}

        {/* Playhead */}
        <line x1={headX} y1="3" x2={headX} y2={H - 3} stroke="#e7e2da" strokeWidth="1" opacity="0.8" />
        <circle cx={headX} cy="3.5" r="3" fill="#e7e2da" />
      </svg>

      {/* Hour ticks */}
      <div className="flex justify-between mono text-[9px] tracking-wider text-stone-500 mt-1 px-1">
        {ticks.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  )
}
