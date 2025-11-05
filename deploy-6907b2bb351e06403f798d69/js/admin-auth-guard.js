// js/admin-auth-guard.js (FIXED)
import { supabase, getSession, logoutAndRedirect, checkAdminRole } from './auth.js';

console.log("admin-auth-guard.js: Script loaded!");

const dashboardLayout = document.querySelector('.dashboard-layout');

// --- Helper to hide protected content (visual cue for unauthenticated/unauthorized) ---
const hideProtectedContent = () => {
    if (dashboardLayout) {
        dashboardLayout.style.display = 'none'; // Hide entire admin dashboard layout
        console.log("admin-auth-guard.js: Protected admin content hidden.");
    }
};

// --- Helper to show content ---
const showProtectedContent = () => {
    if (dashboardLayout) {
        dashboardLayout.style.display = 'flex'; // Show the layout
        console.log("admin-auth-guard.js: Protected admin content shown.");
    }
};

// --- Main Auth Check for Admin Pages ---
async function checkAdminAuthAndHandleRedirect() {
    console.log(`admin-auth-guard.js: checkAdminAuthAndHandleRedirect() called on ${window.location.pathname}.`);

    // Hide content first to prevent flash
    hideProtectedContent();

    const session = await getSession();

    if (!session) {
        // No session found at all, redirect to admin login
        console.log("admin-auth-guard.js: No session found. Redirecting to admin-login.html.");
        // No need to hide, already hidden
        await logoutAndRedirect('admin-login.html'); // Logout (cleans up any partial state) and redirect
        return false;
    } else {
        // Session exists, now check if this user is an ADMIN
        const isAdmin = await checkAdminRole(session.user.id);

        if (!isAdmin) {
            // User is logged in, but not found in 'admins' table
            console.warn("admin-auth-guard.js: User is authenticated but NOT AN ADMIN. Redirecting to admin-login.html.");
            // No need to hide, already hidden
            alert('You do not have administrative privileges.');
            await logoutAndRedirect('admin-login.html'); // Force logout if not an admin
            return false;
        }

        console.log("admin-auth-guard.js: Session active. User is authenticated and confirmed as Admin.");

        // --- THIS IS THE FIX ---
        // We are an admin, so show the page content
        showProtectedContent();

        return true;
    }
}

// --- Initial Auth Check on Script Load ---
(async () => {
    console.log("admin-auth-guard.js: Initial execution of admin auth check started.");
    await checkAdminAuthAndHandleRedirect();
    console.log("admin-auth-guard.js: Initial execution of admin auth check finished.");
})();