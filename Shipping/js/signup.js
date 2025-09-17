import { signUp, signInWithGoogle } from './auth.js';
import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const googleButton = document.getElementById('google-signup-btn');

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value; // Get the phone number
            const password = document.getElementById('password').value;
            const signupButton = signupForm.querySelector('.auth-btn');

            if (!fullName || !email || !password) {
                alert('Please fill in all required fields.');
                return;
            }

            signupButton.textContent = 'Creating Account...';
            signupButton.disabled = true;
            
            // Pass the phone number to the signUp function
            const user = await signUp(fullName, email, password, phone);

            if (user) {
                alert('Signup successful! Please check your email for a confirmation link to activate your account.');
                window.location.href = 'login.html'; 
            } else {
                signupButton.textContent = 'Create Account';
                signupButton.disabled = false;
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