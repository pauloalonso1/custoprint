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
// funções declaradas vazam do eval direto; consts não — expõe o que os testes precisam
const { MARKETPLACES, ML_CATEGORIES } = eval(code + "; ({ MARKETPLACES, ML_CATEGORIES });");

let fails = 0;
const assert = (cond, msg) => { console.log((cond ? '✓' : '✗') + ' ' + msg); if (!cond) fails++; };

// contexto ML padrão: Casa (13/18), 0,3kg, frete automático
setMlContext({ catId: 'casa', weightKg: 0.3, freteAuto: true });

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

// 3. ML: comissão por categoria + custo fixo 2026 + frete automático
const ml = MARKETPLACES.find(m => m.id === 'ml');
r = mkResultAtPrice(ml, 100, 50, 0);
assert(Math.abs(r.fees - 13) < 0.01, `ML ≥79 Casa: 13%, sem custo fixo (taxas ${r.fees.toFixed(2)})`);
assert(Math.abs(r.ship - 14.35) < 0.01, `ML R$100/0,3kg: frete tabela R$14,35 (${r.ship.toFixed(2)})`);
r = mkResultAtPrice(ml, 50, 20, 0);
assert(Math.abs(r.fees - (50 * 0.13 + 6.00)) < 0.01, `ML R$20-79: 13% + fixo R$6,00 (taxas ${r.fees.toFixed(2)})`);
assert(Math.abs(r.ship - 7.75) < 0.01, `ML R$50/0,3kg: frete R$7,75 (${r.ship.toFixed(2)})`);
r = mkResultAtPrice(ml, 15, 5, 0);
assert(Math.abs(r.fees - (15 * 0.13 + 5.50)) < 0.01, `ML R$12,50-20: fixo R$5,50 (taxas ${r.fees.toFixed(2)})`);
r = mkResultAtPrice(ml, 10, 3, 0);
assert(Math.abs(r.fees - (10 * 0.13 + 5.00)) < 0.01, `ML <R$12,50: fixo = 50% do preço (taxas ${r.fees.toFixed(2)})`);
assert(Math.abs(r.ship - 5) < 0.01, `ML <R$19: frete limitado a metade do preço (${r.ship.toFixed(2)})`);

// 4. Categoria muda a comissão (Premium Moda 19%)
setMlContext({ catId: 'moda' });
const mlp = MARKETPLACES.find(m => m.id === 'ml_premium');
r = mkResultAtPrice(mlp, 100, 50, 0);
assert(Math.abs(r.fees - 19) < 0.01, `ML Premium Moda: 19% (taxas ${r.fees.toFixed(2)})`);
setMlContext({ catId: 'casa' });

// 5. Frete manual substitui a tabela quando freteAuto = false
setMlContext({ freteAuto: false });
r = mkResultAtPrice(ml, 100, 50, 0, 22);
assert(Math.abs(r.ship - 22) < 0.01, `ML frete manual (${r.ship.toFixed(2)})`);
setMlContext({ freteAuto: true });

// 6. Frete manual aplica nos canais sem tabela
r = mkResultAtPrice(shopee, 100, 50, 0, 12);
assert(Math.abs(r.ship - 12) < 0.01, `Shopee usa frete manual (${r.ship.toFixed(2)})`);

// 7. Preço sugerido do ML entrega a margem com frete + custo fixo dinâmicos
price = mkSuggestPrice(ml, 30, 40, 0);
r = mkResultAtPrice(ml, price, 30, 0);
assert(Math.abs(r.profit - 12) < 0.15, `ML sugerido entrega margem 40% s/ custo 30 (lucro ${r.profit.toFixed(2)} vs 12,00, preço ${price.toFixed(2)})`);

// 8. Imposto entra no preço sugerido
price = mkSuggestPrice(own, 20, 30, 10);
r = mkResultAtPrice(own, price, 20, 10);
assert(Math.abs(r.profit - 6) < 0.05, `com 10% de imposto ainda entrega a margem (lucro ${r.profit.toFixed(2)})`);

// 9. Margem impossível
assert(hasImpossibleMargin(60, ['shopee']) === false, 'Shopee + 60%: faixas de 14% ainda viáveis');
assert(hasImpossibleMargin(90, ['shopee']) === true, 'Shopee + 90% imposto = inviável em todas as faixas');
assert(hasImpossibleMargin(10, ['ml']) === false, 'ML + 10% imposto = viável');

// 10. Cruzando a faixa de R$79: preço sugerido não oscila e entrega ≥ margem
for (const c of [24, 25, 26, 27, 28]) {
  const p = mkSuggestPrice(ml, c, 30, 0);
  const res = mkResultAtPrice(ml, p, c, 0);
  assert(res.profit >= c * 0.30 - 0.05, `ML borda R$79 (custo ${c}): preço ${p.toFixed(2)}, lucro ${res.profit.toFixed(2)} ≥ ${(c * 0.3).toFixed(2)}`);
}

// 11. Validação contra o concorrente (R$100, 0,3kg): frete tabela + comissão da categoria
r = mkResultAtPrice(ml, 100, 0, 0);
assert(Math.abs((r.fees + r.ship) - 27.35) < 0.01, `ML R$100: custos do canal 27,35 (${(r.fees + r.ship).toFixed(2)})`);

// 12. Totais de orçamento
const t = quoteTotals({ items: [{ unitPrice: 50, quantity: 2 }, { unitPrice: 10, quantity: 1 }], discountPct: 10, shippingCharge: 15 });
assert(Math.abs(t.total - (110 - 11 + 15)) < 0.01, `totais do orçamento (${t.total.toFixed(2)})`);

console.log(fails === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${fails} FALHA(S)`);
process.exit(fails ? 1 : 0);
