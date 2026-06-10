'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase, LOCATIONS_TABLE } from '@/lib/supabase'
import { computeHeat, getWindowStart, getWindowEnd } from '@/lib/heatmap'
import FloorPlan from './FloorPlan'
import HeatLayer from './HeatLayer'
import type { Dog, LocationEvent, RoomHeat, RoomId, TimeRange } from '@/lib/types'
import { DOG_META, SENSORS } from '@/lib/types'

const TIME_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: 'TODAY', value: 'today' },
  { label: 'YESTERDAY', value: 'yesterday' },
]

export default function DogTracker() {
  const [visible, setVisible] = useState<Record<Dog, boolean>>({ razzy: true, bucky: true })
  const [timeRange, setTimeRange] = useState<TimeRange>('today')
  const [events, setEvents] = useState<LocationEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const start = getWindowStart(timeRange)
    const end = getWindowEnd(timeRange)

    const { data } = await getSupabase()
      .from(LOCATIONS_TABLE)
      .select('*')
      .gte('entered_at', start.toISOString())
      .lte('entered_at', end.toISOString())
      .order('entered_at', { ascending: true })
      .limit(10000)

    setEvents((data as LocationEvent[]) ?? [])
    setLoading(false)
  }, [timeRange])

  useEffect(() => {
    setLoading(true)
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
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
  }, [fetchEvents])

  function getDogState(dog: Dog): { heat: RoomHeat[]; liveRoom: RoomId | null } {
    const dogEvents = events.filter(e => e.dog === dog)
    // "Here now" = the most recent sample dot, if it's fresh (within 5 min).
    const last = dogEvents[dogEvents.length - 1]
    const fresh = last && Date.now() - new Date(last.entered_at).getTime() < 5 * 60_000
    const liveRoom = fresh ? (last.room as RoomId) : null
    return { heat: computeHeat(dogEvents, liveRoom), liveRoom }
  }

  const noData = !loading && events.length === 0
  const razzy = getDogState('razzy')
  const bucky = getDogState('bucky')
  const toggleDog = (dog: Dog) => setVisible(v => ({ ...v, [dog]: !v[dog] }))

  // Which sensors should pulse right now (a visible dog is live there)
  const liveSensors: { room: RoomId; color: string; emoji: string }[] = []
  if (visible.razzy && razzy.liveRoom)
    liveSensors.push({ room: razzy.liveRoom, color: DOG_META.razzy.color, emoji: DOG_META.razzy.emoji })
  if (visible.bucky && bucky.liveRoom)
    liveSensors.push({ room: bucky.liveRoom, color: DOG_META.bucky.color, emoji: DOG_META.bucky.emoji })

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ background: '#f2ede6', fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
    >
      {/* Header */}
      <header className="mb-8 flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wolf-potato-logo.png"
          alt="Wolf &amp; Potato"
          width={176}
          height={176}
          className="w-44 h-44 object-contain"
          style={{ mixBlendMode: 'multiply' }}
        />
        <h1 className="-mt-3 text-xl font-light tracking-tight text-stone-700">
          Dog Day Heat Map
        </h1>
      </header>

      {/* Dog toggles + time range */}
      <div className="flex flex-wrap gap-4 justify-center items-center mb-6">
        {(['razzy', 'bucky'] as Dog[]).map(dog => {
          const meta = DOG_META[dog]
          const on = visible[dog]
          const liveRoom = dog === 'razzy' ? razzy.liveRoom : bucky.liveRoom
          const dotColor = dog === 'razzy' ? '#60a5fa' : '#fb923c'

          return (
            <button
              key={dog}
              onClick={() => toggleDog(dog)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full text-sm transition-all"
              style={{
                background: on ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                border: `1.5px solid ${on ? dotColor : '#d4cfc8'}`,
                color: on ? '#2a2520' : '#a09890',
                backdropFilter: 'blur(4px)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: on ? dotColor : '#d4cfc8' }}
              />
              <span className="font-medium tracking-wide">{meta.label}</span>
              {on && liveRoom && (
                <span
                  className="text-xs tracking-wider uppercase"
                  style={{ color: dotColor, opacity: 0.8 }}
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
          style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid #d4cfc8' }}
        >
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className="px-3 py-1 rounded-full text-xs font-medium tracking-widest transition-all"
              style={{
                background: timeRange === opt.value ? '#2a2520' : 'transparent',
                color: timeRange === opt.value ? '#f2ede6' : '#8a7f74',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map card */}
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-sm"
        style={{ border: '1px solid #d4cfc8' }}
      >
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ aspectRatio: '480 / 576', background: '#f7f4ef' }}
          >
            <span className="text-3xl opacity-40 animate-pulse">◦ ◦ ◦</span>
          </div>
        ) : (
          <FloorPlan liveSensors={liveSensors}>
            <HeatLayer dog="razzy" heat={razzy.heat} visible={visible.razzy} />
            <HeatLayer dog="bucky" heat={bucky.heat} visible={visible.bucky} />
          </FloorPlan>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-5 text-xs tracking-widest uppercase text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 opacity-80" />
          Razzy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-400 opacity-80" />
          Bucky
        </span>
        <span>density = time</span>
      </div>

      {noData && (
        <p className="text-center text-stone-400 text-xs tracking-[0.2em] uppercase mt-4 opacity-50">
          no movement data yet — are the beacons on?
        </p>
      )}
    </div>
  )
}
