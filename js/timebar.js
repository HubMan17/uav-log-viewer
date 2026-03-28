/**
 * Timeline bar with playback controls
 */
const TimeBar = {
    playing: false,
    playbackSpeed: 1,
    animFrameId: null,
    lastFrameTime: null,

    init() {
        this.playBtn = document.getElementById('btn-play');
        this.currentEl = document.getElementById('timebar-current');
        this.totalEl = document.getElementById('timebar-total');
        this.track = document.getElementById('timebar-track');
        this.progressEl = document.getElementById('timebar-progress');
        this.cursorEl = document.getElementById('timebar-cursor');
        this.modesEl = document.getElementById('timebar-modes');
        this.speedSelect = document.getElementById('playback-speed');

        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.speedSelect.addEventListener('change', () => {
            this.playbackSpeed = parseFloat(this.speedSelect.value);
        });

        // Track click
        this.track.addEventListener('mousedown', (e) => this.onTrackClick(e));
        this.track.addEventListener('mousemove', (e) => {
            if (this._dragging) this.onTrackClick(e);
        });
        document.addEventListener('mouseup', () => { this._dragging = false; });

        EventBus.on('parse:complete', () => this.onDataLoaded());
        EventBus.on('time:change', (t) => this.setTime(t, true));
    },

    onDataLoaded() {
        if (!State.timeRange) return;
        this.totalEl.textContent = Utils.formatTime(State.timeRange.end - State.timeRange.start);
        this.currentEl.textContent = '0:00';
        this.renderModeSegments();
        this.setTime(State.timeRange.start, true);
    },

    renderModeSegments() {
        this.modesEl.innerHTML = '';
        if (!State.timeRange || State.flightModeChanges.length === 0) return;

        const total = State.timeRange.end - State.timeRange.start;

        State.flightModeChanges.forEach((mode, i) => {
            const next = State.flightModeChanges[i + 1];
            const start = mode.timeUS - State.timeRange.start;
            const end = next ? next.timeUS - State.timeRange.start : total;
            const left = (start / total) * 100;
            const width = ((end - start) / total) * 100;

            const seg = document.createElement('div');
            seg.className = 'timebar-mode-segment';
            seg.style.position = 'absolute';
            seg.style.left = left + '%';
            seg.style.width = width + '%';
            seg.style.background = mode.color;
            seg.title = mode.name;
            this.modesEl.appendChild(seg);
        });
    },

    onTrackClick(e) {
        this._dragging = true;
        const rect = this.track.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (!State.timeRange) return;

        const time = State.timeRange.start + pct * (State.timeRange.end - State.timeRange.start);
        State.currentTime = time;
        this.updateDisplay();
        EventBus.emit('time:change', time);
    },

    setTime(time, external) {
        if (!State.timeRange) return;
        State.currentTime = Math.max(State.timeRange.start, Math.min(State.timeRange.end, time));
        this.updateDisplay();
    },

    updateDisplay() {
        if (!State.timeRange) return;
        const total = State.timeRange.end - State.timeRange.start;
        const elapsed = State.currentTime - State.timeRange.start;
        const pct = total > 0 ? (elapsed / total) * 100 : 0;

        this.progressEl.style.width = pct + '%';
        this.cursorEl.style.left = pct + '%';
        this.currentEl.textContent = Utils.formatTime(elapsed);
    },

    togglePlay() {
        this.playing = !this.playing;
        this.playBtn.classList.toggle('playing', this.playing);
        const icon = this.playBtn.querySelector('i');
        icon.className = this.playing ? 'fas fa-pause' : 'fas fa-play';

        if (this.playing) {
            this.lastFrameTime = performance.now();
            this.animate();
        } else {
            if (this.animFrameId) {
                cancelAnimationFrame(this.animFrameId);
                this.animFrameId = null;
            }
        }
    },

    animate() {
        if (!this.playing) return;

        const now = performance.now();
        const dt = (now - this.lastFrameTime) / 1000; // seconds
        this.lastFrameTime = now;

        if (State.timeRange && State.currentTime !== null) {
            // Advance time (dt in seconds * speed * 1e6 to microseconds)
            State.currentTime += dt * this.playbackSpeed * 1e6;

            if (State.currentTime >= State.timeRange.end) {
                State.currentTime = State.timeRange.end;
                this.togglePlay();
            }

            this.updateDisplay();
            EventBus.emit('time:update', State.currentTime);
        }

        this.animFrameId = requestAnimationFrame(() => this.animate());
    }
};
