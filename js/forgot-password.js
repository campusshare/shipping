// js/forgot-password.js - Updated with Suspended Account Protection

import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const messageDiv = document.getElementById('message');
    const sendResetButton = forgotPasswordForm ? forgotPasswordForm.querySelector('.auth-btn') : null;

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value;

            if (!email) {
                messageDiv.textContent = 'Please enter your email address.';
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'red';
                return;
            }

            if (sendResetButton) {
                sendResetButton.textContent = 'Checking...';
                sendResetButton.disabled = true;
            }
            messageDiv.style.display = 'none';

            // *** Check if email is associated with a suspended account ***
            const { data: customerCheck, error } = await supabase
                .from('customers')
                .select('status')
                .eq('email', email)
                .single();
            
            if (customerCheck && customerCheck.status === 'suspended') {
                messageDiv.textContent = 'This account has been suspended. Password reset is not available. Please contact support for assistance.';
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'red';
                
                if (sendResetButton) {
                    sendResetButton.textContent = 'Send Reset Link';
                    sendResetButton.disabled = false;
                }
                return;
            }

            // If not suspended or doesn't exist, proceed with normal password reset
            try {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/update-password.html`
                });
                
                if (resetError) throw resetError;
                
                messageDiv.textContent = 'Password reset email sent! Please check your inbox.';
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'green';
            } catch (error) {
                console.error('Password reset error:', error);
                messageDiv.textContent = 'Error sending password reset email: ' + error.message;
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'red';
            }

            if (sendResetButton) {
                sendResetButton.textContent = 'Send Reset Link';
                sendResetButton.disabled = false;
            }
        });
    }
});