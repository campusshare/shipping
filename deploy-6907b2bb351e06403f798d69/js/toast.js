// js/toast.js

/**
 * Manages the creation and display of toast notifications.
 */
const Toast = {
    _container: null,
    _queue: [],
    _timer: 5000, // Default duration in ms

    /**
     * Initializes the toast container and adds it to the DOM.
     */
    _init: function() {
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = 'toast-container';
            document.body.appendChild(this._container);
        }
    },

    /**
     * Creates and displays a toast.
     * @param {string} message The message to display.
     * @param {string} type The type of toast ('success', 'error', 'info').
     */
    show: function(message, type = 'info') {
        this._init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast__icon">${this._getIcon(type)}</div>
            <div class="toast__text">${message}</div>
            <button class="toast__close">&times;</button>
        `;

        this._container.appendChild(toast);
        
        // Show the toast after a slight delay for the CSS transition to work
        setTimeout(() => toast.classList.add('show'), 10);

        const closeButton = toast.querySelector('.toast__close');
        closeButton.addEventListener('click', () => this._hide(toast));

        const timeoutId = setTimeout(() => this._hide(toast), this._timer);
        toast.dataset.timeoutId = timeoutId; // Store timer ID for manual clearing
    },

    /**
     * Hides and removes a toast from the DOM.
     * @param {HTMLElement} toast The toast element to hide.
     */
    _hide: function(toast) {
        if (!toast) return;
        
        toast.classList.remove('show');
        toast.classList.add('hide');

        clearTimeout(toast.dataset.timeoutId);
        
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    },

    /**
     * Helper function to get an icon based on toast type.
     * @param {string} type
     * @returns {string} HTML for the icon.
     */
    _getIcon: function(type) {
        switch (type) {
            case 'success':
                return '<i class="fas fa-check-circle"></i>';
            case 'error':
                return '<i class="fas fa-exclamation-circle"></i>';
            case 'info':
                return '<i class="fas fa-info-circle"></i>';
            default:
                return '';
        }
    }
};

// Export the Toast object
export default Toast;