# CalcPro 3D — Planos Free/Pro, Clientes e Orçamentos

Refatoração que transforma a calculadora em plataforma com dois planos,
mantendo o design "ACID" (preto + verde `#C5F230`, Archivo Black + Geist Mono).

## Mapa de arquivos

| Arquivo | O que é |
|---|---|
| `app.css` | Design system compartilhado do app (tokens + componentes) |
| `app-core.js` | Auth guard, planos, storage por usuário, motor de taxas, navegação |
| `calculadora.html` | Calculadora (reescrita) — Free + gates Pro |
| `pecas.html` | Biblioteca de peças salvas (Free: 3 · Pro: ilimitado) |
| `clientes.html` | **Pro** — CRUD de clientes |
| `orcamentos.html` | **Pro** — lista + builder + PDF com logo (jsPDF via CDN) |
| `configuracoes.html` | Dados da loja + upload de logo + rodapé do PDF + plano |
| `planos.html` | Comparativo Free/Pro + assinatura |
| `tests-engine.js` | Testes do motor (`node tests-engine.js`) |
| `index.html` | Landing (patch): seção/link "Planos", FAQ atualizado, acentuação |

`admin.html`, `privacidade.html` e `supabase-config.js` não foram alterados.
Os protótipos antigos (`Landing Page*.html`, `Precificadora.html`,
`precificadora-app.jsx`, `tweaks-panel.jsx`, `nm3d-data.js`, `nm3d.css`)
seguem no repositório, mas nada mais depende deles — podem ser removidos.

## O que cada plano libera

**Free:** calculadora completa · Shopee + ML Clássico · até 3 peças salvas.

**Pro (R$ 19,90/mês):** 7 marketplaces (+ ML Premium, Amazon, Magalu, Elo7,
Loja Própria) · imposto sobre a venda · modo "testar meu preço" · peças
ilimitadas · **cadastro de clientes** · **orçamentos em PDF com a logo da
loja** · tabela comparativa + CSV/copiar · simulação mensal com capacidade
e alerta de gargalo.

## Como o plano funciona hoje (e o que falta para cobrar de verdade)

- `getPlan()` lê `user_metadata.plan` da sessão Supabase e, como fallback,
  uma flag local por e-mail.
- `activatePro()` (chamada pelo botão em `planos.html`) grava a flag local e
  tenta `auth.updateUser({ data: { plan: 'pro' } })`.

⚠️ **Antes de lançar cobrando:** `user_metadata` pode ser editado pelo
próprio usuário via console. A ativação real deve acontecer no **webhook do
gateway** (Stripe/Mercado Pago) gravando em **`app_metadata`** com a service
role — o cliente não consegue alterá-lo. Depois, troque a leitura em
`getPlan()` para `app_metadata.plan` e aponte `subscribe()` em `planos.html`
para o checkout. Os dois pontos estão marcados com comentários
`>>> INTEGRAÇÃO DE PAGAMENTO <<<` no código.

## Dados do usuário

Peças, clientes, orçamentos e configurações ficam em `localStorage`, com
chave por e-mail (`nm3d:<email>:*`) — multiusuário no mesmo navegador não se
mistura, mas os dados **não migram entre dispositivos**. A camada de acesso
está isolada em `app-core.js` (`loadData`/`saveData` + CRUDs); levar para o
Supabase depois = reimplementar essas funções + criar as tabelas com RLS por
`auth.uid()`, sem tocar nas páginas.

## Taxas de marketplace

Vigência **março/2026**, centralizadas em `MARKETPLACES` no `app-core.js`
(modelo por faixas — Shopee com 5 faixas, ML com corte em R$ 79). Ao
atualizar, rode `node tests-engine.js`.
