/**
 * File upload handling - drag & drop and click-to-browse
 */
const Upload = {
    init() {
        this.area = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.progressEl = document.getElementById('upload-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');

        this.area.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        this.area.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.area.classList.add('dragover');
        });

        this.area.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.area.classList.remove('dragover');
        });

        this.area.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.area.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Listen for parsing progress from worker
        EventBus.on('parse:progress', (pct, status) => {
            this.updateProgress(pct, status);
        });

        EventBus.on('parse:complete', () => {
            Router.navigate('plot');
        });
    },

    handleFiles(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        const ext = file.name.split('.').pop().toLowerCase();

        if (!['bin', 'log', 'tlog'].includes(ext)) {
            alert('Unsupported file format. Please use .BIN, .LOG, or .TLOG files.');
            return;
        }

        State.reset();
        State.file = file;

        // Determine log type
        if (ext === 'tlog') {
            State.logType = 'mavlink';
        } else {
            State.logType = 'dataflash';
        }

        this.showProgress();
        this.parseFile(file);
    },

    showProgress() {
        this.area.style.display = 'none';
        this.progressEl.style.display = 'block';
        this.updateProgress(0, 'Reading file...');
    },

    updateProgress(pct, status) {
        if (pct >= 0) {
            this.progressFill.style.width = pct + '%';
        }
        if (status) {
            this.progressText.textContent = status;
        }
    },

    parseFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target.result;
            this.updateProgress(10, 'Parsing log file...');

            if (State.logType === 'dataflash') {
                this.startWorkerParse(buffer, file.name);
            } else if (State.logType === 'mavlink') {
                this.startWorkerParse(buffer, file.name);
            }
        };
        reader.readAsArrayBuffer(file);
    },

    startWorkerParse(buffer, filename) {
        const worker = new Worker('js/workers/parser-worker.js');

        worker.onmessage = (e) => {
            const msg = e.data;

            switch (msg.type) {
                case 'progress':
                    this.updateProgress(10 + msg.percent * 0.8, msg.status);
                    EventBus.emit('parse:progress', 10 + msg.percent * 0.8, msg.status);
                    break;

                case 'result': {
                    const result = msg.data;
                    this.updateProgress(95, 'Finalizing...');

                    // Store formats
                    State.formats = result.formatsByName || {};
                    State.units = result.fmtUnits || {};

                    // Store messages in the format our app expects
                    // Parser gives: { name: { fields: {label: [...]}, count: N } }
                    for (const [name, msgData] of Object.entries(result.messages || {})) {
                        State.messages[name] = {
                            data: msgData.fields || {},
                            count: msgData.count || 0
                        };
                    }

                    // Flight modes
                    State.flightModeChanges = (result.modes || []).map(m => ({
                        timeUS: m.timeUS,
                        mode: m.mode !== undefined ? m.mode : m.modeNum,
                        modeNum: m.modeNum !== undefined ? m.modeNum : m.mode,
                        name: m.name || ''
                    }));

                    // Text messages
                    State.textMessages = (result.textMessages || []).map(m => ({
                        timeUS: m.timeUS,
                        text: m.text || m.message || '',
                        severity: m.severity
                    }));

                    // Mission
                    State.mission = (result.missions || []).map(m => ({
                        lat: m.lat || m.Lat,
                        lng: m.lng || m.Lng,
                        alt: m.alt || m.Alt,
                        seq: m.seq || m.CNum,
                        command: m.command || m.CId
                    }));

                    // Parameters
                    State.params = result.parameters || {};

                    // Events
                    State.events = result.events || [];

                    // Trajectories - convert from flat array to grouped format
                    const rawTrajectories = result.trajectories || [];
                    if (Array.isArray(rawTrajectories)) {
                        // Group by source
                        const grouped = {};
                        for (const point of rawTrajectories) {
                            const src = point.source || 'GPS';
                            if (!grouped[src]) {
                                grouped[src] = { lat: [], lng: [], alt: [], time: [] };
                            }
                            grouped[src].lat.push(point.lat);
                            grouped[src].lng.push(point.lng);
                            grouped[src].alt.push(point.alt || 0);
                            grouped[src].time.push(point.timeUS || 0);
                        }
                        State.trajectories = grouped;
                    } else {
                        State.trajectories = rawTrajectories;
                    }
                    State.trajectorySources = Object.keys(State.trajectories);
                    if (State.trajectorySources.length > 0) {
                        State.trajectorySource = State.trajectorySources[0];
                        State.mapAvailable = true;
                    }

                    // Attitudes - convert from flat array to structured format
                    const rawAttitudes = result.attitudes || [];
                    if (Array.isArray(rawAttitudes) && rawAttitudes.length > 0) {
                        State.timeAttitude = {
                            time: rawAttitudes.map(a => a.timeUS),
                            roll: rawAttitudes.map(a => a.roll),
                            pitch: rawAttitudes.map(a => a.pitch),
                            yaw: rawAttitudes.map(a => a.yaw)
                        };
                    } else {
                        State.timeAttitude = rawAttitudes;
                    }

                    // Compute message types and time range
                    State.messageTypes = Object.keys(State.messages).sort();
                    this.computeTimeRange();

                    // Process flight modes with vehicle type detection
                    const vehicleType = result.vehicleType ||
                        FlightModes.detectVehicleType(State.params, State.formats);
                    State.flightModeChanges = FlightModes.processFlightModes(
                        State.flightModeChanges, vehicleType
                    );

                    State.processDone = true;
                    this.updateProgress(100, 'Done!');

                    setTimeout(() => {
                        EventBus.emit('parse:complete');
                    }, 200);

                    worker.terminate();
                    break;
                }

                case 'error':
                    this.updateProgress(-1, 'Error: ' + (msg.message || msg.error));
                    worker.terminate();
                    break;
            }
        };

        worker.postMessage({
            action: 'parse',
            buffer: buffer,
            filename: filename,
            logType: State.logType
        }, [buffer]);
    },

    computeTimeRange() {
        let minTime = Infinity, maxTime = -Infinity;

        for (const [type, msgData] of Object.entries(State.messages)) {
            if (msgData.data && msgData.data.TimeUS) {
                const times = msgData.data.TimeUS;
                if (times.length > 0) {
                    minTime = Math.min(minTime, times[0]);
                    maxTime = Math.max(maxTime, times[times.length - 1]);
                }
            }
        }

        if (minTime < Infinity && maxTime > -Infinity) {
            State.timeRange = { start: minTime, end: maxTime };
            State.currentTime = minTime;
        }
    },

    resetUI() {
        this.area.style.display = '';
        this.progressEl.style.display = 'none';
        this.progressFill.style.width = '0%';
        this.fileInput.value = '';
    }
};
