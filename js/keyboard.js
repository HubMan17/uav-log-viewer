/**
 * Keyboard shortcuts for the application
 */
const Keyboard = {
    init() {
        document.addEventListener('keydown', (e) => this.handleKey(e));
    },

    handleKey(e) {
        // Don't handle when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        switch (e.key) {
            case ' ':
                e.preventDefault();
                if (Router.currentPage === 'plot') {
                    TimeBar.togglePlay();
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                this.stepTime(-1, e.shiftKey);
                break;

            case 'ArrowRight':
                e.preventDefault();
                this.stepTime(1, e.shiftKey);
                break;

            case 'Home':
                e.preventDefault();
                if (State.timeRange) {
                    State.currentTime = State.timeRange.start;
                    EventBus.emit('time:change', State.currentTime);
                }
                break;

            case 'End':
                e.preventDefault();
                if (State.timeRange) {
                    State.currentTime = State.timeRange.end;
                    EventBus.emit('time:change', State.currentTime);
                }
                break;

            case 'b':
            case 'B':
                if (Router.currentPage === 'plot') {
                    MessageBrowser.show();
                }
                break;

            case 'Escape':
                if (MessageBrowser.visible) {
                    MessageBrowser.hide();
                }
                break;

            case 's':
            case 'S':
                if (Router.currentPage === 'plot') {
                    const sidebar = document.getElementById('sidebar');
                    sidebar.classList.toggle('expanded');
                }
                break;

            case 'Delete':
                if (Router.currentPage === 'plot' && !e.shiftKey) {
                    // Clear all plots with confirmation
                    PlotManager.clearAll();
                }
                break;

            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                if (e.altKey && Router.currentPage === 'plot') {
                    e.preventDefault();
                    // Quick switch to speed
                    const speeds = [0.5, 1, 2, 5, 10];
                    const idx = parseInt(e.key) - 1;
                    if (idx < speeds.length) {
                        TimeBar.playbackSpeed = speeds[idx];
                        document.getElementById('playback-speed').value = speeds[idx];
                    }
                }
                break;
        }
    },

    stepTime(direction, large) {
        if (!State.timeRange || State.currentTime === null) return;
        const total = State.timeRange.end - State.timeRange.start;
        const step = large ? total * 0.05 : total * 0.005;
        State.currentTime = Math.max(
            State.timeRange.start,
            Math.min(State.timeRange.end, State.currentTime + direction * step)
        );
        EventBus.emit('time:change', State.currentTime);
    }
};
