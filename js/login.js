
import { signIn, checkAdminRole } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log(">>> login.js DOMContentLoaded fired!");

    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-submit-btn');
    const mathAnswerInput = document.getElementById('math-answer');

    const messageDiv = document.getElementById('auth-message-login');

    const showMessage = (message, isError = true) => {
        if (!messageDiv) return;
        messageDiv.textContent = message;
        messageDiv.className = isError ? 'auth-message error' : 'auth-message success';
        messageDiv.style.display = 'block';
    };

    if (loginButton) {
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

            if (messageDiv) messageDiv.style.display = 'none';

            if (!mathAnswerInput) {
                console.error("ERROR: Math answer input (id='math-answer') not found on submit!");
                showMessage('Internal error: CAPTCHA input missing.', true);
                return;
            }

            if (typeof validateMathPuzzleOnSubmit !== 'function' || !validateMathPuzzleOnSubmit(mathAnswerInput.value)) {
                console.log(">>> CAPTCHA validation failed on submit.");
                if (loginButton) {
                    loginButton.textContent = 'Sign In';
                    loginButton.disabled = true;
                }
                return;
            }

            console.log(">>> CAPTCHA passed on submit. Proceeding with login.");

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (loginButton) {
                loginButton.textContent = 'Logging In...';
                loginButton.disabled = true;
            }

            try {
                const user = await signIn(email, password);

                if (user) {
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
                console.error("Login process error:", authError.message);


                showMessage(authError.message, true);

                if (loginButton) {
                    loginButton.textContent = 'Sign In';
                }
                if (typeof generateMathPuzzle === 'function') {
                    generateMathPuzzle(difficulty + 1);
                }
            }
        });
    } else {
        console.error("CRITICAL ERROR: Login form with ID 'login-form' NOT FOUND!");
    }
});