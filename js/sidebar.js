/**
 * Sidebar navigation and panel management
 */
const Sidebar = {
    init() {
        this.el = document.getElementById('sidebar');
        this.panelsContainer = document.querySelector('.sidebar-panels');
        this.buttons = document.querySelectorAll('.sidebar-btn[data-panel]');
        this.toggleBtn = document.getElementById('sidebar-toggle');
        this.newFileBtn = document.getElementById('btn-new-file');

        this.expanded = false;

        // Toggle sidebar expand/collapse
        this.toggleBtn.addEventListener('click', () => {
            this.expanded = !this.expanded;
            this.el.classList.toggle('expanded', this.expanded);
        });

        // Panel buttons
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.panel;
                this.togglePanel(panel, btn);
            });
        });

        // New file button
        this.newFileBtn.addEventListener('click', () => {
            Upload.resetUI();
            Router.navigate('home');
        });

        // Listen for data updates
        EventBus.on('parse:complete', () => this.populatePanels());
    },

    togglePanel(panelName, btn) {
        const panelEl = document.getElementById('panel-' + panelName);
        if (!panelEl) return;

        const isActive = btn.classList.contains('active');

        // Deactivate all buttons and panels
        this.buttons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));

        if (isActive) {
            // Close panel
            this.panelsContainer.classList.remove('visible');
            State.activePanel = null;
        } else {
            // Open panel
            btn.classList.add('active');
            panelEl.classList.add('active');
            this.panelsContainer.classList.add('visible');
            State.activePanel = panelName;
        }
    },

    populatePanels() {
        this.populateFlightModes();
        this.populateMessages();
        this.populateParams();
    },

    populateFlightModes() {
        const list = document.getElementById('flight-modes-list');
        if (!list) return;
        list.innerHTML = '';

        if (State.flightModeChanges.length === 0) {
            list.innerHTML = '<p class="panel-empty">No flight mode data</p>';
            return;
        }

        State.flightModeChanges.forEach((mode, i) => {
            const el = document.createElement('div');
            el.className = 'mode-item';
            el.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;';
            const timeStr = Utils.formatTime(mode.timeUS);
            el.innerHTML = `
                <span class="mode-color" style="width:10px;height:10px;border-radius:50%;background:${mode.color};flex-shrink:0;"></span>
                <span style="flex:1;font-size:0.85rem;">${mode.name}</span>
                <span style="font-size:0.75rem;color:var(--text-muted);font-family:monospace;">${timeStr}</span>
            `;
            el.addEventListener('click', () => {
                State.currentTime = mode.timeUS;
                EventBus.emit('time:change', mode.timeUS);
            });
            list.appendChild(el);
        });
    },

    populateMessages() {
        const list = document.getElementById('messages-list');
        if (!list) return;
        list.innerHTML = '';

        if (State.textMessages.length === 0) {
            list.innerHTML = '<p class="panel-empty">No messages</p>';
            return;
        }

        State.textMessages.forEach(msg => {
            const el = document.createElement('div');
            el.style.cssText = 'padding:4px 0;border-bottom:1px solid var(--border);font-size:0.8rem;cursor:pointer;';

            const timeStr = Utils.formatTime(msg.timeUS);
            const severity = msg.severity !== undefined ? `[${msg.severity}] ` : '';
            el.innerHTML = `
                <span style="color:var(--text-muted);font-family:monospace;font-size:0.75rem;">${timeStr}</span>
                <span style="margin-left:6px;">${severity}${msg.text}</span>
            `;
            el.addEventListener('click', () => {
                State.currentTime = msg.timeUS;
                EventBus.emit('time:change', msg.timeUS);
            });
            list.appendChild(el);
        });
    },

    populateParams() {
        const list = document.getElementById('params-list');
        const search = document.getElementById('param-search');
        if (!list) return;

        const renderParams = (filter) => {
            list.innerHTML = '';
            const keys = Object.keys(State.params).sort();
            const filtered = filter ? keys.filter(k => k.toLowerCase().includes(filter.toLowerCase())) : keys;

            if (filtered.length === 0) {
                list.innerHTML = '<p class="panel-empty">No parameters found</p>';
                return;
            }

            filtered.forEach(key => {
                const el = document.createElement('div');
                el.style.cssText = 'display:flex;justify-content:space-between;padding:3px 0;font-size:0.8rem;border-bottom:1px solid var(--border);';
                el.innerHTML = `
                    <span style="color:var(--text-secondary);">${key}</span>
                    <span style="color:var(--accent);font-family:monospace;">${State.params[key]}</span>
                `;
                list.appendChild(el);
            });
        };

        renderParams('');

        if (search) {
            search.addEventListener('input', Utils.debounce(() => {
                renderParams(search.value);
            }, 150));
        }
    }
};
