/* ============================================================
   SUPABASE CONFIG — CustoPrint MVP
   ============================================================

   SQL para criar a tabela no Supabase (rode no SQL Editor):

   CREATE TABLE leads (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     nome text NOT NULL,
     email text NOT NULL,
     whatsapp text NOT NULL,
     consent_at timestamptz NOT NULL,
     created_at timestamptz DEFAULT now()
   );

   ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "anon_insert" ON leads
     FOR INSERT TO anon WITH CHECK (true);

   CREATE POLICY "auth_select" ON leads
     FOR SELECT TO authenticated USING (true);

   CREATE POLICY "auth_delete" ON leads
     FOR DELETE TO authenticated USING (true);

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
  const { data, error } = await sb.from('leads').insert([{
    nome, email, whatsapp, consent_at: consentAt
  }]);
  if (error) throw error;
  return data;
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

async function loginAdmin(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function logoutAdmin() {
  const sb = getSupabase();
  await sb.auth.signOut();
}

async function getSession() {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  return data?.session;
}
