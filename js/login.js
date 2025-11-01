// js/login.js (This is now a module)

import { signIn } from './auth.js';
// We DON'T import from math-captcha.js because it's a global script

document.addEventListener('DOMContentLoaded', () => {
    console.log(">>> login.js DOMContentLoaded fired!");

    const loginForm = document.getElementById('login-form');
    // This ID matches your HTML
    const loginButton = document.getElementById('login-submit-btn');
    const mathAnswerInput = document.getElementById('math-answer');

    // --- THIS IS THE FIX ---
    // Changed 'message' to 'auth-message-login' to match your HTML
    const messageDiv = document.getElementById('auth-message-login');

    if (loginButton) {
        // Init captcha from global scope (loaded from non-module script)
        initMathCaptcha(loginButton);
    } else {
        console.error("CRITICAL ERROR: Login submit button with ID 'login-submit-btn' NOT FOUND!");
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log(">>> Login form submitted.");

            if (!mathAnswerInput) {
                console.error("ERROR: Math answer input (id='math-answer') not found on submit!");
                if (messageDiv) {
                    messageDiv.textContent = 'Internal error: CAPTCHA input missing.';
                    messageDiv.className = 'auth-message error';
                    messageDiv.style.display = 'block';
                }
                return;
            }

            // Perform final math CAPTCHA validation on submit
            if (!validateMathPuzzleOnSubmit(mathAnswerInput.value)) {
                console.log(">>> CAPTCHA validation failed on submit.");
                return; // Stop form submission
            }

            console.log(">>> CAPTCHA passed on submit. Proceeding with login.");

            // IDs from your HTML
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loginButton.textContent = 'Logging In...';
            loginButton.disabled = true;

            const user = await signIn(email, password); // signIn (from auth.js) will show its own alert on failure

            if (user) {
                console.log(">>> Login successful, redirecting.");
                window.location.href = 'dashboard.html';
            } else {
                console.log(">>> Login failed, loginButton was:", loginButton);
                // The signIn function in auth.js will show the error alert.
                // We just need to reset the button.
                loginButton.textContent = 'Sign In';
                // The button will be re-disabled by the captcha logic
                // after the user types a new (incorrect) answer.
                // We'll call generateMathPuzzle to be safe.
                generateMathPuzzle(1); // Reset to easy difficulty
            }
        });
    } else {
        console.error("CRITICAL ERROR: Login form with ID 'login-form' NOT FOUND!");
    }
});