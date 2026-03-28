/**
 * MAVLink TLOG (.tlog) Log Parser
 *
 * Parses MAVLink telemetry log files which consist of timestamped MAVLink v1/v2
 * messages. Designed for use in a Web Worker context (no ES modules).
 *
 * TLOG format: each entry is an 8-byte big-endian uint64 timestamp (microseconds
 * since Unix epoch) followed by a MAVLink v1 or v2 message frame.
 */

// eslint-disable-next-line no-unused-vars
class MavlinkParser {

    // ---------------------------------------------------------------
    //  Constants
    // ---------------------------------------------------------------

    static MAVLINK_V1_START = 0xFE;
    static MAVLINK_V2_START = 0xFD;
    static TIMESTAMP_SIZE = 8;

    // MAVLink v1 overhead: start(1) + len(1) + seq(1) + sysid(1) + compid(1) + msgid(1) + crc(2) = 8
    static V1_HEADER_SIZE = 6;
    static V1_OVERHEAD = 8;

    // MAVLink v2 overhead: start(1) + len(1) + incompat(1) + compat(1) + seq(1) + sysid(1) + compid(1) + msgid(3) + crc(2) = 12
    static V2_HEADER_SIZE = 10;
    static V2_OVERHEAD = 12;
    static V2_SIGNATURE_SIZE = 13;

    // Incompatibility flag: message is signed
    static IFLAG_SIGNED = 0x01;

    // ---------------------------------------------------------------
    //  Message definitions
    // ---------------------------------------------------------------

    /**
     * Each definition: { name, fields: [ { name, type, count? } ] }
     * type is one of: uint8, int8, uint16, int16, uint32, int32, uint64, float, char
     * count is used for char arrays (strings) and repeated fields.
     * Fields are listed in *wire order* (sorted by type size descending, as per
     * MAVLink serialisation rules - the XML order is NOT wire order).
     */
    static MSG_DEFS = {
        0: {
            name: 'HEARTBEAT',
            // Wire order: custom_mode(uint32), type(uint8), autopilot(uint8), base_mode(uint8), system_status(uint8), mavlink_version(uint8)
            fields: [
                { name: 'custom_mode', type: 'uint32' },
                { name: 'type', type: 'uint8' },
                { name: 'autopilot', type: 'uint8' },
                { name: 'base_mode', type: 'uint8' },
                { name: 'system_status', type: 'uint8' },
                { name: 'mavlink_version', type: 'uint8' },
            ],
        },
        1: {
            name: 'SYS_STATUS',
            // Wire order: sensors_present(uint32), sensors_enabled(uint32), sensors_health(uint32), load(uint16), voltage_battery(uint16), current_battery(int16), battery_remaining(int8)
            fields: [
                { name: 'sensors_present', type: 'uint32' },
                { name: 'sensors_enabled', type: 'uint32' },
                { name: 'sensors_health', type: 'uint32' },
                { name: 'load', type: 'uint16' },
                { name: 'voltage_battery', type: 'uint16' },
                { name: 'current_battery', type: 'int16' },
                { name: 'battery_remaining', type: 'int8' },
            ],
        },
        22: {
            name: 'PARAM_VALUE',
            // Wire order: param_value(float), param_count(uint16), param_index(uint16), param_id(char[16]), param_type(uint8)
            fields: [
                { name: 'param_value', type: 'float' },
                { name: 'param_count', type: 'uint16' },
                { name: 'param_index', type: 'uint16' },
                { name: 'param_id', type: 'char', count: 16 },
                { name: 'param_type', type: 'uint8' },
            ],
        },
        24: {
            name: 'GPS_RAW_INT',
            // Wire order: time_usec(uint64), lat(int32), lon(int32), alt(int32), eph(uint16), epv(uint16), vel(uint16), cog(uint16), fix_type(uint8), satellites_visible(uint8)
            fields: [
                { name: 'time_usec', type: 'uint64' },
                { name: 'lat', type: 'int32' },
                { name: 'lon', type: 'int32' },
                { name: 'alt', type: 'int32' },
                { name: 'eph', type: 'uint16' },
                { name: 'epv', type: 'uint16' },
                { name: 'vel', type: 'uint16' },
                { name: 'cog', type: 'uint16' },
                { name: 'fix_type', type: 'uint8' },
                { name: 'satellites_visible', type: 'uint8' },
            ],
        },
        30: {
            name: 'ATTITUDE',
            // Wire order: time_boot_ms(uint32), roll(float), pitch(float), yaw(float), rollspeed(float), pitchspeed(float), yawspeed(float)
            fields: [
                { name: 'time_boot_ms', type: 'uint32' },
                { name: 'roll', type: 'float' },
                { name: 'pitch', type: 'float' },
                { name: 'yaw', type: 'float' },
                { name: 'rollspeed', type: 'float' },
                { name: 'pitchspeed', type: 'float' },
                { name: 'yawspeed', type: 'float' },
            ],
        },
        33: {
            name: 'GLOBAL_POSITION_INT',
            // Wire order: time_boot_ms(uint32), lat(int32), lon(int32), alt(int32), relative_alt(int32), vx(int16), vy(int16), vz(int16), hdg(uint16)
            fields: [
                { name: 'time_boot_ms', type: 'uint32' },
                { name: 'lat', type: 'int32' },
                { name: 'lon', type: 'int32' },
                { name: 'alt', type: 'int32' },
                { name: 'relative_alt', type: 'int32' },
                { name: 'vx', type: 'int16' },
                { name: 'vy', type: 'int16' },
                { name: 'vz', type: 'int16' },
                { name: 'hdg', type: 'uint16' },
            ],
        },
        35: {
            name: 'RC_CHANNELS_RAW',
            // Wire order: time_boot_ms(uint32), chan1_raw..chan8_raw(uint16 x8), port(uint8), rssi(uint8)
            fields: [
                { name: 'time_boot_ms', type: 'uint32' },
                { name: 'chan1_raw', type: 'uint16' },
                { name: 'chan2_raw', type: 'uint16' },
                { name: 'chan3_raw', type: 'uint16' },
                { name: 'chan4_raw', type: 'uint16' },
                { name: 'chan5_raw', type: 'uint16' },
                { name: 'chan6_raw', type: 'uint16' },
                { name: 'chan7_raw', type: 'uint16' },
                { name: 'chan8_raw', type: 'uint16' },
                { name: 'port', type: 'uint8' },
                { name: 'rssi', type: 'uint8' },
            ],
        },
        36: {
            name: 'SERVO_OUTPUT_RAW',
            // Wire order: time_usec(uint32), servo1_raw..servo8_raw(uint16 x8), port(uint8)
            fields: [
                { name: 'time_usec', type: 'uint32' },
                { name: 'servo1_raw', type: 'uint16' },
                { name: 'servo2_raw', type: 'uint16' },
                { name: 'servo3_raw', type: 'uint16' },
                { name: 'servo4_raw', type: 'uint16' },
                { name: 'servo5_raw', type: 'uint16' },
                { name: 'servo6_raw', type: 'uint16' },
                { name: 'servo7_raw', type: 'uint16' },
                { name: 'servo8_raw', type: 'uint16' },
                { name: 'port', type: 'uint8' },
            ],
        },
        62: {
            name: 'NAV_CONTROLLER_OUTPUT',
            // Wire order: nav_roll(float), nav_pitch(float), alt_error(float), aspd_error(float), xtrack_error(float), nav_bearing(int16), target_bearing(int16), wp_dist(uint16)
            fields: [
                { name: 'nav_roll', type: 'float' },
                { name: 'nav_pitch', type: 'float' },
                { name: 'alt_error', type: 'float' },
                { name: 'aspd_error', type: 'float' },
                { name: 'xtrack_error', type: 'float' },
                { name: 'nav_bearing', type: 'int16' },
                { name: 'target_bearing', type: 'int16' },
                { name: 'wp_dist', type: 'uint16' },
            ],
        },
        74: {
            name: 'VFR_HUD',
            // Wire order: airspeed(float), groundspeed(float), alt(float), climb(float), heading(int16), throttle(uint16)
            fields: [
                { name: 'airspeed', type: 'float' },
                { name: 'groundspeed', type: 'float' },
                { name: 'alt', type: 'float' },
                { name: 'climb', type: 'float' },
                { name: 'heading', type: 'int16' },
                { name: 'throttle', type: 'uint16' },
            ],
        },
        253: {
            name: 'STATUSTEXT',
            // Wire order: severity(uint8), text(char[50])
            fields: [
                { name: 'severity', type: 'uint8' },
                { name: 'text', type: 'char', count: 50 },
            ],
        },
    };

    // Type sizes for reading
    static TYPE_SIZES = {
        uint8: 1, int8: 1,
        uint16: 2, int16: 2,
        uint32: 4, int32: 4,
        uint64: 8,
        float: 4,
        char: 1,
    };

    // MAV_TYPE enum (common values)
    static MAV_TYPES = {
        0: 'generic', 1: 'fixed_wing', 2: 'quadrotor', 3: 'coaxial',
        4: 'helicopter', 6: 'gcs', 10: 'ground_rover', 11: 'surface_boat',
        12: 'submarine', 13: 'hexarotor', 14: 'octorotor', 15: 'tricopter',
        20: 'vtol_tiltrotor', 21: 'vtol_tailsitter', 22: 'vtol_tiltrotor',
    };

    // ---------------------------------------------------------------
    //  Constructor
    // ---------------------------------------------------------------

    /**
     * @param {ArrayBuffer} buffer  - Raw .tlog file contents.
     * @param {object}      [opts]
     * @param {function}    [opts.onProgress] - Called with (percent, statusText).
     */
    constructor(buffer, opts = {}) {
        this.buffer = buffer;
        this.data = new Uint8Array(buffer);
        this.view = new DataView(buffer);
        this.length = buffer.byteLength;
        this.onProgress = opts.onProgress || null;

        // Parsed output
        this.messages = {};         // msgName -> { fields: {label: []}, count: number }
        this.parameters = {};       // param name -> value
        this.parameterList = [];    // [{name, value}]
        this.modes = [];            // [{mode, modeNum, timeUS, index}]
        this.textMessages = [];     // [{timeUS, message, severity}]
        this.trajectories = [];     // [{lat, lng, alt, timeUS, source}]
        this.attitudes = [];        // [{timeUS, roll, pitch, yaw}]

        this.totalMessages = 0;
        this.errors = [];

        // Tracking state
        this._firstTimestampUS = null;
        this._lastTimestampUS = null;
        this._lastHeartbeatMode = null;
        this._vehicleMavType = null;
        this._vehicleSysId = null;
    }

    // ---------------------------------------------------------------
    //  Public API
    // ---------------------------------------------------------------

    /**
     * Run the full parse. Returns a result object compatible with DataFlashParser.
     */
    parse() {
        const t0 = performance.now();

        this._reportProgress(0, 'Parsing MAVLink TLOG...');
        this._parseMessages();

        this._reportProgress(85, 'Extracting trajectories...');
        this._extractTrajectories();

        this._reportProgress(90, 'Extracting attitudes...');
        this._extractAttitudes();

        this._reportProgress(95, 'Extracting flight modes...');
        this._extractModes();

        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        this._reportProgress(100, `Done in ${elapsed}s`);

        return this._buildResult(elapsed);
    }

    // ---------------------------------------------------------------
    //  Main parse loop
    // ---------------------------------------------------------------

    _parseMessages() {
        const data = this.data;
        const len = this.length;
        let offset = 0;
        let count = 0;
        let errorCount = 0;
        const maxErrors = 10000; // safety limit to avoid infinite error loops

        const progressInterval = Math.max(1, Math.floor(len / 80));
        let nextProgressAt = progressInterval;

        while (offset < len) {
            // We need at least 8 (timestamp) + 1 (start byte) to peek
            if (offset + MavlinkParser.TIMESTAMP_SIZE + 1 > len) {
                break;
            }

            // Read 8-byte big-endian timestamp
            const timestampUS = this._readTimestampUS(offset);
            const msgStart = offset + MavlinkParser.TIMESTAMP_SIZE;

            const startByte = data[msgStart];

            let msgLen = 0;
            let parsed = false;

            if (startByte === MavlinkParser.MAVLINK_V1_START) {
                msgLen = this._tryParseV1(msgStart, timestampUS);
                if (msgLen > 0) {
                    parsed = true;
                    count++;
                }
            } else if (startByte === MavlinkParser.MAVLINK_V2_START) {
                msgLen = this._tryParseV2(msgStart, timestampUS);
                if (msgLen > 0) {
                    parsed = true;
                    count++;
                }
            }

            if (parsed) {
                offset = msgStart + msgLen;
                errorCount = 0;
            } else {
                // Sync error - try to find next valid timestamp + start byte
                offset = this._resync(offset + 1);
                errorCount++;
                if (errorCount > maxErrors) {
                    this.errors.push(`Stopped parsing after ${maxErrors} consecutive sync errors at offset ${offset}.`);
                    break;
                }
            }

            // Progress reporting
            if (offset >= nextProgressAt) {
                const pct = Math.round((offset / len) * 85);
                this._reportProgress(pct, `Parsed ${count} messages...`);
                nextProgressAt = offset + progressInterval;
            }
        }

        this.totalMessages = count;
    }

    /**
     * Attempt to parse a MAVLink v1 message at the given offset.
     * Returns total frame size on success, 0 on failure.
     */
    _tryParseV1(offset, timestampUS) {
        const data = this.data;
        const len = this.length;

        if (offset + MavlinkParser.V1_HEADER_SIZE > len) return 0;

        const payloadLen = data[offset + 1];
        const frameSize = payloadLen + MavlinkParser.V1_OVERHEAD;

        if (offset + frameSize > len) return 0; // truncated

        // const seq = data[offset + 2];
        const sysId = data[offset + 3];
        // const compId = data[offset + 4];
        const msgId = data[offset + 5];
        const payloadOffset = offset + MavlinkParser.V1_HEADER_SIZE;

        this._decodeAndStore(msgId, payloadOffset, payloadLen, timestampUS, sysId);

        return frameSize;
    }

    /**
     * Attempt to parse a MAVLink v2 message at the given offset.
     * Returns total frame size on success, 0 on failure.
     */
    _tryParseV2(offset, timestampUS) {
        const data = this.data;
        const len = this.length;

        if (offset + MavlinkParser.V2_HEADER_SIZE > len) return 0;

        const payloadLen = data[offset + 1];
        const incompatFlags = data[offset + 2];
        // const compatFlags = data[offset + 3];
        // const seq = data[offset + 4];
        const sysId = data[offset + 5];
        // const compId = data[offset + 6];

        // 3-byte little-endian message ID
        const msgId = data[offset + 7] | (data[offset + 8] << 8) | (data[offset + 9] << 16);

        let frameSize = payloadLen + MavlinkParser.V2_OVERHEAD;
        if (incompatFlags & MavlinkParser.IFLAG_SIGNED) {
            frameSize += MavlinkParser.V2_SIGNATURE_SIZE;
        }

        if (offset + frameSize > len) return 0; // truncated

        const payloadOffset = offset + MavlinkParser.V2_HEADER_SIZE;

        this._decodeAndStore(msgId, payloadOffset, payloadLen, timestampUS, sysId);

        return frameSize;
    }

    // ---------------------------------------------------------------
    //  Message decoding and storage
    // ---------------------------------------------------------------

    /**
     * Decode a MAVLink message payload and store fields in columnar format.
     */
    _decodeAndStore(msgId, payloadOffset, payloadLen, timestampUS, sysId) {
        // Track timestamps
        if (this._firstTimestampUS === null) {
            this._firstTimestampUS = timestampUS;
        }
        this._lastTimestampUS = timestampUS;

        const def = MavlinkParser.MSG_DEFS[msgId];
        if (!def) {
            // Unknown message - store raw info under a generic name
            this._storeUnknownMessage(msgId, timestampUS);
            return;
        }

        const name = def.name;

        // Lazily initialise columnar storage
        if (!this.messages[name]) {
            const fields = { TimeUS: [] };
            for (const f of def.fields) {
                fields[f.name] = [];
            }
            this.messages[name] = { fields, count: 0 };
        }

        const msg = this.messages[name];
        const fields = msg.fields;

        // Always store the TLOG timestamp
        fields['TimeUS'].push(timestampUS);

        // Decode each field from the payload
        let pos = payloadOffset;
        const endPos = payloadOffset + payloadLen;

        for (const fieldDef of def.fields) {
            if (pos >= endPos) {
                // MAVLink v2 allows truncated trailing zero bytes; fill with default
                if (fieldDef.type === 'char') {
                    fields[fieldDef.name].push('');
                } else {
                    fields[fieldDef.name].push(0);
                }
                continue;
            }

            if (fieldDef.type === 'char') {
                const charCount = fieldDef.count || 1;
                const readLen = Math.min(charCount, endPos - pos);
                fields[fieldDef.name].push(this._readString(pos, readLen));
                pos += charCount;
            } else {
                const size = MavlinkParser.TYPE_SIZES[fieldDef.type];
                if (pos + size > endPos) {
                    // Truncated field - zero fill
                    fields[fieldDef.name].push(0);
                    pos = endPos;
                    continue;
                }
                fields[fieldDef.name].push(this._readField(fieldDef.type, pos));
                pos += size;
            }
        }

        msg.count++;

        // Handle special messages inline
        this._handleSpecialMessage(name, fields, msg.count - 1, timestampUS, sysId);
    }

    /**
     * Store a count for unknown message IDs so they show up in messageTypes.
     */
    _storeUnknownMessage(msgId, timestampUS) {
        const name = `MAVMSG_${msgId}`;
        if (!this.messages[name]) {
            this.messages[name] = { fields: { TimeUS: [] }, count: 0 };
        }
        this.messages[name].fields['TimeUS'].push(timestampUS);
        this.messages[name].count++;
    }

    /**
     * Handle special messages inline during parsing.
     */
    _handleSpecialMessage(name, fields, idx, timestampUS, sysId) {
        switch (name) {
            case 'HEARTBEAT': {
                // Skip GCS heartbeats (type 6 = MAV_TYPE_GCS)
                const mavType = fields['type'][idx];
                if (mavType === 6) break;

                // Track vehicle type from the first non-GCS heartbeat
                if (this._vehicleMavType === null) {
                    this._vehicleMavType = mavType;
                    this._vehicleSysId = sysId;
                }

                // Only track modes from the identified vehicle
                if (sysId === this._vehicleSysId) {
                    const customMode = fields['custom_mode'][idx];
                    if (customMode !== this._lastHeartbeatMode) {
                        this._lastHeartbeatMode = customMode;
                        // Mode will be extracted in _extractModes from stored data
                    }
                }
                break;
            }
            case 'PARAM_VALUE': {
                const paramId = fields['param_id'][idx];
                const paramValue = fields['param_value'][idx];
                if (paramId) {
                    this.parameters[paramId] = paramValue;
                    this.parameterList.push({ name: paramId, value: paramValue });
                }
                break;
            }
            case 'STATUSTEXT': {
                const severity = fields['severity'][idx];
                const text = fields['text'][idx];
                this.textMessages.push({
                    timeUS: timestampUS,
                    message: text,
                    severity: severity,
                });
                break;
            }
            default:
                break;
        }
    }

    // ---------------------------------------------------------------
    //  Post-processing: trajectories, attitudes, modes
    // ---------------------------------------------------------------

    _extractTrajectories() {
        const trajectories = this.trajectories;

        // Primary: GLOBAL_POSITION_INT (already fused by the autopilot)
        const gpi = this.messages['GLOBAL_POSITION_INT'];
        if (gpi) {
            const f = gpi.fields;
            const lat = f['lat'];
            const lon = f['lon'];
            const alt = f['alt'];
            const timeUS = f['TimeUS'];
            if (lat && lon) {
                for (let i = 0; i < lat.length; i++) {
                    // lat/lon are in degE7, alt in mm
                    const latDeg = lat[i] * 1e-7;
                    const lonDeg = lon[i] * 1e-7;
                    if (latDeg === 0 && lonDeg === 0) continue;
                    trajectories.push({
                        lat: latDeg,
                        lng: lonDeg,
                        alt: alt ? alt[i] / 1000.0 : 0,
                        timeUS: timeUS ? timeUS[i] : 0,
                        source: 'GLOBAL_POSITION_INT',
                    });
                }
            }
        }

        // Fallback: GPS_RAW_INT
        if (trajectories.length === 0) {
            const gps = this.messages['GPS_RAW_INT'];
            if (gps) {
                const f = gps.fields;
                const lat = f['lat'];
                const lon = f['lon'];
                const alt = f['alt'];
                const fixType = f['fix_type'];
                const timeUS = f['TimeUS'];
                if (lat && lon) {
                    for (let i = 0; i < lat.length; i++) {
                        // Only 3D fix or better
                        if (fixType && fixType[i] < 3) continue;
                        const latDeg = lat[i] * 1e-7;
                        const lonDeg = lon[i] * 1e-7;
                        if (latDeg === 0 && lonDeg === 0) continue;
                        trajectories.push({
                            lat: latDeg,
                            lng: lonDeg,
                            alt: alt ? alt[i] / 1000.0 : 0,
                            timeUS: timeUS ? timeUS[i] : 0,
                            source: 'GPS_RAW_INT',
                        });
                    }
                }
            }
        }
    }

    _extractAttitudes() {
        const att = this.messages['ATTITUDE'];
        if (!att) return;
        const f = att.fields;
        const timeUS = f['TimeUS'];
        const roll = f['roll'];
        const pitch = f['pitch'];
        const yaw = f['yaw'];
        if (!roll) return;

        for (let i = 0; i < roll.length; i++) {
            this.attitudes.push({
                timeUS:  timeUS ? timeUS[i] : 0,
                // Convert radians to degrees for consistency with DataFlash ATT
                roll:    roll[i]  * (180 / Math.PI),
                pitch:   pitch  ? pitch[i]  * (180 / Math.PI) : 0,
                yaw:     yaw    ? yaw[i]    * (180 / Math.PI) : 0,
                desRoll:  0,
                desPitch: 0,
                desYaw:   0,
            });
        }
    }

    _extractModes() {
        const hb = this.messages['HEARTBEAT'];
        if (!hb) return;

        const f = hb.fields;
        const customMode = f['custom_mode'];
        const mavType = f['type'];
        const timeUS = f['TimeUS'];
        if (!customMode) return;

        let lastMode = null;
        for (let i = 0; i < customMode.length; i++) {
            // Skip GCS heartbeats
            if (mavType && mavType[i] === 6) continue;

            const mode = customMode[i];
            if (mode !== lastMode) {
                lastMode = mode;
                this.modes.push({
                    timeUS: timeUS ? timeUS[i] : 0,
                    mode: this._modeName(mode),
                    modeNum: mode,
                    index: this.modes.length,
                });
            }
        }
    }

    /**
     * Convert ArduPilot custom_mode number to a human-readable name.
     * This depends on vehicle type; we use common ArduCopter/ArduPlane mappings.
     */
    _modeName(modeNum) {
        // ArduCopter modes
        const copterModes = {
            0: 'STABILIZE', 1: 'ACRO', 2: 'ALT_HOLD', 3: 'AUTO',
            4: 'GUIDED', 5: 'LOITER', 6: 'RTL', 7: 'CIRCLE',
            9: 'LAND', 11: 'DRIFT', 13: 'SPORT', 14: 'FLIP',
            15: 'AUTOTUNE', 16: 'POSHOLD', 17: 'BRAKE', 18: 'THROW',
            19: 'AVOID_ADSB', 20: 'GUIDED_NOGPS', 21: 'SMART_RTL',
            22: 'FLOWHOLD', 23: 'FOLLOW', 24: 'ZIGZAG', 25: 'SYSTEMID',
            26: 'AUTOROTATE', 27: 'AUTO_RTL',
        };

        // ArduPlane modes
        const planeModes = {
            0: 'MANUAL', 1: 'CIRCLE', 2: 'STABILIZE', 3: 'TRAINING',
            4: 'ACRO', 5: 'FBWA', 6: 'FBWB', 7: 'CRUISE',
            8: 'AUTOTUNE', 10: 'AUTO', 11: 'RTL', 12: 'LOITER',
            13: 'TAKEOFF', 14: 'AVOID_ADSB', 15: 'GUIDED', 17: 'QSTABILIZE',
            18: 'QHOVER', 19: 'QLOITER', 20: 'QLAND', 21: 'QRTL',
            22: 'QAUTOTUNE', 23: 'QACRO', 24: 'THERMAL',
        };

        // ArduRover modes
        const roverModes = {
            0: 'MANUAL', 1: 'ACRO', 3: 'STEERING', 4: 'HOLD',
            5: 'LOITER', 6: 'FOLLOW', 7: 'SIMPLE', 10: 'AUTO',
            11: 'RTL', 12: 'SMART_RTL', 15: 'GUIDED',
        };

        // Pick mode table based on detected vehicle type
        const vType = this._vehicleMavType;
        let table;
        if (vType === 1) {
            table = planeModes;
        } else if (vType === 10 || vType === 11) {
            table = roverModes;
        } else {
            // Default to copter (most common)
            table = copterModes;
        }

        return table[modeNum] || `MODE_${modeNum}`;
    }

    // ---------------------------------------------------------------
    //  Resync
    // ---------------------------------------------------------------

    /**
     * Find the next offset that looks like a valid TLOG entry:
     * 8-byte timestamp followed by 0xFE or 0xFD.
     */
    _resync(offset) {
        const data = this.data;
        const len = this.length;

        for (let i = offset; i < len - MavlinkParser.TIMESTAMP_SIZE; i++) {
            const startByte = data[i + MavlinkParser.TIMESTAMP_SIZE];
            if (startByte === MavlinkParser.MAVLINK_V1_START ||
                startByte === MavlinkParser.MAVLINK_V2_START) {
                // Quick sanity: check that the timestamp is reasonable
                // (non-zero, and the payload length byte exists)
                if (i + MavlinkParser.TIMESTAMP_SIZE + 2 <= len) {
                    const payloadLen = data[i + MavlinkParser.TIMESTAMP_SIZE + 1];
                    if (payloadLen <= 255) {
                        return i;
                    }
                }
            }
        }
        return len; // EOF
    }

    // ---------------------------------------------------------------
    //  Result builder
    // ---------------------------------------------------------------

    _buildResult(elapsed) {
        const startUS = this._firstTimestampUS || 0;
        const endUS = this._lastTimestampUS || 0;

        // Message type summary
        const messageTypes = {};
        for (const name in this.messages) {
            messageTypes[name] = {
                count: this.messages[name].count,
                labels: Object.keys(this.messages[name].fields),
            };
        }

        // Build synthetic formats and formatsByName for compatibility
        const formats = {};
        const formatsByName = {};
        let fmtIdx = 0;
        for (const name in this.messages) {
            const labels = Object.keys(this.messages[name].fields);
            const def = {
                type: fmtIdx,
                length: 0,
                name: name,
                format: '',
                labels: labels,
            };
            formats[fmtIdx] = def;
            formatsByName[name] = def;
            fmtIdx++;
        }

        const vehicleType = this._guessVehicleType();

        return {
            type: 'mavlink',
            totalMessages: this.totalMessages,
            parseTime: elapsed,
            fileSize: this.length,
            timeRange: {
                startUS: startUS,
                endUS: endUS,
                durationS: (endUS - startUS) / 1e6,
            },
            vehicleType,
            formats,
            formatsByName,
            fmtUnits: {},
            messageTypes,
            messages: this.messages,
            parameters: this.parameters,
            parameterList: this.parameterList,
            modes: this.modes,
            textMessages: this.textMessages,
            missions: [],
            events: [],
            trajectories: this.trajectories,
            attitudes: this.attitudes,
            errors: this.errors,
        };
    }

    _guessVehicleType() {
        const vType = this._vehicleMavType;
        if (vType === null) return 'unknown';

        // Fixed-wing types
        if (vType === 1) return 'plane';

        // Rotorcraft types
        if (vType === 2 || vType === 3 || vType === 4 ||
            vType === 13 || vType === 14 || vType === 15) return 'copter';

        // Ground vehicles
        if (vType === 10 || vType === 11) return 'rover';

        // Submarine
        if (vType === 12) return 'sub';

        // VTOL types
        if (vType >= 19 && vType <= 22) return 'plane';

        // Also check parameters
        if (this.parameters['Q_ENABLE'] !== undefined) return 'plane';
        if (this.parameters['FRAME_CLASS'] !== undefined) return 'copter';

        return MavlinkParser.MAV_TYPES[vType] || 'unknown';
    }

    // ---------------------------------------------------------------
    //  Low-level read helpers
    // ---------------------------------------------------------------

    /**
     * Read an 8-byte big-endian timestamp (microseconds since epoch).
     */
    _readTimestampUS(offset) {
        const view = this.view;
        const hi = view.getUint32(offset, false);     // big-endian
        const lo = view.getUint32(offset + 4, false);  // big-endian
        return hi * 0x100000000 + lo;
    }

    /**
     * Read a typed field from the payload (little-endian).
     */
    _readField(type, offset) {
        const view = this.view;
        const LE = true;
        switch (type) {
            case 'uint8':  return view.getUint8(offset);
            case 'int8':   return view.getInt8(offset);
            case 'uint16': return view.getUint16(offset, LE);
            case 'int16':  return view.getInt16(offset, LE);
            case 'uint32': return view.getUint32(offset, LE);
            case 'int32':  return view.getInt32(offset, LE);
            case 'float':  return view.getFloat32(offset, LE);
            case 'uint64': {
                const lo = view.getUint32(offset, LE);
                const hi = view.getUint32(offset + 4, LE);
                return hi * 0x100000000 + lo;
            }
            default:
                return 0;
        }
    }

    /**
     * Read a null-terminated ASCII string from a fixed-length buffer.
     */
    _readString(offset, maxLen) {
        const data = this.data;
        let end = offset;
        const limit = Math.min(offset + maxLen, this.length);
        while (end < limit && data[end] !== 0) {
            end++;
        }
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
}
