/**
 * Simple page router - switches between home and plot views
 */
const Router = {
    currentPage: 'home',

    init() {
        this.pages = {
            home: document.getElementById('home-page'),
            plot: document.getElementById('plot-page')
        };
    },

    navigate(page) {
        if (!this.pages[page]) return;
        // Hide all pages
        Object.values(this.pages).forEach(el => el.classList.remove('active'));
        // Show target
        this.pages[page].classList.add('active');
        this.currentPage = page;
        EventBus.emit('page:change', page);
    }
};
