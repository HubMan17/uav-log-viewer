/**
 * Global application state
 */
const State = {
    // File & parsing
    file: null,
    logType: '',        // 'dataflash', 'mavlink', 'dji'
    processDone: false,
    processStatus: 'Pre-processing...',
    processPercentage: -1,

    // Parsed data
    messages: {},       // { msgType: { fields: [...], data: { field: [...] }, count: N, instances: {} } }
    messageTypes: [],   // sorted list of available message types
    formats: {},        // FMT definitions
    units: {},          // FMTU unit definitions
    multipliers: {},    // FMTU multiplier definitions

    // Trajectory & GPS
    trajectories: {},
    trajectorySource: '',
    trajectorySources: [],
    mapAvailable: false,

    // Attitude
    timeAttitude: {},
    attitudeSources: {},
    attitudeSource: null,

    // Flight info
    flightModeChanges: [],
    events: [],
    mission: [],
    fences: [],
    textMessages: [],
    params: {},
    paramTimeSeries: [],
    metadata: null,
    startTime: null,

    // Time
    timeRange: null,    // { start, end } in microseconds
    currentTime: null,  // current time in microseconds

    // Plot
    plots: [],          // array of plot instances
    plotCache: {},
    expressions: [],

    // Map display toggles
    showTrajectory: true,
    showWaypoints: true,
    showFences: true,
    showClickableTrajectory: false,
    cameraType: 'follow',
    modelScale: 1,
    heightOffset: 0,

    // Sidebar
    activePanel: null,

    // Colors for plot series
    colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
             '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],

    // Flight mode colors
    modeColors: {},

    // Reset state for loading a new file
    reset() {
        this.file = null;
        this.logType = '';
        this.processDone = false;
        this.processStatus = 'Pre-processing...';
        this.processPercentage = -1;
        this.messages = {};
        this.messageTypes = [];
        this.formats = {};
        this.units = {};
        this.multipliers = {};
        this.trajectories = {};
        this.trajectorySource = '';
        this.trajectorySources = [];
        this.mapAvailable = false;
        this.timeAttitude = {};
        this.attitudeSources = {};
        this.attitudeSource = null;
        this.flightModeChanges = [];
        this.events = [];
        this.mission = [];
        this.fences = [];
        this.textMessages = [];
        this.params = {};
        this.paramTimeSeries = [];
        this.metadata = null;
        this.startTime = null;
        this.timeRange = null;
        this.currentTime = null;
        this.plots = [];
        this.plotCache = {};
        this.expressions = [];
        this.activePanel = null;
    }
};
