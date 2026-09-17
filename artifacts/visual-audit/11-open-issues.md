# 11 — Catálogo Completo de Problemas Abertos

**Documento**: `artifacts/visual-audit/11-open-issues.md`  
**Data**: 16/09/2026 · **Total**: 32 problemas · **Status**: Todos abertos (nenhuma correção aplicada)

---

## Índice Rápido por Prioridade

- **P1 (8)**: A11Y-001, A11Y-002, A11Y-004, A11Y-005, STA-001, STA-002, RSP-001, RSP-002
- **P2 (13)**: A11Y-003, A11Y-008, UX-001, UX-002, FUN-001, RSP-003, RSP-004, VIS-003, DS-001, DS-002, DS-006, DS-007, DS-012
- **P3 (10)**: A11Y-006, A11Y-007, UX-003, VIS-002, VIS-004, VIS-005, VIS-007, DS-003, DS-004, DS-005, DS-008, DS-009, DS-010, DS-011, DS-013
- **P4 (1)**: VIS-006

---

## A11Y-001 · Foco visual ausente para navegação por teclado

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y — Acessibilidade |
| **Severidade** | Crítica |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Tela** | Todas |
| **Rota** | `/`, `/login`, `/standby`, `/comodo/[id]` |
| **Componente** | Aplicação inteira |
| **Arquivo** | [`globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css) |
| **Viewport** | Todos |
| **Tema** | Ambos |
| **Passos** | Tab repetidamente a partir da barra de endereços |
| **Esperado** | Anel de foco `outline: 2px solid #38bdf8` no elemento ativo |
| **Observado** | Nenhum contorno visual. 0 regras `:focus-visible` em 10.430 linhas CSS |
| **Impacto** | Usuários de teclado/switches navegam às cegas. Reprovação WCAG 2.4.7 (AA) |
| **Correção** | `*:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }` |

---

## A11Y-002 · Contraste do acento no Tema Claro (2.59:1)

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y — Acessibilidade |
| **Severidade** | Crítica |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Tela** | Todas |
| **Componente** | Indicadores ativos sob tema claro |
| **Arquivo** | [`globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css) L83–86 |
| **Tema** | Claro (`light`) |
| **Passos** | Alternar para tema claro; inspecionar `#d97706` sobre `#e2e8f4` |
| **Esperado** | Contraste ≥ 4.5:1 (WCAG 1.4.3) |
| **Observado** | **2.59:1** — reprovação crítica |
| **Impacto** | Dispositivos ligados invisíveis sob luz solar. Reprovação WCAG AA |
| **Correção** | `--on-accent` no tema claro → `#b45309` (4.82:1 ✅) |

---

## A11Y-003 · Ausência de Focus Trap nos modais

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y — Acessibilidade |
| **Severidade** | Alta |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Tela** | Modais |
| **Componente** | `RoomPopup`, `MediaHubModal`, `EnergyWidget`, `VacuumWidget`, etc. |
| **Passos** | Abrir modal → Tab repetidamente |
| **Esperado** | Foco cicla dentro do modal |
| **Observado** | Foco vaza para botões e cards da página de fundo |
| **Impacto** | Usuários de leitor de tela acionam controles invisíveis. Violação WCAG 2.4.3 |
| **Correção** | `useFocusTrap` ou primitivo `@base-ui/react/dialog` |

---

## A11Y-004 · Contraste de alertas no Tema Claro (3.93:1)

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y — Acessibilidade |
| **Severidade** | Alta |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Tela** | Todas (alertas) |
| **Componente** | `SecurityAlertsBar`, `BatteryAlertsBar` |
| **Tema** | Claro (`light`) |
| **Passos** | Tema claro → inspecionar `#dc2626` sobre `#e2e8f4` |
| **Esperado** | Contraste ≥ 4.5:1 |
| **Observado** | **3.93:1** — reprovado |
| **Impacto** | Alertas de segurança lavados à distância |
| **Correção** | Token de alerta claro → `#b91c1c` (5.21:1 ✅) |

---

## A11Y-005 · Botão Power TV com 34px

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y — Acessibilidade |
| **Severidade** | Alta |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Tela** | Home |
| **Componente** | `.tv-compact-power` |
| **Passos** | Inspecionar dimensões no DevTools |
| **Esperado** | Alvo tátil ≥ 44px × 44px (WCAG 2.5.5) |
| **Observado** | **34px × 34px** |
| **Correção** | `min-width: 44px; min-height: 44px;` |

---

## A11Y-006 · Hierarquia de headings quebrada

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y |
| **Severidade** | Média |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Componente** | `BatteryAlertsBar`, `SecurityAlertsBar` |
| **Observado** | Salto de `<h1>` direto para `<h3>` |
| **Correção** | Títulos de modais como `<h2>` |

---

## A11Y-007 · Sliders sem `aria-valuetext`

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y |
| **Severidade** | Média |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Componente** | `LightDimmerModal` |
| **Observado** | Leitor anuncia "80" sem unidade |
| **Correção** | `aria-valuetext={`${brilho}% de brilho`}` |

---

## A11Y-008 · Retorno de foco ausente pós-fechamento

| Campo | Valor |
|:---|:---|
| **Categoria** | A11Y |
| **Severidade** | Média |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Componente** | Todos os modais |
| **Observado** | Foco cai no `<body>` após Escape |
| **Correção** | Restaurar `.focus()` no gatilho |

---

## STA-001 · Falha silenciosa de comandos sem toast

| Campo | Valor |
|:---|:---|
| **Categoria** | STA — Estado / Feedback |
| **Severidade** | Alta |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Tela** | Todas |
| **Componente** | Todos os acionadores |
| **Observado** | Shake 400ms + reversão silenciosa. Zero texto de erro |
| **Correção** | `ToastContainer.tsx` com `role="alert"` |

---

## STA-002 · `unavailable` indistinguível de `off`

| Campo | Valor |
|:---|:---|
| **Categoria** | STA — Estado / Feedback |
| **Severidade** | Alta |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Tela** | Home |
| **Componente** | `RoomCard` |
| **Arquivo** | [`RoomCard.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/RoomCard.tsx) L187 |
| **Observado** | `=== "on"` ignora `unavailable` → contabilizado como `off` |
| **Correção** | Badge "Offline" + ícone `WifiOff` + token `#64748b` |

---

## UX-001 · Sticky Hover em telas touch

| Campo | Valor |
|:---|:---|
| **Categoria** | UX |
| **Severidade** | Média |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Componente** | `RoomCard`, `QuickScenesPanel` |
| **Observado** | 118 regras `:hover` sem `@media (hover: hover)` |
| **Correção** | Encapsular hover em `@media (hover: hover) and (pointer: fine)` |

---

## UX-002 · Cenas sem possibilidade de undo

| Campo | Valor |
|:---|:---|
| **Categoria** | UX |
| **Severidade** | Média |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Componente** | `QuickScenesPanel` |
| **Observado** | POST imediato sem confirmação |
| **Correção** | Toast com "Desfazer" + delay 3s |

---

## UX-003 · Badge "Ao vivo" sem ação

| Campo | Valor |
|:---|:---|
| **Categoria** | UX |
| **Severidade** | Baixa |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Observado** | `cursor: pointer` mas sem handler |
| **Correção** | Associar a `buscar()` ou remover affordance |

---

## FUN-001 · Ricochete no seletor do aspirador

| Campo | Valor |
|:---|:---|
| **Categoria** | FUN |
| **Severidade** | Média |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Componente** | `VacuumWidget` |
| **Observado** | Estado local desacoplado de `travasOtimistasRef` |
| **Correção** | Estender travas otimistas ao aspirador |

---

## RSP-001 · Zero-Scroll violado em 1024×768

| Campo | Valor |
|:---|:---|
| **Categoria** | RSP |
| **Severidade** | Crítica |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Tela** | Home |
| **Viewport** | 1024×768 |
| **Observado** | 2ª fileira de cômodos cortada (scrollHeight > innerHeight) |
| **Correção** | Compactar gaps, cards e padding via media query |

---

## RSP-002 · Micro-pílulas com alvo de 36px

| Campo | Valor |
|:---|:---|
| **Categoria** | RSP |
| **Severidade** | Alta |
| **Prioridade** | P1 |
| **Status** | Aberto |
| **Componente** | `.security-micro-pill`, `.battery-micro-pill` |
| **Observado** | L7201 sobrescreve L4212 (36px anula 44px) |
| **Correção** | Corrigir especificidade CSS |

---

## RSP-003 · 3 colunas prematuras em < 480px

| Campo | Valor |
|:---|:---|
| **Categoria** | RSP |
| **Severidade** | Alta |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Observado** | Media query ativa 3 cols em `min-width: 320px` |
| **Correção** | `repeat(2, 1fr)` até 480px portrait |

---

## RSP-004 · Overflow em zoom 200%

| Campo | Valor |
|:---|:---|
| **Categoria** | RSP |
| **Severidade** | Média |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Observado** | 12 cards com `scrollWidth > clientWidth` |
| **Correção** | `text-overflow: ellipsis` universal |

---

## VIS-001 · 124 sombras distintas sem tokens

| Campo | Valor |
|:---|:---|
| **Categoria** | VIS |
| **Severidade** | Baixa |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Observado** | 124 `box-shadow` ad-hoc em globals.css |
| **Correção** | 4 tokens semânticos de sombra |

---

## VIS-002 · font-size fracionário 11.5px

| Campo | Valor |
|:---|:---|
| **Categoria** | VIS |
| **Severidade** | Baixa |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Observado** | `globals.css:4211: font-size: 11.5px` |
| **Correção** | `var(--font-caption, 12px)` |

---

## VIS-003 · Vermelho de energia = vermelho de segurança

| Campo | Valor |
|:---|:---|
| **Categoria** | VIS |
| **Severidade** | Média |
| **Prioridade** | P2 |
| **Status** | Aberto |
| **Observado** | `#ef4444` para consumo >350W e alertas de perímetro |
| **Correção** | Laranja `#f97316` para energia |

---

## VIS-004 · Verde com 4 significados

| Campo | Valor |
|:---|:---|
| **Categoria** | VIS |
| **Severidade** | Baixa |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Observado** | `#10b981` para rede, bateria, clima e economia |
| **Correção** | Variações semânticas distintas |

---

## VIS-005 · 7 tons de âmbar dispersos

| Campo | Valor |
|:---|:---|
| **Categoria** | VIS |
| **Severidade** | Média |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Observado** | 7 hexadecimais concorrentes de âmbar |
| **Correção** | `var(--color-primary)` unificado |

---

## VIS-006 · 32 tokens oklch zumbis

| Campo | Valor |
|:---|:---|
| **Categoria** | VIS |
| **Severidade** | Baixa |
| **Prioridade** | P4 |
| **Status** | Aberto |
| **Observado** | 32 variáveis `oklch` do shadcn/ui no `:root` |
| **Correção** | Remover do bloco `:root` |

---

## VIS-007 · Title Case na data do Standby

| Campo | Valor |
|:---|:---|
| **Categoria** | VIS |
| **Severidade** | Média |
| **Prioridade** | P3 |
| **Status** | Aberto |
| **Observado** | "Sexta-Feira, 11 De Setembro" |
| **Correção** | `toLocaleDateString('pt-BR')` nativo |

---

## DS-001 a DS-013

> Para detalhes completos dos 13 problemas de Design System (DS-001 a DS-013), consulte [`03-design-system-inconsistencies.md`](file:///c:/HomeAssistant/artifacts/visual-audit/03-design-system-inconsistencies.md) e o [catálogo consolidado](file:///C:/Users/adoli/.gemini/antigravity-ide/brain/be6a7a2b-ec64-4f48-b3da-01ea727fba36/auditoria-visual-catalogo-final.md).

| ID | Problema | Prioridade |
|:---|:---|:---:|
| DS-001 | Botão fechar com "✕" tipográfico (não SVG) | P2 |
| DS-002 | Alturas inconsistentes na barra diária (72–108px) | P2 |
| DS-003 | Headers de modais divergentes | P3 |
| DS-004 | Border-radius inconsistente (12/14/16px) | P3 |
| DS-005 | Componentes duplicados e órfãos | P3 |
| DS-006 | 49 font-sizes vs. 6 tokens previstos | P2 |
| DS-007 | Jitter numérico sem tabular-nums | P2 |
| DS-008 | Títulos de modal com 3 tamanhos diferentes | P3 |
| DS-009 | Subtítulo de cômodo 11px (ilegível a 3m) | P3 |
| DS-010 | Tracking ausente em uppercase | P3 |
| DS-011 | Font-weight inconsistente (300–700) | P3 |
| DS-012 | Loading heterogêneo sem Skeleton | P2 |
| DS-013 | Disabled com hover ativo | P3 |
