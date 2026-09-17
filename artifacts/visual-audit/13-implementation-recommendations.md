# 13 — Recomendações Técnicas de Implementação

**Documento**: `artifacts/visual-audit/13-implementation-recommendations.md`  
**Data**: 16/09/2026  
**Escopo**: Orientações técnicas detalhadas para executar cada fase do roadmap de correção.

---

## Regras de Governança para a Fase de Implementação

1. **Protocolo Antigravity**: Todas as correções devem ser aplicadas exclusivamente em `dashboard-app/` (código frontend, CSS, componentes React). Nenhuma alteração em `config/`, `.storage/` ou automações YAML.
2. **Validação Obrigatória**: Executar `tsc --noEmit` e `npm run build` após cada fase.
3. **Verificação HTTP**: Confirmar resposta 200 em `http://localhost:3002/api/state` após cada deploy.
4. **Sem Acionamento Físico**: Nenhum relé, lâmpada ou atuador deve ser acionado durante testes.
5. **Versionamento**: Cada fase deve ser commitada isoladamente para facilitar rollback.

---

## Fase 1 — Bloqueadores (Implementação Detalhada)

### 1.1 Regra Global de Foco Visível (A11Y-001)

**Arquivo**: [`globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css)

```css
/* === ACESSIBILIDADE: Anel de Foco Assistivo === */
*:focus-visible {
  outline: 2px solid var(--focus-ring, #38bdf8);
  outline-offset: 2px;
  border-radius: inherit;
}

/* Exceção para inputs de range (slider) */
input[type="range"]:focus-visible {
  outline-offset: 4px;
}

/* Remover outlines decorativos conflitantes */
*:focus:not(:focus-visible) {
  outline: none;
}
```

**Posição**: Adicionar imediatamente após os resets globais (antes da linha 50).

---

### 1.2 e 1.3 Calibração de Contraste no Tema Claro (A11Y-002, A11Y-004)

**Arquivo**: [`globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css) — bloco `[data-theme="light"]`

```css
[data-theme="light"],
.theme-light {
  /* ANTES:  --on-accent: #d97706;  (2.59:1 ❌) */
  --on-accent: #b45309;            /* Amber 700 → 4.82:1 ✅ */
  
  /* ANTES:  --color-danger: #dc2626;  (3.93:1 ❌) */
  --color-danger: #b91c1c;         /* Red 800 → 5.21:1 ✅ */
}
```

**Validação**: Usar [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) com os pares corrigidos.

---

### 1.4 Compactação Zero-Scroll em 1024×768 (RSP-001)

**Arquivo**: [`globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css)

**Estratégia**: Adicionar media query específica para o viewport do tablet de parede:

```css
@media (min-width: 1024px) and (max-height: 780px) and (orientation: landscape) {
  .dashboard-shell {
    padding-top: 8px;
    padding-bottom: 8px;
    gap: 6px;
  }
  
  .scenes-section {
    margin-bottom: 4px;
  }
  
  .daily-panorama-bar {
    gap: 6px;
    min-height: 72px;
  }
  
  .room-grid {
    gap: 6px;
  }
  
  .room-card {
    min-height: clamp(140px, 18vh, 175px);
    padding: 10px;
  }
}
```

**Validação**: `document.documentElement.scrollHeight <= window.innerHeight` em 1024×768.

---

## Fase 2 — Feedback e Estado

### 2.1 ToastContainer Global (STA-001)

**Novo arquivo**: `app/components/ToastContainer.tsx`

```tsx
// Estrutura sugerida
interface Toast {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'success';
  duration?: number;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    const handler = (e: CustomEvent<Toast>) => {
      setToasts(prev => [...prev, e.detail]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== e.detail.id));
      }, e.detail.duration || 5000);
    };
    window.addEventListener('toast', handler as EventListener);
    return () => window.removeEventListener('toast', handler as EventListener);
  }, []);
  
  return (
    <div role="alert" aria-live="polite" className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
```

**Integração**: Adicionar `<ToastContainer />` no `layout.tsx`.  
**Disparo**: Na função `alternar()` de `page.tsx`, no bloco `catch`:

```tsx
window.dispatchEvent(new CustomEvent('toast', {
  detail: {
    id: crypto.randomUUID(),
    message: `Falha ao comunicar com ${nomeDispositivo}. Verifique a conexão.`,
    type: 'error'
  }
}));
```

---

### 2.2 Diferenciação de Estado `unavailable` (STA-002)

**Arquivo**: [`RoomCard.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/RoomCard.tsx)

```tsx
// Adicionar contagem de unavailable
const quantosIndisponiveis = comodo.pontos.filter(
  p => estados[p.entityId]?.state === "unavailable"
).length;

// No JSX, renderizar indicador quando > 0
{quantosIndisponiveis > 0 && (
  <span className="unavailable-badge" title={`${quantosIndisponiveis} offline`}>
    <WifiOff size={12} />
  </span>
)}
```

**CSS**: Token `--color-device-unavailable: #64748b` (Slate 500).

---

### 2.3 Alvo Tátil do Power TV (A11Y-005)

**Arquivo**: [`globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css)

```css
.tv-compact-power {
  min-width: 44px;
  min-height: 44px;
  /* manter dimensão visual de 34px via inner content, expandir alvo tátil */
}
```

---

## Fase 3 — Funcionamento

### 3.3 Focus Trap para Modais (A11Y-003)

**Opção A**: Hook customizado `useFocusTrap`:

```tsx
function useFocusTrap(ref: RefObject<HTMLElement>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = ref.current.querySelectorAll(focusableSelector);
    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;
    
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    
    ref.current.addEventListener('keydown', trap);
    first?.focus();
    return () => ref.current?.removeEventListener('keydown', trap);
  }, [isOpen, ref]);
}
```

**Opção B**: Usar `<dialog>` nativo do HTML5 que já inclui Focus Trap built-in.

---

### 3.4 Retorno de Foco (A11Y-008)

**Padrão**: Armazenar `document.activeElement` no momento da abertura e restaurar no fechamento:

```tsx
const triggerRef = useRef<Element | null>(null);

const abrir = () => {
  triggerRef.current = document.activeElement;
  setAberto(true);
};

const fechar = () => {
  setAberto(false);
  (triggerRef.current as HTMLElement)?.focus();
};
```

---

## Fase 5 — Cores e Tokens

### Proposta de Tokens Semânticos Unificados

```css
:root {
  /* Fundo e Superfícies */
  --bg-canvas: #07090e;
  --bg-surface: #111827;
  --bg-surface-elevated: #1f293d;
  
  /* Tipografia */
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  
  /* Ações e Estados */
  --color-primary: #fbbf24;         /* Luzes ativas */
  --color-primary-hover: #f59e0b;   /* Hover de luzes */
  --color-media: #38bdf8;           /* Entretenimento */
  --color-healthy: #10b981;         /* Rede online */
  --color-comfort: #34d399;         /* Conforto térmico (variação) */
  --color-economy: #a3e635;         /* Economia energética (variação) */
  --color-warning: #f59e0b;         /* Bateria média */
  --color-energy-high: #f97316;     /* Consumo elevado (≠ danger) */
  --color-danger: #ef4444;          /* Segurança e falhas críticas */
  --color-offline: #64748b;         /* Dispositivos indisponíveis */
  --focus-ring: #38bdf8;            /* Anel de foco assistivo */
  
  /* Sombras Liquid Glass (4 níveis) */
  --shadow-glass-flat: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-glass-elevated: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-radiance-amber: 0 0 20px rgba(251, 191, 36, 0.15);
  --shadow-radiance-cyan: 0 0 20px rgba(56, 189, 248, 0.12);
  
  /* Tipografia (6 tokens modulares) */
  --text-display: clamp(1.85rem, 2.8vw, 2.35rem);
  --text-h1: clamp(1.45rem, 2.0vw, 1.85rem);
  --text-h2: clamp(1.15rem, 1.5vw, 1.35rem);
  --text-body: 0.875rem;
  --text-body-sm: 0.8125rem;
  --text-caption: 0.75rem;
}

[data-theme="light"] {
  --bg-canvas: #e2e8f4;
  --bg-surface: #ffffff;
  --bg-surface-elevated: #f1f5f9;
  --text-primary: #0f172a;
  --text-muted: #475569;
  --color-primary: #b45309;      /* 4.82:1 ✅ */
  --color-danger: #b91c1c;       /* 5.21:1 ✅ */
}
```

---

## Fase 6 — Componentes Atômicos

### 6.1 `ModalCloseButton` (DS-001)

```tsx
export function ModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="modal-close-btn"
      aria-label="Fechar"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
```

```css
.modal-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 150ms ease;
}
.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
```

---

## Fase 7 — Sticky Hover

### Padrão de Encapsulamento (UX-001)

```css
/* ANTES (problemático em touch) */
.room-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-glass-elevated);
}

/* DEPOIS (correto) */
@media (hover: hover) and (pointer: fine) {
  .room-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-glass-elevated);
  }
}
```

**Escopo**: Aplicar em todas as **118 regras `:hover`** decorativas do globals.css.

---

## Checklist de Validação Final

### Após Fase 1 (Bloqueadores)
- [ ] `tsc --noEmit` sem erros
- [ ] `npm run build` sem erros
- [ ] HTTP 200 em `http://localhost:3002/api/state`
- [ ] Foco visível em Tab navigation
- [ ] Contraste ≥ 4.5:1 no tema claro (medição WebAIM)
- [ ] `scrollHeight ≤ innerHeight` em 1024×768

### Após Fase 2 (Feedback)
- [ ] Toast visível ao simular falha de API
- [ ] Badge "Offline" em cards com entidades `unavailable`
- [ ] Botão Power TV ≥ 44px
- [ ] Micro-pílulas ≥ 44px em mobile

### Após Fase 3 (Funcionamento)
- [ ] Focus Trap ativo em todos os 10 modais
- [ ] Foco retorna ao gatilho após fechar modal
- [ ] Aspirador sem ricochete de seletor
- [ ] Cenas com toast "Desfazer" de 3s

### Após Fase 6 (Design System)
- [ ] `ModalCloseButton` SVG em todos os modais
- [ ] Barra diária com altura uniforme
- [ ] `tabular-nums` em todos os contadores
- [ ] Zero `font-size` hardcoded (todos via tokens)

### Validação Global
- [ ] Zero erros no console do navegador
- [ ] Vazamento horizontal = 0 em todos os viewports
- [ ] Tema claro funcional com contraste aprovado
- [ ] Tema escuro sem regressões
- [ ] Standby OLED com fundo #000000 puro
- [ ] Gravação de browser demonstrando fluxos corrigidos

---

> [!IMPORTANT]
> **Nenhuma alteração de código foi aplicada nesta fase de auditoria.** Este documento serve como guia técnico para a fase de implementação, que será executada somente após aprovação explícita do André.
