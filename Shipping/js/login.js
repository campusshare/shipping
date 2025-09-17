import { signIn, signInWithGoogle } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const googleButton = document.getElementById('google-login-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginButton = loginForm.querySelector('.auth-btn');
            
            loginButton.textContent = 'Logging In...';
            loginButton.disabled = true;

            const user = await signIn(email, password);

            if (user) {
                window.location.href = 'dashboard.html'; 
            } else {
                loginButton.textContent = 'Login';
                loginButton.disabled = false;
            }
        });
    }

    if (googleButton) {
        googleButton.addEventListener('click', (e) => {
            e.preventDefault();
            signInWithGoogle();
        });
    }
});