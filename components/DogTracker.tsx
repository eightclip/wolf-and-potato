'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getSupabase, LOCATIONS_TABLE } from '@/lib/supabase'
import { computeHeat, getWindowStart, getWindowEnd } from '@/lib/heatmap'
import { getDemoEvents } from '@/lib/demo'
import FloorPlan from './FloorPlan'
import HeatLayer from './HeatLayer'
import Timeline from './Timeline'
import type { Dog, LocationEvent, RoomHeat, RoomId, TimeRange } from '@/lib/types'
import { DOG_META, SENSORS } from '@/lib/types'

const TIME_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: 'TODAY', value: 'today' },
  { label: 'YESTERDAY', value: 'yesterday' },
]

const REPLAY_MS = 16_000 // how long a full-day replay takes

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export default function DogTracker() {
  const [visible, setVisible] = useState<Record<Dog, boolean>>({ razzy: true, bucky: true })
  const [timeRange, setTimeRange] = useState<TimeRange>('today')
  const [events, setEvents] = useState<LocationEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)

  // Replay state: playhead is a ms timestamp inside the window, null = live.
  const [playhead, setPlayhead] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  // Where the replay should start from — captured in the play handler
  const playFromRef = useRef<number | null>(null)

  const fetchEvents = useCallback(async () => {
    const start = getWindowStart(timeRange)
    const end = getWindowEnd(timeRange)

    try {
      const { data, error } = await getSupabase()
        .from(LOCATIONS_TABLE)
        .select('*')
        .gte('entered_at', start.toISOString())
        .lte('entered_at', end.toISOString())
        .order('entered_at', { ascending: true })
        .limit(10000)
      if (error) throw error
      setEvents((data as unknown as LocationEvent[]) ?? [])
      setDemo(false)
    } catch {
      // No Supabase env (or query failed) — show a plausible synthesized day
      setEvents(getDemoEvents(start, end))
      setDemo(true)
    }
    setLoading(false)
  }, [timeRange])

  useEffect(() => {
    // Async data fetch on mount / range change; setState happens in the
    // promise continuation, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents()
  }, [fetchEvents])

  const changeRange = (r: TimeRange) => {
    if (r === timeRange) return
    setLoading(true)
    setPlaying(false)
    setPlayhead(null)
    setTimeRange(r)
  }

  useEffect(() => {
    try {
      const sb = getSupabase()
      const channel = sb
        .channel('wolf-potato-locations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: LOCATIONS_TABLE },
          () => { fetchEvents() }
        )
        .subscribe()
      return () => { sb.removeChannel(channel) }
    } catch {
      // Demo mode: refresh once a minute so the synthetic day keeps moving
      const id = setInterval(fetchEvents, 60_000)
      return () => clearInterval(id)
    }
  }, [fetchEvents])

  // Replay engine
  useEffect(() => {
    if (!playing) return
    const start = getWindowStart(timeRange).getTime()
    const end = getWindowEnd(timeRange).getTime()
    const span = end - start
    const current = playFromRef.current
    const from = current !== null && current > start && current < end - span * 0.02 ? current : start
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = from + span * ((t - t0) / REPLAY_MS)
      if (p >= end) {
        setPlayhead(null)
        setPlaying(false)
        return
      }
      setPlayhead(p)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, timeRange])

  const windowStart = getWindowStart(timeRange).getTime()
  const windowEnd = getWindowEnd(timeRange).getTime()
  // For live ranges windowEnd is "now"; for yesterday nothing can be live anyway.
  const effectiveNow = playhead ?? windowEnd

  function getDogState(dog: Dog): { heat: RoomHeat[]; liveRoom: RoomId | null; minutes: number; topRoom: RoomId | null } {
    const dogEvents = events.filter(e =>
      e.dog === dog && (playhead === null || new Date(e.entered_at).getTime() <= playhead)
    )
    // "Here now" = the most recent sample, if fresh (within 5 min of the playhead)
    const last = dogEvents[dogEvents.length - 1]
    const fresh = last && effectiveNow - new Date(last.entered_at).getTime() < 5 * 60_000
    const liveRoom = fresh ? (last.room as RoomId) : null
    const heat = computeHeat(dogEvents, liveRoom, effectiveNow)
    const top = heat.reduce<RoomHeat | null>((a, b) => (b.count > (a?.count ?? 0) ? b : a), null)
    return { heat, liveRoom, minutes: dogEvents.length, topRoom: top && top.count > 0 ? top.room : null }
  }

  const noData = !loading && events.length === 0
  const razzy = getDogState('razzy')
  const bucky = getDogState('bucky')
  const states = { razzy, bucky }
  const toggleDog = (dog: Dog) => setVisible(v => ({ ...v, [dog]: !v[dog] }))

  // Which sensors should pulse right now (a visible dog is live there)
  const liveSensors: { dog: string; room: RoomId; color: string; emoji: string }[] = []
  if (visible.razzy && razzy.liveRoom)
    liveSensors.push({ dog: 'razzy', room: razzy.liveRoom, color: DOG_META.razzy.color, emoji: DOG_META.razzy.emoji })
  if (visible.bucky && bucky.liveRoom)
    liveSensors.push({ dog: 'bucky', room: bucky.liveRoom, color: DOG_META.bucky.color, emoji: DOG_META.bucky.emoji })

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      {/* Header */}
      <header className="rise mb-6 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wolf-potato-logo.png"
          alt="Wolf &amp; Potato"
          width={120}
          height={120}
          className="w-30 h-30 object-contain"
          style={{
            filter: 'invert(1) contrast(1.35) brightness(1.08)',
            mixBlendMode: 'screen',
            opacity: 0.95,
            // Fade the edges so the inverted paper grain never reads as a box
            WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 98%)',
            maskImage: 'radial-gradient(closest-side, #000 55%, transparent 98%)',
          }}
        />
        <h1 className="mono -mt-2 text-[11px] font-medium tracking-[0.45em] uppercase text-stone-400">
          Dog Day Heat Map
        </h1>
        {demo && (
          <span className="mono mt-2 text-[9px] tracking-[0.3em] uppercase text-amber-500/60 border border-amber-500/20 rounded-full px-2.5 py-0.5">
            demo data
          </span>
        )}
      </header>

      {/* Dog toggles + time range */}
      <div className="rise flex flex-wrap gap-3 justify-center items-center mb-5" style={{ animationDelay: '0.08s' }}>
        {(['razzy', 'bucky'] as Dog[]).map(dog => {
          const meta = DOG_META[dog]
          const on = visible[dog]
          const liveRoom = states[dog].liveRoom

          return (
            <button
              key={dog}
              onClick={() => toggleDog(dog)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full text-sm transition-all cursor-pointer"
              style={{
                background: on ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${on ? `${meta.color}66` : 'rgba(255,255,255,0.08)'}`,
                color: on ? '#e7e2da' : '#6b6259',
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: on ? meta.color : '#48413a',
                  boxShadow: on ? `0 0 8px ${meta.color}` : 'none',
                }}
              />
              <span className="font-medium tracking-wide">{meta.label}</span>
              {on && liveRoom && (
                <span
                  className="mono text-[10px] tracking-[0.15em] uppercase"
                  style={{ color: meta.color, opacity: 0.85 }}
                >
                  {SENSORS[liveRoom].label}
                </span>
              )}
            </button>
          )
        })}

        {/* Time pills */}
        <div
          className="flex gap-0.5 rounded-full p-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => changeRange(opt.value)}
              className="mono px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.18em] transition-all cursor-pointer"
              style={{
                background: timeRange === opt.value ? '#e7e2da' : 'transparent',
                color: timeRange === opt.value ? '#13100d' : '#8a7f74',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map card */}
      <div
        className="rise w-full max-w-xl rounded-3xl overflow-hidden"
        style={{
          animationDelay: '0.16s',
          border: '1px solid rgba(255,255,255,0.09)',
          background: '#13100d',
          boxShadow: '0 24px 80px -24px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ aspectRatio: '480 / 576' }}
          >
            <span className="mono text-xs tracking-[0.4em] uppercase text-stone-600 animate-pulse">
              warming up
            </span>
          </div>
        ) : (
          <>
            <FloorPlan liveSensors={liveSensors}>
              <HeatLayer dog="razzy" heat={razzy.heat} visible={visible.razzy} />
              <HeatLayer dog="bucky" heat={bucky.heat} visible={visible.bucky} />
            </FloorPlan>

            {/* Replay timeline */}
            <div className="px-5 pt-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <Timeline
                events={events}
                start={windowStart}
                end={windowEnd}
                playhead={playhead}
                playing={playing}
                visible={visible}
                onScrub={t => { setPlaying(false); setPlayhead(t) }}
                onPlayToggle={() => {
                  playFromRef.current = playhead
                  setPlaying(p => !p)
                }}
                onLive={() => { setPlaying(false); setPlayhead(null) }}
              />
            </div>
          </>
        )}
      </div>

      {/* Per-dog stats */}
      {!loading && !noData && (
        <div className="rise flex flex-wrap gap-x-8 gap-y-2 justify-center mt-5" style={{ animationDelay: '0.24s' }}>
          {(['razzy', 'bucky'] as Dog[]).map(dog => {
            const st = states[dog]
            if (!visible[dog] || st.minutes === 0) return null
            return (
              <span key={dog} className="mono text-[10px] tracking-[0.2em] uppercase text-stone-400">
                <span style={{ color: DOG_META[dog].color }}>{DOG_META[dog].label}</span>
                {' '}{fmtDuration(st.minutes)}
                {st.topRoom && <span className="text-stone-500"> · mostly {SENSORS[st.topRoom].label}</span>}
              </span>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="rise flex gap-6 mt-4 mono text-[9px] tracking-[0.25em] uppercase text-stone-600" style={{ animationDelay: '0.3s' }}>
        <span>glow builds where they linger, cools when they leave</span>
        <span>press play to replay the day</span>
      </div>

      {noData && (
        <p className="mono text-center text-stone-500 text-[10px] tracking-[0.25em] uppercase mt-4">
          no movement data yet — are the beacons on?
        </p>
      )}
    </div>
  )
}
