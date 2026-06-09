/* global window */
/* ============================================================
   NICKMAKER3D — DATA & PRICING ENGINE
   Model reverse-engineered from the reference (validated to R$0,01).
   ============================================================ */

// ---- Filament presets: typical R$/kg (jun/2026) ----
const FILAMENTS = [
  { id: "PLA",    label: "PLA",            price: 100 },
  { id: "PETG",   label: "PETG",           price: 120 },
  { id: "ABS",    label: "ABS",            price: 110 },
  { id: "ASA",    label: "ASA",            price: 140 },
  { id: "TPU",    label: "TPU (flex\u00edvel)",  price: 160 },
  { id: "NYLON",  label: "Nylon",          price: 220 },
  { id: "RESINA", label: "Resina",         price: 250 },
  { id: "CUSTOM", label: "Personalizado",  price: null },
];

// ---- Printer presets: cost (R$), avg power (W), useful life (h) ----
const PRINTERS = [
  { id: "CUSTOM",   label: "Personalizado",        cost: null, power: null, life: null },
  { id: "ENDER3",   label: "Creality Ender 3 V3",  cost: 1600, power: 350, life: 5000 },
  { id: "K1",       label: "Creality K1",          cost: 3500, power: 350, life: 6000 },
  { id: "A1",       label: "Bambu Lab A1",         cost: 3200, power: 150, life: 6000 },
  { id: "P1S",      label: "Bambu Lab P1S",        cost: 6000, power: 150, life: 8000 },
  { id: "NEPTUNE4", label: "Elegoo Neptune 4",     cost: 1800, power: 300, life: 5000 },
  { id: "MK4",      label: "Prusa MK4",            cost: 6500, power: 120, life: 10000 },
  { id: "PHOTON",   label: "Anycubic Photon M5",   cost: 1500, power: 60,  life: 4000 },
];

// ---- Energy tariff presets: typical residential R$/kWh by state (com impostos, aprox. 2025/26) ----
const TARIFFS = [
  { id: "CUSTOM", label: "Personalizado", price: null },
  { id: "AC", label: "AC · Acre", price: 0.78 },
  { id: "AL", label: "AL · Alagoas", price: 0.95 },
  { id: "AP", label: "AP · Amapá", price: 0.71 },
  { id: "AM", label: "AM · Amazonas", price: 0.92 },
  { id: "BA", label: "BA · Bahia", price: 0.95 },
  { id: "CE", label: "CE · Ceará", price: 0.82 },
  { id: "DF", label: "DF · Distrito Federal", price: 0.78 },
  { id: "ES", label: "ES · Espírito Santo", price: 0.88 },
  { id: "GO", label: "GO · Goiás", price: 0.92 },
  { id: "MA", label: "MA · Maranhão", price: 0.88 },
  { id: "MT", label: "MT · Mato Grosso", price: 0.95 },
  { id: "MS", label: "MS · Mato Grosso do Sul", price: 0.92 },
  { id: "MG", label: "MG · Minas Gerais", price: 0.95 },
  { id: "PA", label: "PA · Pará", price: 0.92 },
  { id: "PB", label: "PB · Paraíba", price: 0.86 },
  { id: "PR", label: "PR · Paraná", price: 0.78 },
  { id: "PE", label: "PE · Pernambuco", price: 0.88 },
  { id: "PI", label: "PI · Piauí", price: 0.90 },
  { id: "RJ", label: "RJ · Rio de Janeiro", price: 0.98 },
  { id: "RN", label: "RN · Rio Grande do Norte", price: 0.85 },
  { id: "RS", label: "RS · Rio Grande do Sul", price: 0.90 },
  { id: "RO", label: "RO · Rondônia", price: 0.82 },
  { id: "RR", label: "RR · Roraima", price: 0.75 },
  { id: "SC", label: "SC · Santa Catarina", price: 0.80 },
  { id: "SP", label: "SP · São Paulo", price: 0.79 },
  { id: "SE", label: "SE · Sergipe", price: 0.88 },
  { id: "TO", label: "TO · Tocantins", price: 0.92 },
];

// ---- Marketplaces: commission %, fixed fee R$ ----
const MARKETPLACES = [
  { id: "shopee",     label: "Shopee",                  comm: 0.20, fixed: 4.00, color: "var(--mk-shopee)",  note: "~20% comiss\u00e3o + R$4,00 taxa fixa" },
  { id: "ml_classico",label: "Mercado Livre (Cl\u00e1ssico)", comm: 0.13, fixed: 6.00, color: "var(--mk-ml)",      note: "~13% comiss\u00e3o + R$6,00 fixo por unidade" },
  { id: "ml_premium", label: "Mercado Livre (Premium)", comm: 0.18, fixed: 6.00, color: "var(--mk-ml-prem)", note: "~18% comiss\u00e3o + R$6,00 fixo por unidade" },
  { id: "amazon",     label: "Amazon",                  comm: 0.15, fixed: 2.00, color: "var(--mk-amazon)",  note: "~15% comiss\u00e3o + R$2,00/item (plano individual)" },
  { id: "magalu",     label: "Magalu",                  comm: 0.16, fixed: 3.00, color: "var(--mk-magalu)",  note: "~16% comiss\u00e3o + R$3,00 fixo por pedido" },
  { id: "elo7",       label: "Elo7",                    comm: 0.20, fixed: 0.00, color: "var(--mk-elo7)",    note: "~20% comiss\u00e3o (sem taxa fixa)" },
  { id: "own",        label: "Loja Pr\u00f3pria",            comm: 0.05, fixed: 0.00, color: "var(--mk-own)",     note: "~5% gateway de pagamento, sem comiss\u00e3o" },
];

// ---- Cost composition meta (label + color) ----
const COST_KEYS = [
  { key: "material", label: "Material",     color: "var(--cost-material)" },
  { key: "energy",   label: "Energia",      color: "var(--cost-energy)" },
  { key: "deprec",   label: "Deprecia\u00e7\u00e3o", color: "var(--cost-deprec)" },
  { key: "labor",    label: "M\u00e3o de Obra",  color: "var(--cost-labor)" },
  { key: "pack",     label: "Embalagem",    color: "var(--cost-pack)" },
  { key: "other",    label: "Outros",       color: "var(--cost-other)" },
  { key: "fail",     label: "Falha",        color: "var(--cost-fail)" },
];

// ---- Core cost calc ----
function computeCosts(s) {
  const n = (v) => (isFinite(+v) ? +v : 0);
  const material = (n(s.filamentPrice) / 1000) * n(s.materialGrams);
  const printHours = n(s.hours) + n(s.minutes) / 60;
  const energy = (n(s.power) / 1000) * printHours * n(s.tariff);
  const hourlyDeprec = n(s.printerLife) > 0 ? n(s.printerCost) / n(s.printerLife) : 0;
  const deprec = hourlyDeprec * printHours;
  const labor = (n(s.laborRate) / 60) * (n(s.prepMin) + n(s.finishMin));
  const pack = n(s.packaging);
  const other = n(s.other);
  const subtotal = material + energy + deprec + labor + pack + other;
  const fail = subtotal * (n(s.failRate) / 100);
  const total = subtotal + fail;
  return {
    material, energy, deprec, labor, pack, other, fail,
    subtotal, total, hourlyDeprec, printHours,
  };
}

// ---- Per-marketplace pricing ----
// price = (cost + targetProfit + fixedFee) / (1 - commission - tax)
function priceForMarketplace(mk, totalCost, marginPct, taxPct) {
  const targetProfit = totalCost * (marginPct / 100);
  const tax = taxPct / 100;
  const denom = Math.max(0.01, 1 - mk.comm - tax);
  const price = (totalCost + targetProfit + mk.fixed) / denom;
  const fees = mk.comm * price + mk.fixed + tax * price;
  const profit = price - totalCost - fees;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return { price, fees, profit, margin };
}

const BRL = (v) =>
  "R$ " + (isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PCT = (v) => (isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

Object.assign(window, {
  FILAMENTS, PRINTERS, TARIFFS, MARKETPLACES, COST_KEYS,
  computeCosts, priceForMarketplace, BRL, PCT,
});
