/**
 * Sidebar navigation and panel management
 */
const Sidebar = {
    init() {
        this.el = document.getElementById('sidebar');
        this.panelsContainer = document.querySelector('.sidebar-panels');
        this.buttons = document.querySelectorAll('.sidebar-btn[data-panel]');
        this.toggleBtn = document.getElementById('sidebar-toggle');
        this.newFileBtn = document.getElementById('btn-new-file');

        this.expanded = false;

        // Toggle sidebar expand/collapse
        this.toggleBtn.addEventListener('click', () => {
            this.expanded = !this.expanded;
            this.el.classList.toggle('expanded', this.expanded);
        });

        // Panel buttons
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.panel;
                this.togglePanel(panel, btn);
            });
        });

        // New file button
        this.newFileBtn.addEventListener('click', () => {
            Upload.resetUI();
            Router.navigate('home');
        });

        // Listen for data updates
        EventBus.on('parse:complete', () => this.populatePanels());
    },

    togglePanel(panelName, btn) {
        const panelEl = document.getElementById('panel-' + panelName);
        if (!panelEl) return;

        const isActive = btn.classList.contains('active');

        // Deactivate all buttons and panels
        this.buttons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));

        if (isActive) {
            // Close panel
            this.panelsContainer.classList.remove('visible');
            State.activePanel = null;
        } else {
            // Open panel
            btn.classList.add('active');
            panelEl.classList.add('active');
            this.panelsContainer.classList.add('visible');
            State.activePanel = panelName;
        }
    },

    populatePanels() {
        this.populateFlightModes();
        this.populateMessages();
        this.populateParams();
        this.populateDeviceIds();
        this.populateEKF();
        this.populateAttitude();
        this.populateMagFit();
    },

    populateFlightModes() {
        const list = document.getElementById('flight-modes-list');
        if (!list) return;
        list.innerHTML = '';

        if (State.flightModeChanges.length === 0) {
            list.innerHTML = '<p class="panel-empty">No flight mode data</p>';
            return;
        }

        State.flightModeChanges.forEach((mode, i) => {
            const el = document.createElement('div');
            el.className = 'mode-item';
            el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;';
            const timeStr = Utils.formatTime(mode.timeUS);
            el.innerHTML = `
                <span class="mode-color" style="width:10px;height:10px;border-radius:50%;background:${mode.color};flex-shrink:0;"></span>
                <span style="flex:1;font-size:0.85rem;">${mode.name}</span>
                <span style="font-size:0.75rem;color:var(--text-muted);font-family:monospace;">${timeStr}</span>
            `;
            el.addEventListener('click', () => {
                State.currentTime = mode.timeUS;
                EventBus.emit('time:change', mode.timeUS);
            });
            list.appendChild(el);
        });
    },

    populateMessages() {
        const list = document.getElementById('messages-list');
        if (!list) return;
        list.innerHTML = '';

        if (State.textMessages.length === 0) {
            list.innerHTML = '<p class="panel-empty">No messages</p>';
            return;
        }

        State.textMessages.forEach(msg => {
            const el = document.createElement('div');
            el.style.cssText = 'padding:4px 0;border-bottom:1px solid var(--border);font-size:0.8rem;cursor:pointer;';

            const timeStr = Utils.formatTime(msg.timeUS);
            const severity = msg.severity !== undefined ? `[${msg.severity}] ` : '';
            el.innerHTML = `
                <span style="color:var(--text-muted);font-family:monospace;font-size:0.75rem;">${timeStr}</span>
                <span style="margin-left:6px;">${severity}${msg.text}</span>
            `;
            el.addEventListener('click', () => {
                State.currentTime = msg.timeUS;
                EventBus.emit('time:change', msg.timeUS);
            });
            list.appendChild(el);
        });
    },

    populateParams() {
        const list = document.getElementById('params-list');
        const search = document.getElementById('param-search');
        if (!list) return;

        const renderParams = (filter) => {
            list.innerHTML = '';
            const keys = Object.keys(State.params).sort();
            const filtered = filter ? keys.filter(k => k.toLowerCase().includes(filter.toLowerCase())) : keys;

            if (filtered.length === 0) {
                list.innerHTML = '<p class="panel-empty">No parameters found</p>';
                return;
            }

            filtered.forEach(key => {
                const el = document.createElement('div');
                el.style.cssText = 'display:flex;justify-content:space-between;padding:3px 0;font-size:0.8rem;border-bottom:1px solid var(--border);';
                el.innerHTML = `
                    <span style="color:var(--text-secondary);">${key}</span>
                    <span style="color:var(--accent);font-family:monospace;">${State.params[key]}</span>
                `;
                list.appendChild(el);
            });
        };

        renderParams('');

        if (search) {
            search.addEventListener('input', Utils.debounce(() => {
                renderParams(search.value);
            }, 150));
        }
    },

    // ========== Device IDs Panel ==========

    _busTypeNames: { 0: 'Unknown', 1: 'I2C', 2: 'SPI', 3: 'UAVCAN', 4: 'SITL' },

    _accelDevTypes: {
        1: 'ADXL345', 2: 'ADXL375', 3: 'LSM303D', 4: 'LSM9DS1', 5: 'MPU6000',
        6: 'MPU6050', 7: 'MPU6500', 8: 'MPU9250', 9: 'ICM20601', 10: 'ICM20602',
        11: 'ICM20608', 12: 'ICM20649', 13: 'ICM20689', 14: 'ICM20789', 15: 'ICM20948',
        16: 'BMI055', 17: 'BMI088', 21: 'LSM6DSL', 22: 'LSM6DS3', 24: 'ICM40609',
        25: 'ICM42688', 26: 'ICM42605', 27: 'ICM40605', 28: 'IIM42652',
        29: 'BMI270', 30: 'BMI085', 33: 'ICM45686', 34: 'LSM6DSRO'
    },

    _gyroDevTypes: {
        1: 'L3GD20', 3: 'LSM303D', 4: 'LSM9DS1', 5: 'MPU6000', 6: 'MPU6050',
        7: 'MPU6500', 8: 'MPU9250', 9: 'ICM20601', 10: 'ICM20602', 11: 'ICM20608',
        12: 'ICM20649', 13: 'ICM20689', 14: 'ICM20789', 15: 'ICM20948',
        16: 'BMI055', 17: 'BMI088', 21: 'LSM6DSL', 22: 'LSM6DS3', 24: 'ICM40609',
        25: 'ICM42688', 26: 'ICM42605', 27: 'ICM40605', 28: 'IIM42652',
        29: 'BMI270', 30: 'BMI085', 33: 'ICM45686', 34: 'LSM6DSRO'
    },

    _compassDevTypes: {
        1: 'HMC5883', 2: 'LSM303D', 3: 'AK8963', 4: 'BMM150', 5: 'LSM9DS1',
        6: 'LIS3MDL', 7: 'AK09916', 8: 'IST8310', 9: 'ICM20948', 10: 'MMC3416',
        11: 'QMC5883L', 12: 'MAG3110', 13: 'RM3100', 14: 'AK09918', 15: 'IST8308',
        16: 'MMC5883', 17: 'QMC5883', 18: 'BMM350'
    },

    _baroDevTypes: {
        1: 'BMP085', 2: 'BMP280', 3: 'BMP388', 4: 'DPS280', 5: 'DPS310',
        6: 'FBM320', 7: 'ICM20789', 8: 'KELLERLD', 9: 'LPS2XH', 10: 'MS5611',
        11: 'SPL06', 12: 'UAVCAN', 13: 'MSP', 14: 'ICP101XX', 15: 'ICP201XX',
        16: 'MS5607', 17: 'MS5837', 18: 'BMP390', 19: 'BMP581'
    },

    _deviceIdPatterns: [
        { regex: /^INS_ACC\d*_ID$|^INS_ACC_ID$/, label: 'Accelerometer', devTypes: '_accelDevTypes' },
        { regex: /^INS_GYR\d*_ID$|^INS_GYR_ID$/, label: 'Gyroscope', devTypes: '_gyroDevTypes' },
        { regex: /^COMPASS_DEV_ID\d*$|^COMPASS_DEV_ID$/, label: 'Compass', devTypes: '_compassDevTypes' },
        { regex: /^BARO\d*_DEVID$|^BARO_DEVID$/, label: 'Barometer', devTypes: '_baroDevTypes' },
        { regex: /^INS_ACC\d*_ID$/, label: 'Accelerometer', devTypes: '_accelDevTypes' },
    ],

    _decodeDeviceId(value, devTypeMap) {
        const v = Math.round(value);
        if (v === 0) return null;
        const busType = v & 0xFF;
        const bus = (v >> 8) & 0xFF;
        const address = (v >> 16) & 0xFF;
        const devType = (v >> 24) & 0xFF;
        return {
            busType: this._busTypeNames[busType] || `Unknown(${busType})`,
            bus,
            address: '0x' + address.toString(16).toUpperCase(),
            devType: (devTypeMap[devType]) || `Unknown(${devType})`,
            raw: v
        };
    },

    populateDeviceIds() {
        const container = document.getElementById('device-ids-list');
        if (!container) return;
        container.innerHTML = '';

        const params = State.params;
        if (!params || Object.keys(params).length === 0) {
            container.innerHTML = '<p class="panel-empty">No parameters available</p>';
            return;
        }

        const entries = [];
        for (const [name, value] of Object.entries(params)) {
            for (const pattern of this._deviceIdPatterns) {
                if (pattern.regex.test(name)) {
                    const decoded = this._decodeDeviceId(value, this[pattern.devTypes]);
                    if (decoded) {
                        entries.push({ name, category: pattern.label, decoded });
                    }
                    break;
                }
            }
        }

        if (entries.length === 0) {
            container.innerHTML = '<p class="panel-empty">No device IDs found</p>';
            return;
        }

        entries.sort((a, b) => a.name.localeCompare(b.name));

        entries.forEach(entry => {
            const d = entry.decoded;
            const card = document.createElement('div');
            card.className = 'devid-card';
            card.innerHTML = `
                <div class="devid-header">${entry.name}</div>
                <table class="devid-table">
                    <tr><td>Category</td><td>${entry.category}</td></tr>
                    <tr><td>Device</td><td>${d.devType}</td></tr>
                    <tr><td>Bus Type</td><td>${d.busType}</td></tr>
                    <tr><td>Bus</td><td>${d.bus}</td></tr>
                    <tr><td>Address</td><td>${d.address}</td></tr>
                </table>
            `;
            container.appendChild(card);
        });
    },

    // ========== EKF Helper Panel ==========

    populateEKF() {
        const container = document.getElementById('ekf-display');
        if (!container) return;
        container.innerHTML = '';

        // Detect EKF source: XKF4 = EKF3, NKF4 = EKF2
        let ekfType = null;
        let msgKey = null;
        if (State.messages['XKF4'] && State.messages['XKF4'].count > 0) {
            ekfType = 'EKF3';
            msgKey = 'XKF4';
        } else if (State.messages['NKF4'] && State.messages['NKF4'].count > 0) {
            ekfType = 'EKF2';
            msgKey = 'NKF4';
        }

        if (!ekfType) {
            container.innerHTML = '<p class="panel-empty">No EKF data (XKF4/NKF4) found</p>';
            return;
        }

        const data = State.messages[msgKey].data;
        const heading = document.createElement('div');
        heading.className = 'ekf-source-label';
        heading.textContent = ekfType + ' Status (' + msgKey + ')';
        container.appendChild(heading);

        // Innovation test ratios: SV=velocity, SP=position, SH=height, SM=compass, SVT=airspeed
        const fields = [
            { key: 'SV', label: 'Velocity' },
            { key: 'SP', label: 'Position' },
            { key: 'SH', label: 'Height' },
            { key: 'SM', label: 'Compass' },
            { key: 'SVT', label: 'Airspeed' }
        ];

        fields.forEach(f => {
            const arr = data[f.key];
            if (!arr || arr.length === 0) return;

            // Compute stats over the full log
            let sum = 0, max = -Infinity, count = 0;
            for (let i = 0; i < arr.length; i++) {
                const v = arr[i];
                if (v !== undefined && v !== null && !isNaN(v)) {
                    sum += v;
                    if (v > max) max = v;
                    count++;
                }
            }
            const mean = count > 0 ? sum / count : 0;
            max = count > 0 ? max : 0;

            // Thresholds: green < 0.5, yellow < 1.0, red >= 1.0
            let statusClass = 'ekf-green';
            if (max >= 1.0) statusClass = 'ekf-red';
            else if (max >= 0.5) statusClass = 'ekf-yellow';

            const row = document.createElement('div');
            row.className = 'ekf-row';
            row.innerHTML = `
                <span class="ekf-indicator ${statusClass}"></span>
                <span class="ekf-label">${f.label}</span>
                <span class="ekf-values">mean: ${mean.toFixed(2)} / max: ${max.toFixed(2)}</span>
            `;
            container.appendChild(row);
        });

        // Solution status flags from SS field
        const ssArr = data['SS'];
        if (ssArr && ssArr.length > 0) {
            // Use last value as representative
            const lastSS = ssArr[ssArr.length - 1];
            const ss = Math.round(lastSS);
            const flagDefs = [
                { bit: 0, label: 'Attitude' },
                { bit: 1, label: 'Horiz Velocity' },
                { bit: 2, label: 'Vert Velocity' },
                { bit: 3, label: 'Horiz Pos (rel)' },
                { bit: 4, label: 'Horiz Pos (abs)' },
                { bit: 5, label: 'Vert Pos (abs)' },
                { bit: 6, label: 'Vert Pos (AGL)' },
                { bit: 7, label: 'Const Pos Mode' },
                { bit: 8, label: 'Pred Horiz Pos (rel)' },
                { bit: 9, label: 'Pred Horiz Pos (abs)' }
            ];

            const flagsDiv = document.createElement('div');
            flagsDiv.className = 'ekf-flags-section';
            flagsDiv.innerHTML = '<div class="ekf-flags-title">Solution Status Flags</div>';
            flagDefs.forEach(fd => {
                const active = (ss & (1 << fd.bit)) !== 0;
                const flag = document.createElement('div');
                flag.className = 'ekf-flag';
                flag.innerHTML = `
                    <span class="ekf-indicator ${active ? 'ekf-green' : 'ekf-red'}"></span>
                    <span class="ekf-flag-label">${fd.label}</span>
                `;
                flagsDiv.appendChild(flag);
            });
            container.appendChild(flagsDiv);
        }
    },

    // ========== Attitude Panel ==========

    _attitudeCanvas: null,
    _attitudeCtx: null,
    _attitudeInitialized: false,

    populateAttitude() {
        const container = document.getElementById('attitude-display');
        if (!container) return;
        container.innerHTML = '';

        // Check if ATT data exists
        const attMsg = State.messages['ATT'];
        if (!attMsg || attMsg.count === 0) {
            container.innerHTML = '<p class="panel-empty">No ATT data available</p>';
            return;
        }

        // Create canvas for artificial horizon
        const wrapper = document.createElement('div');
        wrapper.className = 'attitude-wrapper';

        const canvas = document.createElement('canvas');
        canvas.id = 'attitude-canvas';
        canvas.width = 240;
        canvas.height = 240;
        wrapper.appendChild(canvas);

        // Readout below the canvas
        const readout = document.createElement('div');
        readout.id = 'attitude-readout';
        readout.className = 'attitude-readout';
        readout.innerHTML = `
            <div><span class="att-label">Roll:</span> <span id="att-roll-val">0.0</span>&deg;</div>
            <div><span class="att-label">Pitch:</span> <span id="att-pitch-val">0.0</span>&deg;</div>
            <div><span class="att-label">Yaw:</span> <span id="att-yaw-val">0.0</span>&deg;</div>
        `;
        wrapper.appendChild(readout);
        container.appendChild(wrapper);

        this._attitudeCanvas = canvas;
        this._attitudeCtx = canvas.getContext('2d');

        // Draw initial state
        this._drawAttitude(0, 0, 0);

        // Listen for time changes
        if (!this._attitudeInitialized) {
            this._attitudeInitialized = true;
            EventBus.on('time:change', (timeUS) => this._updateAttitude(timeUS));
        }
    },

    _updateAttitude(timeUS) {
        const attMsg = State.messages['ATT'];
        if (!attMsg || !attMsg.data || !attMsg.data.TimeUS) return;
        if (!this._attitudeCtx) return;

        const times = attMsg.data.TimeUS;
        const idx = Utils.binarySearch(times, timeUS);

        const roll = attMsg.data.Roll ? attMsg.data.Roll[idx] : 0;
        const pitch = attMsg.data.Pitch ? attMsg.data.Pitch[idx] : 0;
        const yaw = attMsg.data.Yaw ? attMsg.data.Yaw[idx] : 0;

        this._drawAttitude(roll, pitch, yaw);

        const rollEl = document.getElementById('att-roll-val');
        const pitchEl = document.getElementById('att-pitch-val');
        const yawEl = document.getElementById('att-yaw-val');
        if (rollEl) rollEl.textContent = roll.toFixed(1);
        if (pitchEl) pitchEl.textContent = pitch.toFixed(1);
        if (yawEl) yawEl.textContent = yaw.toFixed(1);
    },

    _drawAttitude(rollDeg, pitchDeg, yawDeg) {
        const ctx = this._attitudeCtx;
        if (!ctx) return;
        const w = 240, h = 240;
        const cx = w / 2, cy = h / 2;
        const r = 100; // horizon circle radius

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(cx, cy);

        // Clip to circular region
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();

        // Roll rotation
        const rollRad = -rollDeg * Math.PI / 180;
        ctx.rotate(rollRad);

        // Pitch offset: 2 pixels per degree
        const pitchPx = pitchDeg * 2;

        // Sky (blue)
        ctx.fillStyle = '#4A90D9';
        ctx.fillRect(-r - 10, -r - 10 + pitchPx, (r + 10) * 2, r + 10);

        // Ground (brown)
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-r - 10, pitchPx, (r + 10) * 2, r + 10);

        // Horizon line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r, pitchPx);
        ctx.lineTo(r, pitchPx);
        ctx.stroke();

        // Pitch ladder lines (every 10 degrees)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.font = '9px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        for (let p = -30; p <= 30; p += 10) {
            if (p === 0) continue;
            const py = pitchPx - p * 2;
            const lw = Math.abs(p) === 10 ? 20 : 30;
            ctx.beginPath();
            ctx.moveTo(-lw, py);
            ctx.lineTo(lw, py);
            ctx.stroke();
            ctx.fillText(Math.abs(p).toString(), lw + 12, py + 3);
        }

        ctx.restore();

        // Draw circle border
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();

        // Fixed aircraft reference (center crosshair)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-15, 8);
        ctx.stroke();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(15, 0);
        ctx.lineTo(15, 8);
        ctx.stroke();
        // Center dot
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Roll indicator triangle at top
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(0, -r + 2);
        ctx.lineTo(-6, -r + 12);
        ctx.lineTo(6, -r + 12);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    },

    // ========== MagFit Panel ==========

    populateMagFit() {
        const container = document.getElementById('magfit-display');
        if (!container) return;
        container.innerHTML = '';

        const params = State.params;

        // Compass offsets section
        const offsetSection = document.createElement('div');
        offsetSection.className = 'magfit-section';
        offsetSection.innerHTML = '<div class="magfit-title">Compass Offsets (Parameters)</div>';

        const compassSets = [
            { prefix: 'COMPASS_OFS', label: 'Compass 1' },
            { prefix: 'COMPASS_OFS2', label: 'Compass 2' },
            { prefix: 'COMPASS_OFS3', label: 'Compass 3' }
        ];

        let hasOffsets = false;
        compassSets.forEach(cs => {
            const x = params[cs.prefix + '_X'];
            const y = params[cs.prefix + '_Y'];
            const z = params[cs.prefix + '_Z'];
            if (x !== undefined || y !== undefined || z !== undefined) {
                hasOffsets = true;
                const row = document.createElement('div');
                row.className = 'magfit-offset-row';
                row.innerHTML = `
                    <div class="magfit-offset-label">${cs.label}</div>
                    <table class="magfit-offset-table">
                        <tr><td>X</td><td>${(x !== undefined ? Number(x).toFixed(1) : 'N/A')}</td></tr>
                        <tr><td>Y</td><td>${(y !== undefined ? Number(y).toFixed(1) : 'N/A')}</td></tr>
                        <tr><td>Z</td><td>${(z !== undefined ? Number(z).toFixed(1) : 'N/A')}</td></tr>
                    </table>
                `;
                offsetSection.appendChild(row);
            }
        });

        if (!hasOffsets) {
            offsetSection.innerHTML += '<p class="panel-empty">No compass offset parameters found</p>';
        }
        container.appendChild(offsetSection);

        // Raw mag data statistics
        const magSection = document.createElement('div');
        magSection.className = 'magfit-section';
        magSection.innerHTML = '<div class="magfit-title">Raw Mag Data Statistics</div>';

        // Check for MAG, MAG2, MAG3 messages
        const magSources = [
            { key: 'MAG', label: 'Mag 1' },
            { key: 'MAG2', label: 'Mag 2' },
            { key: 'MAG3', label: 'Mag 3' }
        ];

        // Also check for instance-based MAG messages (MAG with field data)
        let hasMagData = false;
        magSources.forEach(ms => {
            const msg = State.messages[ms.key];
            if (!msg || msg.count === 0) return;
            const data = msg.data;
            if (!data) return;

            const axes = [
                { key: 'MagX', label: 'X' },
                { key: 'MagY', label: 'Y' },
                { key: 'MagZ', label: 'Z' }
            ];

            let hasAxes = false;
            const rows = [];
            axes.forEach(ax => {
                const arr = data[ax.key];
                if (!arr || arr.length === 0) return;
                hasAxes = true;

                let min = Infinity, max = -Infinity, sum = 0, count = 0;
                for (let i = 0; i < arr.length; i++) {
                    const v = arr[i];
                    if (v !== undefined && v !== null && !isNaN(v)) {
                        if (v < min) min = v;
                        if (v > max) max = v;
                        sum += v;
                        count++;
                    }
                }
                const mean = count > 0 ? sum / count : 0;
                min = count > 0 ? min : 0;
                max = count > 0 ? max : 0;

                rows.push(`<tr><td>${ax.label}</td><td>${min.toFixed(1)}</td><td>${max.toFixed(1)}</td><td>${mean.toFixed(1)}</td></tr>`);
            });

            if (hasAxes) {
                hasMagData = true;
                const block = document.createElement('div');
                block.className = 'magfit-mag-block';
                block.innerHTML = `
                    <div class="magfit-offset-label">${ms.label} (${msg.count} samples)</div>
                    <table class="magfit-stats-table">
                        <tr class="magfit-stats-header"><th>Axis</th><th>Min</th><th>Max</th><th>Mean</th></tr>
                        ${rows.join('')}
                    </table>
                `;
                magSection.appendChild(block);
            }
        });

        if (!hasMagData) {
            magSection.innerHTML += '<p class="panel-empty">No raw mag data (MAG/MAG2/MAG3) found</p>';
        }
        container.appendChild(magSection);
    }
};
