/**
 * Web Worker for log parsing.
 *
 * Accepts messages of the form:
 *   { action: 'parse', buffer: ArrayBuffer, filename: string, logType: string }
 *
 * Posts back:
 *   { type: 'progress', percent: number, status: string }
 *   { type: 'result', data: object }
 *   { type: 'error', message: string }
 *
 * logType is one of 'dataflash' or 'mavlink'.
 * If logType is 'auto' or omitted the worker will guess from the first bytes / filename.
 */

// Import parsers (paths relative to the worker file location)
importScripts('../parsers/dataflash.js');
importScripts('../parsers/mavlink.js');

self.onmessage = function (e) {
    const msg = e.data;

    if (msg.action !== 'parse') {
        self.postMessage({ type: 'error', message: `Unknown action: ${msg.action}` });
        return;
    }

    const { buffer, filename } = msg;
    let logType = msg.logType || 'auto';

    if (!buffer || !(buffer instanceof ArrayBuffer)) {
        self.postMessage({ type: 'error', message: 'No ArrayBuffer provided.' });
        return;
    }

    // Auto-detect log type
    if (logType === 'auto') {
        logType = detectLogType(buffer, filename || '');
    }

    const onProgress = (percent, status) => {
        self.postMessage({ type: 'progress', percent, status });
    };

    try {
        let parser;
        if (logType === 'mavlink') {
            parser = new MavlinkParser(buffer, { onProgress });
        } else {
            parser = new DataFlashParser(buffer, { onProgress });
        }

        const result = parser.parse();
        self.postMessage({ type: 'result', data: result });

    } catch (err) {
        self.postMessage({
            type: 'error',
            message: err.message || String(err),
            stack: err.stack || '',
        });
    }
};

/**
 * Guess log type from magic bytes and filename extension.
 * DataFlash .BIN files start with 0xA3 0x95.
 * MAVLink .tlog files start with 0xFE (v1) or 0xFD (v2).
 */
function detectLogType(buffer, filename) {
    // Check extension first
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (ext === 'tlog') return 'mavlink';
    if (ext === 'bin' || ext === 'log') return 'dataflash';

    // Fall back to magic bytes
    if (buffer.byteLength >= 2) {
        const header = new Uint8Array(buffer, 0, 2);
        if (header[0] === 0xA3 && header[1] === 0x95) return 'dataflash';
        if (header[0] === 0xFE || header[0] === 0xFD) return 'mavlink';
    }

    // Default to DataFlash
    return 'dataflash';
}
