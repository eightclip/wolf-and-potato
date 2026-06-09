# Wolf & Potato 🐺🥔

Real-time heatmap of where Razzy (Wolf) and Bucky (Potato) are hanging out throughout the day, based on ESPresense BLE beacons + MQTT.

## What it does

- Shows a cute illustrated floor plan of the house (Garage, Studio, Kitchen, Living Room, Bedroom, Yard)
- Dual-color heatmap: Razzy = blue/silver, Bucky = warm orange
- Pulsing live dot shows where each dog is *right now*
- Toggle each dog on/off
- Time range filter: Last 1h / Last 6h / Today / Yesterday
- Live updates via Supabase Realtime — no refresh needed

## Architecture

```
ESPresense nodes (ESP32 per room)
  └─ MQTT  espresense/devices/<beacon>/<room>  { distance: X.X }
       │
wolf-potato-bridge (Docker on QNAP)
  └─ INSERT wolf_potato_locations (dog, room, entered_at)
       │
Supabase (wolf_potato_locations table)
       │
Next.js on Vercel  ← this repo's root
```

The bridge is intentionally separate from GAEDHD. Same MQTT broker, different Supabase table, different Docker container.

## Setup

### 1. Supabase

Run `supabase/migrations.sql` in your Supabase SQL editor. Enable Realtime on the `wolf_potato_locations` table.

### 2. Next.js (Vercel)

Copy `.env.local.example` → `.env.local` and fill in your Supabase project URL and anon key.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Deploy to Vercel, set the same env vars in the Vercel dashboard (or use the `vercel.json` secret references).

### 3. Bridge (QNAP Docker)

```bash
cd bridge
cp .env.example .env
# Fill in MQTT creds and Supabase service role key
docker compose up -d
```

Configure your ESPresense beacon aliases to match `RAZZY_BEACON_ID` and `BUCKY_BEACON_ID` in `.env`.

## Dev

```bash
pnpm install
pnpm dev
```

## Adding new rooms

1. Add the room slug to `RoomId` in `lib/types.ts`
2. Add bounds + label to `ROOM_META`
3. Add the room `<rect>` to `components/FloorPlan.tsx`

## Project structure

```
app/             Next.js app router
components/
  DogTracker.tsx  Main page component (data fetching, state)
  FloorPlan.tsx   SVG illustrated floor plan
  HeatLayer.tsx   Heatmap overlay per dog
lib/
  types.ts        Shared types, room/dog metadata
  supabase.ts     Supabase client (lazy init)
  heatmap.ts      Heat computation utilities
bridge/           Docker service (runs on QNAP)
supabase/         SQL migrations
```
