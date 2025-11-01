// js/auth.js (Final, Simplified, and Role-Aware with Admin Role Check)

import { supabase } from './supabase-client.js';

// --- USER SESSION MANAGEMENT ---
/**
 * Retrieves the current user session, which includes the auth token and user data.
 * @returns {Promise<object|null>} The session object or null if no session exists.
 */
const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) { 
        console.error("auth.js: Error getting session:", error); 
        return null; 
    }
    return data.session;
};

// --- CORE AUTH FUNCTIONS ---

/**
 * Signs up a new user in Supabase Auth.
 * The public profile is now created separately by the calling function (e.g., in signup.js).
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @returns {Promise<object|null>} The user object on success, or null on failure.
 */
const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
        email: email, 
        password: password,
    });

    if (error) {
        console.error("auth.js: Supabase Auth SignUp Error:", error);
        alert('Signup Error: ' + error.message);
        return null;
    }
    
    console.log("auth.js: Supabase Auth SignUp successful for:", data.user.email);
    return data.user;
};

/**
 * Signs in a regular user (customer). Does not redirect.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<object|null>} The user object on success, or null on failure.
 */
const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email, 
        password: password,
    });

    if (error) { 
        let errorMessage = error.message.includes('invalid login credentials') 
            ? 'Invalid email or password. Please try again.'
            : 'Login Error: ' + error.message;
        alert(errorMessage); 
        return null; 
    }
    
    console.log("auth.js: Successful customer login for:", data.user.email);
    return data.user;
};

/**
 * Signs in an admin user. Does not redirect.
 * @param {string} email - The admin's email.
 * @param {string} password - The admin's password.
 * @returns {Promise<object|null>} The user object on success, or null on failure.
 */
const adminSignIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email, 
        password: password,
    });

    if (error) {
        let errorMessage = error.message.includes('invalid login credentials')
            ? 'Invalid email or password. Please try again.'
            : 'Admin Login Error: ' + error.message;
        alert(errorMessage);
        return null;
    }

    console.log("auth.js: Successful admin login for:", data.user.email);
    return data.user;
};

/**
 * Verifies if a user is a legitimate admin by checking against the 'admins' table.
 * This provides a second layer of security beyond the JWT role claim.
 * @param {string} userId - The UUID of the user to check.
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
const checkAdminRole = async (userId) => {
    if (!userId) return false;

    try {
        // This efficient query only checks for existence (count) without downloading data.
        const { count, error } = await supabase
            .from('admins')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error("auth.js: Error checking admin role:", error);
            return false;
        }

        // If count is 1, the user's ID was found in the admins table.
        return count === 1;

    } catch (err) {
        console.error("auth.js: Unexpected error in checkAdminRole:", err);
        return false;
    }
};

/**
 * Signs the user out and redirects them to a specified path.
 * This is the primary function to use for logout actions.
 * @param {string} [redirectPath='index.html'] - The path to redirect to after logout.
 * @returns {Promise<boolean>} True on success, false on failure.
 */
const logoutAndRedirect = async (redirectPath = 'index.html') => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('auth.js: Supabase signOut Error:', error);
        alert('An error occurred during logout. Please try again.');
        return false;
    }
    
    console.log(`auth.js: User signed out. Redirecting to ${redirectPath}`);
    window.location.href = redirectPath;
    return true;
};

/**
 * A simple alias for logging out, typically used for security actions like password changes.
 */
const signOut = async () => {
    await logoutAndRedirect('index.html');
};

/**
 * Sends a password reset email to the user.
 * @param {string} email - The email address to send the reset link to.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success and a message.
 */
const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password.html'
    });
    
    if (error) {
        console.error("Password reset error:", error);
        return { success: false, message: error.message };
    }
    
    return { success: true, message: 'Password reset link sent! Please check your email.' };
};

// Export all functions to be used across the application
export { 
    supabase, 
    getSession, 
    signUp, 
    signIn, 
    adminSignIn, 
    checkAdminRole,
    signOut, 
    resetPassword, 
    logoutAndRedirect 
};