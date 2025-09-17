// js/main.js - THE SINGLE ENTRY POINT FOR THE CUSTOMER SITE

import { supabase } from './supabase-client.js';
import { getSession, signOut } from './auth.js';
import { 
    initShopPage, 
    initProductPage, 
    initCartPage, 
    initHomePage, 
    updateCartCount 
} from './e-commerce.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize animation library
    AOS.init({ duration: 800, once: true, offset: 50 });

    // 2. Check user login status and update UI
    const session = await getSession();
    const body = document.body;
    if (session) {
        body.classList.add('is-logged-in');
        const user = session.user;
        
        // Fetch the customer's public profile to get their name
        const { data: customer } = await supabase.from('customers').select('name').eq('id', user.id).single();
        
        if (customer) {
            const profileNameEl = document.querySelector('.profile-dropdown .dropdown-header strong');
            const profileAvatarEl = document.querySelector('.profile-avatar-sm');
            if(profileNameEl) profileNameEl.textContent = customer.name;
            if(profileAvatarEl) profileAvatarEl.textContent = customer.name.charAt(0).toUpperCase();
        }
        
        // Attach the signOut function to all logout links
        document.querySelectorAll('a[href*="login.html"]').forEach(el => {
            if (el.textContent.toLowerCase().includes('logout')) {
                el.addEventListener('click', (e) => { e.preventDefault(); signOut(); });
            }
        });
    } else {
        body.classList.remove('is-logged-in');
    }
    updateCartCount(); // Always update cart count on page load

    // 3. Mobile Navigation Hamburger Menu
    const navLinks = document.getElementById('nav-links');
    const hamburger = document.getElementById('hamburger-menu');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            body.classList.toggle('mobile-nav-open'); // Use a body class for more control
        });
    }

    // --- DEFINITIVE PAGE ROUTER ---
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (currentPage === 'shop.html') {
        initShopPage();
    } else if (currentPage === 'index.html') {
        initHomePage();
        initFaqAccordion();
        initHomepageCalculator();
    } else if (currentPage === 'product.html') {
        initProductPage();
    } else if (currentPage === 'cart.html' || currentPage === 'checkout.html') {
        initCartPage();
    } else if (currentPage === 'faq.html') {
        buildAndInitFaqPage();
    }
    // Add other page initializers here as you build them, e.g., for order.html, shipping.html, etc.
});

// --- PAGE-SPECIFIC INITIALIZERS ---

function initFaqAccordion() {
    const allFaqItems = document.querySelectorAll('.faq-item');
    allFaqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                allFaqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        }
    });
}

function buildAndInitFaqPage() {
    const faqData = [
        { q: 'How long does shipping take?', a: 'Our standard Air Freight takes approximately 10-25 days. Sea Freight is a more affordable option that takes 45-60 days.' },
        { q: 'How do I pay for my orders?', a: 'We accept Mobile Money (MTN, Vodafone, AirtelTigo), Visa, and Mastercard.' },
        { q: 'What happens if my product is damaged?', a: 'We offer optional insurance. If insured and damaged, we offer a full refund or replacement.' },
        { q: 'Can I track my order?', a: 'Absolutely! Every order and shipment appears in your user dashboard with a live visual timeline.' },
        { q: 'What is your refund and return policy?', a: 'For items procured via our "Order with Link" service, we cannot offer returns. For items from our E-commerce Store, we have a 7-day return policy for defective products.' }
    ];
    const faqContainer = document.getElementById('faq-accordion-container');
    if (faqContainer) {
        faqContainer.innerHTML = faqData.map(item => `
            <div class="faq-item">
                <div class="faq-question">${item.q}<i class="fas fa-chevron-down"></i></div>
                <div class="faq-answer"><p>${item.a}</p></div>
            </div>
        `).join('');
        initFaqAccordion();
    }
}

function initHomepageCalculator() {
    const homeCalculatorForm = document.getElementById('home-shipping-calculator');
    if (homeCalculatorForm) {
        // In a real app, these rates would be fetched from DB.settings
        const AIR_FREIGHT_RATE_PER_KG = 85; 
        const SEA_FREIGHT_RATE_PER_KG = 35;
        homeCalculatorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(document.getElementById('calc-weight').value) || 0;
            const method = document.getElementById('calc-method').value;
            let cost = (method === 'air') ? weight * AIR_FREIGHT_RATE_PER_KG : weight * SEA_FREIGHT_RATE_PER_KG;
            document.getElementById('calc-result').textContent = `₵${cost.toFixed(2)}`;
        });
    }
}