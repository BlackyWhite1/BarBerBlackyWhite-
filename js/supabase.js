// Configuración pública de Supabase. La Publishable Key puede usarse en el navegador
// cuando RLS y las políticas están correctamente configuradas.
const SUPABASE_URL = 'https://torwmszbkayzagpnktae.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QFTAJgJbngGR8DtGHVlcIg_Wn7oDdEh';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Compatibilidad con el panel de administración
window.supabaseClient = supabaseClient;
