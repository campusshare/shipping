// js/auth-guard.js - Fixed with Better Path Detection
import { supabase } from './supabase-client.js';
import { getSession } from './auth.js';

console.log("auth-guard.js: Role-aware guard loaded!");

(async () => {
    const currentPath = window.location.pathname;
    console.log("auth-guard.js: Current path detected:", currentPath);

    // Normalize path - remove leading slash for comparison
    const normalizedPath = currentPath.replace(/^\//, '');

    // Public paths that don't require authentication
    const publicPaths = [
        'index.html',
        'login.html',
        'signup.html',
        'admin-login.html',
        'forgot-password.html',
        'update-password.html',
        'about.html', // <-- ADDED
        'contact.html', // <-- ADDED
        ''  // Root path
    ];

    // Check if current page is public
    const isPublicPage = publicPaths.some(path => {
        return normalizedPath === path ||
            normalizedPath.endsWith('/' + path) ||
            currentPath === '/' + path ||
            (path === '' && (currentPath === '/' || currentPath === ''));
    });

    console.log("auth-guard.js: Is public page?", isPublicPage);

    // Allow public pages without checking auth
    if (isPublicPage) {
        console.log("Guard: Public page, allowing access.");
        return;
    }

    // Protected pages - check authentication
    const adminPaths = ['admin-dashboard.html', 'admin-login.html'];
    const customerPaths = ['dashboard.html'];

    try {
        const session = await getSession();

        if (!session) {
            console.log("Guard: No session found. Redirecting to login.");
            const isAdminPage = adminPaths.some(path => normalizedPath.includes(path));
            window.location.href = isAdminPage ? 'admin-login.html' : 'login.html';
            return;
        }

        const userId = session.user.id;
        console.log("Guard: Session found. User ID:", userId);

        // Check if this is an admin (try admin table first)
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('role')
            .eq('id', userId)
            .single();

        if (adminData) {
            console.log("Guard: User is an admin.");
            // Admin trying to access customer page
            const isCustomerPage = customerPaths.some(path => normalizedPath.includes(path));
            if (isCustomerPage) {
                console.log("Guard: Admin trying to access customer page. Redirecting to admin dashboard.");
                window.location.href = 'admin-dashboard.html';
                return;
            }
            console.log("Guard: Admin is in the correct location. Access granted.");
            return;
        }

        // Not an admin, check if customer exists
        const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('status')
            .eq('id', userId)
            .single();

        if (customerError || !customerData) {
            console.log("Guard: User not found in customers or admins table. Logging out.");
            await supabase.auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        // Check if customer account is suspended
        if (customerData.status === 'suspended') {
            console.log("Guard: Customer account is suspended. Logging out.");
            await supabase.auth.signOut();
            alert('Your account has been suspended. Please contact support for assistance.');
            window.location.href = 'login.html';
            return;
        }

        console.log("Guard: User role is 'customer'.");

        // Customer trying to access admin page
        const isAdminPage = adminPaths.some(path => normalizedPath.includes(path));
        if (isAdminPage) {
            console.log("Guard: Customer trying to access admin page. Redirecting to customer dashboard.");
            window.location.href = 'dashboard.html';
            return;
        }

        console.log("Guard: User is in the correct location for their role. Access granted.");

    } catch (error) {
        console.error("Guard: Error during authentication check:", error);
        window.location.href = 'login.html';
    }
})();