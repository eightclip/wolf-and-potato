/**
 * Wolf-Potato Presence Bridge — sampling model
 *
 * Watches ESPresense MQTT topics for both dogs' beacons and, once a minute,
 * drops a single "sample dot" row into the wolf_potato_locations table for
 * each dog at its nearest sensor. Accumulated dot density over time shows
 * where the dogs actually spend their time.
 *
 * Runs on the QNAP via Docker alongside the GAEDHD bridge.
 */

import mqtt from 'mqtt'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ---------------------------------------------------------------------------
// Load .env if present
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const envPath = resolve(__dirname, '.env')
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (k && !(k in process.env)) process.env[k] = v
  }
} catch { /* no .env — rely on environment */ }

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MQTT_HOST    = process.env.MQTT_HOST    || '192.168.87.100'
const MQTT_PORT    = parseInt(process.env.MQTT_PORT || '1883', 10)
const MQTT_USER    = process.env.MQTT_USER    || ''
const MQTT_PASS    = process.env.MQTT_PASS    || ''

const RAZZY_ID = process.env.RAZZY_BEACON_ID || 'razzy_beacon'
const BUCKY_ID = process.env.BUCKY_BEACON_ID || 'bucky_beacon'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY   // service role — bypasses RLS

// Tuning
const FRESH_MS        = parseInt(process.env.FRESH_MS        || '30000', 10)  // ignore stale readings
const SAMPLE_MS       = parseInt(process.env.SAMPLE_MS       || '60000', 10)  // one dot per dog per minute
const MAX_DISTANCE_M  = parseFloat(process.env.MAX_DISTANCE_M || '8')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[fatal] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. Exiting.')
  process.exit(1)
}
if (!MQTT_PASS) console.warn('[warn] MQTT_PASS is not set — broker auth will fail.')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
})
const TABLE = 'wolf_potato_locations'

console.log(`[init] wolf-potato bridge (sampling model)`)
console.log(`[init] razzy=${RAZZY_ID}  bucky=${BUCKY_ID}`)
console.log(`[init] mqtt ${MQTT_HOST}:${MQTT_PORT}  sample=${SAMPLE_MS}ms fresh=${FRESH_MS}ms maxDist=${MAX_DISTANCE_M}m`)

// ---------------------------------------------------------------------------
// Per-dog state
// ---------------------------------------------------------------------------
function makeDogState(name, beaconId) {
  return {
    name,
    beaconId,
    topic: `espresense/devices/${beaconId}/+`,
    readings: new Map(),    // room -> { distance, ts }
  }
}

const dogs = {
  razzy: makeDogState('razzy', RAZZY_ID),
  bucky: makeDogState('bucky', BUCKY_ID),
}

// ---------------------------------------------------------------------------
// MQTT
// ---------------------------------------------------------------------------
const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USER,
  password: MQTT_PASS,
  reconnectPeriod: 5000,
  connectTimeout: 10_000,
})

client.on('connect', () => {
  console.log('[mqtt] connected')
  for (const dog of Object.values(dogs)) {
    client.subscribe(dog.topic, err => {
      if (err) console.error(`[mqtt] subscribe error (${dog.name}):`, err.message)
      else console.log(`[mqtt] subscribed ${dog.topic}`)
    })
  }
})
client.on('reconnect', () => console.log('[mqtt] reconnecting…'))
client.on('error',     err  => console.error('[mqtt] error:', err.message))
client.on('close',     ()   => console.log('[mqtt] connection closed'))

client.on('message', (topic, payload) => {
  // espresense/devices/<beaconId>/<room>
  const parts = topic.split('/')
  const beaconId = parts[2]
  const room = parts[3]
  if (!beaconId || !room) return

  const dog = Object.values(dogs).find(d => d.beaconId === beaconId)
  if (!dog) return

  let dist
  try { dist = JSON.parse(payload.toString()).distance } catch { return }
  if (typeof dist !== 'number' || !Number.isFinite(dist)) return

  dog.readings.set(room, { distance: dist, ts: Date.now() })
})

// ---------------------------------------------------------------------------
// Nearest-room helper
// ---------------------------------------------------------------------------
function nearestRoom(dog) {
  const now = Date.now()
  let best = null, bestDist = Infinity
  for (const [room, r] of dog.readings) {
    if (now - r.ts > FRESH_MS) continue
    if (r.distance > MAX_DISTANCE_M) continue
    if (r.distance < bestDist) { bestDist = r.distance; best = room }
  }
  return best ? { room: best, distance: bestDist } : null
}

// ---------------------------------------------------------------------------
// Sampling — one dot per dog per SAMPLE_MS
// ---------------------------------------------------------------------------
async function sampleDog(dog) {
  const near = nearestRoom(dog)
  if (!near) return  // dog not detected anywhere fresh — no dot this round

  const { error } = await supabase
    .from(TABLE)
    .insert({
      dog: dog.name,
      room: near.room,
      distance_m: near.distance,
      entered_at: new Date().toISOString(),
    })

  if (error) console.error(`[db] sample failed (${dog.name}):`, error.message)
  else console.log(`[dot] ${dog.name} @ ${near.room} (${near.distance.toFixed(1)}m)`)
}

function sampleAll() {
  for (const dog of Object.values(dogs)) sampleDog(dog)
}

// First dot shortly after startup (so the map fills in without a full-minute
// wait), then one per dog every SAMPLE_MS.
setTimeout(sampleAll, 15_000)
setInterval(sampleAll, SAMPLE_MS)

// ---------------------------------------------------------------------------
// Heartbeat — what each dog currently looks like, for log debugging
// ---------------------------------------------------------------------------
setInterval(() => {
  const now = Date.now()
  for (const dog of Object.values(dogs)) {
    const live = [...dog.readings.entries()]
      .filter(([, r]) => now - r.ts <= FRESH_MS)
      .map(([room, r]) => `${room}:${r.distance.toFixed(1)}m`)
      .join(' ')
    const near = nearestRoom(dog)
    console.log(`[hb] ${dog.name} nearest=${near?.room ?? '?'} live=[${live || 'none'}]`)
  }
}, 60_000)

process.on('SIGTERM', () => { client.end(); process.exit(0) })
process.on('SIGINT',  () => { client.end(); process.exit(0) })
