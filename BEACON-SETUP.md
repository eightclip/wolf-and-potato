# Beacon Setup — Tagging Razzy & Bucky

The bridge is running and connected to MQTT. Once the beacons are configured in
ESPresense, tracking starts automatically. Here's how to do it.

## Step 1 — Get the F-EZY-Com beacons broadcasting

Power on each beacon. They broadcast over Bluetooth immediately — no app needed.
By default they'll show up in ESPresense with their raw MAC address as the ID.

## Step 2 — Find each beacon's ID in ESPresense

Open your ESPresense web UI. The easiest way to find it:

1. Go to **http://espresense.local** (or the IP of any ESP32 node — check your
   router DHCP table for a device named "espresense")
2. Click **Devices** in the top nav
3. Hold one beacon near the ESP32 — watch for a new device to appear with a
   strong signal (low distance number, high RSSI)
4. Note the **ID** shown — it'll look like `ibeacon:xxxx-xxxx` or a raw MAC

Do this one beacon at a time so you know which is which.

## Step 3 — Alias the beacons in ESPresense

In the ESPresense UI → **Devices** → click the beacon → set the **Alias** to:
- Razzy's beacon → `razzy_beacon`
- Bucky's beacon → `bucky_beacon`

These exact names match what the bridge is already listening for on MQTT.

## Step 4 — Verify it's working

On your Mac, run:

```bash
ssh what-server "HOME=/tmp/docker-home DOCKER_HOST=unix:///var/run/docker.sock LD_LIBRARY_PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/usr/lib /share/CACHEDEV1_DATA/.qpkg/container-station/usr/bin/.libs/docker logs -f wolf-potato-bridge"
```

Walk around the house with a beacon. You should see:

```
[mqtt] message on espresense/devices/razzy_beacon/kitchen
[enter] razzy → kitchen (id=1)
[hb] razzy current=kitchen live=[kitchen:1.2m living_room:4.5m]
```

And rows appearing in Supabase → Table Editor → `wolf_potato_locations`.

## Step 5 — Attach to the dogs

Once verified, attach the beacons to their collars. Small zip tie or collar loop
works well. The beacons are small enough not to bother them.

## If the alias name is different

If you used different aliases in ESPresense, update the bridge `.env` on the QNAP:

```bash
ssh what-server "nano /share/CACHEDEV1_DATA/Container/wolf-potato-bridge/.env"
# Change RAZZY_BEACON_ID and BUCKY_BEACON_ID to match your aliases
```

Then restart:

```bash
ssh what-server "cd /share/CACHEDEV1_DATA/Container/wolf-potato-bridge && \
  HOME=/tmp/docker-home DOCKER_HOST=unix:///var/run/docker.sock \
  LD_LIBRARY_PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/usr/lib \
  /share/CACHEDEV1_DATA/.qpkg/container-station/usr/bin/.libs/docker compose restart"
```
