/**
 * Application entry point - initializes all modules
 */
const App = {
    init() {
        Router.init();
        Upload.init();
        Sidebar.init();
        TimeBar.init();
        PlotManager.init();
        ExpressionEditor.init();
        MessageBrowser.init();
        MapViewer.init();
        Keyboard.init();

        // Message browser button
        document.getElementById('btn-msg-browser')?.addEventListener('click', () => {
            MessageBrowser.show();
        });

        // Info bar
        EventBus.on('parse:complete', () => this.updateInfoBar());

        // Handle window resize
        window.addEventListener('resize', Utils.debounce(() => {
            EventBus.emit('resize');
            // Resize plots
            State.plots.forEach(plot => {
                const el = document.getElementById(plot.id + '-area');
                if (el) Plotly.Plots.resize(el);
            });
            // Redraw 2D map
            if (MapViewer.canvas) MapViewer.draw2DMap();
        }, 150));

        // Map resize handle
        this.initMapResize();

        console.log('UAV Log Viewer initialized');
    },

    updateInfoBar() {
        const bar = document.getElementById('info-bar');
        if (!bar) return;
        bar.style.display = '';

        document.getElementById('info-filename').textContent = State.file ? State.file.name : '';

        const vehicleType = FlightModes.detectVehicleType(State.params, State.formats);
        document.getElementById('info-vehicle').textContent = vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1);

        if (State.timeRange) {
            const duration = (State.timeRange.end - State.timeRange.start) / 1e6;
            const min = Math.floor(duration / 60);
            const sec = Math.floor(duration % 60);
            document.getElementById('info-duration').textContent = `${min}m ${sec}s`;
        }

        document.getElementById('info-messages').textContent = State.messageTypes.length + ' types';
        document.getElementById('info-params').textContent = Object.keys(State.params).length + ' params';
    },

    initMapResize() {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        const handle = document.createElement('div');
        handle.className = 'map-resize-handle';
        mapContainer.appendChild(handle);

        let startY, startHeight;

        handle.addEventListener('mousedown', (e) => {
            startY = e.clientY;
            startHeight = mapContainer.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';

            const onMove = (e) => {
                const dy = e.clientY - startY;
                const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight + dy));
                mapContainer.style.height = newHeight + 'px';
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                EventBus.emit('resize');
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
