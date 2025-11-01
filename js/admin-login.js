// js/admin-login.js

import { adminSignIn } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const adminLoginForm = document.getElementById('admin-login-form');

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (event) => {
            // 1. Prevent the default browser action (page reload)
            event.preventDefault();

            const loginButton = adminLoginForm.querySelector('button[type="submit"]');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            const email = emailInput.value;
            const password = passwordInput.value;

            // 2. Provide visual feedback to the user
            loginButton.textContent = 'Logging In...';
            loginButton.disabled = true;

            // 3. Call the adminSignIn function from auth.js
            const user = await adminSignIn(email, password);

            // 4. Handle the result
            if (user) {
                // SUCCESS: The adminSignIn function returns a user object.
                // The new role-aware auth-guard will handle the redirect automatically.
                // We can add a fallback redirect here just in case.
                console.log('Admin login successful. Redirecting to admin dashboard...');
                window.location.href = 'admin-dashboard.html';
            } else {
                // FAILURE: The adminSignIn function returns null and shows an alert.
                // Re-enable the form for another attempt.
                loginButton.textContent = 'Login';
                loginButton.disabled = false;
            }
        });
    }
});