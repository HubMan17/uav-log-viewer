/**
 * Map/3D viewer - Cesium integration for trajectory display
 * Note: CesiumJS is loaded separately. If unavailable, shows a 2D fallback.
 */
const MapViewer = {
    viewer: null,
    trajectoryEntity: null,
    waypointEntities: [],
    fenceEntities: [],
    vehicleEntity: null,
    initialized: false,

    init() {
        EventBus.on('parse:complete', () => this.onDataLoaded());
        EventBus.on('time:change', (t) => this.updateVehiclePosition(t));
        EventBus.on('time:update', (t) => this.updateVehiclePosition(t));

        // Map setting toggles
        document.getElementById('toggle-trajectory')?.addEventListener('change', (e) => {
            State.showTrajectory = e.target.checked;
            this.updateVisibility();
        });
        document.getElementById('toggle-waypoints')?.addEventListener('change', (e) => {
            State.showWaypoints = e.target.checked;
            this.updateVisibility();
        });
        document.getElementById('toggle-fences')?.addEventListener('change', (e) => {
            State.showFences = e.target.checked;
            this.updateVisibility();
        });
        document.getElementById('camera-mode')?.addEventListener('change', (e) => {
            State.cameraType = e.target.value;
        });
    },

    onDataLoaded() {
        if (!State.mapAvailable) {
            document.getElementById('map-overlay').style.display = '';
            return;
        }
        document.getElementById('map-overlay').style.display = 'none';

        if (typeof Cesium !== 'undefined') {
            this.initCesium();
        } else {
            this.initFallbackMap();
        }
    },

    initCesium() {
        if (this.initialized && this.viewer) {
            this.viewer.entities.removeAll();
        }

        if (!this.initialized) {
            try {
                // Use OpenStreetMap tiles (works offline if cached, online otherwise)
                const osmProvider = new Cesium.OpenStreetMapImageryProvider({
                    url: 'https://a.tile.openstreetmap.org/'
                });

                this.viewer = new Cesium.Viewer('cesium-viewer', {
                    animation: false,
                    timeline: false,
                    baseLayerPicker: false,
                    fullscreenButton: false,
                    geocoder: false,
                    homeButton: false,
                    infoBox: false,
                    sceneModePicker: false,
                    selectionIndicator: false,
                    navigationHelpButton: false,
                    imageryProvider: osmProvider,
                    terrain: undefined,
                    requestRenderMode: true,
                    maximumRenderTimeChange: Infinity
                });

                // Suppress Cesium ion warning
                this.viewer.cesiumWidget.creditContainer.style.display = 'none';

                this.initialized = true;
            } catch (e) {
                console.warn('CesiumJS init failed:', e);
                this.initFallbackMap();
                return;
            }
        }

        this.drawTrajectory();
        this.drawWaypoints();
        this.drawFences();
        this.zoomToTrajectory();
    },

    initFallbackMap() {
        // Canvas-based 2D fallback when Cesium isn't available
        const container = document.getElementById('cesium-viewer');
        container.innerHTML = '';

        const canvas = document.createElement('canvas');
        canvas.id = 'map-canvas';
        canvas.style.cssText = 'width:100%;height:100%;';
        container.appendChild(canvas);

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.draw2DMap();
    },

    draw2DMap() {
        if (!this.canvas || !this.ctx) return;
        const canvas = this.canvas;
        const ctx = this.ctx;

        // Set canvas size to match container
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const w = rect.width;
        const h = rect.height;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        const traj = State.trajectories[State.trajectorySource];
        if (!traj || traj.lat.length === 0) return;

        // Compute bounds
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        for (let i = 0; i < traj.lat.length; i++) {
            const lat = traj.lat[i], lon = traj.lng[i];
            if (lat === 0 && lon === 0) continue;
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLon = Math.min(minLon, lon);
            maxLon = Math.max(maxLon, lon);
        }

        const padding = 40;
        const scaleX = (w - 2 * padding) / (maxLon - minLon || 1);
        const scaleY = (h - 2 * padding) / (maxLat - minLat || 1);
        const scale = Math.min(scaleX, scaleY);

        const toX = lon => padding + (lon - minLon) * scale;
        const toY = lat => h - padding - (lat - minLat) * scale;

        // Draw grid
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const x = padding + (w - 2 * padding) * i / 4;
            ctx.beginPath(); ctx.moveTo(x, padding); ctx.lineTo(x, h - padding); ctx.stroke();
            const y = padding + (h - 2 * padding) * i / 4;
            ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(w - padding, y); ctx.stroke();
        }

        // Draw trajectory with flight mode colors
        if (State.flightModeChanges.length > 0 && traj.time) {
            let modeIdx = 0;
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < traj.lat.length; i++) {
                if (traj.lat[i] === 0 && traj.lng[i] === 0) continue;

                // Find current mode
                while (modeIdx < State.flightModeChanges.length - 1 &&
                       traj.time[i] >= State.flightModeChanges[modeIdx + 1].timeUS) {
                    modeIdx++;
                }

                const color = State.flightModeChanges[modeIdx]?.color || '#4fc3f7';
                const x = toX(traj.lng[i]);
                const y = toY(traj.lat[i]);

                if (i === 0) {
                    ctx.strokeStyle = color;
                    ctx.moveTo(x, y);
                } else {
                    const prevColor = ctx.strokeStyle;
                    if (color !== prevColor) {
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.moveTo(x, y);
                    }
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        } else {
            // Simple trajectory
            ctx.strokeStyle = '#4fc3f7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < traj.lat.length; i++) {
                if (traj.lat[i] === 0 && traj.lng[i] === 0) continue;
                const x = toX(traj.lng[i]);
                const y = toY(traj.lat[i]);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Draw home position
        if (traj.lat.length > 0 && !(traj.lat[0] === 0 && traj.lng[0] === 0)) {
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.arc(toX(traj.lng[0]), toY(traj.lat[0]), 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw waypoints
        if (State.showWaypoints && State.mission.length > 0) {
            ctx.fillStyle = '#ff9800';
            State.mission.forEach(wp => {
                if (wp.lat && wp.lng) {
                    ctx.beginPath();
                    ctx.arc(toX(wp.lng), toY(wp.lat), 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Store mapping for vehicle position updates
        this._mapTransform = { toX, toY, w, h, minLat, maxLat, minLon, maxLon };
    },

    drawTrajectory() {
        if (!this.viewer) return;
        const traj = State.trajectories[State.trajectorySource];
        if (!traj || traj.lat.length === 0) return;

        this.trajectoryEntities = [];

        // Draw trajectory segments colored by flight mode
        if (State.flightModeChanges.length > 0 && traj.time) {
            let modeIdx = 0;
            let segPositions = [];
            let segColor = State.flightModeChanges[0]?.color || '#4fc3f7';

            for (let i = 0; i < traj.lat.length; i++) {
                if (traj.lat[i] === 0 && traj.lng[i] === 0) continue;

                // Check if mode changed
                while (modeIdx < State.flightModeChanges.length - 1 &&
                       traj.time[i] >= State.flightModeChanges[modeIdx + 1].timeUS) {
                    modeIdx++;
                    // End current segment and start new one
                    if (segPositions.length > 1) {
                        const entity = this.viewer.entities.add({
                            polyline: {
                                positions: segPositions,
                                width: 3,
                                material: Cesium.Color.fromCssColorString(segColor),
                                clampToGround: false
                            }
                        });
                        this.trajectoryEntities.push(entity);
                    }
                    segPositions = segPositions.length > 0 ? [segPositions[segPositions.length - 1]] : [];
                    segColor = State.flightModeChanges[modeIdx]?.color || '#4fc3f7';
                }

                segPositions.push(Cesium.Cartesian3.fromDegrees(
                    traj.lng[i], traj.lat[i], traj.alt[i] || 0
                ));
            }

            // Final segment
            if (segPositions.length > 1) {
                const entity = this.viewer.entities.add({
                    polyline: {
                        positions: segPositions,
                        width: 3,
                        material: Cesium.Color.fromCssColorString(segColor),
                        clampToGround: false
                    }
                });
                this.trajectoryEntities.push(entity);
            }
        } else {
            // Single color trajectory
            const positions = [];
            for (let i = 0; i < traj.lat.length; i++) {
                if (traj.lat[i] === 0 && traj.lng[i] === 0) continue;
                positions.push(Cesium.Cartesian3.fromDegrees(
                    traj.lng[i], traj.lat[i], traj.alt[i] || 0
                ));
            }

            if (positions.length > 0) {
                const entity = this.viewer.entities.add({
                    polyline: {
                        positions: positions,
                        width: 3,
                        material: Cesium.Color.fromCssColorString('#4fc3f7'),
                        clampToGround: false
                    }
                });
                this.trajectoryEntities.push(entity);
            }
        }

        // Home marker
        if (traj.lat.length > 0 && !(traj.lat[0] === 0 && traj.lng[0] === 0)) {
            this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(traj.lng[0], traj.lat[0], traj.alt[0] || 0),
                point: { pixelSize: 10, color: Cesium.Color.LIME, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
                label: {
                    text: 'Home',
                    font: '12px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    pixelOffset: new Cesium.Cartesian2(0, -18),
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    outlineWidth: 2,
                    outlineColor: Cesium.Color.BLACK
                }
            });
        }

        // Store first entity as the main one for zoom
        this.trajectoryEntity = this.trajectoryEntities[0];
    },

    drawWaypoints() {
        if (!this.viewer || !State.mission.length) return;
        this.waypointEntities = [];

        State.mission.forEach((wp, i) => {
            if (!wp.lat || !wp.lng) return;
            const entity = this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.alt || 0),
                point: { pixelSize: 8, color: Cesium.Color.ORANGE },
                label: {
                    text: String(i + 1),
                    font: '12px sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    pixelOffset: new Cesium.Cartesian2(0, -15)
                }
            });
            this.waypointEntities.push(entity);
        });
    },

    drawFences() {
        if (!this.viewer || !State.fences.length) return;
        // Fence rendering with Cesium
    },

    zoomToTrajectory() {
        if (!this.viewer) return;
        if (this.trajectoryEntities && this.trajectoryEntities.length > 0) {
            this.viewer.zoomTo(this.viewer.entities);
        }
    },

    updateVehiclePosition: Utils.throttle(function (timeUS) {
        const traj = State.trajectories[State.trajectorySource];
        if (!traj || !traj.time) return;

        const idx = Utils.binarySearch(traj.time, timeUS);
        if (idx < 0) return;

        const lat = traj.lat[idx];
        const lon = traj.lng[idx];
        const alt = traj.alt ? traj.alt[idx] : 0;

        if (lat === 0 && lon === 0) return;

        if (MapViewer.viewer && typeof Cesium !== 'undefined') {
            const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
            if (!MapViewer.vehicleEntity) {
                MapViewer.vehicleEntity = MapViewer.viewer.entities.add({
                    position: position,
                    point: {
                        pixelSize: 12,
                        color: Cesium.Color.RED,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2
                    }
                });
            } else {
                MapViewer.vehicleEntity.position = position;
            }

            // Camera follow mode
            if (State.cameraType === 'follow') {
                MapViewer.viewer.camera.lookAt(
                    position,
                    new Cesium.HeadingPitchRange(0, -Math.PI / 4, 200)
                );
            }

            MapViewer.viewer.scene.requestRender();
        } else if (MapViewer.canvas && MapViewer._mapTransform) {
            // 2D fallback vehicle marker
            MapViewer.draw2DMap();
            const ctx = MapViewer.ctx;
            const t = MapViewer._mapTransform;
            ctx.fillStyle = '#f44336';
            ctx.beginPath();
            ctx.arc(t.toX(lon), t.toY(lat), 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }, 30),

    updateVisibility() {
        if (this.trajectoryEntities) {
            this.trajectoryEntities.forEach(e => { e.show = State.showTrajectory; });
        }
        this.waypointEntities.forEach(e => { e.show = State.showWaypoints; });
        this.fenceEntities.forEach(e => { e.show = State.showFences; });

        // Redraw 2D map if no Cesium
        if (this.canvas) this.draw2DMap();
    }
};
