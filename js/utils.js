/**
 * Utility functions
 */
const Utils = {
    degrees(rad) {
        return rad * 57.29577951308232;
    },

    radians(deg) {
        return deg * 0.017453292519943295;
    },

    kmh(ms) {
        return ms * 3.6;
    },

    /**
     * Barometric altitude calculation
     */
    altitude(press, gndPress, gndTemp) {
        const scaling = press / gndPress;
        const temp = gndTemp + 273.15;
        return temp * (1 - Math.pow(scaling, 0.190284)) / 0.0065;
    },

    /**
     * Format time in microseconds to mm:ss or hh:mm:ss
     */
    formatTime(timeUs) {
        const seconds = Math.floor(timeUs / 1e6);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${m}:${String(s).padStart(2, '0')}`;
    },

    /**
     * Format timestamp to readable date/time
     */
    formatTimestamp(epochMs) {
        if (!epochMs) return '';
        const d = new Date(epochMs);
        return d.toISOString().replace('T', ' ').slice(0, 19);
    },

    /**
     * Binary search for nearest index in sorted array
     */
    binarySearch(arr, target) {
        let lo = 0, hi = arr.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            if (arr[mid] < target) lo = mid + 1;
            else if (arr[mid] > target) hi = mid - 1;
            else return mid;
        }
        if (lo >= arr.length) return arr.length - 1;
        if (hi < 0) return 0;
        return (target - arr[hi] < arr[lo] - target) ? hi : lo;
    },

    /**
     * Throttle function execution
     */
    throttle(fn, delay) {
        let last = 0;
        let timer = null;
        return function (...args) {
            const now = Date.now();
            if (now - last >= delay) {
                last = now;
                fn.apply(this, args);
            } else {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    last = Date.now();
                    fn.apply(this, args);
                }, delay - (now - last));
            }
        };
    },

    /**
     * Debounce function execution
     */
    debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * 3x3 Matrix operations for attitude calculations
     */
    Matrix3x3: class {
        constructor(data) {
            this.data = data || [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ];
        }

        static fromEuler(roll, pitch, yaw) {
            const cr = Math.cos(roll), sr = Math.sin(roll);
            const cp = Math.cos(pitch), sp = Math.sin(pitch);
            const cy = Math.cos(yaw), sy = Math.sin(yaw);
            return new Utils.Matrix3x3([
                [cp * cy, sr * sp * cy - cr * sy, cr * sp * cy + sr * sy],
                [cp * sy, sr * sp * sy + cr * cy, cr * sp * sy - sr * cy],
                [-sp, sr * cp, cr * cp]
            ]);
        }

        multiply(other) {
            const a = this.data, b = other.data;
            const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    for (let k = 0; k < 3; k++) {
                        result[i][j] += a[i][k] * b[k][j];
                    }
                }
            }
            return new Utils.Matrix3x3(result);
        }

        transposed() {
            const d = this.data;
            return new Utils.Matrix3x3([
                [d[0][0], d[1][0], d[2][0]],
                [d[0][1], d[1][1], d[2][1]],
                [d[0][2], d[1][2], d[2][2]]
            ]);
        }
    }
};

// Make utility functions available globally for expressions
window.degrees = Utils.degrees;
window.radians = Utils.radians;
window.kmh = Utils.kmh;
window.altitude = Utils.altitude;
window.sqrt = Math.sqrt;
window.abs = Math.abs;
window.min = Math.min;
window.max = Math.max;
window.pow = Math.pow;
window.log = Math.log;
window.log10 = Math.log10;
window.sin = Math.sin;
window.cos = Math.cos;
window.tan = Math.tan;
window.atan2 = Math.atan2;
window.getParam = function(name, defaultVal) {
    const val = State.params[name];
    return val !== undefined ? val : (defaultVal !== undefined ? defaultVal : 0);
};
window.mag_heading = function(magX, magY, magZ, roll, pitch, yaw) {
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const headX = magX * cp + magY * sr * sp + magZ * cr * sp;
    const headY = magY * cr - magZ * sr;
    return Utils.degrees(Math.atan2(-headY, headX));
};
