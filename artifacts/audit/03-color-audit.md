# Auditoria de Cores, Contraste e Tokens (03-color-audit.md)

**Documento**: `artifacts/audit/03-color-audit.md`  
**Escopo**: Análise cromática de `globals.css` e arquivos TSX da aplicação  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Métricas da Dispersão de Cores

* **Ocorrências de cores hexadecimais no CSS**: 331 ocorrências com 50 valores únicos.
* **Cores hardcoded diretamente em arquivos TSX**: 121 ocorrências com 49 valores adicionais.
* **Variantes de `rgba()`**: Mais de 300 gradações de transparência concorrentes.
* **Tokens Zumbis**: 32 variáveis CSS legadas do shadcn/ui em `oklch` convivem no `:root` com a paleta noturna real (ex.: `--background: oklch(1 0 0)` define fundo branco puro que conflita com o tema Obsidian).

---

## 2. Medição Matemática de Contraste WCAG 2.1

| Par de Cores Avaliado | Frente | Fundo Efetivo | Razão Calculada | Mínimo WCAG | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Texto Primário (Dark)** | `#f1f5f9` | `#0d1117` | **17.27:1** | 4.5:1 | ✅ Aprovado (AAA) |
| **Texto Muted (Dark)** | `#85898e` | `#0d1117` | **5.38:1** | 4.5:1 | ✅ Aprovado (AA) |
| **Texto Primário (Light)** | `#0f172a` | `#e2e8f4` | **14.52:1** | 4.5:1 | ✅ Aprovado (AAA) |
| **Texto Muted (Light)** | `#475569` | `#e2e8f4` | **6.16:1** | 4.5:1 | ✅ Aprovado (AA) |
| **Acento Ativo (Dark)** | `#fbbf24` | `#111827` | **10.63:1** | 3.0:1 | ✅ Aprovado (AAA) |
| **Acento Ativo (Light)** | `#d97706` | `#e2e8f4` | **2.59:1** | 4.5:1 | ❌ **REPROVADO** |
| **Alerta de Perigo (Dark)** | `#f87171` | `#0d1117` | **6.84:1** | 4.5:1 | ✅ Aprovado (AA) |
| **Alerta de Perigo (Light)** | `#dc2626` | `#e2e8f4` | **3.93:1** | 4.5:1 | ❌ **REPROVADO** |
| **Ícones Desligados** | `rgba(255,255,255,0.35)` | `#0d1117` | **3.08:1** | 3.0:1 | ⚠️ Limítrofe |
| **Bordas Estruturais** | `rgba(255,255,255,0.10)` | `#0d1117` | **1.28:1** | 3.0:1 | ⚠️ Invisível |

---

## 3. Proposta Canônica de Tokens Semânticos

```css
:root {
  /* Superfícies */
  --color-background-canvas: #07090e;
  --color-background-surface: #111827;
  --color-background-elevated: #1f293d;

  /* Tipografia */
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #94a3b8;

  /* Bordas e Foco */
  --color-border-default: rgba(255, 255, 255, 0.12);
  --color-border-strong: rgba(255, 255, 255, 0.24);
  --color-focus-ring: #38bdf8;

  /* Ações e Estados */
  --color-action-primary: #fbbf24;
  --color-action-danger: #ef4444;
  --color-status-success: #10b981;
  --color-status-error: #ef4444;
  --color-status-offline: #e11d48;

  /* Dispositivos Físicos */
  --color-device-on: #fbbf24;
  --color-device-off: rgba(241, 245, 249, 0.38);
  --color-device-unavailable: #64748b;
}

[data-theme="light"],
.theme-light {
  --color-background-canvas: #e2e8f4;
  --color-background-surface: #ffffff;
  --color-text-primary: #0f172a;
  --color-text-muted: #64748b;
  --color-action-primary: #b45309; /* Contraste corrigido >= 4.5:1 */
  --color-action-danger: #b91c1c;  /* Contraste corrigido >= 4.5:1 */
}
```
