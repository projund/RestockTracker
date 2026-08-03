# Conroe Restock Tracker

Static HTML/CSS/JavaScript prototype for community restock tracking near ZIP 77304.

## Run locally

Serve this folder with a local web server so the JSON files can load:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## This revision

- Fresh, Stale, and Archived sighting lifecycle
- TCG/Squishies: Fresh 0–2h, Stale 2–3h, Archived after 3h
- Beyblade: Fresh 0–12h, Stale 12–24h, Archived after 24h
- Out-of-stock quantity forced to zero and archived after 1h
- History renamed to Archived Sightings
- Stores list and map consolidated on one page
- Store search includes address, city, ZIP, retailer, name, and number
- Product filters correctly scope the matching sighting data
- No-active-sighting products remain in a separate collapsible section
- Watchlist, Archived Sightings, and Data pages restored
- Restock Days renamed to Restock Activity
- One confirmed schedule per store
- Separate one-time restock activity submissions
- Schedule-change requests sent to a pending admin-review queue
- User-facing delete controls replaced with Hide from my view

## Prototype storage

Changes are saved in browser `localStorage`. Use the Data page to export or import JSON. Resetting demo data requires the prototype administrator passcode.

See `TODO.md` for future user settings and preferences work.
