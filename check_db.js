const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const parts = trimmed.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    process.env[key] = value;
                }
            }
        });
    }
} catch (e) {
    console.error('Error loading env file:', e);
}

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Connecting to:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test selecting a row from barberos
    const { data: barberos, error } = await supabase.from('barberos').select('*').limit(1);
    if (error) {
        console.error('Error fetching barberos:', error);
    } else {
        console.log('Barberos row keys:', barberos && barberos.length > 0 ? Object.keys(barberos[0]) : 'No rows found');
        console.log('Full row:', barberos?.[0]);
    }
}

run();
