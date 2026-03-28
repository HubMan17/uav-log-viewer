/**
 * Simple event bus for inter-module communication
 */
const EventBus = {
    _listeners: {},

    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    },

    off(event, callback) {
        if (!this._listeners[event]) return;
        if (callback) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        } else {
            delete this._listeners[event];
        }
    },

    emit(event, ...args) {
        if (!this._listeners[event]) return;
        for (const callback of this._listeners[event]) {
            callback(...args);
        }
    }
};
