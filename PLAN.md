# UAV Log Viewer - Development Plan

## Overview
Open-source, fully offline ArduPilot log viewer. Single index.html entry point, no build tools or frameworks. All dependencies bundled locally.

## Phases

### Phase 1: Project Skeleton & Core Infrastructure [DONE]
- [x] Init repo, .gitignore, plan
- [x] Create index.html with full UI layout
- [x] Set up CSS modules (main, layout, home, sidebar, toolbar, plot, map, timebar, modal, info-bar)
- [x] Bundle Plotly.js, CesiumJS, and Font Awesome locally
- [x] Create app shell (router, state management, event bus)

### Phase 2: File Upload & Parsing [DONE]
- [x] Drag-and-drop file upload UI
- [x] DataFlash binary (.BIN) parser
- [x] DataFlash text (.LOG) parser
- [x] MAVLink TLOG parser (v1/v2)
- [x] Web Worker for background parsing with progress
- [x] Auto-detect file format

### Phase 3: Plotting System [DONE]
- [x] Plotly.js time-series charts
- [x] 80+ predefined graph definitions
- [x] Expression editor with autocomplete
- [x] Synchronized zoom across all plots
- [x] Time cursor synchronization
- [x] Message browser with quick-plot

### Phase 4: Map/3D Viewer [DONE]
- [x] CesiumJS 3D globe with bundled assets
- [x] Flight trajectory colored by flight mode
- [x] Camera modes (follow, chase, free)
- [x] Waypoints with connection lines
- [x] Geofence rendering
- [x] Home position marker
- [x] 2D canvas fallback

### Phase 5: Sidebar Panels [DONE]
- [x] Parameters viewer with search
- [x] Messages viewer
- [x] Flight mode timeline
- [x] Device IDs (hardware decode)
- [x] Attitude indicator (artificial horizon)
- [x] EKF Helper
- [x] MagFit tool

### Phase 6: Timeline & Synchronization [DONE]
- [x] Time bar with click navigation
- [x] Flight mode segments
- [x] Playback with speed control
- [x] Keyboard shortcuts

### Phase 7: Polish & Extras [DONE]
- [x] File info bar
- [x] Favicon
- [x] README
- [x] All features complete

## Status: COMPLETE
Started: 2026-03-28
