/**
 * MAVLink log parser (stub).
 *
 * MAVLink .tlog files use a different framing protocol.
 * This stub provides the same interface as DataFlashParser so the
 * worker and application code can treat both log types uniformly.
 */

// eslint-disable-next-line no-unused-vars
class MavlinkParser {

    /**
     * @param {ArrayBuffer} buffer  - Raw .tlog file contents.
     * @param {object}      [opts]
     * @param {function}    [opts.onProgress] - Called with (percent, statusText).
     */
    constructor(buffer, opts = {}) {
        this.buffer = buffer;
        this.length = buffer.byteLength;
        this.onProgress = opts.onProgress || null;
    }

    /**
     * Parse the MAVLink log.
     * @returns {object} Parsed result (same shape as DataFlashParser where applicable).
     */
    parse() {
        if (this.onProgress) {
            this.onProgress(0, 'MAVLink parsing not yet implemented');
        }

        // Return a minimal result object that matches the DataFlash shape
        // so downstream code does not crash.
        if (this.onProgress) {
            this.onProgress(100, 'MAVLink parsing not yet implemented');
        }

        return {
            type: 'mavlink',
            totalMessages: 0,
            parseTime: '0',
            fileSize: this.length,
            timeRange: { startUS: 0, endUS: 0, durationS: 0 },
            vehicleType: 'unknown',
            formats: {},
            formatsByName: {},
            fmtUnits: {},
            messageTypes: {},
            messages: {},
            parameters: {},
            parameterList: [],
            modes: [],
            textMessages: [],
            missions: [],
            events: [],
            trajectories: [],
            attitudes: [],
            errors: ['MAVLink (.tlog) parsing is not yet implemented.'],
        };
    }
}
