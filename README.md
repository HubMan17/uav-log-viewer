# UAV Log Viewer

Open-source, fully offline log viewer for ArduPilot flight controller logs. A free alternative to cloud-based viewers — works entirely in your browser with no internet required.

![Screenshot](https://img.shields.io/badge/status-beta-blue)

## Features

### Log Format Support
- **DataFlash Binary (.BIN)** — Full binary parser with all format characters
- **DataFlash Text (.LOG)** — Text-format log files
- **MAVLink Telemetry (.TLOG)** — MAVLink v1/v2 telemetry logs

### 3D Map Viewer
- CesiumJS-powered 3D globe with OpenStreetMap tiles
- Flight trajectory colored by flight mode
- Mission waypoints with numbered markers and connection lines
- Geofence polygon rendering
- Home position marker
- Camera modes: Follow, Chase, Free
- 2D canvas fallback when offline

### Plotting System
- 80+ predefined graph presets organized by category:
  - Speed, Attitude, Sensors (Accel/Gyro/Baro/Compass/Lidar)
  - GPS, Power, RC Input/Output, Servos
  - EKF2/EKF3 diagnostics, PID tuning (Copter/Plane)
  - TECS, Altitude, Position, Radio
- Custom expression input with autocomplete
- Synchronized zoom/pan across all charts
- Time cursor synchronization between plots and map
- Click-to-set-time on any plot
- Plotly.js-based interactive charts with WebGL rendering

### Message Browser
- Browse all parsed message types and their fields
- Field statistics (min/max values)
- Quick-plot any field with one click
- Search/filter across message types

### Sidebar Panels
- **Flight Modes** — Timeline of mode changes with color coding
- **Messages** — STATUSTEXT messages with timestamps
- **Parameters** — Searchable parameter viewer with 1200+ params
- **Device IDs** — Decoded hardware identification (bus type, address, device)
- **Attitude** — Canvas-based artificial horizon indicator
- **EKF Helper** — Innovation test ratios with health indicators
- **Mag Fit** — Compass offsets and raw magnetometer statistics

### Timeline
- Scrubber with flight mode color segments
- Play/pause with adjustable speed (0.5x–10x)
- Click anywhere to seek

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` / `→` | Step time backward / forward |
| `Shift + ←/→` | Large step |
| `Home` / `End` | Jump to start / end |
| `B` | Open Message Browser |
| `S` | Toggle Sidebar |
| `Delete` | Clear all plots |

## Getting Started

### Quick Start
1. Download or clone this repository
2. Open `index.html` in any modern browser
3. Drop a `.BIN`, `.LOG`, or `.TLOG` file onto the upload area

**That's it.** No build step, no npm install, no server required.

### From a Web Server (optional)
For the best experience with CesiumJS 3D maps and Web Workers:
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```
Then open `http://localhost:8080` in your browser.

## Architecture

This project is built with vanilla JavaScript — no React, Vue, or other frameworks. Everything runs client-side in the browser.

```
index.html              — Single entry point
css/                    — Modular stylesheets
  main.css              — Theme variables and base styles
  layout.css            — Page layout
  home.css              — Upload page
  sidebar.css           — Sidebar navigation and panels
  toolbar.css           — Top toolbar
  plot.css              — Plot containers
  map.css               — Map viewer
  timebar.css           — Timeline bar
  modal.css             — Modal dialogs
  info-bar.css          — File info bar
js/                     — Application modules
  app.js                — Entry point, initializes all modules
  state.js              — Global application state
  events.js             — Event bus for inter-module communication
  router.js             — Page navigation
  utils.js              — Utility functions and math helpers
  upload.js             — File upload and parsing orchestration
  plot.js               — Plotly chart management
  expression.js         — Expression editor with autocomplete
  graph-definitions.js  — 80+ predefined graph presets
  flight-modes.js       — ArduPilot mode definitions (Copter/Plane/Rover/Sub)
  map.js                — CesiumJS 3D viewer + 2D canvas fallback
  sidebar.js            — Sidebar panels (modes, msgs, params, etc.)
  timebar.js            — Timeline with playback
  message-browser.js    — Message type explorer
  keyboard.js           — Keyboard shortcuts
  parsers/
    dataflash.js        — DataFlash binary (.BIN) parser
    dataflash-text.js   — DataFlash text (.LOG) parser
    mavlink.js          — MAVLink TLOG parser
  workers/
    parser-worker.js    — Web Worker for background parsing
libs/                   — Bundled third-party libraries
  plotly/               — Plotly.js (charting)
  cesium/               — CesiumJS (3D globe)
  fontawesome/          — Font Awesome (icons)
```

## Supported Vehicles

- ArduCopter (all frame types)
- ArduPlane (including QuadPlane)
- ArduRover
- ArduSub

## Browser Compatibility

Works in all modern browsers with JavaScript enabled:
- Chrome / Chromium 80+
- Firefox 78+
- Safari 14+
- Edge 80+

## Performance

- Parses 129MB BIN files in ~5 seconds
- Handles 2.7M+ messages efficiently
- Uses Web Workers for non-blocking parsing
- WebGL-accelerated charts via Plotly's scattergl

## License

MIT License — free to use, modify, and distribute.

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.
