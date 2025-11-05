// js/auth-slider.js
document.addEventListener('DOMContentLoaded', () => {
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');

    // --- NEW: Mobile toggle buttons ---
    const signUpButtonMobile = document.getElementById('signUpMobile');
    const signInButtonMobile = document.getElementById('signInMobile');

    // Desktop overlay buttons
    if (signUpButton) {
        signUpButton.addEventListener('click', (e) => {
            e.preventDefault();
            container.classList.add("right-panel-active");
        });
    }

    if (signInButton) {
        signInButton.addEventListener('click', (e) => {
            e.preventDefault();
            container.classList.remove("right-panel-active");
        });
    }

    // --- NEW: Mobile toggle listeners ---
    if (signUpButtonMobile) {
        signUpButtonMobile.addEventListener('click', (e) => {
            e.preventDefault();
            container.classList.add("right-panel-active");
        });
    }

    if (signInButtonMobile) {
        signInButtonMobile.addEventListener('click', (e) => {
            e.preventDefault();
            container.classList.remove("right-panel-active");
        });
    }
});