/**
 * Predefined graph definitions for common ArduPilot log analysis
 */
const GraphDefinitions = {
    _definitions: {
        'Speed': [
            {
                name: 'Ground vs Air Speed',
                expressions: ['GPS.Spd', 'ARSP.Airspeed'],
            },
            {
                name: 'Ground Speed',
                expressions: ['GPS.Spd'],
            }
        ],
        'Attitude': [
            {
                name: 'Roll and Pitch',
                expressions: ['ATT.Roll', 'ATT.Pitch'],
            },
            {
                name: 'RP Comparison',
                expressions: ['ATT.Roll', 'ATT.DesRoll', 'ATT.Pitch', 'ATT.DesPitch'],
            },
            {
                name: 'Yaw',
                expressions: ['ATT.Yaw', 'ATT.DesYaw'],
            },
            {
                name: 'Roll Control',
                expressions: ['ATT.Roll', 'ATT.DesRoll'],
            },
            {
                name: 'Pitch Control',
                expressions: ['ATT.Pitch', 'ATT.DesPitch'],
            }
        ],
        'Sensors/Accelerometer': [
            {
                name: 'Accelerometer 1',
                expressions: ['IMU.AccX', 'IMU.AccY', 'IMU.AccZ'],
            },
            {
                name: 'Accelerometer 2',
                expressions: ['IMU2.AccX', 'IMU2.AccY', 'IMU2.AccZ'],
            },
            {
                name: 'Vibration',
                expressions: ['VIBE.VibeX', 'VIBE.VibeY', 'VIBE.VibeZ'],
            },
            {
                name: 'Clipping',
                expressions: ['VIBE.Clip0', 'VIBE.Clip1', 'VIBE.Clip2'],
            }
        ],
        'Sensors/Gyroscope': [
            {
                name: 'Gyro 1',
                expressions: ['IMU.GyrX', 'IMU.GyrY', 'IMU.GyrZ'],
            },
            {
                name: 'Gyro 2',
                expressions: ['IMU2.GyrX', 'IMU2.GyrY', 'IMU2.GyrZ'],
            }
        ],
        'Sensors/Barometer': [
            {
                name: 'Barometer 1',
                expressions: ['BARO.Alt', 'BARO.Press'],
            },
            {
                name: 'Barometer 2',
                expressions: ['BAR2.Alt', 'BAR2.Press'],
            },
            {
                name: 'Barometer Comparison',
                expressions: ['BARO.Alt', 'BAR2.Alt'],
            }
        ],
        'Sensors/Compass': [
            {
                name: 'Compass 1',
                expressions: ['MAG.MagX', 'MAG.MagY', 'MAG.MagZ'],
            },
            {
                name: 'Compass 2',
                expressions: ['MAG2.MagX', 'MAG2.MagY', 'MAG2.MagZ'],
            },
            {
                name: 'Compass vs Yaw',
                expressions: ['ATT.Yaw', 'MAG.MagX'],
            }
        ],
        'Sensors/Lidar': [
            {
                name: 'Rangefinder vs Baro',
                expressions: ['RFND.Dist1', 'BARO.Alt'],
            }
        ],
        'GPS': [
            {
                name: 'GPS Status',
                expressions: ['GPS.Status', 'GPS.NSats'],
            },
            {
                name: 'GPS HDop',
                expressions: ['GPS.HDop'],
            },
            {
                name: 'GPS Altitude',
                expressions: ['GPS.Alt'],
            },
            {
                name: 'GPS Speed',
                expressions: ['GPS.Spd'],
            }
        ],
        'Power': [
            {
                name: 'Battery Voltage',
                expressions: ['BAT.Volt'],
            },
            {
                name: 'Battery Current',
                expressions: ['BAT.Curr'],
            },
            {
                name: 'Battery Consumed',
                expressions: ['BAT.CurrTot'],
            },
            {
                name: 'Board Voltage',
                expressions: ['POWR.Vcc'],
            }
        ],
        'RC': [
            {
                name: 'RC Input 1-4',
                expressions: ['RCIN.C1', 'RCIN.C2', 'RCIN.C3', 'RCIN.C4'],
            },
            {
                name: 'RC Input 5-8',
                expressions: ['RCIN.C5', 'RCIN.C6', 'RCIN.C7', 'RCIN.C8'],
            },
            {
                name: 'RC Output 1-4',
                expressions: ['RCOU.C1', 'RCOU.C2', 'RCOU.C3', 'RCOU.C4'],
            },
            {
                name: 'RC Output 5-8',
                expressions: ['RCOU.C5', 'RCOU.C6', 'RCOU.C7', 'RCOU.C8'],
            }
        ],
        'Servos': [
            {
                name: 'Servos 1-4',
                expressions: ['RCOU.C1', 'RCOU.C2', 'RCOU.C3', 'RCOU.C4'],
            },
            {
                name: 'Servos 1-8',
                expressions: ['RCOU.C1', 'RCOU.C2', 'RCOU.C3', 'RCOU.C4', 'RCOU.C5', 'RCOU.C6', 'RCOU.C7', 'RCOU.C8'],
            }
        ],
        'EKF2': [
            {
                name: 'EKF2 Velocity Innovations',
                expressions: ['NKF1.IVN', 'NKF1.IVE', 'NKF1.IVD'],
            },
            {
                name: 'EKF2 Position Innovations',
                expressions: ['NKF1.IPN', 'NKF1.IPE', 'NKF1.IPD'],
            },
            {
                name: 'EKF2 Mag Innovations',
                expressions: ['NKF2.IMX', 'NKF2.IMY', 'NKF2.IMZ'],
            },
            {
                name: 'EKF2 Gyro Bias',
                expressions: ['NKF1.GyrX', 'NKF1.GyrY', 'NKF1.GyrZ'],
            },
            {
                name: 'EKF2 Accel Bias',
                expressions: ['NKF3.AccBX', 'NKF3.AccBY', 'NKF3.AccBZ'],
            },
            {
                name: 'EKF2 Wind',
                expressions: ['NKF3.WindN', 'NKF3.WindE'],
            },
            {
                name: 'EKF2 Euler Roll',
                expressions: ['NKF1.Roll'],
            },
            {
                name: 'EKF2 Euler Pitch',
                expressions: ['NKF1.Pitch'],
            },
            {
                name: 'EKF2 Euler Yaw',
                expressions: ['NKF1.Yaw'],
            }
        ],
        'EKF3': [
            {
                name: 'EKF3 Velocity Innovations',
                expressions: ['XKF1.IVN', 'XKF1.IVE', 'XKF1.IVD'],
            },
            {
                name: 'EKF3 Position Innovations',
                expressions: ['XKF1.IPN', 'XKF1.IPE', 'XKF1.IPD'],
            },
            {
                name: 'EKF3 Mag Innovations',
                expressions: ['XKF2.IMX', 'XKF2.IMY', 'XKF2.IMZ'],
            },
            {
                name: 'EKF3 Gyro Bias',
                expressions: ['XKF1.GyrX', 'XKF1.GyrY', 'XKF1.GyrZ'],
            },
            {
                name: 'EKF3 Accel Bias',
                expressions: ['XKF3.AccBX', 'XKF3.AccBY', 'XKF3.AccBZ'],
            },
            {
                name: 'EKF3 Wind',
                expressions: ['XKF3.WindN', 'XKF3.WindE'],
            },
            {
                name: 'EKF3 Solution Status',
                expressions: ['XKF4.SS'],
            }
        ],
        'PID/Copter': [
            {
                name: 'Rate Roll PID',
                expressions: ['PIDR.P', 'PIDR.I', 'PIDR.D', 'PIDR.Tar', 'PIDR.Act'],
            },
            {
                name: 'Rate Pitch PID',
                expressions: ['PIDP.P', 'PIDP.I', 'PIDP.D', 'PIDP.Tar', 'PIDP.Act'],
            },
            {
                name: 'Rate Yaw PID',
                expressions: ['PIDY.P', 'PIDY.I', 'PIDY.D', 'PIDY.Tar', 'PIDY.Act'],
            },
            {
                name: 'Altitude PID',
                expressions: ['PIDA.P', 'PIDA.I', 'PIDA.D', 'PIDA.Tar', 'PIDA.Act'],
            },
            {
                name: 'Desired vs Achieved Roll',
                expressions: ['ATT.DesRoll', 'ATT.Roll'],
            },
            {
                name: 'Desired vs Achieved Pitch',
                expressions: ['ATT.DesPitch', 'ATT.Pitch'],
            },
            {
                name: 'Desired vs Achieved Yaw',
                expressions: ['ATT.DesYaw', 'ATT.Yaw'],
            }
        ],
        'PID/Plane': [
            {
                name: 'Pitch Controller',
                expressions: ['PIDP.P', 'PIDP.I', 'PIDP.D', 'PIDP.Tar', 'PIDP.Act'],
            },
            {
                name: 'Roll Controller',
                expressions: ['PIDR.P', 'PIDR.I', 'PIDR.D', 'PIDR.Tar', 'PIDR.Act'],
            }
        ],
        'TECS': [
            {
                name: 'TECS Height',
                expressions: ['TECS.h', 'TECS.dh'],
            },
            {
                name: 'TECS Speed',
                expressions: ['TECS.sp', 'TECS.dsp'],
            }
        ],
        'Altitude': [
            {
                name: 'All Altitudes',
                expressions: ['GPS.Alt', 'BARO.Alt', 'CTUN.Alt'],
            },
            {
                name: 'GPS vs Baro',
                expressions: ['GPS.Alt', 'BARO.Alt'],
            },
            {
                name: 'Desired vs Actual',
                expressions: ['CTUN.DAlt', 'CTUN.Alt'],
            }
        ],
        'Position': [
            {
                name: 'Position XY',
                expressions: ['POS.Lat', 'POS.Lng'],
            },
            {
                name: 'Position vs EKF',
                expressions: ['POS.Lat', 'XKF1.PN'],
            }
        ],
        'Radio': [
            {
                name: 'RSSI',
                expressions: ['RAD.RSSI', 'RAD.RemRSSI'],
            },
            {
                name: 'Radio Errors',
                expressions: ['RAD.TxBuf', 'RAD.Noise', 'RAD.RemNoise'],
            }
        ]
    },

    getCategories() {
        return Object.keys(this._definitions).sort();
    },

    getPresets(category) {
        return this._definitions[category] || [];
    },

    getPreset(category, name) {
        const presets = this._definitions[category] || [];
        return presets.find(p => p.name === name);
    }
};
