// js/login.js (This is now a module)

import { signIn, checkAdminRole } from './auth.js';
// We DON'T import from math-captcha.js because it's a global script loaded in the HTML

document.addEventListener('DOMContentLoaded', () => {
    console.log(">>> login.js DOMContentLoaded fired!");

    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-submit-btn');
    const mathAnswerInput = document.getElementById('math-answer');

    // Use the correct ID from login.html
    const messageDiv = document.getElementById('auth-message-login');

    // Helper function to show messages
    const showMessage = (message, isError = true) => {
        if (!messageDiv) return;
        messageDiv.textContent = message;
        messageDiv.className = isError ? 'auth-message error' : 'auth-message success';
        messageDiv.style.display = 'block';
    };

    if (loginButton) {
        // Init captcha from global scope (loaded from math-captcha.js)
        if (typeof initMathCaptcha === 'function') {
            initMathCaptcha(loginButton);
        } else {
            console.error("math-captcha.js not loaded or initMathCaptcha not defined globally.");
        }
    } else {
        console.error("CRITICAL ERROR: Login submit button with ID 'login-submit-btn' NOT FOUND!");
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log(">>> Login form submitted.");

            // Clear any previous error messages
            if (messageDiv) messageDiv.style.display = 'none';

            if (!mathAnswerInput) {
                console.error("ERROR: Math answer input (id='math-answer') not found on submit!");
                showMessage('Internal error: CAPTCHA input missing.', true);
                return;
            }

            // Perform final math CAPTCHA validation on submit
            if (typeof validateMathPuzzleOnSubmit !== 'function' || !validateMathPuzzleOnSubmit(mathAnswerInput.value)) {
                console.log(">>> CAPTCHA validation failed on submit.");
                if (loginButton) {
                    loginButton.textContent = 'Sign In';
                    loginButton.disabled = true; // It's re-disabled by the captcha script
                }
                return; // Stop form submission
            }

            console.log(">>> CAPTCHA passed on submit. Proceeding with login.");

            // --- THIS IS THE FIX ---
            // Changed back to 'email' and 'password' which are now on BOTH html pages
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            // --- END OF FIX ---

            if (loginButton) {
                loginButton.textContent = 'Logging In...';
                loginButton.disabled = true;
            }

            try {
                // This will now throw an error on failure, which we will catch
                const user = await signIn(email, password);

                if (user) {
                    // Check if user is an admin
                    const isAdmin = await checkAdminRole(user.id);
                    if (isAdmin) {
                        console.log(">>> Admin login successful, redirecting to admin dashboard.");
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        console.log(">>> Customer login successful, redirecting to dashboard.");
                        window.location.href = 'dashboard.html';
                    }
                }

            } catch (authError) {
                // The error from auth.js is caught here
                console.error("Login process error:", authError.message);

                // Display the error message in the auth-message div
                showMessage(authError.message, true);

                if (loginButton) {
                    loginButton.textContent = 'Sign In';
                }
                // Regenerate the captcha
                if (typeof generateMathPuzzle === 'function' && typeof difficulty !== 'undefined') {
                    generateMathPuzzle(difficulty + 1); // Get a new puzzle
                } else if (typeof generateMathPuzzle === 'function') {
                    generateMathPuzzle(1); // Reset puzzle
                }
            }
        });
    } else {
        console.error("CRITICAL ERROR: Login form with ID 'login-form' NOT FOUND!");
    }
});