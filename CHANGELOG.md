# Changelog

All notable changes to Wolf & Potato are documented here.

## [0.2.0.0] - 2026-06-10

### Added
- **Dark minimalist heatmap** — full UI overhaul to a dark (#0d0b09) ink-and-fire aesthetic. The floor plan renders as chalk lines on a dark field using `mixBlendMode: screen` on the inverted lot-sketch image.
- **Temporal heat decay** — room glow builds as dogs linger and visibly cools once they leave, powered by exponential decay (`weight = 0.5^(ageMin / 90min half-life)`).
- **Day replay timeline** — 96-bin activity barcode strip with scrubbing and 16-second full-day playback. Watch Razzy and Bucky patrol the property across the entire day.
- **Animated dog markers** — 🐺 and 🥔 are now large (30px), glowing emoji that smoothly glide between rooms during replay. When sharing a room they step apart so both are visible.
- **Demo data mode** — deterministic synthetic schedule shown automatically when no Supabase connection is available. Displays a "DEMO DATA" badge; real data takes over when env vars are set.
- **Organic heat blobs** — rooms glow with soft layered discs roughed up by turbulence filters, with floating ember particles rising from warm areas.
- **Per-dog stats footer** — shows recency-weighted time in each room and the dog's top location for the selected window.

### Changed
- Heat pools now scale with built-up occupancy — a long stay spreads the glow further and collapses as the room cools.
- Room clips for Kitchen and Living Room prevent heat bleed through walls.
- Sensor dots and radar pulse rings still mark live positions; the emoji marker shows the dog's current room.
- Theme color set to #0d0b09 for mobile browser chrome.

## [0.1.0] - initial

- Basic dog location heatmap with Supabase realtime and ESPresense BLE sensor zones.
