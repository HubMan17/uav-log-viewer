/**
 * Message type browser - allows exploring all available message types and their fields
 */
const MessageBrowser = {
    visible: false,

    init() {
        // Create the modal
        const modal = document.createElement('div');
        modal.id = 'message-browser-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content msg-browser">
                <div class="modal-header">
                    <h3>Message Browser</h3>
                    <input type="text" id="msg-browser-search" class="msg-search" placeholder="Search message types...">
                    <button class="modal-close" id="msg-browser-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="msg-browser-body">
                    <div class="msg-type-list" id="msg-type-list"></div>
                    <div class="msg-detail" id="msg-detail">
                        <p class="msg-detail-hint">Select a message type to see its fields</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        this.modal = modal;
        this.typeList = document.getElementById('msg-type-list');
        this.detail = document.getElementById('msg-detail');
        this.search = document.getElementById('msg-browser-search');

        // Close button
        document.getElementById('msg-browser-close').addEventListener('click', () => this.hide());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hide();
        });

        // Search
        this.search.addEventListener('input', Utils.debounce(() => {
            this.renderTypeList(this.search.value);
        }, 100));

        // Keyboard shortcut to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.visible) this.hide();
        });
    },

    show() {
        this.visible = true;
        this.modal.classList.add('visible');
        this.renderTypeList('');
        this.search.focus();
    },

    hide() {
        this.visible = false;
        this.modal.classList.remove('visible');
    },

    renderTypeList(filter) {
        this.typeList.innerHTML = '';
        const types = State.messageTypes.filter(t => {
            if (!filter) return true;
            return t.toLowerCase().includes(filter.toLowerCase());
        });

        types.forEach(type => {
            const msgData = State.messages[type];
            const count = msgData ? msgData.count : 0;
            const el = document.createElement('div');
            el.className = 'msg-type-item';
            el.innerHTML = `
                <span class="msg-type-name">${type}</span>
                <span class="msg-type-count">${count}</span>
            `;
            el.addEventListener('click', () => {
                // Highlight active
                this.typeList.querySelectorAll('.msg-type-item').forEach(i => i.classList.remove('active'));
                el.classList.add('active');
                this.showTypeDetail(type);
            });
            this.typeList.appendChild(el);
        });
    },

    showTypeDetail(type) {
        const msgData = State.messages[type];
        if (!msgData || !msgData.data) {
            this.detail.innerHTML = '<p class="msg-detail-hint">No data available</p>';
            return;
        }

        const fields = Object.keys(msgData.data).filter(f => f !== 'TimeUS');
        const fmt = State.formats[type];
        const count = msgData.count;

        let html = `
            <div class="msg-detail-header">
                <h4>${type}</h4>
                <span class="msg-count-badge">${count} messages</span>
            </div>
            <div class="msg-fields-table-wrap">
                <table class="msg-fields-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th>Plot</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        fields.forEach(field => {
            const data = msgData.data[field];
            let min = '-', max = '-';

            if (data && data.length > 0 && typeof data[0] === 'number') {
                let lo = Infinity, hi = -Infinity;
                // Sample for speed on large arrays
                const step = Math.max(1, Math.floor(data.length / 1000));
                for (let i = 0; i < data.length; i += step) {
                    const v = data[i];
                    if (v < lo) lo = v;
                    if (v > hi) hi = v;
                }
                min = lo.toFixed(2);
                max = hi.toFixed(2);
            }

            html += `
                <tr>
                    <td class="msg-field-name">${field}</td>
                    <td class="msg-field-stat">${min}</td>
                    <td class="msg-field-stat">${max}</td>
                    <td>
                        <button class="msg-plot-btn" data-expr="${type}.${field}" title="Plot ${type}.${field}">
                            <i class="fas fa-chart-line"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        this.detail.innerHTML = html;

        // Attach plot button handlers
        this.detail.querySelectorAll('.msg-plot-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const expr = btn.dataset.expr;
                PlotManager.addPlot({
                    title: expr,
                    expressions: [expr]
                });
                this.hide();
            });
        });
    }
};
