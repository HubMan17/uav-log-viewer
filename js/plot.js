/**
 * Plot management - creates and manages Plotly charts
 */
const PlotManager = {
    plotCounter: 0,

    init() {
        this.container = document.getElementById('plot-container');
        this.categorySelect = document.getElementById('graph-category');
        this.presetSelect = document.getElementById('graph-preset');
        this.clearBtn = document.getElementById('btn-clear-plots');

        // "+" = merge into current plot (or create first)
        document.getElementById('btn-add-graph').addEventListener('click', () => this.addPresetGraph(true));
        // "new" = always create separate plot
        document.getElementById('btn-new-graph').addEventListener('click', () => this.addPresetGraph(false));

        this.clearBtn.addEventListener('click', () => this.clearAll());

        this.categorySelect.addEventListener('change', () => {
            this.populatePresets(this.categorySelect.value);
        });

        EventBus.on('parse:complete', () => this.onDataLoaded());
        EventBus.on('time:change', (t) => this.updateTimeCursor(t));
        EventBus.on('time:update', (t) => this.updateTimeCursor(t));
        EventBus.on('plot:add', (config) => this.addPlot(config));
    },

    onDataLoaded() {
        this.container.innerHTML = '';
        this.populateCategories();
        this.showEmptyState();
    },

    showEmptyState() {
        if (this.container.children.length > 0) return;
        this.container.innerHTML = `
            <div class="plot-empty">
                <i class="fas fa-chart-area"></i>
                <p>Select a graph preset or enter an expression to start plotting</p>
            </div>
        `;
    },

    populateCategories() {
        this.categorySelect.innerHTML = '<option value="">Select Category</option>';
        const categories = GraphDefinitions.getCategories();
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            this.categorySelect.appendChild(opt);
        });
    },

    populatePresets(category) {
        this.presetSelect.innerHTML = '<option value="">Select Graph</option>';
        if (!category) return;

        const presets = GraphDefinitions.getPresets(category);
        presets.forEach(preset => {
            const opt = document.createElement('option');
            opt.value = preset.name;
            opt.textContent = preset.name;
            this.presetSelect.appendChild(opt);
        });
    },

    addPresetGraph(merge) {
        const category = this.categorySelect.value;
        const presetName = this.presetSelect.value;
        if (!category || !presetName) return;

        const preset = GraphDefinitions.getPreset(category, presetName);
        if (!preset) return;

        const config = { title: preset.name, expressions: preset.expressions };

        if (merge && State.plots.length > 0) {
            this.mergeIntoLastPlot(config);
        } else {
            this.addPlot(config);
        }
    },

    mergeIntoLastPlot(config) {
        const lastPlot = State.plots[State.plots.length - 1];
        if (!lastPlot) return this.addPlot(config);

        const plotArea = document.getElementById(lastPlot.id + '-area');
        if (!plotArea || !plotArea.data) return this.addPlot(config);

        const newTraces = [];
        const existingCount = plotArea.data.length;

        if (config.expressions) {
            config.expressions.forEach((expr, i) => {
                const trace = this.resolveExpression(expr, existingCount + i);
                if (trace) newTraces.push(trace);
            });
        }

        if (newTraces.length === 0) return;

        Plotly.addTraces(plotArea, newTraces);

        // Update title
        const header = document.querySelector('#' + lastPlot.id + ' .plot-title');
        if (header) {
            header.textContent = header.textContent + ' + ' + config.title;
        }

        lastPlot.config.expressions = (lastPlot.config.expressions || []).concat(config.expressions);
        lastPlot.traces = lastPlot.traces.concat(newTraces);
    },

    addPlot(config) {
        // Remove empty state
        const empty = this.container.querySelector('.plot-empty');
        if (empty) empty.remove();

        const id = 'plot-' + (++this.plotCounter);
        const wrapper = document.createElement('div');
        wrapper.className = 'plot-wrapper';
        wrapper.id = id;

        wrapper.innerHTML = `
            <div class="plot-header">
                <span class="plot-title">${config.title || 'Custom Plot'}</span>
                <button class="plot-close" data-plot="${id}" title="Remove"><i class="fas fa-times"></i></button>
            </div>
            <div class="plot-area" id="${id}-area"></div>
        `;

        this.container.appendChild(wrapper);

        // Close button
        wrapper.querySelector('.plot-close').addEventListener('click', () => {
            Plotly.purge(id + '-area');
            wrapper.remove();
            State.plots = State.plots.filter(p => p.id !== id);
            if (this.container.children.length === 0) this.showEmptyState();
        });

        // Build traces
        const traces = [];

        if (config.expressions) {
            config.expressions.forEach((expr, i) => {
                const trace = this.resolveExpression(expr, i);
                if (trace) traces.push(trace);
            });
        }

        if (traces.length === 0) {
            const area = document.getElementById(id + '-area');
            area.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.85rem;">No data found for: ' +
                (config.expressions || []).join(', ') + '</div>';
            State.plots.push({ id, config, traces });
            return;
        }

        console.log('Plotting', traces.length, 'traces for', config.title);

        State.plots.push({ id, config, traces });

        // Defer Plotly creation to next frame so DOM has computed dimensions
        requestAnimationFrame(() => {
            const plotArea = document.getElementById(id + '-area');
            if (!plotArea) return;

            // Force explicit dimensions for Plotly
            const rect = plotArea.getBoundingClientRect();
            const layout = this.getBaseLayout();
            layout.width = Math.max(rect.width, 300);
            layout.height = Math.max(rect.height, 200);

            try {
                Plotly.newPlot(plotArea, traces, layout, {
                    responsive: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'],
                    displaylogo: false,
                    scrollZoom: true
                });
            } catch (e) {
                console.error('Plotly.newPlot failed:', e);
                plotArea.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--error);">Plot error: ' + e.message + '</div>';
                return;
            }

            this._bindPlotEvents(plotArea, id);
        });
    },

    _bindPlotEvents(plotArea, id) {
        plotArea.on('plotly_hover', (data) => {
            if (data.points && data.points[0]) {
                const x = data.points[0].x;
                if (State.timeRange) {
                    EventBus.emit('time:change', State.timeRange.start + x * 1e6);
                }
            }
        });

        plotArea.on('plotly_relayout', (eventData) => {
            if (this._syncing) return;
            const xRange = [];
            if (eventData['xaxis.range[0]'] !== undefined) {
                xRange.push(eventData['xaxis.range[0]'], eventData['xaxis.range[1]']);
            } else if (eventData['xaxis.autorange']) {
                xRange.push(null, null);
            }
            if (xRange.length === 2) {
                this.syncXRange(id, xRange[0], xRange[1]);
            }
        });

        plotArea.on('plotly_click', (data) => {
            if (data.points && data.points[0]) {
                const x = data.points[0].x;
                if (State.timeRange) {
                    State.currentTime = State.timeRange.start + x * 1e6;
                    EventBus.emit('time:change', State.currentTime);
                }
            }
        });
    },

    resolveExpression(expr, colorIdx) {
        // expr format: "MSG.Field" or "MSG[instance].Field"
        const match = expr.match(/^(\w+)(?:\[(\d+)\])?\.(\w+)$/);
        if (!match) {
            console.warn('Plot: invalid expression format:', expr);
            return null;
        }

        let [, msgType, instance, field] = match;

        // Handle instance bracket notation: IMU[0] -> IMU, IMU[1] -> IMU2, IMU[2] -> IMU3
        if (instance !== undefined) {
            const instNum = parseInt(instance, 10);
            if (instNum > 0) {
                msgType = msgType + (instNum + 1);
            }
        }

        const msgData = State.messages[msgType];
        if (!msgData || !msgData.data) {
            console.warn('Plot: message type not found:', msgType);
            return null;
        }

        const timeData = msgData.data.TimeUS;
        const fieldData = msgData.data[field];

        if (!timeData || !fieldData) {
            console.warn('Plot: field not found:', field, 'in', msgType,
                '(available:', Object.keys(msgData.data).join(', ') + ')');
            return null;
        }

        // Convert time to seconds from start, with downsampling for large datasets
        const startTime = State.timeRange ? State.timeRange.start : 0;
        const maxPoints = 20000;
        const len = timeData.length;
        const step = len > maxPoints ? Math.ceil(len / maxPoints) : 1;

        let x, y;
        if (step > 1) {
            const n = Math.ceil(len / step);
            x = new Array(n);
            y = new Array(n);
            for (let i = 0, j = 0; i < len; i += step, j++) {
                x[j] = (timeData[i] - startTime) / 1e6;
                y[j] = fieldData[i];
            }
        } else {
            x = new Array(len);
            y = fieldData;
            for (let i = 0; i < len; i++) {
                x[i] = (timeData[i] - startTime) / 1e6;
            }
        }

        return {
            x: x,
            y: y,
            name: expr,
            type: 'scatter',
            mode: 'lines',
            line: {
                color: State.colors[colorIdx % State.colors.length],
                width: 1
            }
        };
    },

    getBaseLayout() {
        return {
            paper_bgcolor: '#1a1a2e',
            plot_bgcolor: '#1a1a2e',
            font: { color: '#b0b3b8', size: 11 },
            margin: { l: 50, r: 20, t: 10, b: 30 },
            xaxis: {
                title: 'Time (s)',
                gridcolor: '#2d3748',
                zerolinecolor: '#2d3748',
                tickfont: { size: 10 }
            },
            yaxis: {
                gridcolor: '#2d3748',
                zerolinecolor: '#2d3748',
                tickfont: { size: 10 }
            },
            showlegend: true,
            legend: {
                orientation: 'h',
                y: 1.12,
                font: { size: 10 }
            },
            hovermode: 'x unified',
            shapes: [] // for time cursor
        };
    },

    updateTimeCursor: Utils.throttle(function (timeUS) {
        if (!State.timeRange) return;
        const timeSec = (timeUS - State.timeRange.start) / 1e6;

        State.plots.forEach(plot => {
            const plotArea = document.getElementById(plot.id + '-area');
            if (!plotArea || !plotArea.layout) return;

            Plotly.relayout(plotArea, {
                shapes: [{
                    type: 'line',
                    x0: timeSec,
                    x1: timeSec,
                    y0: 0,
                    y1: 1,
                    yref: 'paper',
                    line: { color: '#4fc3f7', width: 1, dash: 'dot' }
                }]
            });
        });
    }, 50),

    syncXRange(sourceId, x0, x1) {
        this._syncing = true;
        State.plots.forEach(plot => {
            if (plot.id === sourceId) return;
            const el = document.getElementById(plot.id + '-area');
            if (!el) return;
            if (x0 === null) {
                Plotly.relayout(el, { 'xaxis.autorange': true });
            } else {
                Plotly.relayout(el, { 'xaxis.range': [x0, x1] });
            }
        });
        this._syncing = false;
    },

    clearAll() {
        this.container.innerHTML = '';
        State.plots = [];
        this.plotCounter = 0;
        this.showEmptyState();
    }
};
