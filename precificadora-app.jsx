/* global React, computeCosts, priceForMarketplace, BRL, PCT, FILAMENTS, PRINTERS, TARIFFS, MARKETPLACES, COST_KEYS */
const { useState, useEffect, useMemo, useRef } = React;

/* ---------- tiny inline icon set ---------- */
const I = {
  spool: <g><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/></g>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>,
  printer: <g><rect x="6" y="3" width="12" height="6" rx="1"/><path d="M6 14H4a2 2 0 0 1-2-2v-1a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2h-2"/><rect x="7" y="13" width="10" height="8" rx="1"/></g>,
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.5 2.5-2-2 2.5-2.5z"/>,
  tag: <g><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.4"/></g>,
  chart: <g><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></g>,
  store: <g><path d="M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></g>,
  sun: <g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></g>,
  moon: <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4a7.5 7.5 0 1 0 10.5 10.5z"/>,
  copy: <g><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></g>,
  reset: <g><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></g>,
  check: <polyline points="4 12 10 18 20 6"/>,
  info: <g><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/></g>,
  download: <g><path d="M12 3v12"/><polyline points="7 11 12 16 17 11"/><path d="M4 20h16"/></g>,
  lock: <g><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></g>,
  crown: <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.6 12H4.6L3 7z"/>,
  bolt2: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>,
  card: <g><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19"/></g>,
  pix: <path d="M12 3 4 11l8 8 8-8-8-8zM7 11h10M12 6v10"/>,
  back: <path d="M15 5l-7 7 7 7"/>,
  shield: <g><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><polyline points="9 12 11 14 15 10"/></g>,
};
const Icon = ({ d, size = 20, sw = 1.9, ...r }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...r}>{d}</svg>
);

/* ---------- number field ---------- */
function NumField({ label, value, onChange, suffix, step = "any", placeholder, hint }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="input-wrap">
        <input
          type="number" className={"input" + (suffix ? " has-suffix" : "")}
          value={value} step={step} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="input-wrap select-wrap">
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}

/* ---------- printer profile dropdown (free = genérica; presets are PRO) ---------- */
const PRINTER_FREE = ["CUSTOM"];
function PrinterSelect({ value, onChange, pro, onUpgrade }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const lbl = (p) => (p.id === "CUSTOM" ? "Impressora genérica" : p.label);
  const cur = PRINTERS.find((p) => p.id === value) || PRINTERS[0];
  const visible = pro ? PRINTERS : PRINTERS.filter((p) => PRINTER_FREE.includes(p.id) || p.id === value);
  return (
    <div className="field">
      <label className="field-label">Perfil da impressora</label>
      <div className="psel" ref={ref}>
        <button className={"psel-btn" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
          <span>{lbl(cur)}</span>
          <span className="psel-chev"></span>
        </button>
        {open && (
          <div className="psel-menu">
            {visible.map((p) => (
              <button key={p.id} className={"psel-opt" + (p.id === value ? " sel" : "")}
                onClick={() => { onChange(p.id); setOpen(false); }}>
                {lbl(p)}{p.id === value && <Icon d={I.check} size={15} />}
              </button>
            ))}
            {!pro && (
              <button className="psel-locked" onClick={() => { setOpen(false); onUpgrade(); }}>
                <span className="psel-lock-ic"><Icon d={I.lock} size={14} /></span>
                <span>
                  <span className="psel-lock-t">+ Impressoras personalizadas</span>
                  <span className="psel-lock-s">Ender 3, Bambu Lab, Prusa e mais · PRO</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- input panel shell ---------- */
function Panel({ icon, title, accentWord, children }) {
  return (
    <section className="card card-pad panel">
      <header className="panel-head">
        <span className="panel-icon"><Icon d={icon} size={18} /></span>
        <h2 className="t-h4 panel-title">{title}{accentWord && <span className="accent-text"> {accentWord}</span>}</h2>
      </header>
      {children}
    </section>
  );
}

/* ---------- cost breakdown donut ---------- */
function CostDonut({ parts, total }) {
  const size = 132, stroke = 18, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {parts.map((p) => {
        if (p.value <= 0 || total <= 0) return null;
        const frac = p.value / total;
        const dash = `${frac * c} ${c}`;
        const el = (
          <circle key={p.key} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={p.color} strokeWidth={stroke} strokeDasharray={dash}
            strokeDashoffset={-acc * c} transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray .4s ease, stroke-dashoffset .4s ease" }} />
        );
        acc += frac;
        return el;
      })}
    </svg>
  );
}

/* ---------- tweak option maps ---------- */
// each palette: [400, 500, 600, glow, foreground]; keyed by the 500 hex (TweakColor stores it)
const ACCENT_LIST = [
  ["#D6F95E", "#C5F230", "#A6D40E", "#C5F230", "#0A0E00"], // lime (padrão)
  ["#6FF5DE", "#2EE6C6", "#16C9A8", "#2EE6C6", "#04201B"], // ciano
  ["#FFD36B", "#F5B21F", "#D4920E", "#F5B21F", "#231700"], // âmbar
  ["#B79CFF", "#8B5CFF", "#6D3FF2", "#B79CFF", "#ffffff"], // violeta
  ["#FF7AC6", "#F23D9E", "#D41680", "#FF7AC6", "#ffffff"], // magenta
];
const ACCENT_OPTIONS = ACCENT_LIST.map((p) => p[1]);
const DENSITY = { "Compacto": 0.84, "Padrão": 1, "Espaçoso": 1.18 };
const RADIUS = { "Reto": 0.35, "Padrão": 1, "Arredondado": 1.7 };

// Semantic palettes applied as INLINE custom properties on <html> (ACID, bold black/lime).
const THEMES = {
  light: {
    "--bg": "#FFFFFF", "--bg-grad": "radial-gradient(950px 520px at 88% -12%, color-mix(in oklab, var(--accent-500) 16%, transparent), transparent 58%), #FFFFFF",
    "--surface": "#FFFFFF", "--surface-2": "#F5F5F4", "--surface-inset": "#F2F2F0",
    "--field": "#FFFFFF", "--field-border": "#E2E2E0", "--field-border-hover": "#C8C8C6",
    "--border": "#E8E8E6", "--border-strong": "#D6D6D4",
    "--ink": "#0A0A0B", "--ink-2": "#3A3A3E", "--ink-3": "#6C6C72", "--ink-4": "#9A9AA0",
    "--accent-ink": "color-mix(in oklab, var(--accent-500) 58%, #000)",
    "--shadow-card": "0 1px 2px 0 rgb(0 0 0 / .05)",
    "--shadow-pop": "0 4px 6px -1px rgb(0 0 0 / .07), 0 10px 28px -8px rgb(0 0 0 / .18)",
    "--glow": "0 0 0 1px color-mix(in oklab, var(--accent-500) 50%, transparent)",
  },
  dark: {
    "--bg": "#000000", "--bg-grad": "radial-gradient(950px 520px at 88% -12%, color-mix(in oklab, var(--accent-500) 7%, transparent), transparent 60%), #000000",
    "--surface": "#0E0E0F", "--surface-2": "#141416", "--surface-inset": "#060607",
    "--field": "#0F0F10", "--field-border": "rgba(255,255,255,.10)", "--field-border-hover": "rgba(255,255,255,.22)",
    "--border": "rgba(255,255,255,.09)", "--border-strong": "rgba(255,255,255,.16)",
    "--ink": "#FFFFFF", "--ink-2": "#C8C8CC", "--ink-3": "#9A9AA0", "--ink-4": "#6C6C72",
    "--accent-ink": "var(--accent-500)",
    "--shadow-card": "0 2px 14px rgba(0,0,0,.5)",
    "--shadow-pop": "0 16px 50px rgba(0,0,0,.7)",
    "--glow": "0 0 0 1px color-mix(in oklab, var(--accent-500) 35%, transparent)",
  },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#C5F230",
  "density": "Padrão",
  "radius": "Padrão"
}/*EDITMODE-END*/;

/* ---------- PRO gating ---------- */
const FREE_MK = ["shopee", "ml_classico"]; // free tier: 2 marketplaces

function ProTag({ small }) {
  return <span className={"pro-tag" + (small ? " sm" : "")}><Icon d={I.crown} size={small ? 11 : 12} sw={2.2} />PRO</span>;
}

// Wraps content; when locked, blurs it and overlays a lock + unlock CTA.
function Lock({ locked, onUnlock, label, children }) {
  if (!locked) return children;
  return (
    <div className="lock-wrap">
      <div className="lock-blur" aria-hidden="true">{children}</div>
      <button className="lock-veil" onClick={onUnlock}>
        <span className="lock-ic"><Icon d={I.lock} size={18} /></span>
        <span className="lock-label">{label || "Recurso PRO"}</span>
        <span className="lock-cta">Desbloquear <Icon d={I.crown} size={12} sw={2.2} /> PRO</span>
      </button>
    </div>
  );
}

function UpgradeModal({ open, onClose, onPay, annual, setAnnual }) {
  const [step, setStep] = useState("plan");      // plan · checkout · processing · success
  const [method, setMethod] = useState("pix");   // pix · card
  const [card, setCard] = useState({ num: "", name: "", exp: "", cvv: "" });
  const [copied, setCopied] = useState(false);

  // reset to first step whenever it reopens
  useEffect(() => { if (open) { setStep("plan"); setMethod("pix"); setCopied(false); } }, [open]);

  if (!open) return null;
  const price = annual ? 15 : 19;
  const total = annual ? 180 : 19;            // anual cobra 12×15 = 180
  const totalLabel = annual ? "R$ 180,00 / ano" : "R$ 19,00 / mês";
  const benefits = [
    "Todos os marketplaces (Amazon, Magalu, Premium, Elo7, loja própria)",
    "Salvar e exportar orçamentos em PDF",
    "Precificação em lote para produção",
    "Comparativo de peças lado a lado",
    "Taxas dos marketplaces sempre atualizadas",
  ];
  const fmtCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };
  const cardValid = card.num.replace(/\s/g, "").length >= 16 && card.exp.length === 5 && card.cvv.length >= 3 && card.name.trim().length > 2;

  const pay = () => {
    setStep("processing");
    setTimeout(() => setStep("success"), 1700);
  };
  const finish = () => { onPay(); };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Fechar">✕</button>

        {/* progress dots (hidden on success/processing) */}
        {(step === "plan" || step === "checkout") && (
          <div className="modal-steps">
            <span className={"ms-dot" + (step === "plan" ? " on" : " done")}>1</span>
            <span className="ms-bar"></span>
            <span className={"ms-dot" + (step === "checkout" ? " on" : "")}>2</span>
          </div>
        )}

        {/* ---------- STEP 1: PLAN ---------- */}
        {step === "plan" && (
          <>
            <div className="modal-crown"><Icon d={I.crown} size={22} sw={2} /></div>
            <h3 className="t-h2 modal-title">Desbloqueie o <span className="accent-text">NickMaker3D PRO</span></h3>
            <p className="modal-sub">Tudo da calculadora gratuita, sem limites, e os recursos que fazem você vender com lucro de verdade.</p>
            <div className="modal-bill">
              <div className="segmented" style={{ width: "100%" }}>
                <span className={"seg" + (!annual ? " active accent" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setAnnual(false)}>Mensal</span>
                <span className={"seg" + (annual ? " active accent" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setAnnual(true)}>Anual <b style={{ opacity: .8 }}>-20%</b></span>
              </div>
            </div>
            <div className="modal-price">
              <span className="modal-amt num">R$ {price}</span>
              <span className="modal-per">/ mês{annual ? " · cobrado anual" : ""}</span>
            </div>
            <ul className="modal-benefits">
              {benefits.map((b, i) => <li key={i}><Icon d={I.check} size={16} sw={2.6} />{b}</li>)}
            </ul>
            <button className="btn btn-primary btn-lg modal-pay" onClick={() => setStep("checkout")}>
              Continuar para o pagamento
            </button>
            <p className="modal-fine">Sem fidelidade · cancele quando quiser</p>
          </>
        )}

        {/* ---------- STEP 2: CHECKOUT ---------- */}
        {step === "checkout" && (
          <>
            <button className="modal-back" onClick={() => setStep("plan")}><Icon d={I.back} size={16} /> Voltar</button>
            <h3 className="t-h3 modal-title" style={{ marginTop: 4 }}>Pagamento</h3>
            <div className="order-sum">
              <div>
                <div className="os-k">NickMaker3D PRO · {annual ? "Anual" : "Mensal"}</div>
                <div className="os-s">{annual ? "12 meses por R$ 15/mês" : "Renova todo mês"}</div>
              </div>
              <div className="os-total num">{totalLabel}</div>
            </div>

            <div className="pay-tabs">
              <button className={"pay-tab" + (method === "pix" ? " on" : "")} onClick={() => setMethod("pix")}><Icon d={I.pix} size={16} /> Pix</button>
              <button className={"pay-tab" + (method === "card" ? " on" : "")} onClick={() => setMethod("card")}><Icon d={I.card} size={16} /> Cartão</button>
            </div>

            {method === "pix" ? (
              <div className="pix-box">
                <div className="pix-qr" aria-hidden="true">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <i key={i} style={{ background: (i * 7 + ((i * i) % 5) + (i % 3)) % 2 ? "#0b0b0c" : "transparent" }}></i>
                  ))}
                </div>
                <p className="pix-help">Escaneie o QR no app do seu banco ou copie o código:</p>
                <button className="pix-code" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  <span className="num">00020126…NICKMAKER3D…BR{annual ? "180" : "19"}00</span>
                  {copied ? <span className="accent-text"><Icon d={I.check} size={14} /> copiado</span> : <Icon d={I.copy} size={15} />}
                </button>
                <button className="btn btn-primary btn-lg modal-pay" onClick={pay}>Já fiz o pagamento</button>
              </div>
            ) : (
              <div className="card-form">
                <div className="field">
                  <label className="field-label">Número do cartão</label>
                  <div className="input-wrap"><input className="input num" inputMode="numeric" placeholder="0000 0000 0000 0000"
                    value={card.num} onChange={(e) => setCard({ ...card, num: fmtCard(e.target.value) })} /></div>
                </div>
                <div className="field">
                  <label className="field-label">Nome impresso no cartão</label>
                  <div className="input-wrap"><input className="input" placeholder="Como está no cartão"
                    value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label className="field-label">Validade</label>
                    <div className="input-wrap"><input className="input num" inputMode="numeric" placeholder="MM/AA"
                      value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} /></div>
                  </div>
                  <div className="field">
                    <label className="field-label">CVV</label>
                    <div className="input-wrap"><input className="input num" inputMode="numeric" placeholder="000"
                      value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
                  </div>
                </div>
                <button className="btn btn-primary btn-lg modal-pay" disabled={!cardValid} onClick={pay}>
                  Pagar {annual ? "R$ 180,00" : "R$ 19,00"}
                </button>
              </div>
            )}
            <p className="modal-fine"><Icon d={I.shield} size={13} /> Pagamento simulado · ambiente seguro</p>
          </>
        )}

        {/* ---------- STEP 3: PROCESSING ---------- */}
        {step === "processing" && (
          <div className="modal-state">
            <div className="spinner"></div>
            <h3 className="t-h3 modal-title">Processando pagamento…</h3>
            <p className="modal-sub" style={{ textAlign: "center" }}>Confirmando com a operadora. Leva só um instante.</p>
          </div>
        )}

        {/* ---------- STEP 4: SUCCESS ---------- */}
        {step === "success" && (
          <div className="modal-state">
            <div className="success-mark"><Icon d={I.check} size={34} sw={2.4} /></div>
            <h3 className="t-h2 modal-title" style={{ textAlign: "center" }}>Bem-vindo ao <span className="accent-text">PRO!</span></h3>
            <p className="modal-sub" style={{ textAlign: "center" }}>Tudo liberado. Agora é precificar sem limites.</p>
            <ul className="modal-benefits" style={{ marginTop: 18 }}>
              {benefits.slice(0, 3).map((b, i) => <li key={i}><Icon d={I.check} size={16} sw={2.6} />{b}</li>)}
            </ul>
            <button className="btn btn-primary btn-lg modal-pay" onClick={finish}>Começar a usar</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- save budget modal ---------- */
function SaveBudgetModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  useEffect(() => { if (open) setName(""); }, [open]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Fechar">✕</button>
        <h3 className="t-h3 modal-title">Salvar orçamento</h3>
        <p className="modal-sub">Dê um nome para encontrar depois.</p>
        <div className="field" style={{ marginBottom: 18 }}>
          <label className="field-label">Nome do orçamento</label>
          <div className="input-wrap">
            <input className="input" placeholder="Ex: Suporte de fone PLA"
              value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSave(name.trim()); }}
              autoFocus />
          </div>
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          disabled={!name.trim()} onClick={() => onSave(name.trim())}>
          Salvar orçamento
        </button>
      </div>
    </div>
  );
}

/* ---------- budgets list modal ---------- */
function BudgetsModal({ open, onClose, budgets, onLoad, onDelete }) {
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Fechar">✕</button>
        <h3 className="t-h3 modal-title">Meus orçamentos</h3>
        {budgets.length === 0 ? (
          <p className="modal-sub">Nenhum orçamento salvo ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {budgets.map((b) => (
              <div key={b.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", background: "var(--surface-2)",
                border: "1px solid var(--border)", borderRadius: "var(--r-sm)"
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{b.name}</div>
                  <div className="num" style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 2 }}>
                    {new Date(b.date).toLocaleDateString("pt-BR")} · Custo: {BRL(b.total)}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => onLoad(b)}>Carregar</button>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger-400)", padding: "7px 9px" }}
                  onClick={() => { if (confirm("Excluir \"" + b.name + "\"?")) onDelete(b.id); }}
                  title="Excluir">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ */
const DEFAULTS = {
  theme: "dark",
  filament: "PLA", filamentPrice: 100, materialGrams: 50,
  power: 200, hours: 4, minutes: 30, tariff: 0.85, tariffRegion: "CUSTOM",
  printer: "CUSTOM", printerCost: 2000, printerLife: 5000,
  laborRate: 20, prepMin: 15, finishMin: 10,
  packaging: 3, other: 2, failRate: 5, taxRate: 0, margin: 30,
  pro: false,
};

function App() {
  const [s, setS] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("nm3d") || "{}") }; }
    catch { return DEFAULTS; }
  });
  const set = (patch) => setS((p) => ({ ...p, ...patch }));
  useEffect(() => { localStorage.setItem("nm3d", JSON.stringify(s)); }, [s]);
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", s.theme);
    // Apply the palette as INLINE custom properties, reliable re-resolution of
    // inherited `color: var(--ink)` (attribute-only changes proved flaky in some engines).
    const pal = THEMES[s.theme] || THEMES.light;
    for (const k in pal) html.style.setProperty(k, pal[k]);
    // Force a full style recalc so EVERY `color: var(--ink)` node re-resolves
    // (some engines leave a few stale on inline-var-only changes). Flash-free.
    html.style.display = "none"; void html.offsetHeight; html.style.display = "";
  }, [s.theme]);

  // ---- tweaks → CSS vars ----
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => {
    const r = document.documentElement.style;
    const a = ACCENT_LIST.find((p) => p[1] === t.accent) || ACCENT_LIST[0];
    r.setProperty("--accent-400", a[0]);
    r.setProperty("--accent-500", a[1]);
    r.setProperty("--accent-600", a[2]);
    r.setProperty("--accent-glow", a[3]);
    r.setProperty("--accent-fg", a[4] || "#ffffff");
    r.setProperty("--density", DENSITY[t.density] ?? 1);
    r.setProperty("--r-scale", RADIUS[t.radius] ?? 1);
  }, [t.accent, t.density, t.radius]);

  // filament preset → price
  const onFilament = (id) => {
    const f = FILAMENTS.find((x) => x.id === id);
    set({ filament: id, ...(f && f.price != null ? { filamentPrice: f.price } : {}) });
  };
  const onPrinter = (id) => {
    const p = PRINTERS.find((x) => x.id === id);
    set({ printer: id, ...(p && p.cost != null ? { printerCost: p.cost, power: p.power, printerLife: p.life } : {}) });
  };
  const onTariff = (id) => {
    const tf = TARIFFS.find((x) => x.id === id);
    set({ tariffRegion: id, ...(tf && tf.price != null ? { tariff: tf.price } : {}) });
  };

  const costs = useMemo(() => computeCosts(s), [s]);
  const parts = useMemo(
    () => COST_KEYS.map((k) => ({ ...k, value: costs[k.key] })),
    [costs]
  );
  const prices = useMemo(
    () => MARKETPLACES.map((mk) => ({ mk, ...priceForMarketplace(mk, costs.total, s.margin, s.taxRate) })),
    [costs.total, s.margin, s.taxRate]
  );
  const bestId = useMemo(() => {
    let best = null;
    prices.forEach((p) => { if (!best || p.price < best.price) best = p; });
    return best ? best.mk.id : null;
  }, [prices]);

  const [copied, setCopied] = useState(null);
  const copyPrice = (p) => {
    navigator.clipboard?.writeText(BRL(p.price).replace("R$ ", "R$"));
    setCopied(p.mk.id); setTimeout(() => setCopied(null), 1400);
  };

  // ---- PRO state ----
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [annual, setAnnual] = useState(true);
  const openUpgrade = () => setShowUpgrade(true);
  const doPay = () => { set({ pro: true }); setShowUpgrade(false); };

  // ---- Budgets ----
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nm3d_budgets") || "[]"); }
    catch { return []; }
  });
  const [showSave, setShowSave] = useState(false);
  const [showBudgets, setShowBudgets] = useState(false);
  useEffect(() => { localStorage.setItem("nm3d_budgets", JSON.stringify(budgets)); }, [budgets]);
  const saveBudget = (name) => {
    const b = { id: Date.now(), name, date: new Date().toISOString(), total: costs.total, state: { ...s } };
    setBudgets((prev) => [b, ...prev]);
    setShowSave(false);
  };
  const loadBudget = (b) => { setS({ ...DEFAULTS, ...b.state }); setShowBudgets(false); };
  const deleteBudget = (id) => { setBudgets((prev) => prev.filter((b) => b.id !== id)); };

  return (
    <div className="app">
      {/* ---------- top bar ---------- */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Icon d={I.printer} size={22} sw={2} /></span>
          <div>
            <div className="brand-name">NickMaker<span className="accent-text">3D</span></div>
            <div className="brand-sub">Precificadora inteligente para impressão 3D</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="taxes-stamp">
            <span className="muted">Taxas atualizadas</span>
            <span className="accent-text">Junho 2026</span>
          </div>
          {s.pro
            ? <span className="pro-chip"><Icon d={I.crown} size={14} sw={2.2} /> PRO</span>
            : <button className="btn btn-primary btn-sm pro-btn" onClick={openUpgrade}>
                <Icon d={I.crown} size={14} sw={2.2} /> Atualizar para PRO
              </button>}
          <button className="theme-toggle" onClick={() => set({ theme: s.theme === "dark" ? "light" : "dark" })}
            title="Alternar tema" aria-label="Alternar tema">
            <Icon d={s.theme === "dark" ? I.sun : I.moon} size={18} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm("Restaurar valores padrão?")) setS({ ...DEFAULTS, theme: s.theme, pro: s.pro }); }}>
            <Icon d={I.reset} size={15} /> Limpar
          </button>
        </div>
      </header>

      {/* ---------- two-column body ---------- */}
      <div className="body-grid">
        {/* ===== INPUTS ===== */}
        <div className="inputs-col">
          <Panel icon={I.spool} title="Material /" accentWord="Filamento">
            <SelectField label="Tipo de material" value={s.filament} onChange={onFilament}
              options={FILAMENTS.map((f) => ({ value: f.id, label: f.label }))} />
            <div className="grid-2">
              <NumField label="Preço do filamento" value={s.filamentPrice} suffix="R$/kg"
                onChange={(v) => set({ filamentPrice: v, filament: "CUSTOM" })} />
              <NumField label="Material utilizado" value={s.materialGrams} suffix="g"
                onChange={(v) => set({ materialGrams: v })} />
            </div>
          </Panel>

          <Panel icon={I.bolt} title="Energia Elétrica">
            <SelectField label="Estado (tarifa de energia)" value={s.tariffRegion} onChange={onTariff}
              options={TARIFFS.map((tf) => ({ value: tf.id, label: tf.label }))} />
            <div className="grid-4" style={{ marginTop: "var(--sp-4)" }}>
              <NumField label="Potência" value={s.power} suffix="W" onChange={(v) => set({ power: v, printer: "CUSTOM" })} />
              <NumField label="Horas" value={s.hours} suffix="h" onChange={(v) => set({ hours: v })} />
              <NumField label="Minutos" value={s.minutes} suffix="min" onChange={(v) => set({ minutes: v })} />
              <NumField label="Tarifa" value={s.tariff} suffix="R$/kWh" onChange={(v) => set({ tariff: v, tariffRegion: "CUSTOM" })} />
            </div>
            <p className="field-hint" style={{ marginTop: 10 }}>Médias residenciais com impostos. Confira sua conta de luz e ajuste a tarifa se precisar.</p>
          </Panel>

          <Panel icon={I.printer} title="Equipamento /" accentWord="Depreciação">
            <PrinterSelect value={s.printer} onChange={onPrinter} pro={s.pro} onUpgrade={openUpgrade} />
            <div className="grid-2">
              <NumField label="Custo da impressora" value={s.printerCost} suffix="R$" onChange={(v) => set({ printerCost: v, printer: "CUSTOM" })} />
              <NumField label="Vida útil estimada" value={s.printerLife} suffix="horas" onChange={(v) => set({ printerLife: v, printer: "CUSTOM" })} />
            </div>
            <p className="field-hint deprec-line">
              Custo por hora de uso: <strong className="accent-text num">{BRL(costs.hourlyDeprec)}/h</strong>
            </p>
          </Panel>

          <Panel icon={I.wrench} title="Mão de Obra">
            <div className="grid-3">
              <NumField label="Valor/hora" value={s.laborRate} suffix="R$/h" onChange={(v) => set({ laborRate: v })} />
              <NumField label="Preparação" value={s.prepMin} suffix="min" onChange={(v) => set({ prepMin: v })} />
              <NumField label="Acabamento" value={s.finishMin} suffix="min" onChange={(v) => set({ finishMin: v })} />
            </div>
          </Panel>

          <Panel icon={I.tag} title="Custos Adicionais &" accentWord="Precificação">
            <div className="grid-2">
              <NumField label="Embalagem" value={s.packaging} suffix="R$" onChange={(v) => set({ packaging: v })} />
              <NumField label="Outros (cola, lixa…)" value={s.other} suffix="R$" onChange={(v) => set({ other: v })} />
            </div>
            <div className="grid-2" style={{ marginTop: "var(--sp-4)" }}>
              <NumField label="Taxa de falha" value={s.failRate} suffix="%" onChange={(v) => set({ failRate: v })} />
              <NumField label="Imposto sobre venda" value={s.taxRate} suffix="%" onChange={(v) => set({ taxRate: v })} />
            </div>
            <div className="margin-block">
              <div className="margin-head">
                <label className="field-label">Margem de lucro desejada</label>
                <span className="margin-value num">{s.margin}%</span>
              </div>
              <input className="range" type="range" min="0" max="200" step="1"
                value={s.margin} onChange={(e) => set({ margin: +e.target.value })} />
              <div className="margin-scale"><span>0%</span><span>50%</span><span>100%</span><span>200%</span></div>
            </div>
          </Panel>
        </div>

        {/* ===== RESULTS ===== */}
        <div className="results-col">
          <section className="card card-pad results-cost">
            <header className="panel-head">
              <span className="panel-icon"><Icon d={I.chart} size={18} /></span>
              <h2 className="t-h4 panel-title">Custo de Produção</h2>
            </header>
            <ul className="cost-list">
              {parts.map((p) => (
                <li key={p.key}>
                  <span className="cost-name"><i className="cost-swatch" style={{ background: p.color }}></i>{p.label}</span>
                  <span className="num cost-val">{BRL(p.value)}</span>
                </li>
              ))}
            </ul>
            <div className="hr" style={{ margin: "var(--sp-4) 0" }}></div>
            <div className="total-row">
              <div>
                <div className="t-h4">Custo Total</div>
                <div className="field-hint">por unidade produzida</div>
              </div>
              <div className="total-value num accent-text">{BRL(costs.total)}</div>
            </div>
            <div className="donut-block">
              <CostDonut parts={parts} total={costs.total} />
              <ul className="donut-legend">
                {parts.filter((p) => p.value > 0).map((p) => (
                  <li key={p.key}>
                    <i className="cost-swatch" style={{ background: p.color }}></i>
                    {p.label} <span className="muted num">{costs.total > 0 ? Math.round((p.value / costs.total) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="export-row">
              {s.pro ? (
                <>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowSave(true)}><Icon d={I.download} size={15} /> Salvar</button>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowBudgets(true)}><Icon d={I.chart} size={15} /> Orçamentos{budgets.length > 0 ? ` (${budgets.length})` : ""}</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}><Icon d={I.download} size={15} /> PDF</button>
                </>
              ) : (
                <button className="btn btn-soft export-locked" onClick={openUpgrade}>
                  <Icon d={I.lock} size={15} /> Salvar e exportar orçamento em PDF <ProTag small />
                </button>
              )}
            </div>
          </section>

          <section className="card card-pad results-mk">
            <header className="panel-head">
              <span className="panel-icon"><Icon d={I.store} size={18} /></span>
              <h2 className="t-h4 panel-title">Preço por Marketplace</h2>
              {!s.pro && <span className="mk-free-tag">2 de {MARKETPLACES.length} no plano grátis</span>}
            </header>
            <div className="mk-list">
              {prices.filter((p) => s.pro || FREE_MK.includes(p.mk.id)).map((p) => {
                const best = p.mk.id === bestId;
                return (
                  <div key={p.mk.id} className={"mk-card" + (best ? " is-best" : "")} style={{ "--mk": p.mk.color }}>
                    {best && <span className="badge-best mk-best-badge">Melhor opção</span>}
                    <div className="mk-top">
                      <span className="mk-name">{p.mk.label}</span>
                      <button className="mk-price num" onClick={() => copyPrice(p)} title="Copiar preço">
                        {copied === p.mk.id ? <span className="copied"><Icon d={I.check} size={15} /> copiado</span> : BRL(p.price)}
                      </button>
                    </div>
                    <div className="mk-stats">
                      <div className="mk-stat">
                        <span className="mk-stat-k">Taxas</span>
                        <span className="num mk-stat-fee">{BRL(p.fees)}</span>
                      </div>
                      <div className="mk-stat">
                        <span className="mk-stat-k">Lucro</span>
                        <span className="num mk-stat-profit">{BRL(p.profit)}</span>
                      </div>
                      <div className="mk-stat">
                        <span className="mk-stat-k">Margem</span>
                        <span className="num">{PCT(p.margin)}</span>
                      </div>
                    </div>
                    <p className="mk-note">{p.mk.note}</p>
                  </div>
                );
              })}

              {!s.pro && (
                <Lock locked onUnlock={openUpgrade} label={`+${prices.length - FREE_MK.length} marketplaces no PRO`}>
                  <div className="mk-locked-list">
                    {prices.filter((p) => !FREE_MK.includes(p.mk.id)).map((p) => (
                      <div key={p.mk.id} className="mk-card" style={{ "--mk": p.mk.color }}>
                        <div className="mk-top">
                          <span className="mk-name">{p.mk.label}</span>
                          <span className="mk-price num">{BRL(p.price)}</span>
                        </div>
                        <div className="mk-stats">
                          <div className="mk-stat"><span className="mk-stat-k">Taxas</span><span className="num mk-stat-fee">{BRL(p.fees)}</span></div>
                          <div className="mk-stat"><span className="mk-stat-k">Lucro</span><span className="num mk-stat-profit">{BRL(p.profit)}</span></div>
                          <div className="mk-stat"><span className="mk-stat-k">Margem</span><span className="num">{PCT(p.margin)}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Lock>
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="app-foot">
        <span className="muted">NickMaker3D · precificadora para makers · valores salvos automaticamente neste navegador</span>
      </footer>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} onPay={doPay}
        annual={annual} setAnnual={setAnnual} />
      <SaveBudgetModal open={showSave} onClose={() => setShowSave(false)} onSave={saveBudget} />
      <BudgetsModal open={showBudgets} onClose={() => setShowBudgets(false)}
        budgets={budgets} onLoad={loadBudget} onDelete={deleteBudget} />

      <TweaksPanel>
        <TweakSection label="Conta" />
        <TweakToggle label="Plano PRO (simulação)" value={s.pro} onChange={(v) => set({ pro: v })} />
        <TweakSection label="Marca" />
        <TweakColor label="Cor de destaque" value={t.accent}
          options={ACCENT_OPTIONS}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Densidade" value={t.density}
          options={Object.keys(DENSITY)} onChange={(v) => setTweak("density", v)} />
        <TweakRadio label="Cantos" value={t.radius}
          options={Object.keys(RADIUS)} onChange={(v) => setTweak("radius", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
