/**
 * Expression input with autocomplete for custom plot expressions
 */
const ExpressionEditor = {
    init() {
        this.input = document.getElementById('expression-input');
        this.suggestions = document.getElementById('suggestions-box');
        this.addBtn = document.getElementById('btn-add-expression');
        this.selectedIdx = -1;

        this.input.addEventListener('input', () => this.onInput());
        this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
        this.input.addEventListener('blur', () => {
            setTimeout(() => this.hideSuggestions(), 200);
        });

        this.addBtn.addEventListener('click', () => this.submit());
    },

    onInput() {
        const value = this.input.value;
        const lastToken = this.getLastToken(value);

        if (lastToken.length < 1) {
            this.hideSuggestions();
            return;
        }

        const matches = this.getSuggestions(lastToken);
        this.showSuggestions(matches);
    },

    getLastToken(value) {
        const tokens = value.split(/\s+/);
        return tokens[tokens.length - 1] || '';
    },

    getSuggestions(token) {
        const suggestions = [];
        const dotIdx = token.indexOf('.');
        const upper = token.toUpperCase();

        if (dotIdx === -1) {
            // Suggest message types
            State.messageTypes.forEach(type => {
                if (type.toUpperCase().startsWith(upper)) {
                    suggestions.push(type);
                }
            });
        } else {
            // Suggest fields for a message type
            const msgType = token.substring(0, dotIdx);
            const fieldPrefix = token.substring(dotIdx + 1).toLowerCase();
            const msgData = State.messages[msgType];

            if (msgData && msgData.data) {
                Object.keys(msgData.data).forEach(field => {
                    if (field === 'TimeUS') return;
                    if (field.toLowerCase().startsWith(fieldPrefix)) {
                        suggestions.push(msgType + '.' + field);
                    }
                });
            }
        }

        return suggestions.slice(0, 20);
    },

    showSuggestions(matches) {
        if (matches.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.suggestions.innerHTML = '';
        this.selectedIdx = -1;

        matches.forEach((match, i) => {
            const el = document.createElement('div');
            el.className = 'suggestion-item';
            el.textContent = match;
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.applySuggestion(match);
            });
            this.suggestions.appendChild(el);
        });

        this.suggestions.classList.add('visible');
    },

    hideSuggestions() {
        this.suggestions.classList.remove('visible');
        this.selectedIdx = -1;
    },

    applySuggestion(suggestion) {
        const value = this.input.value;
        const tokens = value.split(/\s+/);
        tokens[tokens.length - 1] = suggestion;
        this.input.value = tokens.join(' ');
        this.hideSuggestions();
        this.input.focus();
    },

    onKeyDown(e) {
        const items = this.suggestions.querySelectorAll('.suggestion-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIdx = Math.min(this.selectedIdx + 1, items.length - 1);
                this.highlightSuggestion(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
                this.highlightSuggestion(items);
                break;
            case 'Tab':
            case 'Enter':
                if (this.suggestions.classList.contains('visible') && this.selectedIdx >= 0) {
                    e.preventDefault();
                    this.applySuggestion(items[this.selectedIdx].textContent);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submit();
                }
                break;
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    },

    highlightSuggestion(items) {
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === this.selectedIdx);
        });
        if (this.selectedIdx >= 0 && items[this.selectedIdx]) {
            items[this.selectedIdx].scrollIntoView({ block: 'nearest' });
        }
    },

    submit() {
        const value = this.input.value.trim();
        if (!value) return;

        const expressions = value.split(/\s+/).filter(Boolean);
        const mergeCheck = document.getElementById('toggle-merge-plot');
        const shouldMerge = mergeCheck && mergeCheck.checked;

        if (shouldMerge && State.plots.length > 0) {
            PlotManager.mergeIntoLastPlot({
                title: value,
                expressions: expressions
            });
        } else {
            PlotManager.addPlot({
                title: value,
                expressions: expressions
            });
        }

        this.input.value = '';
        this.hideSuggestions();
    }
};
