// js/signup.js

import { signUp, supabase } from './auth.js';
// We import supabase here now to use it directly for getting the user and inserting the profile

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

            // --- Pre-checks (Suspended account check logic remains the same) ---
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

            const authResponse = await supabase.auth.signUp({ email, password });
            const authUser = authResponse.data.user;
            const authError = authResponse.error;


            if (authError) {
                console.error("Supabase Auth SignUp Error:", authError);
                showMessage(authError.message.includes('User already registered') ? 'This email is already in use.' : 'Sign up failed.', true);

            } else if (authUser) {
                console.log("Signup Step 1 Success. Waiting for session stability...");
                showMessage('Account created! Setting up profile...', false);
                
                // --- CRITICAL FIX: Add a small delay and force session refresh ---
                // This ensures the RLS policy has a chance to see the new user's JWT
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Fetch the latest user object (optional, but helps ensure state is fresh)
                const { data: { user: latestUser } } = await supabase.auth.getUser();


                if (!latestUser) {
                     // Should not happen, but critical safety check
                    showMessage("Internal Error: Profile creation failed because we lost the user session.", true);
                    return;
                }
                
                const customerUniqueId = generateCustomerUniqueId(fullName);
                console.log("Generated Customer ID:", customerUniqueId);

                const { error: profileError } = await supabase
                    .from('customers')
                    .insert([
                        {
                            id: latestUser.id, // Use the ID from the fresh session
                            name: fullName,
                            email: email,
                            phone: phone,
                            customer_unique_id: customerUniqueId,
                            status: 'active'
                        }
                    ]);

                if (profileError) {
                    console.error("CRITICAL ERROR: Profile creation failed (RLS violation suspected):", profileError);
                    
                    // Display the RLS error and instruct user on next steps
                    showMessage("Your account was created, but we couldn't set up your profile. Please log in again to retry or contact support. Error: " + profileError.message, true);
                    
                    // Sign out the partially created user so they can log back in
                    await supabase.auth.signOut();
                    
                } else {
                    console.log("Signup Step 2 Success. Profile created with ID:", customerUniqueId);
                    
                    // Since email confirmation is required, tell them to check email
                    showMessage('Signup successful! Please check your email for a confirmation link.', false);
                    
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 4000); // Give them time to read the confirmation message
                }
            }
            
            signupButton.textContent = 'Create Account';
            signupButton.disabled = false;
        });
    }
});
