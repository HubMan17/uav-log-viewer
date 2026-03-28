# UAV Log Viewer - Development Plan

## Overview
Open-source, fully offline ArduPilot log viewer. Single index.html entry point, no build tools or frameworks. All dependencies bundled locally.

## Architecture
- `index.html` - Single entry point
- `css/` - Stylesheets (main, layout, home, sidebar, toolbar, plot, map, timebar, modal)
- `js/` - Application JavaScript modules
- `js/parsers/` - Log file parsers (DataFlash BIN/LOG, MAVLink TLOG)
- `js/workers/` - Web Workers for background parsing
- `libs/` - Third-party libraries (Plotly, CesiumJS, FontAwesome)
- `assets/` - 3D models, textures, icons

## Phases

### Phase 1: Project Skeleton & Core Infrastructure [DONE]
- [x] Init repo, .gitignore, plan
- [x] Create index.html with full UI layout
- [x] Set up CSS (layout, sidebar, toolbar, theme)
- [x] Download and bundle Plotly.js and Font Awesome locally
- [x] Create app shell (router, state management, event bus)

### Phase 2: File Upload & Parsing [DONE]
- [x] Drag-and-drop file upload UI (Home page)
- [x] DataFlash binary (.BIN) parser with full FMT support
- [x] Web Worker for background parsing with progress
- [x] Extract: trajectories, attitudes, flight modes, params, messages, missions, fences, events
- [x] Tested with 129MB real .BIN file (2.7M messages in ~5s)

### Phase 3: Plotting System [DONE]
- [x] Plotly.js integration for time-series charts
- [x] 80+ predefined graph definitions (Speed, Attitude, Sensors, EKF, PID, etc.)
- [x] Expression editor with autocomplete
- [x] Synchronized zoom/pan across all plots
- [x] Time cursor synchronization
- [x] Click-to-set-time on plots
- [x] Message browser with quick-plot buttons

### Phase 4: Map/3D Viewer [DONE]
- [x] CesiumJS integration with bundled offline assets
- [x] 3D trajectory rendering with flight mode color coding
- [x] Camera modes (follow, chase, free)
- [x] Waypoint/mission markers with labels
- [x] Home position marker
- [x] 2D canvas fallback when no internet for tiles
- [x] OSM tile imagery provider
- [ ] 3D vehicle models (plane, quad-X, quad-+) - future enhancement

### Phase 5: Sidebar Panels [DONE]
- [x] Parameters viewer with search
- [x] Messages viewer (STATUSTEXT)
- [x] Flight mode timeline with color coding
- [x] Device IDs panel (decode hardware bitmask)
- [x] Attitude indicator (canvas-based artificial horizon)
- [x] EKF Helper (innovation ratios with health indicators)
- [x] MagFit tool (offsets + raw mag statistics)

### Phase 6: Timeline & Synchronization [DONE]
- [x] Time bar / scrubber with click navigation
- [x] Flight mode color segments on timeline
- [x] Synchronized time cursor across plot + map + panels
- [x] Playback controls with speed adjustment
- [x] Global math functions for expressions

### Phase 7: Polish & Extras [IN PROGRESS]
- [ ] MAVLink TLOG parser
- [ ] Keyboard shortcuts
- [ ] Geofence rendering on map
- [ ] DataFlash text (.LOG) parser support
- [ ] README
- [ ] Final testing and bug fixes

## Status
Started: 2026-03-28
Current Phase: 7
