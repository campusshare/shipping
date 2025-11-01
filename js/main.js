// js/main.js - (Updated with Auth Check and Mobile Menu Fix)

import { getSession } from './auth.js';

/**
 * Checks the user's authentication status and updates the <body> class
 * to show/hide 'Login/Sign Up' vs 'My Dashboard' links.
 */
async function updateNavBasedOnAuth() {
    console.log("main.js: Checking auth state for navbar...");
    const session = await getSession();
    if (session) {
        console.log("main.js: User is logged in. Adding 'is-logged-in' class.");
        document.body.classList.add('is-logged-in');
    } else {
        console.log("main.js: User is logged out. Removing 'is-logged-in' class.");
        document.body.classList.remove('is-logged-in');
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Check Auth State for Navbar ---
    // Run the auth check as soon as the DOM is loaded
    updateNavBasedOnAuth();

    // --- 2. Mobile Menu Setup ---
    const hamburgerMenu = document.getElementById('hamburger');
    const closeMenuButton = document.getElementById('close-icon');
    const mobileMenu = document.getElementById('mobile-menu');
    const desktopNavLinksContainer = document.getElementById('desktop-nav-links'); // The <div> holding the nav links
    const desktopNavRightContainer = document.getElementById('desktop-nav-right'); // The <div> holding the auth buttons
    const mobileNavLinksWrapper = document.querySelector('.mobile-nav-links-wrapper');
    const mobileAuthWrapper = document.querySelector('.mobile-auth-wrapper');
    const body = document.body;

    let bodyOverlay = document.querySelector('.mobile-menu-overlay');
    if (!bodyOverlay) {
        bodyOverlay = document.createElement('div');
        bodyOverlay.className = 'mobile-menu-overlay';
        document.body.appendChild(bodyOverlay);
    }

    function openMobileMenu() {
        if (mobileMenu && bodyOverlay) {
            mobileMenu.classList.add('active');
            bodyOverlay.classList.add('active');
            body.classList.add('mobile-menu-open');
            if (hamburgerMenu) {
                hamburgerMenu.classList.add('active');
            }
        }
    }

    function closeMobileMenu() {
        if (mobileMenu && bodyOverlay) {
            mobileMenu.classList.remove('active');
            bodyOverlay.classList.remove('active');
            body.classList.remove('mobile-menu-open');
            if (hamburgerMenu) {
                hamburgerMenu.classList.remove('active');
            }
        }
    }

    // --- 3. Populate Mobile Menu (FIXED to clone individual links) ---
    if (desktopNavLinksContainer && desktopNavRightContainer && mobileNavLinksWrapper && mobileAuthWrapper) {

        // Clear any hardcoded links from the HTML to prevent duplication
        mobileNavLinksWrapper.innerHTML = '';
        mobileAuthWrapper.innerHTML = '';

        // --- FIX 1: Clone individual links ---
        // Loop through each <a> tag inside the desktop nav links container
        desktopNavLinksContainer.querySelectorAll('a').forEach(link => {
            const clonedLink = link.cloneNode(true);
            clonedLink.removeAttribute('id'); // Remove any IDs
            mobileNavLinksWrapper.appendChild(clonedLink);
        });

        // --- FIX 2: Clone the auth view divs directly ---
        const clonedAuthLoggedOut = desktopNavRightContainer.querySelector('.logged-out-view')?.cloneNode(true);
        const clonedAuthLoggedIn = desktopNavRightContainer.querySelector('.logged-in-view')?.cloneNode(true);

        if (clonedAuthLoggedOut) {
            clonedAuthLoggedOut.removeAttribute('id');
            clonedAuthLoggedOut.querySelectorAll('a').forEach(a => a.removeAttribute('id'));
            mobileAuthWrapper.appendChild(clonedAuthLoggedOut);
        }

        if (clonedAuthLoggedIn) {
            clonedAuthLoggedIn.removeAttribute('id');
            clonedAuthLoggedIn.querySelectorAll('a').forEach(a => a.removeAttribute('id'));
            mobileAuthWrapper.appendChild(clonedAuthLoggedIn);
        }

    } else {
        console.warn("main.js: Could not find all elements needed to build mobile menu.");
    }

    // --- 4. Event Listeners for Menu Toggle ---
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openMobileMenu();
        });
    }

    if (closeMenuButton) {
        closeMenuButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
        });
    }

    if (bodyOverlay) {
        bodyOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
        });
    }

    // --- 5. Close Mobile Menu when a link inside it is clicked ---
    if (mobileMenu) {
        mobileMenu.addEventListener('click', (event) => {
            if (event.target.tagName === 'A' && event.target.closest('.mobile-menu')) {
                closeMobileMenu();
            }
        });
    }

    // --- 6. Scroll animations (AOS) ---
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
        });
    }

    // --- 7. Other scripts from index.html (Scroll behavior, etc.) ---

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Debounced scroll handler for header background
    const debouncedScrollHandler = debounce(() => {
        const header = document.querySelector('.header');
        if (header) {
            if (window.scrollY > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
                header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.boxShadow = 'none';
            }
        }
    }, 10);

    window.addEventListener('scroll', debouncedScrollHandler);

    // Add click animation to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            // Only add ripple if it's not a link that's navigating away
            if (this.tagName !== 'A' || this.getAttribute('href') === '#') {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.style.position = 'absolute';
                ripple.style.borderRadius = '50%';
                ripple.style.background = 'rgba(255, 255, 255, 0.6)';
                ripple.style.transform = 'scale(0)';
                ripple.style.animation = 'ripple 0.6s linear';
                ripple.style.pointerEvents = 'none';

                if (getComputedStyle(this).position === 'static') {
                    this.style.position = 'relative';
                }
                this.style.overflow = 'hidden';
                this.appendChild(ripple);

                setTimeout(() => {
                    ripple.remove();
                }, 600);
            }
        });
    });

    // Add ripple animation keyframes
    const style = document.createElement('style');
    style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    `;
    document.head.appendChild(style);
});