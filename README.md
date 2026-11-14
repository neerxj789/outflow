# Outflow

Outflow is a free, client-side lead scraper extension and outreach CRM. Extract **Name**, **Mobile Number**, **Email**, and **Source Link** from any webpage or search results list using the bundled Manifest V3 Chrome Extension, or paste raw CSV/TSV/JSON data directly into your browser workspace.

## Key Features

- **Outflow Chrome Extension (`extension/`)**:
  - Works on Google Search, Google Maps, business directories, or any open webpage containing lists or links.
  - Auto-scrolls and auto-paginates up to **200 leads** per run, with a manual **Stop** button at any time.
  - Optional background **Scan linked pages** toggle using standard HTTP/HTML matching (no AI) that gracefully skips bot-protected (`403`/`429`/captcha) sites.
  - **Copy CSV**, **Download CSV**, or click **Send to Outflow** to push leads straight into your active CRM tab.
- **Zero-Mock-Data Empty State**: Boots cleanly with empty lists and local browser persistence (`localStorage`).
- **Interconnected Analytics**: Shared workspace store drives interactive KPI cards, pipeline distribution bars, and cross-filtered lead tables.
- **Modular UI Primitives**: Standalone components (`Button`, `Card`, `Input`, `Dropdown`, `Toggle`, `CalendarPicker`, `Alert`, `Warning`, `Message`) with empty, active, and error states.
- **One-Click Exports & Legal Pages**: Export filtered leads to CSV or formatted PDF, and view built-in Terms of Service, Privacy Policy, and Cookie Policy pages.

## Installing the Chrome Extension

1. Start the app (`npm run dev`) and click **Get Extension** in the header, or download `/api/extension.zip`.
2. Unzip `outflow-extension.zip` (or use the `extension/` folder directly).
3. Open `chrome://extensions` in Google Chrome and turn on **Developer mode**.
4. Click **Load unpacked** and select the `extension` folder.
5. Paste your Outflow app URL into the extension Side Panel and click **Start Scrape** on any open webpage.

## Developer Seed Module

To keep mock data completely out of the application bundle, the optional developer seed button lives in `src/dev/SeedDataButton.tsx` (excluded via `.gitignore`). It is loaded through an optional `import.meta.glob` boundary in `ImporterPanel.tsx` so removing `src/dev/` causes zero build or runtime errors.

## Local Development

**Prerequisites**: Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Run type-checking and production build:
   ```bash
   npm run lint
   npm run build
   ```
