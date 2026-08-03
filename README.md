# Conroe Restock Tracker Prototype

A single-page restock tracker for Walmart and Target locations around ZIP 77304.

## Run locally
Because the app loads JSON with `fetch()`, open it through a small local web server rather than double-clicking `index.html`.

- VS Code: install/open with Live Server
- Python: `python -m http.server 8000` then open `http://localhost:8000`

## GitHub Pages
1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Open Settings → Pages.
4. Under Build and deployment, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then Save.

## Prototype limitations
- Changes are stored only in the current browser using localStorage.
- Retailer inventory is not checked automatically.
- Store distances and coordinates are approximate starter data and should be verified before a public launch.
- Firebase can later replace localStorage for shared updates and image storage.

## Prototype permissions

- Any user can update a sighting's stock status. Every update records the prior status, new status, user, time, quantity, and optional note.
- Delete actions are inside the three-dot menu and require the prototype administrator passcode `12345`.
- This client-side passcode is only a visual prototype control. It must be replaced with authenticated administrator permissions before public launch.
