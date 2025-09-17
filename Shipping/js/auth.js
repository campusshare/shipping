import { supabase } from './supabase-client.js';

// --- USER SESSION MANAGEMENT ---
const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) { console.error("Error getting session:", error); return null; }
    return data.session;
};

// --- CORE AUTH FUNCTIONS ---
const signUp = async (fullName, email, password, phone) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email, password: password,
    });
    if (authError) { alert('Signup Error: ' + authError.message); return null; }
    if (!authData.user) { alert('Signup successful, but user data not returned. Please check your email to verify.'); return null; }
    
    const { error: customerError } = await supabase.from('customers').insert([{ 
        id: authData.user.id, name: fullName, email: email, phone: phone
    }]);
    if (customerError) {
        console.error("DATABASE ERROR creating customer profile:", customerError);
        alert('Signup Error: Could not create customer profile. Error: ' + customerError.message);
        return null;
    }
    return authData.user;
};

const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email, password: password,
    });
    if (error) { alert('Login Error: ' + error.message); return null; }
    return data.user;
};

const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout Error:', error);
    window.location.href = 'index.html'; 
};

// (!!!) THIS IS THE UPDATED FUNCTION (!!!)
const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
        provider: 'google',
    });
};

// --- PROFILE UPSERT ON LOGIN (Handles Google Sign-In) ---
// This function runs when the user is redirected back from Google.
supabase.auth.onAuthStateChange(async (event, session) => {
    // This event fires on SIGNED_IN for both password and Google login
    if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        
        // Check if a customer profile already exists
        const { data: customer, error: getError } = await supabase
            .from('customers')
            .select('id')
            .eq('id', user.id)
            .single();

        if (getError && getError.code !== 'PGRST116') { // PGRST116 means "not found", which is what we want for new users
            console.error('Error checking for customer profile:', getError);
            return;
        }

        // If no profile exists, create one
        if (!customer) {
            const { error: insertError } = await supabase.from('customers').insert([{
                id: user.id,
                name: user.user_metadata.full_name || user.email, // Use Google name, fallback to email
                email: user.email,
                phone: user.phone || null
            }]);
            if (insertError) {
                console.error('Error creating customer profile after Google sign-in:', insertError);
            } else {
                console.log('New customer profile created for Google user.');
            }
        }
    }
});

export { getSession, signUp, signIn, signOut, signInWithGoogle };