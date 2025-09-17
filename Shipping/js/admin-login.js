import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginButton = loginForm.querySelector('.auth-btn');
        
        loginButton.textContent = 'Logging In...';
        loginButton.disabled = true;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert('Login failed: ' + error.message);
            loginButton.textContent = 'Login';
            loginButton.disabled = false;
        } else {
            window.location.href = 'admin-dashboard.html';
        }
    });
});