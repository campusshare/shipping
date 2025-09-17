import { supabase } from './supabase-client.js';

// This function checks for an active session
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    // If there is no session, redirect to the login page
    if (!session) {
        window.location.href = 'admin-login.html';
    }
}

// THE FIX FOR THE "BACK BUTTON" PROBLEM
// This event fires every time the page is displayed, including from the back/forward cache.
window.addEventListener('pageshow', function(event) {
    // The 'persisted' property is true if the page was loaded from the cache.
    if (event.persisted) {
        // If the page is from the cache, we can't trust its state after a logout.
        // Force a full reload to re-run our auth check.
        window.location.reload();
    }
});

// Run the initial check as soon as the script loads
checkAuth();