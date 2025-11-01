// js/signup.js (Updated to use correct new unique IDs)

import { signUp } from './auth.js';
import { supabase } from './supabase-client.js';

// Generate Customer Unique ID with initials
function generateCustomerUniqueId(fullName) {
    let initials = 'XX';

    if (fullName && fullName.trim() !== '') {
        const nameParts = fullName.trim().split(' ').filter(n => n);

        if (nameParts.length === 1) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        } else if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        }
    }

    const randomPart = Math.floor(100000 + Math.random() * 900000);
    return `${initials}-${randomPart}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    // FIXED: Select the correct message div
    const messageDiv = document.getElementById('auth-message-signup');

    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // FIXED: Get button by its new ID
            const signupButton = signupForm.querySelector('#signup-btn');

            // FIXED: Use the correct, unique IDs from the new HTML
            const fullName = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const phone = document.getElementById('signup-phone').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            // --- Helper function to show messages ---
            const showMessage = (message, isError = false) => {
                if (!messageDiv) return;
                messageDiv.textContent = message;
                messageDiv.className = isError ? 'auth-message error' : 'auth-message success';
                messageDiv.style.display = 'block';
            };

            // Client-side validation
            if (!fullName || !email || !phone || !password) {
                showMessage('Please fill in all required fields.', true);
                return;
            }

            if (password !== confirmPassword) {
                showMessage('Passwords do not match.', true);
                return;
            }

            if (password.length < 6) {
                showMessage('Password must be at least 6 characters long.', true);
                return;
            }

            signupButton.textContent = 'Checking...';
            signupButton.disabled = true;

            // *** STEP 1: Check if email is associated with a suspended account ***
            const { data: emailCheck, error: emailError } = await supabase
                .from('customers')
                .select('status, email')
                .eq('email', email)
                .single();

            if (emailCheck && emailCheck.status === 'suspended') {
                showMessage('This email is associated with a suspended account. Please contact support.', true);
                signupButton.textContent = 'Create Account';
                signupButton.disabled = false;
                return;
            }

            // *** STEP 2: Check if phone is associated with a suspended account ***
            if (phone) {
                const { data: phoneCheck, error: phoneError } = await supabase
                    .from('customers')
                    .select('status, phone, email')
                    .eq('phone', phone);

                if (phoneCheck && phoneCheck.length > 0) {
                    const suspendedAccount = phoneCheck.find(acc => acc.status === 'suspended');
                    if (suspendedAccount) {
                        showMessage('This phone number is associated with a suspended account. Please contact support.', true);
                        signupButton.textContent = 'Create Account';
                        signupButton.disabled = false;
                        return;
                    }
                }
            }

            signupButton.textContent = 'Creating Account...';

            // STEP 3: Create the user in Supabase Auth
            const authUser = await signUp(email, password); // auth.js will show its own alert on failure

            if (authUser) {
                console.log("Signup Step 1 Success. Now creating customer profile...");

                // STEP 4: Generate unique customer ID with initials
                const customerUniqueId = generateCustomerUniqueId(fullName);
                console.log("Generated Customer ID:", customerUniqueId);

                const { error: profileError } = await supabase
                    .from('customers')
                    .insert([
                        {
                            id: authUser.id,
                            name: fullName,
                            email: email,
                            phone: phone,
                            customer_unique_id: customerUniqueId,
                            status: 'active'
                        }
                    ]);

                if (profileError) {
                    console.error("CRITICAL ERROR: User was created in Auth, but profile creation failed:", profileError);
                    showMessage("Your account was created, but we couldn't set up your profile. Please contact support. Error: " + profileError.message, true);
                } else {
                    console.log("Signup Step 2 Success. Profile created with ID:", customerUniqueId);
                    showMessage('Signup successful! Please check your email for a confirmation link.', false);
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000); // Redirect to login after 3 seconds
                }
            } else {
                // signIn function already showed an alert
                showMessage('Sign up failed. This email may already be in use.', true);
                signupButton.textContent = 'Create Account';
                signupButton.disabled = false;
            }
        });
    }
});