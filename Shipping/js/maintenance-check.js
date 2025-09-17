import { supabase } from './supabase-client.js';

// This function runs immediately to check the site's status.
async function checkMaintenanceMode() {
    // Fetch the single row of settings from the database.
    // We only need the 'maintenance_mode' column.
    const { data, error } = await supabase
        .from('settings')
        .select('maintenance_mode')
        .eq('id', 1)
        .single();

    if (error) {
        // If we can't fetch settings, it's safer to assume maintenance is on.
        console.error("Could not check maintenance mode:", error);
        // You could redirect here too as a fallback if you want maximum protection.
        return;
    }

    // If maintenance mode is true, redirect the user.
    if (data && data.maintenance_mode === true) {
        // Make sure the user isn't already on the maintenance page to avoid a redirect loop.
        if (!window.location.pathname.endsWith('maintenance.html')) {
            window.location.href = 'maintenance.html';
        }
    }
}

// Run the check as soon as the script is loaded.
checkMaintenanceMode();