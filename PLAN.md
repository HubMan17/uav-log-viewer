# UAV Log Viewer - Development Plan

## Overview
Open-source, fully offline ArduPilot log viewer. Single index.html entry point, no build tools or frameworks. All dependencies bundled locally.

## Architecture
- `index.html` - Single entry point
- `css/` - Stylesheets
- `js/` - Application JavaScript modules
- `js/parsers/` - Log file parsers (DataFlash BIN/LOG, MAVLink TLOG)
- `js/workers/` - Web Workers for background parsing
- `libs/` - Third-party libraries (Plotly, CesiumJS, FontAwesome)
- `assets/` - 3D models, textures, icons

## Phases

### Phase 1: Project Skeleton & Core Infrastructure [IN PROGRESS]
- [x] Init repo, .gitignore, plan
- [ ] Create index.html with basic structure
- [ ] Set up CSS (layout, sidebar, toolbar, theme)
- [ ] Download and bundle Plotly.js locally
- [ ] Create app shell (router, state management, event bus)

### Phase 2: File Upload & Parsing
- [ ] Drag-and-drop file upload UI (Home page)
- [ ] DataFlash binary (.BIN) parser (FMT, message extraction)
- [ ] DataFlash text (.LOG) parser
- [ ] Web Worker for background parsing with progress
- [ ] Extract: trajectories, attitudes, flight modes, params, messages, missions, fences, events

### Phase 3: Plotting System
- [ ] Plotly.js integration for time-series charts
- [ ] Predefined graph definitions (~80+ graphs: Speed, Attitude, Sensors, EKF, PID, etc.)
- [ ] Expression editor with autocomplete
- [ ] Multiple Y-axes support
- [ ] Time synchronization with cursor/crosshair
- [ ] Plot caching

### Phase 4: Map/3D Viewer
- [ ] CesiumJS integration (offline-capable with bundled assets)
- [ ] 3D trajectory rendering with flight mode color coding
- [ ] 3D vehicle models (plane, quad-X, quad-+)
- [ ] Camera modes (follow, chase, free)
- [ ] Waypoint/mission rendering
- [ ] Geofence rendering
- [ ] Map tile sources (OSM, etc.)

### Phase 5: Sidebar Panels
- [ ] Parameters viewer
- [ ] Messages viewer (STATUSTEXT)
- [ ] Flight mode timeline
- [ ] Device IDs panel
- [ ] Attitude 3D viewer
- [ ] EKF Helper
- [ ] MagFit tool

### Phase 6: Timeline & Synchronization
- [ ] Time bar / scrubber
- [ ] Synchronized time cursor across plot + map + panels
- [ ] Playback controls
- [ ] Time range trimming

### Phase 7: Polish & Extras
- [ ] MAVLink TLOG parser
- [ ] DJI log parser (if feasible)
- [ ] Keyboard shortcuts
- [ ] Responsive design
- [ ] Dark/light theme
- [ ] README
- [ ] Final testing with real .BIN files

## Status
Started: 2026-03-28
Current Phase: 1
