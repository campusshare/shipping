// js/contact.js (Fixed Version)

document.addEventListener('DOMContentLoaded', () => {
    console.log(">>> contact.js loaded!");

    // --- Contact Form Handling ---
    const contactForm = document.getElementById('contact-form');
    const contactMessageStatus = document.getElementById('contact-message-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            // For FormSubmit.co, we don't prevent default - let it submit normally
            // But we can show a loading state
            
            const submitButton = contactForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Sending...';
                submitButton.disabled = true;
            }

            // Show status message
            if (contactMessageStatus) {
                contactMessageStatus.textContent = 'Sending your message...';
                contactMessageStatus.className = 'auth-message';
                contactMessageStatus.style.display = 'block';
                contactMessageStatus.style.color = '#007bff';
            }

            // The form will submit to FormSubmit.co
            // You can add additional client-side validation here if needed
        });

        // Check if user came back with success parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
            if (contactMessageStatus) {
                contactMessageStatus.textContent = 'Thank you! Your message has been sent successfully.';
                contactMessageStatus.className = 'auth-message success';
                contactMessageStatus.style.display = 'block';
                contactMessageStatus.style.color = '#28a745';
            }
        }
    }

    // --- Initialize AOS if available ---
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
        });
        console.log(">>> AOS initialized in contact.js");
    }

    console.log(">>> contact.js initialization complete.");
});