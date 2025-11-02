
import { getSession } from './auth.js';

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

    updateNavBasedOnAuth();

    // --- 2. Mobile Menu Setup ---
    const hamburgerMenu = document.getElementById('hamburger');
    const closeMenuButton = document.getElementById('close-icon');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay'); // overlay
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

    if (desktopNavLinksContainer && desktopNavRightContainer && mobileNavLinksWrapper && mobileAuthWrapper) {

        mobileNavLinksWrapper.innerHTML = '';
        mobileAuthWrapper.innerHTML = '';

        desktopNavLinksContainer.querySelectorAll('a').forEach(link => {
            const clonedLink = link.cloneNode(true);
            clonedLink.removeAttribute('id');
            mobileNavLinksWrapper.appendChild(clonedLink);
        });

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

    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileMenu();
        });
    }

    if (mobileMenu) {
        mobileMenu.addEventListener('click', (event) => {
            if (event.target.closest('a') || event.target.closest('button')) {
                closeMobileMenu();
            }
        });
    }

    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
        });
    }

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