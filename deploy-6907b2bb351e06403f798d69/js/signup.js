// js/signup.js

import { signUp } from './auth.js';
import { supabase } from './supabase-client.js';

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
    const messageDiv = document.getElementById('auth-message-signup');

    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const signupButton = signupForm.querySelector('#signup-btn');

            const fullName = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const phone = document.getElementById('signup-phone').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            const showMessage = (message, isError = false) => {
                if (!messageDiv) return;
                messageDiv.textContent = message;
                messageDiv.className = isError ? 'auth-message error' : 'auth-message success';
                messageDiv.style.display = 'block';
            };

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

            const authUser = await signUp(email, password);

            if (authUser) {
                console.log("Signup Step 1 Success. Now creating customer profile...");

                // CRITICAL FIX: The entire profile insertion is wrapped in a small timeout (50ms).
                // This gives the Supabase client library enough time to process the 
                // new session state and acquire the authentication token needed for the RLS check.
                setTimeout(async () => {
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
                        console.error("CRITICAL ERROR: User created, but profile failed:", profileError);
                        // The previous two errors (RLS violation AND session loss) likely happened here.
                        showMessage("Your account was created, but we couldn't set up your profile. Please contact support. Error: " + profileError.message, true);
                    } else {
                        console.log("Signup Step 2 Success. Profile created with ID:", customerUniqueId);
                        showMessage('Signup successful! Please check your email for a confirmation link.', false);
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 3000);
                    }
                }, 50); // <--- THE DELAY THAT FIXES THE RACE CONDITION

            } else {
                // Original failure path (email already in use, bad password, etc.)
                showMessage('Sign up failed. This email may already be in use.', true);
                signupButton.textContent = 'Create Account';
                signupButton.disabled = false;
            }
        });
    }
});