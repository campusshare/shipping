// js/announcements.js - Complete Announcement System
import { supabase } from './supabase-client.js';

class AnnouncementSystem {
    constructor() {
        this.currentUserId = null;
        this.announcements = [];
        this.overlay = null;
    }

    // Icon mapping for different announcement types
    getIcon(iconName) {
        const icons = {
            'bell': '🔔',
            'party-popper': '🎉',
            'trending-up': '📈',
            'alert-triangle': '⚠️',
            'megaphone': '📢',
            'gift': '🎁',
            'star': '⭐',
            'fire': '🔥',
            'rocket': '🚀',
            'sparkles': '✨'
        };
        return icons[iconName] || '📢';
    }

    // Initialize the system
    async init(userId) {
        this.currentUserId = userId;
        await this.fetchAnnouncements();
        
        if (this.announcements.length > 0) {
            this.createOverlay();
            this.render();
            this.show();
        }
    }

    // Fetch active announcements that user hasn't dismissed
    async fetchAnnouncements() {
        try {
            // Get all active announcements
            const { data: allAnnouncements, error: fetchError } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .lte('start_date', new Date().toISOString())
                .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            // Get dismissed announcements for this user
            const { data: dismissed, error: dismissedError } = await supabase
                .from('user_dismissed_announcements')
                .select('announcement_id')
                .eq('user_id', this.currentUserId);

            if (dismissedError) throw dismissedError;

            const dismissedIds = dismissed ? dismissed.map(d => d.announcement_id) : [];
            
            // Filter out dismissed announcements
            this.announcements = allAnnouncements.filter(
                ann => !dismissedIds.includes(ann.id)
            );

            console.log(`Loaded ${this.announcements.length} new announcements`);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            this.announcements = [];
        }
    }

    // Create the overlay element
    createOverlay() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.className = 'announcements-overlay';
        this.overlay.innerHTML = `
            <div class="announcements-container">
                <div id="announcements-list"></div>
                <div class="announcements-footer">
                    <button class="dismiss-all-btn" id="dismiss-all-announcements">
                        <i class="fas fa-check-double"></i> Dismiss All
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });

        // Dismiss all button
        document.getElementById('dismiss-all-announcements')?.addEventListener('click', () => {
            this.dismissAll();
        });
    }

    // Render announcements
  // Replace the render() method in announcements.js with this corrected version:

render() {
    const container = document.getElementById('announcements-list');
    if (!container) return;

    if (this.announcements.length === 0) {
        container.innerHTML = `
            <div class="announcements-empty">
                <div class="announcements-empty-icon">📭</div>
                <h3>You're all caught up!</h3>
                <p>No new announcements at this time.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = this.announcements.map(ann => this.createCard(ann)).join('');

    // FIX: Add event listeners AFTER HTML is rendered
    this.announcements.forEach(ann => {
        const dismissBtn = document.getElementById(`dismiss-${ann.id}`);
        if (dismissBtn) {
            // Remove any existing listeners first
            dismissBtn.replaceWith(dismissBtn.cloneNode(true));
            const newDismissBtn = document.getElementById(`dismiss-${ann.id}`);
            newDismissBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.dismiss(ann.id);
            });
        }
    });

    // Re-attach dismiss all button listener
    const dismissAllBtn = document.getElementById('dismiss-all-announcements');
    if (dismissAllBtn) {
        dismissAllBtn.replaceWith(dismissAllBtn.cloneNode(true));
        const newDismissAllBtn = document.getElementById('dismiss-all-announcements');
        newDismissAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dismissAll();
        });
    }
}

    // Create a single announcement card
    createCard(announcement) {
        const priorityBadge = announcement.priority > 5 ? 
            `<span class="announcement-priority">
                <i class="fas fa-star"></i> Priority
            </span>` : '';

        const actionButton = announcement.action_url && announcement.action_label ?
            `<a href="${announcement.action_url}" class="announcement-action" target="_blank">
                ${announcement.action_label}
                <i class="fas fa-arrow-right"></i>
            </a>` : '';

        const timeAgo = this.getTimeAgo(announcement.created_at);

        return `
            <div class="announcement-card type-${announcement.type}" data-id="${announcement.id}">
                <div class="announcement-header">
                    <div class="announcement-icon">
                        ${this.getIcon(announcement.icon)}
                    </div>
                    <div class="announcement-title-area">
                        <h3 class="announcement-title">${announcement.title}</h3>
                        <div class="announcement-meta">
                            <span>${timeAgo}</span>
                            ${priorityBadge}
                        </div>
                    </div>
                    <button class="announcement-close" id="dismiss-${announcement.id}" title="Dismiss">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="announcement-body">
                    <p class="announcement-message">${announcement.message}</p>
                    ${actionButton}
                </div>
            </div>
        `;
    }

    // Calculate time ago
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    // Show the overlay
    show() {
        if (this.overlay) {
            setTimeout(() => {
                this.overlay.classList.add('active');
            }, 500); // Delay for better UX
        }
    }

    // Hide the overlay
    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }

    // Dismiss a single announcement
    async dismiss(announcementId) {
        try {
            // Mark as dismissed in database
            const { error } = await supabase
                .from('user_dismissed_announcements')
                .insert([{
                    user_id: this.currentUserId,
                    announcement_id: announcementId
                }]);

            if (error) throw error;

            // Remove from local array
            this.announcements = this.announcements.filter(a => a.id !== announcementId);

            // Animate card removal
            const card = document.querySelector(`[data-id="${announcementId}"]`);
            if (card) {
                card.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => {
                    this.render();
                    if (this.announcements.length === 0) {
                        setTimeout(() => this.hide(), 2000);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('Error dismissing announcement:', error);
            alert('Could not dismiss announcement. Please try again.');
        }
    }

    // Dismiss all announcements
    async dismissAll() {
        try {
            const dismissals = this.announcements.map(ann => ({
                user_id: this.currentUserId,
                announcement_id: ann.id
            }));

            const { error } = await supabase
                .from('user_dismissed_announcements')
                .insert(dismissals);

            if (error) throw error;

            this.announcements = [];
            this.render();
            setTimeout(() => this.hide(), 2000);
        } catch (error) {
            console.error('Error dismissing all announcements:', error);
            alert('Could not dismiss all announcements. Please try again.');
        }
    }

    // Check for new announcements (call this periodically)
    async checkForNew() {
        const oldCount = this.announcements.length;
        await this.fetchAnnouncements();
        
        if (this.announcements.length > oldCount) {
            console.log(`${this.announcements.length - oldCount} new announcements`);
            this.render();
            if (!this.overlay.classList.contains('active')) {
                this.show();
            }
        }
    }

    // Cleanup
    destroy() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

// Add slide out animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

export default AnnouncementSystem;