// js/main.js - (FINAL VERSION - Fixes Mobile Menu Links & Toggling)

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
    updateNavBasedOnAuth();

    // --- 2. Mobile Menu Setup ---
    const hamburgerMenu = document.getElementById('hamburger');
    const closeMenuButton = document.getElementById('close-icon');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay'); // Get the overlay
    const desktopNavLinksContainer = document.getElementById('desktop-nav-links');
    const desktopNavRightContainer = document.getElementById('desktop-nav-right');
    const mobileNavLinksWrapper = document.querySelector('.mobile-nav-links-wrapper');
    const mobileAuthWrapper = document.querySelector('.mobile-auth-wrapper');
    const body = document.body;

    function openMobileMenu() {
        if (mobileMenu && mobileMenuOverlay) {
            mobileMenu.classList.add('active');
            mobileMenuOverlay.classList.add('active');
            body.classList.add('mobile-menu-open');
            if (hamburgerMenu) {
                hamburgerMenu.classList.add('active');
            }
        }
    }

    function closeMobileMenu() {
        if (mobileMenu && mobileMenuOverlay) {
            mobileMenu.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            body.classList.remove('mobile-menu-open');
            if (hamburgerMenu) {
                hamburgerMenu.classList.remove('active');
            }
        }
    }

    // --- 3. Populate Mobile Menu (with duplication fix) ---
    if (desktopNavLinksContainer && desktopNavRightContainer && mobileNavLinksWrapper && mobileAuthWrapper) {

        // Clear any hardcoded links from the HTML to prevent duplication
        mobileNavLinksWrapper.innerHTML = '';
        mobileAuthWrapper.innerHTML = '';

        // Clone individual nav links
        desktopNavLinksContainer.querySelectorAll('a').forEach(link => {
            const clonedLink = link.cloneNode(true);
            clonedLink.removeAttribute('id');
            mobileNavLinksWrapper.appendChild(clonedLink);
        });

        // Clone the auth view divs
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

    if (mobileMenuOverlay) { // Use the correct overlay variable
        mobileMenuOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
        });
    }

    // --- 5. Close Mobile Menu when a link inside it is clicked ---
    if (mobileMenu) {
        mobileMenu.addEventListener('click', (event) => {
            // Check if a link *or* a button inside the menu was clicked
            if (event.target.closest('a') || event.target.closest('button')) {
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

    // --- 7. Smooth scrolling for anchor links ---
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

    // --- 8. Debounce function ---
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

    // --- 9. Debounced scroll handler for header background ---
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
});