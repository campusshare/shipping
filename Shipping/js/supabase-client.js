import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace these with your actual Supabase project URL and public API key
const SUPABASE_URL = 'https://ozhyflsobsoaypihwrco.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aHlmbHNvYnNvYXlwaWh3cmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzkwNDgsImV4cCI6MjA3MzU1NTA0OH0.a8BO3FdWtxA-jbrjjXxnBC962qeOgK032oLhmCpCHlk';

// Create a single Supabase client for interacting with your database
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Export the client to be used in other files
export { supabase };