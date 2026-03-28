/**
 * ArduPilot DataFlash Binary (.BIN) Log Parser
 *
 * Parses the binary DataFlash log format used by ArduPilot.
 * Designed for use in a Web Worker context (no ES modules).
 *
 * Binary format:
 *   Every message starts with 0xA3 0x95 <msgType>.
 *   FMT (type 128) messages define the schema for all other types.
 */

// eslint-disable-next-line no-unused-vars
class DataFlashParser {

    // ---------------------------------------------------------------
    //  Constants
    // ---------------------------------------------------------------

    static HEAD1 = 0xA3;
    static HEAD2 = 0x95;
    static FMT_TYPE = 128;
    static FMT_LENGTH = 89;

    // Format-character -> { size (bytes), read(dataView, offset, littleEndian) }
    // We build these once and reuse.
    static FORMAT_CHARS = null; // lazily initialised

    // ---------------------------------------------------------------
    //  Constructor
    // ---------------------------------------------------------------

    /**
     * @param {ArrayBuffer} buffer  - Raw .BIN file contents.
     * @param {object}      [opts]
     * @param {function}    [opts.onProgress] - Called with (percent, statusText).
     */
    constructor(buffer, opts = {}) {
        this.buffer = buffer;
        this.data = new Uint8Array(buffer);
        this.view = new DataView(buffer);
        this.length = buffer.byteLength;
        this.onProgress = opts.onProgress || null;

        // Parsed output ---
        /** @type {Object<number, {type:number, length:number, name:string, format:string, labels:string[]}>} */
        this.formats = {};          // msgType -> format definition
        this.formatsByName = {};    // name    -> format definition
        this.messages = {};         // name    -> { fields: {label: []}, count: number }
        this.parameters = {};       // PARM name -> value
        this.parameterList = [];    // [{name, value}] in order
        this.modes = [];            // [{mode, modeNum, reason, timeUS, index}]
        this.textMessages = [];     // [{timeUS, message}]
        this.missions = [];         // [{cnum, cid, lat, lng, alt, ...}]
        this.events = [];           // [{id, timeUS}]
        this.trajectories = [];     // [{lat, lng, alt, timeUS, source}]
        this.attitudes = [];        // [{timeUS, roll, pitch, yaw, ...}]
        this.fmtUnits = {};         // msgType -> {unitIds, multIds}

        this.totalMessages = 0;
        this.errors = [];

        if (!DataFlashParser.FORMAT_CHARS) {
            DataFlashParser._initFormatChars();
        }
    }

    // ---------------------------------------------------------------
    //  Public API
    // ---------------------------------------------------------------

    /**
     * Run the full parse.  Returns a result object.
     */
    parse() {
        const t0 = performance.now();

        this._reportProgress(0, 'Scanning FMT messages...');
        this._parseFMTs();

        this._reportProgress(10, 'Parsing messages...');
        this._parseAllMessages();

        this._reportProgress(90, 'Extracting trajectories & metadata...');
        this._extractTrajectories();
        this._extractAttitudes();

        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        this._reportProgress(100, `Done in ${elapsed}s`);

        return this._buildResult(elapsed);
    }

    // ---------------------------------------------------------------
    //  FMT scanning  (first pass – fast)
    // ---------------------------------------------------------------

    _parseFMTs() {
        const data = this.data;
        const len = this.length;
        let offset = 0;

        while (offset < len - 2) {
            // Find next header
            if (data[offset] !== 0xA3 || data[offset + 1] !== 0x95) {
                offset++;
                continue;
            }
            const msgType = data[offset + 2];
            if (msgType === DataFlashParser.FMT_TYPE) {
                if (offset + DataFlashParser.FMT_LENGTH <= len) {
                    this._readFMT(offset);
                }
            }
            // Advance past this message using known length or skip header
            const fmt = this.formats[msgType];
            if (fmt) {
                offset += fmt.length;
            } else if (msgType === DataFlashParser.FMT_TYPE) {
                offset += DataFlashParser.FMT_LENGTH;
            } else {
                // Unknown type during FMT scan – skip header and resync
                offset += 3;
            }
        }
    }

    _readFMT(offset) {
        // offset points at 0xA3
        const view = this.view;
        const base = offset + 3; // past header

        const type   = view.getUint8(base);
        const length = view.getUint8(base + 1);
        const name   = this._readString(base + 2, 4);
        const format = this._readString(base + 6, 16);
        const labels = this._readString(base + 22, 64).split(',');

        const def = { type, length, name, format, labels };
        this.formats[type] = def;
        this.formatsByName[name] = def;
    }

    // ---------------------------------------------------------------
    //  Full message parse  (second pass)
    // ---------------------------------------------------------------

    _parseAllMessages() {
        const data = this.data;
        const len = this.length;
        let offset = 0;
        let count = 0;
        const progressInterval = Math.max(1, Math.floor(len / 80));  // ~80 progress ticks
        let nextProgressAt = progressInterval;

        while (offset < len - 2) {
            // Sync
            if (data[offset] !== 0xA3 || data[offset + 1] !== 0x95) {
                offset = this._resync(offset);
                continue;
            }

            const msgType = data[offset + 2];
            const fmt = this.formats[msgType];

            if (!fmt) {
                // No FMT for this type – could be corruption. Skip header, resync.
                offset += 3;
                continue;
            }

            if (offset + fmt.length > len) {
                // Truncated message at end of file
                break;
            }

            this._decodeMessage(fmt, offset);
            count++;
            offset += fmt.length;

            // Progress
            if (offset >= nextProgressAt) {
                const pct = 10 + Math.round((offset / len) * 80); // 10-90 range
                this._reportProgress(pct, `Parsed ${count} messages...`);
                nextProgressAt = offset + progressInterval;
            }
        }

        this.totalMessages = count;
    }

    /**
     * Find the next valid header starting from `offset`.
     */
    _resync(offset) {
        const data = this.data;
        const len = this.length;
        let i = offset + 1;
        while (i < len - 1) {
            if (data[i] === 0xA3 && data[i + 1] === 0x95) {
                return i;
            }
            i++;
        }
        return len; // EOF
    }

    // ---------------------------------------------------------------
    //  Message decoding
    // ---------------------------------------------------------------

    _decodeMessage(fmt, offset) {
        const { name, format, labels } = fmt;

        // Lazily initialise columnar storage
        if (!this.messages[name]) {
            const fields = {};
            for (let i = 0; i < labels.length; i++) {
                fields[labels[i]] = [];
            }
            this.messages[name] = { fields, count: 0 };
        }

        const msg = this.messages[name];
        const fields = msg.fields;
        let pos = offset + 3; // skip header bytes

        for (let i = 0; i < format.length && i < labels.length; i++) {
            const ch = format[i];
            const spec = DataFlashParser.FORMAT_CHARS[ch];
            if (!spec) {
                // Unknown format char – skip rest of message
                break;
            }
            const value = spec.read(this.view, this.data, pos);
            const label = labels[i];
            if (fields[label]) {
                fields[label].push(value);
            }
            pos += spec.size;
        }

        msg.count++;

        // Inline extraction for frequently-needed types
        this._handleSpecialMessage(name, fields, msg.count - 1);
    }

    /**
     * Handle special messages inline during parsing to avoid a second pass.
     */
    _handleSpecialMessage(name, fields, idx) {
        switch (name) {
            case 'PARM': {
                const pName = fields['Name'] ? fields['Name'][idx] : null;
                const pVal  = fields['Value'] ? fields['Value'][idx] : null;
                if (pName !== null) {
                    this.parameters[pName] = pVal;
                    this.parameterList.push({ name: pName, value: pVal });
                }
                break;
            }
            case 'MODE': {
                const entry = { index: idx };
                if (fields['TimeUS'])  entry.timeUS  = fields['TimeUS'][idx];
                if (fields['Mode'])    entry.mode     = fields['Mode'][idx];
                if (fields['ModeNum']) entry.modeNum  = fields['ModeNum'][idx];
                if (fields['Rsn'])     entry.reason   = fields['Rsn'][idx];
                this.modes.push(entry);
                break;
            }
            case 'MSG': {
                const entry = {};
                if (fields['TimeUS'])  entry.timeUS  = fields['TimeUS'][idx];
                if (fields['Message']) entry.message  = fields['Message'][idx];
                this.textMessages.push(entry);
                break;
            }
            case 'CMD': {
                const entry = { index: idx };
                for (const key of ['TimeUS','CTot','CNum','CId','Prm1','Prm2','Prm3','Prm4','Lat','Lng','Alt','Frame']) {
                    if (fields[key]) entry[key] = fields[key][idx];
                }
                this.missions.push(entry);
                break;
            }
            case 'EV': {
                const entry = {};
                if (fields['TimeUS']) entry.timeUS = fields['TimeUS'][idx];
                if (fields['Id'])     entry.id     = fields['Id'][idx];
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
            default:
                break;
        }
    }

    // ---------------------------------------------------------------
    //  Post-processing helpers
    // ---------------------------------------------------------------

    _extractTrajectories() {
        const trajectories = this.trajectories;

        // GPS-based trajectory (primary)
        const gpsNames = this._findInstanceNames('GPS');
        for (const gpsName of gpsNames) {
            const gps = this.messages[gpsName];
            if (!gps) continue;
            const f = gps.fields;
            const lat = f['Lat'], lng = f['Lng'], alt = f['Alt'];
            const status = f['Status'];
            const timeUS = f['TimeUS'];
            if (!lat || !lng) continue;
            for (let i = 0; i < lat.length; i++) {
                // Only include if GPS has a 3D fix (status >= 3)
                if (status && status[i] < 3) continue;
                // Skip zero coordinates
                if (lat[i] === 0 && lng[i] === 0) continue;
                trajectories.push({
                    lat: lat[i],
                    lng: lng[i],
                    alt: alt ? alt[i] : 0,
                    timeUS: timeUS ? timeUS[i] : 0,
                    source: gpsName,
                });
            }
        }

        // AHR2 fallback
        if (trajectories.length === 0) {
            const ahr2 = this.messages['AHR2'];
            if (ahr2) {
                const f = ahr2.fields;
                const lat = f['Lat'], lng = f['Lng'], alt = f['Alt'];
                const timeUS = f['TimeUS'];
                if (lat && lng) {
                    for (let i = 0; i < lat.length; i++) {
                        if (lat[i] === 0 && lng[i] === 0) continue;
                        trajectories.push({
                            lat: lat[i],
                            lng: lng[i],
                            alt: alt ? alt[i] : 0,
                            timeUS: timeUS ? timeUS[i] : 0,
                            source: 'AHR2',
                        });
                    }
                }
            }
        }

        // POS fallback
        if (trajectories.length === 0) {
            const pos = this.messages['POS'];
            if (pos) {
                const f = pos.fields;
                const lat = f['Lat'], lng = f['Lng'], alt = f['Alt'];
                const timeUS = f['TimeUS'];
                if (lat && lng) {
                    for (let i = 0; i < lat.length; i++) {
                        if (lat[i] === 0 && lng[i] === 0) continue;
                        trajectories.push({
                            lat: lat[i],
                            lng: lng[i],
                            alt: alt ? alt[i] : 0,
                            timeUS: timeUS ? timeUS[i] : 0,
                            source: 'POS',
                        });
                    }
                }
            }
        }
    }

    _extractAttitudes() {
        const att = this.messages['ATT'];
        if (!att) return;
        const f = att.fields;
        const timeUS = f['TimeUS'];
        const roll = f['Roll'], pitch = f['Pitch'], yaw = f['Yaw'];
        const desRoll = f['DesRoll'], desPitch = f['DesPitch'], desYaw = f['DesYaw'];
        if (!roll) return;
        for (let i = 0; i < roll.length; i++) {
            this.attitudes.push({
                timeUS:   timeUS   ? timeUS[i]   : 0,
                roll:     roll[i],
                pitch:    pitch    ? pitch[i]    : 0,
                yaw:      yaw      ? yaw[i]      : 0,
                desRoll:  desRoll  ? desRoll[i]  : 0,
                desPitch: desPitch ? desPitch[i] : 0,
                desYaw:   desYaw   ? desYaw[i]   : 0,
            });
        }
    }

    /**
     * Find all instance names for a base message type.
     * e.g. 'GPS' might also appear as 'GPS2', 'GPS3', or 'GPS[0]', 'GPS[1]'.
     * Returns array of names present in this.messages, with the base name first.
     */
    _findInstanceNames(baseName) {
        const names = [];
        if (this.messages[baseName]) names.push(baseName);
        // Check numbered variants (GPS2, GPS3, ...)
        for (let n = 2; n <= 9; n++) {
            const variant = baseName + n;
            if (this.messages[variant]) names.push(variant);
        }
        // Also check bracket notation (GPS[0], GPS[1], ...)
        for (let n = 0; n <= 9; n++) {
            const variant = `${baseName}[${n}]`;
            if (this.messages[variant]) names.push(variant);
        }
        return names;
    }

    // ---------------------------------------------------------------
    //  Result builder
    // ---------------------------------------------------------------

    _buildResult(elapsed) {
        // Compute time range
        let startTimeUS = Infinity;
        let endTimeUS = -Infinity;
        for (const name in this.messages) {
            const t = this.messages[name].fields['TimeUS'];
            if (t && t.length > 0) {
                if (t[0] < startTimeUS)          startTimeUS = t[0];
                if (t[t.length - 1] > endTimeUS) endTimeUS = t[t.length - 1];
            }
        }
        if (!isFinite(startTimeUS)) startTimeUS = 0;
        if (!isFinite(endTimeUS))   endTimeUS = 0;

        // Message type summary
        const messageTypes = {};
        for (const name in this.messages) {
            messageTypes[name] = {
                count: this.messages[name].count,
                labels: Object.keys(this.messages[name].fields),
            };
        }

        // Vehicle type heuristic (from PARM or FMT names)
        const vehicleType = this._guessVehicleType();

        return {
            type: 'dataflash',
            totalMessages: this.totalMessages,
            parseTime: elapsed,
            fileSize: this.length,
            timeRange: {
                startUS: startTimeUS,
                endUS: endTimeUS,
                durationS: (endTimeUS - startTimeUS) / 1e6,
            },
            vehicleType,
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

    _guessVehicleType() {
        // Try PARM-based detection first
        const frameClass = this.parameters['FRAME_CLASS'];
        if (frameClass !== undefined) {
            // ArduCopter frame classes
            const fc = Number(frameClass);
            if (fc >= 1 && fc <= 12) return 'copter';
        }

        // Check for vehicle-specific parameters
        if (this.parameters['Q_ENABLE'] !== undefined) return 'plane'; // quadplane
        if (this.parameters['SAIL_ENABLE'] !== undefined) return 'rover';

        // Check message names
        if (this.messages['RCOU']) {
            // Look at number of servo outputs for a guess
        }
        if (this.formatsByName['CTUN']) {
            // CTUN exists in copter
            const fmt = this.formatsByName['CTUN'];
            if (fmt.labels.includes('ThI')) return 'copter';
            if (fmt.labels.includes('ASPD')) return 'plane';
        }
        if (this.formatsByName['STER']) return 'rover';
        if (this.formatsByName['DPH']) return 'sub';

        return 'unknown';
    }

    // ---------------------------------------------------------------
    //  Low-level helpers
    // ---------------------------------------------------------------

    _readString(offset, maxLen) {
        const data = this.data;
        let end = offset;
        const limit = Math.min(offset + maxLen, this.length);
        while (end < limit && data[end] !== 0) {
            end++;
        }
        // Fast ASCII decode
        let s = '';
        for (let i = offset; i < end; i++) {
            s += String.fromCharCode(data[i]);
        }
        return s;
    }

    _reportProgress(pct, text) {
        if (this.onProgress) {
            this.onProgress(Math.min(100, Math.max(0, pct)), text);
        }
    }

    // ---------------------------------------------------------------
    //  Static: Format character definitions
    // ---------------------------------------------------------------

    static _initFormatChars() {
        const LE = true; // DataFlash is little-endian

        DataFlashParser.FORMAT_CHARS = {
            'b': {
                size: 1,
                read(view, _data, off) { return view.getInt8(off); },
            },
            'B': {
                size: 1,
                read(view, _data, off) { return view.getUint8(off); },
            },
            'h': {
                size: 2,
                read(view, _data, off) { return view.getInt16(off, LE); },
            },
            'H': {
                size: 2,
                read(view, _data, off) { return view.getUint16(off, LE); },
            },
            'i': {
                size: 4,
                read(view, _data, off) { return view.getInt32(off, LE); },
            },
            'I': {
                size: 4,
                read(view, _data, off) { return view.getUint32(off, LE); },
            },
            'f': {
                size: 4,
                read(view, _data, off) { return view.getFloat32(off, LE); },
            },
            'd': {
                size: 8,
                read(view, _data, off) { return view.getFloat64(off, LE); },
            },
            'n': {
                size: 4,
                read(_view, data, off) { return DataFlashParser._readFixedString(data, off, 4); },
            },
            'N': {
                size: 16,
                read(_view, data, off) { return DataFlashParser._readFixedString(data, off, 16); },
            },
            'Z': {
                size: 64,
                read(_view, data, off) { return DataFlashParser._readFixedString(data, off, 64); },
            },
            'c': {
                size: 2,
                read(view, _data, off) { return view.getInt16(off, LE) * 0.01; },
            },
            'C': {
                size: 2,
                read(view, _data, off) { return view.getUint16(off, LE) * 0.01; },
            },
            'e': {
                size: 4,
                read(view, _data, off) { return view.getInt32(off, LE) * 0.01; },
            },
            'E': {
                size: 4,
                read(view, _data, off) { return view.getUint32(off, LE) * 0.01; },
            },
            'L': {
                size: 4,
                read(view, _data, off) { return view.getInt32(off, LE) * 1e-7; },
            },
            'M': {
                size: 1,
                read(view, _data, off) { return view.getUint8(off); },
            },
            'q': {
                size: 8,
                read(view, _data, off) {
                    // Read as BigInt then convert to Number.
                    // For TimeUS and similar fields this stays within safe integer range.
                    const lo = view.getUint32(off, LE);
                    const hi = view.getInt32(off + 4, LE);
                    return hi * 0x100000000 + lo;
                },
            },
            'Q': {
                size: 8,
                read(view, _data, off) {
                    const lo = view.getUint32(off, LE);
                    const hi = view.getUint32(off + 4, LE);
                    return hi * 0x100000000 + lo;
                },
            },
            'a': {
                size: 64, // 32 * int16
                read(view, _data, off) {
                    const arr = new Int16Array(32);
                    for (let j = 0; j < 32; j++) {
                        arr[j] = view.getInt16(off + j * 2, LE);
                    }
                    return arr;
                },
            },
            'A': {
                size: 64, // 32 * uint16
                read(view, _data, off) {
                    const arr = new Uint16Array(32);
                    for (let j = 0; j < 32; j++) {
                        arr[j] = view.getUint16(off + j * 2, LE);
                    }
                    return arr;
                },
            },
        };
    }

    static _readFixedString(data, off, maxLen) {
        let end = off;
        const limit = off + maxLen;
        while (end < limit && data[end] !== 0) {
            end++;
        }
        let s = '';
        for (let i = off; i < end; i++) {
            s += String.fromCharCode(data[i]);
        }
        return s;
    }
}
