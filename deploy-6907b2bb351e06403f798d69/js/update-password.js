// js/update-password.js - No changes needed

import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const updatePasswordForm = document.getElementById('update-password-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const messageDiv = document.getElementById('message');
    const updateButton = updatePasswordForm ? updatePasswordForm.querySelector('.auth-btn') : null;

    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (newPassword !== confirmPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'red';
                return;
            }

            if (newPassword.length < 6) {
                messageDiv.textContent = 'Password must be at least 6 characters long.';
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'red';
                return;
            }

            if (updateButton) {
                updateButton.textContent = 'Updating...';
                updateButton.disabled = true;
            }
            messageDiv.style.display = 'none';

            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                console.error("Error updating password:", error);
                messageDiv.textContent = 'Error updating password: ' + error.message;
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'red';
            } else {
                messageDiv.textContent = 'Your password has been updated successfully! You can now log in.';
                messageDiv.style.display = 'block';
                messageDiv.style.color = 'green';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            }

            if (updateButton) {
                updateButton.textContent = 'Update Password';
                updateButton.disabled = false;
            }
        });
    }
});