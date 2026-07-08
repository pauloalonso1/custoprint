# Análise competitiva — CalcPro 3D vs Precificadora 3DEcom

Data: 08/07/2026 · Fonte: https://precificadora3decom.com.br/calculadora (testado com dados reais)

## O que o concorrente tem e nós não

### Crítico (afeta a precisão do cálculo)

**1. Frete automático por peso (tabela ML 2026)**
Ele pede só o peso com embalagem (kg) e estima o custo de envio pela tabela oficial do Mercado Livre, com toggle de "frete grátis" (custo absorvido pelo vendedor) e opção de digitar manualmente. No nosso app o frete é 100% manual — o usuário quase sempre não sabe quanto o ML desconta. No teste (R$100, 0,3kg) ele descontou R$14,35 de frete grátis obrigatório (≥R$79). **Nosso cálculo do ML ignora esse custo, o que superestima o lucro do usuário.**

**2. Comissão do ML por categoria**
Dropdown de categoria (ex.: Casa, Móveis e Decoração — 11,5% Clássico / 16,5% Premium). Usamos 14%/18% fixos. As comissões reais variam de ~10% a ~19% por categoria.

**3. Detalhe Shopee CPF vs CNPJ**
Ele diferencia tabela CNPJ da CPF (+R$3/item alto volume). Nossa tabela Shopee é única.

### Alto impacto (UX / percepção de valor)

**4. Painel de resultado em tempo real (sticky) com "waterfall"**
Coluna fixa à direita mostrando: Preço → (–) taxa marketplace → (–) frete → (–) energia → (–) filamento → Lucro em destaque com % e selo qualitativo ("Excelente"), mais **R$/hora de impressão**. Nosso resultado é bom, mas o dele conta a história da dedução linha a linha e dá feedback instantâneo conforme se digita.

**5. Lucro por hora + capacidade produtiva na tela principal**
"R$ 21,98/hora", "Potencial diário (20h): R$ 439", "Potencial mensal (30d): R$ 13.189". Nós temos simulação mensal, mas trancada no Pro e sem o R$/hora — métrica que o público adora.

**6. Múltiplas peças na mesa**
Toggle que divide o custo da impressão por peça automaticamente. Não temos; usuário precisa fazer conta de cabeça.

**7. Dois modos de precificação lado a lado**
"Digitar preço de venda" × "Margem de contribuição" como escolha de primeira classe no fluxo. Nosso "Meu preço" existe mas está trancado no Pro — o concorrente dá de graça.

**8. Preço com promoção embutida**
Toggle "Calcular preço com promoção?" — sugere preço com folga para absorver desconto/cupom. Não temos.

### Médio impacto

**9. Preferências (defaults do usuário)**
Página com padrões: impressora, kWh, filamento R$/kg, embalagem, imposto, margem, desconto promo, taxa cartão, desconto Pix, mão de obra R$/h. Nós só restauramos o último estado; Configurações hoje é só dados da loja.

**10. Venda Direta configurável**
Canal com taxa de cartão e desconto Pix parametrizáveis. Nossa "Loja Própria" usa 5% fixo.

**11. Produto Normal (revenda)**
Além de peça 3D, precifica produto comprado de fornecedor — amplia o público. Avaliar se faz sentido para nosso posicionamento.

**12. Amazon FBA vs DBA** — dois regimes de tarifa; usamos taxa única.

**13. Moeda de exibição (R$/US$/€)** — cosmético, baixa prioridade.

**14. UX em etapas numeradas (1–5)** — formulário guiado tipo wizard, com campos obrigatórios destacados em vermelho e hints por campo.

## O que nós temos e ele não (manter e divulgar)

- **Depreciação da impressora** (valor ÷ vida útil × horas) — ele ignora esse custo.
- **Taxa de falha (%)** — ele ignora.
- **Mão de obra / pós-processamento** no cálculo principal.
- **7 canais comparados lado a lado** com destaque do "melhor" — ele calcula 1 marketplace por vez. Nossa tabela comparativa + CSV é diferencial real.
- **Magalu e Elo7** — ele não cobre.
- **Simulação mensal com gargalo de capacidade** (mais sofisticada que o "potencial" dele).
- **Peças salvas, clientes e orçamentos em PDF** — ele só tem histórico de cálculos.
- **Alerta de margem impossível.**

## Priorização sugerida

| # | Melhoria | Esforço | Impacto |
|---|----------|---------|---------|
| 1 | Frete automático por peso + frete grátis ML ≥R$79 | Médio | Crítico (precisão) |
| 2 | Comissão ML por categoria | Baixo | Crítico (precisão) |
| 3 | Painel de resultado sticky com waterfall + R$/hora | Médio | Alto (UX) |
| 4 | Múltiplas peças na mesa | Baixo | Alto |
| 5 | Modo "margem de contribuição" livre (repensar gate do Pro) | Baixo | Alto |
| 6 | Preço com folga para promoção | Baixo | Médio |
| 7 | Defaults do usuário em Configurações | Baixo | Médio |
| 8 | Shopee CPF/CNPJ + Venda Direta configurável | Baixo | Médio |
| 9 | Selo qualitativo de margem (Ruim/Boa/Excelente) | Baixo | Médio |
| 10 | Produto de revenda / moeda / FBA-DBA | Médio | Baixo |

## Nota estratégica sobre o Pro

O concorrente entrega de graça coisas que trancamos no Pro (preço custom, imposto, potencial produtivo). Sugestão: mover "Meu preço" e imposto para o Free e concentrar o Pro no que ele não tem — comparativo 7 canais, CSV, simulação mensal com gargalo, orçamentos PDF com logo, clientes.
