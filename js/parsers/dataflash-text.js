/**
 * ArduPilot DataFlash Text (.LOG) Parser
 *
 * Parses text-format DataFlash logs where each line is:
 *   FMT, type, length, name, format, labels
 *   MSG_NAME, field1, field2, ...
 *
 * This parser is designed for Web Worker context (no ES modules).
 */
class DataFlashTextParser {

    constructor(buffer, opts = {}) {
        this.onProgress = opts.onProgress || null;

        // Decode ArrayBuffer to text
        const decoder = new TextDecoder('utf-8');
        this.text = decoder.decode(buffer);
        this.lines = this.text.split(/\r?\n/);

        // Parsed output
        this.formats = {};
        this.formatsByName = {};
        this.messages = {};
        this.parameters = {};
        this.parameterList = [];
        this.modes = [];
        this.textMessages = [];
        this.missions = [];
        this.events = [];
        this.trajectories = [];
        this.attitudes = [];
        this.fmtUnits = {};
        this.totalMessages = 0;
        this.errors = [];
    }

    parse() {
        const t0 = performance.now();
        const lines = this.lines;
        const total = lines.length;

        this._reportProgress(0, 'Parsing text log...');

        // First pass: find FMT lines
        for (let i = 0; i < total; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;

            if (line.startsWith('FMT,') || line.startsWith('FMT ')) {
                this._parseFMTLine(line);
            }
        }

        this._reportProgress(10, 'Parsing messages...');

        // Second pass: parse all messages
        for (let i = 0; i < total; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;

            this._parseMessageLine(line, i);

            if (i % 10000 === 0) {
                const pct = 10 + Math.round((i / total) * 80);
                this._reportProgress(pct, `Parsed ${this.totalMessages} messages...`);
            }
        }

        this._reportProgress(90, 'Extracting trajectories...');
        this._extractTrajectories();
        this._extractAttitudes();

        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        this._reportProgress(100, `Done in ${elapsed}s`);

        return this._buildResult(elapsed);
    }

    _parseFMTLine(line) {
        const parts = this._splitLine(line);
        if (parts.length < 6) return;

        // FMT, type, length, name, format, label1,label2,...
        const type = parseInt(parts[1]);
        const length = parseInt(parts[2]);
        const name = parts[3].trim();
        const format = parts[4].trim();
        const labels = parts.slice(5).map(s => s.trim());

        const def = { type, length, name, format, labels };
        this.formats[type] = def;
        this.formatsByName[name] = def;
    }

    _parseMessageLine(line, lineNum) {
        const firstComma = line.indexOf(',');
        const firstSpace = line.indexOf(' ');
        const sep = (firstComma !== -1 && (firstSpace === -1 || firstComma < firstSpace)) ? ',' : ' ';

        let name, rest;
        if (sep === ',') {
            const idx = line.indexOf(',');
            name = line.substring(0, idx).trim();
            rest = line.substring(idx + 1);
        } else {
            const idx = line.indexOf(' ');
            name = line.substring(0, idx).trim();
            rest = line.substring(idx + 1);
        }

        if (!name || name === 'FMT') return;

        const fmt = this.formatsByName[name];
        if (!fmt) return;

        const values = rest.split(',').map(s => s.trim());
        const { format, labels } = fmt;

        // Initialize storage
        if (!this.messages[name]) {
            const fields = {};
            for (const label of labels) {
                fields[label] = [];
            }
            this.messages[name] = { fields, count: 0 };
        }

        const msg = this.messages[name];

        for (let i = 0; i < labels.length && i < values.length; i++) {
            const ch = format[i];
            const raw = values[i];
            let value;

            if (!ch || !raw) continue;

            switch (ch) {
                case 'b': case 'B': case 'h': case 'H':
                case 'i': case 'I': case 'q': case 'Q':
                case 'M':
                    value = parseInt(raw);
                    break;
                case 'f': case 'd':
                case 'c': case 'C': case 'e': case 'E':
                case 'L':
                    value = parseFloat(raw);
                    break;
                case 'n': case 'N': case 'Z':
                    value = raw;
                    break;
                default:
                    value = isNaN(Number(raw)) ? raw : Number(raw);
            }

            if (msg.fields[labels[i]]) {
                msg.fields[labels[i]].push(value);
            }
        }

        msg.count++;
        this.totalMessages++;

        // Handle special messages
        this._handleSpecialMessage(name, msg.fields, msg.count - 1);
    }

    _handleSpecialMessage(name, fields, idx) {
        switch (name) {
            case 'PARM': {
                const pName = fields['Name'] ? fields['Name'][idx] : null;
                const pVal = fields['Value'] ? fields['Value'][idx] : null;
                if (pName !== null) {
                    this.parameters[pName] = pVal;
                    this.parameterList.push({ name: pName, value: pVal });
                }
                break;
            }
            case 'MODE': {
                const entry = { index: idx };
                if (fields['TimeUS']) entry.timeUS = fields['TimeUS'][idx];
                if (fields['Mode']) entry.mode = fields['Mode'][idx];
                if (fields['ModeNum']) entry.modeNum = fields['ModeNum'][idx];
                if (fields['Rsn']) entry.reason = fields['Rsn'][idx];
                this.modes.push(entry);
                break;
            }
            case 'MSG': {
                const entry = {};
                if (fields['TimeUS']) entry.timeUS = fields['TimeUS'][idx];
                if (fields['Message']) entry.message = fields['Message'][idx];
                this.textMessages.push(entry);
                break;
            }
            case 'CMD': {
                const entry = { index: idx };
                for (const key of ['TimeUS', 'CTot', 'CNum', 'CId', 'Prm1', 'Prm2', 'Prm3', 'Prm4', 'Lat', 'Lng', 'Alt', 'Frame']) {
                    if (fields[key]) entry[key] = fields[key][idx];
                }
                this.missions.push(entry);
                break;
            }
            case 'EV': {
                const entry = {};
                if (fields['TimeUS']) entry.timeUS = fields['TimeUS'][idx];
                if (fields['Id']) entry.id = fields['Id'][idx];
                this.events.push(entry);
                break;
            }
            case 'FMTU': {
                const fmtType = fields['FmtType'] ? fields['FmtType'][idx] : null;
                if (fmtType !== null) {
                    this.fmtUnits[fmtType] = {
                        unitIds: fields['UnitIds'] ? fields['UnitIds'][idx] : '',
                        multIds: fields['MultIds'] ? fields['MultIds'][idx] : '',
                    };
                }
                break;
            }
        }
    }

    _extractTrajectories() {
        // GPS-based
        for (const name of ['GPS', 'GPS2']) {
            const gps = this.messages[name];
            if (!gps) continue;
            const f = gps.fields;
            const lat = f['Lat'], lng = f['Lng'], alt = f['Alt'];
            const status = f['Status'], timeUS = f['TimeUS'];
            if (!lat || !lng) continue;

            for (let i = 0; i < lat.length; i++) {
                if (status && status[i] < 3) continue;
                if (lat[i] === 0 && lng[i] === 0) continue;
                this.trajectories.push({
                    lat: lat[i], lng: lng[i],
                    alt: alt ? alt[i] : 0,
                    timeUS: timeUS ? timeUS[i] : 0,
                    source: name
                });
            }
        }

        // AHR2 fallback
        if (this.trajectories.length === 0 && this.messages['AHR2']) {
            const f = this.messages['AHR2'].fields;
            const lat = f['Lat'], lng = f['Lng'], alt = f['Alt'], timeUS = f['TimeUS'];
            if (lat && lng) {
                for (let i = 0; i < lat.length; i++) {
                    if (lat[i] === 0 && lng[i] === 0) continue;
                    this.trajectories.push({
                        lat: lat[i], lng: lng[i],
                        alt: alt ? alt[i] : 0,
                        timeUS: timeUS ? timeUS[i] : 0,
                        source: 'AHR2'
                    });
                }
            }
        }
    }

    _extractAttitudes() {
        const att = this.messages['ATT'];
        if (!att) return;
        const f = att.fields;
        const timeUS = f['TimeUS'], roll = f['Roll'], pitch = f['Pitch'], yaw = f['Yaw'];
        const desRoll = f['DesRoll'], desPitch = f['DesPitch'], desYaw = f['DesYaw'];
        if (!roll) return;

        for (let i = 0; i < roll.length; i++) {
            this.attitudes.push({
                timeUS: timeUS ? timeUS[i] : 0,
                roll: roll[i],
                pitch: pitch ? pitch[i] : 0,
                yaw: yaw ? yaw[i] : 0,
                desRoll: desRoll ? desRoll[i] : 0,
                desPitch: desPitch ? desPitch[i] : 0,
                desYaw: desYaw ? desYaw[i] : 0,
            });
        }
    }

    _splitLine(line) {
        return line.split(',').map(s => s.trim());
    }

    _buildResult(elapsed) {
        let startTimeUS = Infinity, endTimeUS = -Infinity;
        for (const name in this.messages) {
            const t = this.messages[name].fields['TimeUS'];
            if (t && t.length > 0) {
                if (t[0] < startTimeUS) startTimeUS = t[0];
                if (t[t.length - 1] > endTimeUS) endTimeUS = t[t.length - 1];
            }
        }
        if (!isFinite(startTimeUS)) startTimeUS = 0;
        if (!isFinite(endTimeUS)) endTimeUS = 0;

        const messageTypes = {};
        for (const name in this.messages) {
            messageTypes[name] = {
                count: this.messages[name].count,
                labels: Object.keys(this.messages[name].fields),
            };
        }

        return {
            type: 'dataflash-text',
            totalMessages: this.totalMessages,
            parseTime: elapsed,
            fileSize: this.text.length,
            timeRange: { startUS: startTimeUS, endUS: endTimeUS, durationS: (endTimeUS - startTimeUS) / 1e6 },
            vehicleType: 'unknown',
            formats: this.formats,
            formatsByName: this.formatsByName,
            fmtUnits: this.fmtUnits,
            messageTypes,
            messages: this.messages,
            parameters: this.parameters,
            parameterList: this.parameterList,
            modes: this.modes,
            textMessages: this.textMessages,
            missions: this.missions,
            events: this.events,
            trajectories: this.trajectories,
            attitudes: this.attitudes,
            errors: this.errors,
        };
    }

    _reportProgress(pct, text) {
        if (this.onProgress) {
            this.onProgress(Math.min(100, Math.max(0, pct)), text);
        }
    }
}
