/* global getSupabase, getSession, logoutUser */
/* ============================================================
   CALCPRO 3D — APP CORE
   Auth guard, planos Free/Pro, storage por usuário, motor de
   precificação (7 marketplaces, taxas março/2026) e navegação.

   >>> INTEGRAÇÃO DE PAGAMENTO (leia antes de lançar o Pro) <<<
   A ativação do Pro hoje é local + user_metadata do Supabase.
   Quando plugar Stripe/Mercado Pago:
   1. No webhook de pagamento aprovado, grave o plano em
      app_metadata (via service role) — o cliente NÃO consegue
      editar app_metadata, diferente de user_metadata.
   2. Troque a leitura em getPlan() para
      session.user.app_metadata.plan.
   3. Aponte o botão "Assinar Pro" (planos.html) para o checkout.
   ============================================================ */

/* ---------- Utilidades ---------- */
const BRL = (v) => "R$ " + (isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PCT = (v) => (isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
const DATE_BR = (iso) => new Date(iso).toLocaleDateString("pt-BR");
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ---------- Sessão / lead ---------- */
function getLead() {
  try { return JSON.parse(localStorage.getItem("nm3d_lead") || "null"); } catch { return null; }
}

/**
 * Protege páginas do app: exige lead local ou sessão Supabase.
 * Retorna o lead {nome,email,whatsapp} ou redireciona para a landing.
 */
async function requireAuth() {
  const lead = getLead();
  if (lead && lead.nome) return lead;
  try {
    const session = await getSession();
    if (session?.user) {
      const u = session.user;
      const l = {
        nome: u.user_metadata?.full_name || u.email.split("@")[0],
        email: u.email,
        whatsapp: u.user_metadata?.whatsapp || "",
      };
      localStorage.setItem("nm3d_lead", JSON.stringify(l));
      return l;
    }
  } catch { /* segue para redirect */ }
  window.location.href = "index.html";
  return null;
}

async function appLogout() {
  localStorage.removeItem("nm3d_lead");
  localStorage.removeItem("sb-drcerqugqdzjxxilrdab-auth-token");
  try { await logoutUser(); } catch {}
  window.location.href = "index.html";
}

/* ---------- Plano Free / Pro ---------- */
const PRO_PRICE_LABEL = "R$ 19,90/mês";
const FREE_MK_IDS = ["shopee", "ml"];
const FREE_PIECE_LIMIT = 3;

function _planKey() {
  const lead = getLead();
  return "nm3d_plan:" + (lead?.email || "anon");
}

/** Lê o plano: user_metadata do Supabase (se logado) OU flag local. */
async function getPlan() {
  try {
    const session = await getSession();
    if (session?.user?.user_metadata?.plan === "pro") return "pro";
  } catch {}
  return localStorage.getItem(_planKey()) === "pro" ? "pro" : "free";
}

/** Ativa o Pro (stub do gateway — ver cabeçalho deste arquivo). */
async function activatePro() {
  localStorage.setItem(_planKey(), "pro");
  try {
    const sb = getSupabase();
    await sb.auth.updateUser({ data: { plan: "pro", plan_activated_at: new Date().toISOString() } });
  } catch { /* sem sessão: fica só local */ }
}

async function deactivatePro() {
  localStorage.removeItem(_planKey());
  try {
    const sb = getSupabase();
    await sb.auth.updateUser({ data: { plan: "free" } });
  } catch {}
}

/* ---------- Storage por usuário ---------- */
function _userKey(key) {
  const lead = getLead();
  return "nm3d:" + (lead?.email || "anon") + ":" + key;
}
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(_userKey(key));
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function saveData(key, value) {
  try { localStorage.setItem(_userKey(key), JSON.stringify(value)); } catch {}
}

/* Peças */
const getPieces = () => loadData("pieces", []);
function savePiece(name, inputs, existingId) {
  const pieces = getPieces();
  const now = new Date().toISOString();
  if (existingId) {
    const p = pieces.find((x) => x.id === existingId);
    if (p) { p.name = name; p.inputs = inputs; p.updatedAt = now; saveData("pieces", pieces); return p; }
  }
  const piece = { id: uid(), name, inputs, createdAt: now, updatedAt: now };
  pieces.unshift(piece);
  saveData("pieces", pieces);
  return piece;
}
function deletePiece(id) { saveData("pieces", getPieces().filter((p) => p.id !== id)); }
function duplicatePiece(id) {
  const pieces = getPieces();
  const src = pieces.find((p) => p.id === id);
  if (!src) return;
  const now = new Date().toISOString();
  pieces.unshift({ ...src, id: uid(), name: src.name + " (cópia)", createdAt: now, updatedAt: now });
  saveData("pieces", pieces);
}

/* Clientes */
const getClients = () => loadData("clients", []);
function saveClient(data, existingId) {
  const clients = getClients();
  if (existingId) {
    const c = clients.find((x) => x.id === existingId);
    if (c) { Object.assign(c, data); saveData("clients", clients); return c; }
  }
  const client = { ...data, id: uid(), createdAt: new Date().toISOString() };
  clients.unshift(client);
  saveData("clients", clients);
  return client;
}
function deleteClient(id) { saveData("clients", getClients().filter((c) => c.id !== id)); }

/* Orçamentos */
const getQuotes = () => loadData("quotes", []);
function saveQuote(data, existingId) {
  const quotes = getQuotes();
  const now = new Date().toISOString();
  if (existingId) {
    const q = quotes.find((x) => x.id === existingId);
    if (q) { Object.assign(q, data, { updatedAt: now }); saveData("quotes", quotes); return q; }
  }
  const number = quotes.reduce((m, q) => Math.max(m, q.number), 0) + 1;
  const quote = { ...data, id: uid(), number, status: data.status || "rascunho", createdAt: now, updatedAt: now };
  quotes.unshift(quote);
  saveData("quotes", quotes);
  return quote;
}
function deleteQuote(id) { saveData("quotes", getQuotes().filter((q) => q.id !== id)); }
function quoteTotals(q) {
  const subtotal = q.items.reduce((s, it) => s + (+it.unitPrice || 0) * (+it.quantity || 0), 0);
  const discount = subtotal * ((+q.discountPct || 0) / 100);
  const total = subtotal - discount + (+q.shippingCharge || 0);
  return { subtotal, discount, total };
}

/* Configurações da loja */
const DEFAULT_SETTINGS = {
  name: "", tagline: "", doc: "", email: "", phone: "", address: "",
  logoDataUrl: "",
  quoteFooter: "Orçamento sujeito a confirmação de disponibilidade. Valores válidos dentro do prazo indicado.",
};
const getSettings = () => ({ ...DEFAULT_SETTINGS, ...loadData("settings", {}) });
const saveSettings = (s) => saveData("settings", s);

/* Handoffs entre páginas */
const requestPieceLoad = (id) => localStorage.setItem(_userKey("load-piece"), id);
function consumePieceLoad() {
  const k = _userKey("load-piece");
  const id = localStorage.getItem(k);
  if (id) localStorage.removeItem(k);
  return id;
}
const requestQuoteEdit = (id) => localStorage.setItem(_userKey("edit-quote"), id);
function consumeQuoteEdit() {
  const k = _userKey("edit-quote");
  const id = localStorage.getItem(k);
  if (id) localStorage.removeItem(k);
  return id;
}

/* ---------- Motor de precificação (taxas março/2026) ---------- */
const FEES_VIGENCIA = "março/2026";

const MARKETPLACES = [
  {
    id: "shopee", label: "Shopee", color: "var(--mk-shopee)",
    tiers: [
      { min: 0, max: 7.99, comm: 0.50, fixed: 0 },
      { min: 8, max: 79.99, comm: 0.20, fixed: 4 },
      { min: 80, max: 99.99, comm: 0.14, fixed: 16 },
      { min: 100, max: 199.99, comm: 0.14, fixed: 20 },
      { min: 200, max: Infinity, comm: 0.14, fixed: 26 },
    ],
    noteFor(p) {
      const t = this.tiers.find((t) => p >= t.min && p <= t.max) || this.tiers[this.tiers.length - 1];
      return (t.comm * 100).toFixed(0) + "% comissão + R$" + t.fixed.toFixed(0) + " taxa fixa";
    },
  },
  {
    id: "ml", label: "Mercado Livre (Clássico)", color: "var(--mk-ml)",
    tiers: [
      { min: 0, max: 78.99, comm: 0.14, fixed: 6.50 },
      { min: 79, max: Infinity, comm: 0.14, fixed: 0 },
    ],
    noteFor(p) {
      return p < 79 ? "14% comissão + R$6,50 custo fixo (< R$79)" : "14% comissão — sem custo fixo (≥ R$79)";
    },
  },
  {
    id: "ml_premium", label: "Mercado Livre (Premium)", color: "var(--mk-ml-prem)",
    tiers: [
      { min: 0, max: 78.99, comm: 0.18, fixed: 6.50 },
      { min: 79, max: Infinity, comm: 0.18, fixed: 0 },
    ],
    noteFor(p) {
      return p < 79 ? "18% comissão + R$6,50 custo fixo (< R$79)" : "18% comissão — parcelamento sem juros (≥ R$79)";
    },
  },
  {
    id: "amazon", label: "Amazon", color: "var(--mk-amazon)",
    tiers: [{ min: 0, max: Infinity, comm: 0.15, fixed: 2 }],
    noteFor() { return "~15% comissão + R$2,00/item (plano individual)"; },
  },
  {
    id: "magalu", label: "Magalu", color: "var(--mk-magalu)",
    tiers: [{ min: 0, max: Infinity, comm: 0.16, fixed: 3 }],
    noteFor() { return "~16% comissão + R$3,00 fixo por pedido"; },
  },
  {
    id: "elo7", label: "Elo7", color: "var(--mk-elo7)",
    tiers: [{ min: 0, max: Infinity, comm: 0.20, fixed: 0 }],
    noteFor() { return "~20% comissão (sem taxa fixa)"; },
  },
  {
    id: "own", label: "Loja Própria", color: "var(--mk-own)",
    tiers: [{ min: 0, max: Infinity, comm: 0.05, fixed: 0 }],
    noteFor() { return "~5% taxa do gateway de pagamento"; },
  },
];

/** Preço sugerido para entregar a margem desejada (com imposto). */
function mkSuggestPrice(mk, totalCost, marginPct, taxPct) {
  const target = totalCost * (1 + marginPct / 100);
  const tax = (taxPct || 0) / 100;
  for (const tier of mk.tiers) {
    const denom = 1 - tier.comm - tax;
    if (denom <= 0) continue;
    const price = (target + tier.fixed) / denom;
    if (price >= tier.min - 0.01 && price <= tier.max + 0.01) return Math.ceil(price * 100) / 100;
  }
  const last = mk.tiers[mk.tiers.length - 1];
  const denom = 1 - last.comm - tax;
  if (denom <= 0) return 0;
  return Math.ceil(((target + last.fixed) / denom) * 100) / 100;
}

/** Resultado completo (taxas, imposto, lucro, margem real) para um preço. */
function mkResultAtPrice(mk, price, totalCost, taxPct) {
  const tier = mk.tiers.find((t) => price >= t.min && price <= t.max) || mk.tiers[mk.tiers.length - 1];
  const fees = price > 0 ? tier.comm * price + tier.fixed : 0;
  const tax = price * ((taxPct || 0) / 100);
  const profit = price - totalCost - fees - tax;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return { id: mk.id, label: mk.label, color: mk.color, price, fees, tax, profit, margin, note: mk.noteFor(price) };
}

/** Alguma seleção fica inviável (comissão + imposto >= 100%)? */
function hasImpossibleMargin(taxPct, ids) {
  const tax = (taxPct || 0) / 100;
  return MARKETPLACES.filter((m) => !ids || ids.includes(m.id))
    .some((m) => m.tiers.every((t) => 1 - t.comm - tax <= 0));
}

/* ---------- Navegação do app ---------- */
const APP_TABS = [
  { href: "calculadora.html", label: "Calculadora", pro: false },
  { href: "pecas.html", label: "Peças", pro: false },
  { href: "clientes.html", label: "Clientes", pro: true },
  { href: "orcamentos.html", label: "Orçamentos", pro: true },
  { href: "configuracoes.html", label: "Configurações", pro: false },
];

const LOGO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="6" rx="1"/><path d="M6 14H4a2 2 0 0 1-2-2v-1a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2h-2"/><rect x="7" y="13" width="10" height="8" rx="1"/></svg>';
const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

/**
 * Renderiza topbar + abas dentro de #appChrome.
 * active = href da página atual.
 */
function renderAppChrome(active, lead, plan) {
  const el = document.getElementById("appChrome");
  if (!el) return;
  const isPro = plan === "pro";
  const first = esc((lead?.nome || "").split(" ")[0]);
  el.innerHTML =
    '<header class="topbar">' +
      '<a class="logo" href="index.html"><span class="mk">' + LOGO_SVG + '</span>CALC<span class="acid">PRO 3D</span></a>' +
      '<div class="topbar-right">' +
        '<span class="welcome">Olá, <b>' + first + '</b></span>' +
        '<a class="plan-badge' + (isPro ? " pro" : "") + '" href="planos.html" title="Ver planos">' + (isPro ? "Pro" : "Free") + "</a>" +
        '<button class="btn btn-sm" onclick="appLogout()">Sair</button>' +
      "</div>" +
    "</header>" +
    '<nav class="app-tabs" aria-label="Navegação do app">' +
      APP_TABS.map((t) =>
        '<a class="app-tab' + (t.href === active ? " active" : "") + '" href="' + t.href + '">' +
          t.label + (t.pro && !isPro ? ' <span class="tag-pro">Pro</span>' : "") +
        "</a>"
      ).join("") +
    "</nav>";
}

/** HTML de parede Pro para páginas inteiras. */
function proWallHTML(title, desc) {
  return (
    '<div class="pro-wall cut">' +
      '<div class="pw-icon">' + LOCK_SVG + "</div>" +
      "<h2>" + title + ' <span class="tag-pro">Pro</span></h2>' +
      "<p>" + desc + "</p>" +
      '<a class="btn btn-acid cut" href="planos.html">Conhecer o plano Pro</a>' +
    "</div>"
  );
}
