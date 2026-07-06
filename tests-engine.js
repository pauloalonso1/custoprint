// Simula browser mínimo e testa o motor do app-core.js
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.crypto = require('crypto');
global.window = { location: {} };
global.document = { getElementById: () => null };
global.getSupabase = () => { throw new Error('offline'); };
global.getSession = async () => null;
global.logoutUser = async () => {};

const fs = require('fs');
const code = fs.readFileSync('app-core.js', 'utf8');
// funções declaradas vazam do eval direto; consts não — expõe só MARKETPLACES
const MARKETPLACES = eval(code + "; MARKETPLACES;");

let fails = 0;
const assert = (cond, msg) => { console.log((cond ? '✓' : '✗') + ' ' + msg); if (!cond) fails++; };

// 1. Preço sugerido entrega a margem (Loja Própria, sem tiers)
const own = MARKETPLACES.find(m => m.id === 'own');
let cost = 20, margin = 30, tax = 0;
let price = mkSuggestPrice(own, cost, margin, tax);
let r = mkResultAtPrice(own, price, cost, tax);
assert(Math.abs(r.profit - cost * margin / 100) < 0.05, `lucro ≈ margem alvo (${r.profit.toFixed(2)} vs 6,00)`);

// 2. Faixas da Shopee: peça barata cai na faixa de 50%
const shopee = MARKETPLACES.find(m => m.id === 'shopee');
price = mkSuggestPrice(shopee, 2, 30, 0);
assert(price <= 7.99 && price >= 5.0, `Shopee faixa <R$8 usa 50% (preço ${price.toFixed(2)})`);
r = mkResultAtPrice(shopee, price, 2, 0);
assert(Math.abs(r.profit - 0.6) < 0.05, `lucro Shopee faixa baixa (${r.profit.toFixed(2)})`);

// 3. ML: sem custo fixo acima de R$79
const ml = MARKETPLACES.find(m => m.id === 'ml');
r = mkResultAtPrice(ml, 100, 50, 0);
assert(Math.abs(r.fees - 14) < 0.01, `ML ≥79: só 14% (taxas ${r.fees.toFixed(2)})`);
r = mkResultAtPrice(ml, 50, 20, 0);
assert(Math.abs(r.fees - (7 + 6.5)) < 0.01, `ML <79: 14% + 6,50 (taxas ${r.fees.toFixed(2)})`);

// 4. Imposto entra no preço sugerido
price = mkSuggestPrice(own, 20, 30, 10);
r = mkResultAtPrice(own, price, 20, 10);
assert(Math.abs(r.profit - 6) < 0.05, `com 10% de imposto ainda entrega a margem (lucro ${r.profit.toFixed(2)})`);

// 5. Margem impossível
assert(hasImpossibleMargin(60, ['shopee']) === false, 'Shopee + 60%: faixas de 14% ainda viáveis');
assert(hasImpossibleMargin(90, ['shopee']) === true, 'Shopee + 90% imposto = inviável em todas as faixas');
assert(hasImpossibleMargin(10, ['ml']) === false, 'ML + 10% imposto = viável');

// 6. Totais de orçamento
const t = quoteTotals({ items: [{ unitPrice: 50, quantity: 2 }, { unitPrice: 10, quantity: 1 }], discountPct: 10, shippingCharge: 15 });
assert(Math.abs(t.total - (110 - 11 + 15)) < 0.01, `totais do orçamento (${t.total.toFixed(2)})`);

console.log(fails === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${fails} FALHA(S)`);
process.exit(fails ? 1 : 0);
