/* ============================================================
   SUPABASE CONFIG — CalcPro 3D MVP
   ============================================================

   SQL de setup (rode no SQL Editor do Supabase):

   -- Tabela de leads
   CREATE TABLE IF NOT EXISTS leads (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     nome text NOT NULL,
     email text NOT NULL,
     whatsapp text NOT NULL,
     consent_at timestamptz NOT NULL,
     created_at timestamptz DEFAULT now()
   );

   -- Funcao segura para insert (SECURITY DEFINER = bypassa RLS)
   CREATE OR REPLACE FUNCTION insert_lead(
     p_nome text,
     p_email text,
     p_whatsapp text,
     p_consent_at timestamptz
   ) RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   BEGIN
     INSERT INTO leads (nome, email, whatsapp, consent_at)
     VALUES (p_nome, p_email, p_whatsapp, p_consent_at);
   END;
   $$;

   -- Permissoes
   GRANT EXECUTE ON FUNCTION insert_lead TO anon;
   REVOKE ALL ON leads FROM anon;
   GRANT SELECT, DELETE ON leads TO authenticated;

   -- RLS: apenas authenticated pode ler/deletar
   ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

   DROP POLICY IF EXISTS "anon_insert" ON leads;
   DROP POLICY IF EXISTS "anon_select" ON leads;
   DROP POLICY IF EXISTS "anon_select_own" ON leads;

   CREATE POLICY "auth_select" ON leads
     FOR SELECT TO authenticated USING (true);

   CREATE POLICY "auth_delete" ON leads
     FOR DELETE TO authenticated USING (true);

   NOTIFY pgrst, 'reload schema';

   ============================================================ */

const SUPABASE_URL = 'https://drcerqugqdzjxxilrdab.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyY2VycXVncWR6anh4aWxyZGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzk1MzcsImV4cCI6MjA5NzY1NTUzN30.9cT7QsqLucWDtLimMokUgNsZjTt4k41APEvigkd70E8';

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

async function saveLead(nome, email, whatsapp, consentAt) {
  const sb = getSupabase();
  const { error } = await sb.rpc('insert_lead', {
    p_nome: nome,
    p_email: email,
    p_whatsapp: whatsapp,
    p_consent_at: consentAt
  });
  if (error) throw error;
}

async function deleteLead(id) {
  const sb = getSupabase();
  const { error } = await sb.from('leads').delete().eq('id', id);
  if (error) throw error;
}

async function getLeads(search) {
  const sb = getSupabase();
  let q = sb.from('leads').select('*').order('created_at', { ascending: false });
  if (search) {
    q = q.or(`nome.ilike.%${search}%,email.ilike.%${search}%,whatsapp.ilike.%${search}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function signUpEmail(email, password, nome, whatsapp) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: nome, whatsapp: whatsapp } }
  });
  if (error) throw error;
  return data;
}

async function signInEmail(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signInGoogle(redirectTo) {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
  if (error) throw error;
}

async function logoutUser() {
  const sb = getSupabase();
  await sb.auth.signOut({ scope: 'local' });
}

async function getSession() {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  return data?.session;
}
