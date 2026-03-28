/**
 * ArduPilot flight mode definitions and color mapping
 */
const FlightModes = {
    // Copter modes
    copter: {
        0: 'Stabilize',
        1: 'Acro',
        2: 'AltHold',
        3: 'Auto',
        4: 'Guided',
        5: 'Loiter',
        6: 'RTL',
        7: 'Circle',
        9: 'Land',
        11: 'Drift',
        13: 'Sport',
        14: 'Flip',
        15: 'AutoTune',
        16: 'PosHold',
        17: 'Brake',
        18: 'Throw',
        19: 'Avoid_ADSB',
        20: 'Guided_NoGPS',
        21: 'Smart_RTL',
        22: 'FlowHold',
        23: 'Follow',
        24: 'ZigZag',
        25: 'SystemID',
        26: 'Heli_Autorotate',
        27: 'Auto RTL'
    },

    // Plane modes
    plane: {
        0: 'Manual',
        1: 'Circle',
        2: 'Stabilize',
        3: 'Training',
        4: 'Acro',
        5: 'FBWA',
        6: 'FBWB',
        7: 'Cruise',
        8: 'Autotune',
        10: 'Auto',
        11: 'RTL',
        12: 'Loiter',
        13: 'Takeoff',
        14: 'Avoid_ADSB',
        15: 'Guided',
        17: 'QStabilize',
        18: 'QHover',
        19: 'QLoiter',
        20: 'QLand',
        21: 'QRTL',
        22: 'QAutotune',
        23: 'QAcro',
        24: 'Thermal',
        25: 'Loiter to QLand'
    },

    // Rover modes
    rover: {
        0: 'Manual',
        1: 'Acro',
        3: 'Steering',
        4: 'Hold',
        5: 'Loiter',
        6: 'Follow',
        7: 'Simple',
        8: 'Dock',
        10: 'Auto',
        11: 'RTL',
        12: 'SmartRTL',
        15: 'Guided'
    },

    // Sub modes
    sub: {
        0: 'Stabilize',
        1: 'Acro',
        2: 'AltHold',
        3: 'Auto',
        4: 'Guided',
        7: 'Circle',
        9: 'Surface',
        16: 'PosHold',
        19: 'Manual',
        21: 'Surftrak'
    },

    // Color palette for modes
    _colorPalette: [
        '#4fc3f7', '#ff7043', '#66bb6a', '#ab47bc', '#ffa726',
        '#26c6da', '#ef5350', '#8d6e63', '#78909c', '#d4e157',
        '#5c6bc0', '#29b6f6', '#ec407a', '#26a69a', '#ffca28',
        '#7e57c2', '#42a5f5', '#ff8a65', '#9ccc65', '#ba68c8'
    ],

    _modeColorMap: {},

    /**
     * Detect vehicle type from parameters or messages
     */
    detectVehicleType(params, formats) {
        // Check FRAME_CLASS parameter (copter)
        if (params && params['FRAME_CLASS'] !== undefined) return 'copter';
        // Check specific format messages
        if (formats) {
            if (formats['RCOU'] || formats['RCOUT']) {
                if (params && params['MIXING_GAIN'] !== undefined) return 'plane';
                if (params && params['MOT_PWM_TYPE'] !== undefined) return 'copter';
            }
        }
        // Default to copter
        return 'copter';
    },

    /**
     * Get mode name from mode number
     */
    getModeName(modeNum, vehicleType) {
        const modes = this[vehicleType || 'copter'] || this.copter;
        return modes[modeNum] || `Mode ${modeNum}`;
    },

    /**
     * Get consistent color for a mode
     */
    getModeColor(modeName) {
        if (!this._modeColorMap[modeName]) {
            const idx = Object.keys(this._modeColorMap).length % this._colorPalette.length;
            this._modeColorMap[modeName] = this._colorPalette[idx];
        }
        return this._modeColorMap[modeName];
    },

    /**
     * Process flight mode changes array from parser
     */
    processFlightModes(modeChanges, vehicleType) {
        this._modeColorMap = {};
        return modeChanges.map(m => {
            const name = this.getModeName(m.mode, vehicleType);
            return {
                ...m,
                name: name,
                color: this.getModeColor(name)
            };
        });
    }
};
