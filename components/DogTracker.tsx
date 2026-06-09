'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase, LOCATIONS_TABLE } from '@/lib/supabase'
import { computeHeat, getWindowStart, getWindowEnd } from '@/lib/heatmap'
import FloorPlan from './FloorPlan'
import HeatLayer from './HeatLayer'
import type { Dog, LocationEvent, RoomHeat, RoomId, TimeRange } from '@/lib/types'
import { DOG_META } from '@/lib/types'

const TIME_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: 'Last hour', value: '1h' },
  { label: 'Last 6h', value: '6h' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
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

    setEvents((data as LocationEvent[]) ?? [])
    setLoading(false)
  }, [timeRange])

  // Initial + time range fetch
  useEffect(() => {
    setLoading(true)
    fetchEvents()
  }, [fetchEvents])

  // Realtime subscription — insert new rows live
  useEffect(() => {
    const sb = getSupabase()
    const channel = sb
      .channel('wolf-potato-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: LOCATIONS_TABLE },
        () => {
          // Re-fetch on any change; simple and correct
          fetchEvents()
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [fetchEvents])

  // Derive heat + live position per dog
  function getDogState(dog: Dog): { heat: RoomHeat[]; liveRoom: RoomId | null } {
    const dogEvents = events.filter(e => e.dog === dog)

    // Most recent event without exited_at = currently live
    const liveEvent = [...dogEvents]
      .reverse()
      .find(e => e.exited_at === null)
    const liveRoom = (liveEvent?.room as RoomId) ?? null

    const heat = computeHeat(dogEvents, liveRoom)
    return { heat, liveRoom }
  }

  const razzy = getDogState('razzy')
  const bucky = getDogState('bucky')

  const toggleDog = (dog: Dog) =>
    setVisible(v => ({ ...v, [dog]: !v[dog] }))

  return (
    <div className="min-h-screen bg-amber-50 p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-amber-900 tracking-tight"
            style={{ fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive" }}>
          🐾 Wolf &amp; Potato
        </h1>
        <p className="text-amber-700 text-sm mt-1">where are the babies?</p>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {/* Dog toggles */}
        {(['razzy', 'bucky'] as Dog[]).map(dog => {
          const meta = DOG_META[dog]
          const on = visible[dog]
          return (
            <button
              key={dog}
              onClick={() => toggleDog(dog)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                on
                  ? dog === 'razzy'
                    ? 'bg-blue-100 border-blue-400 text-blue-800'
                    : 'bg-orange-100 border-orange-400 text-orange-800'
                  : 'bg-stone-100 border-stone-300 text-stone-400 opacity-60'
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              {/* Live room badge */}
              {on && (razzy.liveRoom || bucky.liveRoom) && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    dog === 'razzy'
                      ? 'bg-blue-200 text-blue-700'
                      : 'bg-orange-200 text-orange-700'
                  }`}
                >
                  {(dog === 'razzy' ? razzy.liveRoom : bucky.liveRoom)?.replace('_', ' ') ?? '?'}
                </span>
              )}
            </button>
          )
        })}

        {/* Time range pills */}
        <div className="flex gap-1 bg-stone-100 rounded-full p-1">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                timeRange === opt.value
                  ? 'bg-amber-400 text-amber-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floor plan */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-4 border border-amber-200">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-amber-400">
            <span className="text-4xl animate-bounce">🐾</span>
          </div>
        ) : (
          <FloorPlan>
            <HeatLayer dog="razzy" heat={razzy.heat} visible={visible.razzy} />
            <HeatLayer dog="bucky" heat={bucky.heat} visible={visible.bucky} />
          </FloorPlan>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center mt-4 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
          Razzy (Wolf)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />
          Bucky (Potato)
        </span>
        <span className="flex items-center gap-1">
          <span>Darker = more time spent</span>
        </span>
      </div>

      {/* No-data hint */}
      {!loading && events.length === 0 && (
        <p className="text-center text-stone-400 text-sm mt-6">
          No movement data for this window yet — are the beacons on? 🔋
        </p>
      )}
    </div>
  )
}
