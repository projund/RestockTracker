# Conroe Restock Tracker Prototype

A single-page GitHub Pages prototype with separate CSS, JavaScript, JSON, and image assets.

## Run locally
Use VS Code Live Server or another local HTTP server. Opening `index.html` directly may block the JSON files.

## GitHub Pages
1. Create a GitHub repository.
2. Upload everything inside this folder to the repository root.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, select `main`, and use `/ (root)`.
5. Save and open the published URL.

## Prototype behavior
- Seed data comes from `data/*.json`.
- Changes save in the current browser with `localStorage`.
- Export/import JSON is available under **Data**.
- Reports become stale two hours after their sighting time.
- Product deletion and report deletion are hidden in three-dot menus and require passcode `12345`.
- This passcode is not secure for a public site. Replace it with Firebase authentication and server-side security rules before public launch.
- Uploaded sighting photos are saved as browser data URLs and can fill browser storage quickly. Firebase Storage should replace this later.
- Online product images should use direct image URLs from legitimate source pages. The source-page URL can be saved separately.
