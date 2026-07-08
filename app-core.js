/* global getSupabase, getSession, logoutUser */
/* ============================================================
   CALCPRO 3D — APP CORE
   Auth guard, planos Free/Pro, storage por usuário, motor de
   precificação (7 marketplaces, taxas março/2026) e navegação.

   >>> INTEGRAÇÃO DE PAGAMENTO (leia antes de lançar o Pro) <<<
   O Pro está EM BREVE: liberado somente para ADMIN_EMAILS
   (supabase-config.js). Quando plugar Stripe/Mercado Pago:
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

/* ---------- Plano Free / Pro ----------
   O Pro está EM BREVE para o público: não existe mais ativação
   self-service. Hoje o Pro é liberado apenas para os e-mails em
   ADMIN_EMAILS (supabase-config.js) — os mesmos que acessam o
   painel admin. Quando o plano for lançado com pagamento, a
   ativação real deve vir do webhook do gateway gravando em
   app_metadata (via service role) — ver comentário no topo. */
const PRO_PRICE_LABEL = "R$ 19,90/mês";
const PRO_COMING_SOON = true;
const FREE_MK_IDS = ["shopee", "ml"];
const FREE_PIECE_LIMIT = 3;

/** Lê o plano: "pro" apenas para administradores (por enquanto). */
async function getPlan() {
  try {
    const session = await getSession();
    if (session?.user?.email && isAdminEmail(session.user.email)) return "pro";
  } catch {}
  const lead = getLead();
  if (lead?.email && isAdminEmail(lead.email)) return "pro";
  return "free";
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

/* ----- Mercado Livre: comissão por categoria (referência 2026) -----
   Valores médios por categoria (Clássico / Premium). Subcategorias
   variam ±1pp — o hint na UI orienta conferir o anúncio. */
const ML_CATEGORIES = [
  { id: "casa",        label: "Casa, Móveis e Decoração",    classic: 13,   premium: 18 },
  { id: "brinquedos",  label: "Brinquedos e Hobbies",        classic: 13.5, premium: 18.5 },
  { id: "veiculos",    label: "Acessórios para Veículos",    classic: 11.5, premium: 16.5 },
  { id: "eletronicos", label: "Eletrônicos, Áudio e Vídeo",  classic: 12,   premium: 17 },
  { id: "informatica", label: "Informática",                 classic: 12,   premium: 17 },
  { id: "ferramentas", label: "Ferramentas",                 classic: 12.5, premium: 17.5 },
  { id: "esporte",     label: "Esporte e Lazer",             classic: 13,   premium: 18 },
  { id: "beleza",      label: "Beleza e Cuidados Pessoais",  classic: 13.5, premium: 18.5 },
  { id: "saude",       label: "Saúde",                       classic: 13.5, premium: 18.5 },
  { id: "eletrodom",   label: "Eletrodomésticos",            classic: 12.5, premium: 17.5 },
  { id: "moda",        label: "Moda",                        classic: 14,   premium: 19 },
  { id: "outra",       label: "Outra categoria",             classic: 14,   premium: 18 },
];

/* Contexto do ML usado pelo motor (categoria + peso p/ frete).
   As páginas atualizam via setMlContext() antes de calcular. */
let ML_CTX = { catId: "casa", weightKg: 0.3, freteAuto: true };
function setMlContext(partial) { ML_CTX = { ...ML_CTX, ...partial }; }
function mlCat() { return ML_CATEGORIES.find((c) => c.id === ML_CTX.catId) || ML_CATEGORIES[0]; }

/* ----- Custo fixo por unidade do ML (2026) ----- */
function mlFixedCost(price) {
  if (price >= 79) return 0;
  if (price >= 20) return 6.00;
  if (price >= 12.50) return 5.50;
  return price * 0.5; // abaixo de R$12,50: máx. metade do preço
}

/* ----- Envios ML 2026 (reputação verde / sem reputação) -----
   Fonte: mercadolivre.com.br/ajuda/40538. Custo por peso (com
   embalagem) × faixa de preço do anúncio. Aplica-se a toda venda;
   ≥ R$79 o frete grátis rápido é obrigatório. */
const ML_SHIP_BANDS = [18.99, 48.99, 78.99, 99.99, 119.99, 149.99, 199.99, Infinity];
const ML_SHIP_TABLE = [
  [0.3,  [5.65, 6.55, 7.75, 12.35, 14.35, 16.45, 18.45, 20.95]],
  [0.5,  [5.95, 6.65, 7.85, 13.25, 15.45, 17.65, 19.85, 22.55]],
  [1,    [6.05, 6.75, 7.95, 13.85, 16.15, 18.45, 20.75, 23.65]],
  [1.5,  [6.15, 6.85, 8.05, 14.15, 16.45, 18.85, 21.15, 24.65]],
  [2,    [6.25, 6.95, 8.15, 14.45, 16.85, 19.25, 21.65, 24.65]],
  [3,    [6.35, 7.95, 8.55, 15.75, 18.35, 21.05, 23.65, 26.25]],
  [4,    [6.45, 8.15, 8.95, 17.05, 19.85, 22.65, 25.55, 28.35]],
  [5,    [6.55, 8.35, 9.75, 18.45, 21.55, 24.65, 27.75, 30.75]],
  [6,    [6.65, 8.55, 9.95, 25.45, 28.55, 32.65, 35.75, 39.75]],
  [7,    [6.75, 8.75, 10.15, 27.05, 31.05, 36.05, 40.05, 44.05]],
  [8,    [6.85, 8.95, 10.35, 28.85, 33.65, 38.45, 43.25, 48.05]],
  [9,    [6.95, 9.15, 10.55, 29.65, 34.55, 39.55, 44.45, 49.35]],
  [11,   [7.05, 9.55, 10.95, 41.25, 48.05, 54.95, 61.75, 68.65]],
  [13,   [7.15, 9.95, 11.35, 42.15, 49.25, 56.25, 63.25, 70.25]],
  [15,   [7.25, 10.15, 11.55, 45.05, 52.45, 59.95, 67.45, 74.95]],
  [17,   [7.35, 10.35, 11.75, 48.55, 56.05, 63.55, 70.75, 78.65]],
  [20,   [7.45, 10.55, 11.95, 54.75, 63.85, 72.95, 82.05, 91.15]],
  [25,   [7.65, 10.95, 12.15, 64.05, 75.05, 84.75, 95.35, 105.95]],
  [30,   [7.75, 11.15, 12.35, 65.95, 75.45, 85.55, 96.25, 106.95]],
  [Infinity, [7.85, 11.35, 12.55, 67.75, 78.95, 88.95, 99.15, 107.05]],
];

/** Custo de envio do ML para o vendedor (peso em kg, preço do anúncio). */
function mlShippingCost(weightKg, price) {
  if (!weightKg || weightKg <= 0 || !price || price <= 0) return 0;
  const row = ML_SHIP_TABLE.find((r) => weightKg <= r[0]) || ML_SHIP_TABLE[ML_SHIP_TABLE.length - 1];
  let col = ML_SHIP_BANDS.findIndex((b) => price <= b);
  if (col < 0) col = ML_SHIP_BANDS.length - 1;
  let cost = row[1][col];
  if (price < 19) cost = Math.min(cost, price / 2);
  return cost;
}

function _mlShipAt(price, manualShip) {
  return ML_CTX.freteAuto ? mlShippingCost(ML_CTX.weightKg, price) : (manualShip || 0);
}
function _mlNote(pct, price) {
  let n = pct + "% comissão (" + mlCat().label + ")";
  n += price < 79 ? " + custo fixo " + BRL(mlFixedCost(price)) : " · frete grátis obrigatório (≥ R$79)";
  if (ML_CTX.freteAuto) {
    const ship = mlShippingCost(ML_CTX.weightKg, price);
    if (ship > 0) n += " · frete tabela ML: " + BRL(ship);
  }
  return n;
}

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
    commAt: () => mlCat().classic / 100,
    fixedAt: mlFixedCost,
    shipAt: _mlShipAt,
    noteFor(p) { return _mlNote(mlCat().classic, p); },
  },
  {
    id: "ml_premium", label: "Mercado Livre (Premium)", color: "var(--mk-ml-prem)",
    commAt: () => mlCat().premium / 100,
    fixedAt: mlFixedCost,
    shipAt: _mlShipAt,
    noteFor(p) { return _mlNote(mlCat().premium, p) + (p >= 79 ? " · parcelamento sem juros" : ""); },
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

/* Acessores genéricos: marketplaces com tiers estáticos ou funções dinâmicas. */
function _tierFor(mk, price) {
  return mk.tiers.find((t) => price >= t.min && price <= t.max) || mk.tiers[mk.tiers.length - 1];
}
function mkCommAt(mk, price) { return mk.commAt ? mk.commAt(price) : _tierFor(mk, price).comm; }
function mkFixedAt(mk, price) { return mk.fixedAt ? mk.fixedAt(price) : _tierFor(mk, price).fixed; }
function mkShipAt(mk, price, manualShip) { return mk.shipAt ? mk.shipAt(price, manualShip || 0) : (manualShip || 0); }

/** Preço sugerido para entregar a margem desejada (com imposto e frete do canal).
    Iteração de ponto fixo: comissão/custo fixo/frete dependem da faixa de preço. */
function mkSuggestPrice(mk, totalCost, marginPct, taxPct, manualShip) {
  const target = totalCost * (1 + marginPct / 100);
  const tax = (taxPct || 0) / 100;
  let price = Math.max(target, 1);
  let prev = -1;
  for (let i = 0; i < 30; i++) {
    const denom = 1 - mkCommAt(mk, price) - tax;
    if (denom <= 0) return 0;
    const next = (target + mkFixedAt(mk, price) + mkShipAt(mk, price, manualShip)) / denom;
    if (Math.abs(next - price) < 0.005) { price = next; break; }
    // oscilação entre faixas (ex.: cruzando R$79): fica com o maior, que garante a margem
    if (Math.abs(next - prev) < 0.005) { price = Math.max(next, price); break; }
    prev = price;
    price = next;
  }
  return Math.ceil(price * 100) / 100;
}

/** Resultado completo (taxas, frete, imposto, lucro, margem real) para um preço. */
function mkResultAtPrice(mk, price, totalCost, taxPct, manualShip) {
  const fees = price > 0 ? mkCommAt(mk, price) * price + mkFixedAt(mk, price) : 0;
  const ship = price > 0 ? mkShipAt(mk, price, manualShip) : 0;
  const tax = price * ((taxPct || 0) / 100);
  const profit = price - totalCost - fees - ship - tax;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return { id: mk.id, label: mk.label, color: mk.color, price, fees, ship, tax, profit, margin, note: mk.noteFor(price) };
}

/** Alguma seleção fica inviável (comissão + imposto >= 100%)? */
function hasImpossibleMargin(taxPct, ids) {
  const tax = (taxPct || 0) / 100;
  const SAMPLES = [5, 25, 60, 90, 150, 300];
  return MARKETPLACES.filter((m) => !ids || ids.includes(m.id))
    .some((m) => SAMPLES.every((p) => 1 - mkCommAt(m, p) - tax <= 0));
}

/* ---------- Navegação do app ---------- */
const APP_TABS = [
  { href: "calculadora.html", label: "Calculadora", short: "Calcular", pro: false },
  { href: "pecas.html", label: "Peças", short: "Peças", pro: false },
  { href: "clientes.html", label: "Clientes", short: "Clientes", pro: true },
  { href: "orcamentos.html", label: "Orçamentos", short: "Orçam.", pro: true },
  { href: "configuracoes.html", label: "Configurações", short: "Config", pro: false },
];

/* Ícones da navegação inferior (mobile) */
const TAB_ICONS = {
  "calculadora.html": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg>',
  "pecas.html": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  "clientes.html": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  "orcamentos.html": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  "configuracoes.html": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

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
    "</nav>" +
    '<nav class="bottom-nav" aria-label="Navegação inferior">' +
      APP_TABS.map((t) =>
        '<a class="bn-item' + (t.href === active ? " active" : "") + '" href="' + t.href + '"' +
          (t.href === active ? ' aria-current="page"' : "") + ">" +
          '<span class="bn-icon">' + (TAB_ICONS[t.href] || "") + "</span>" +
          '<span class="bn-label">' + t.short + (t.pro && !isPro ? '<span class="bn-pro">Pro</span>' : "") + "</span>" +
        "</a>"
      ).join("") +
    "</nav>";
}

/** HTML de parede Pro para páginas inteiras. */
function proWallHTML(title, desc) {
  return (
    '<div class="pro-wall">' +
      '<div class="pw-icon">' + LOCK_SVG + "</div>" +
      "<h2>" + title + ' <span class="tag-pro">Pro</span></h2>' +
      "<p>" + desc + "</p>" +
      '<p style="font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--acid);margin:0 0 16px;">Em breve</p>' +
      '<a class="btn" href="planos.html">Ver o que vem no Pro</a>' +
    "</div>"
  );
}
