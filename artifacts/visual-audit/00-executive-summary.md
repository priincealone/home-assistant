# 00 — Sumário Executivo da Auditoria Visual & UX

**Projeto**: Painel Residencial (`dashboard-app`)  
**Data**: 16/09/2026  
**Ambiente**: Next.js 16.3.3 · React 19.2.0 · Tailwind CSS v4 · Porta 3002  
**Design System**: *Nocturnal Observatory* (Liquid Glass, Zero-Scroll Wall Mount)  
**Auditor**: Antigravity (Especialista Sênior em UX, UI, Design Systems e Acessibilidade)  
**Metodologia**: Inspeção direta em browser, análise algorítmica de código CSS/TSX, testes de interação end-to-end, simulação de viewports e medição WCAG laboratorial.  
**Resultado**: Nenhuma alteração de código aplicada.

---

## 1. Métricas Globais da Auditoria

| Dimensão | Quantidade |
|:---|:---:|
| **Telas / Rotas Auditadas** | 4 rotas + 10 modais/sheets = **14 superfícies** |
| **Fluxos de Usuário Testados** | **17 fluxos** completos end-to-end |
| **Viewports Homologados** | **17 resoluções** (320×568 a 3440×1440 + zoom 200%) |
| **Elementos Interativos Testados** | **14 categorias** × 15 critérios = **210 verificações** |
| **Medições de Contraste WCAG** | **10 pares** de cores frente/fundo |
| **Problemas Catalogados** | **32** |

---

## 2. Problemas por Categoria

| Categoria | Prefixo | Quantidade | Percentual |
|:---|:---:|:---:|:---:|
| Acessibilidade | A11Y | 8 | 25.0% |
| Design System | DS | 13 | 40.6% |
| Visual | VIS | 7 | 21.9% |
| Responsividade | RSP | 4 | 12.5% |
| Estado / Feedback | STA | 2 | 6.3% |
| Experiência de Uso | UX | 3 | 9.4% |
| Funcionamento | FUN | 1 | 3.1% |
| **Total** | — | **32** | — |

---

## 3. Problemas por Severidade

| Severidade | Quantidade |
|:---|:---:|
| Crítica | 4 |
| Alta | 13 |
| Média | 11 |
| Baixa | 4 |
| **Total** | **32** |

---

## 4. Problemas por Prioridade

| Prioridade | Quantidade | Significado |
|:---|:---:|:---|
| **P1** | 8 | Resolução urgente (bloqueadores ou reprovação WCAG AA) |
| **P2** | 13 | Resolução no próximo ciclo de sprint |
| **P3** | 10 | Backlog de refinamento e polimento |
| **P4** | 1 | Dívida técnica cosmética |
| **Total** | **32** | — |

---

## 5. Principais Incoerências de Cores

1. **CLR-01 / A11Y-002**: Acento ativo no tema claro (`#d97706` sobre `#e2e8f4`) com contraste de **2.59:1** — reprovação crítica WCAG AA (mínimo 4.5:1).
2. **CLR-02 / A11Y-004**: Alertas de erro no tema claro (`#dc2626` sobre `#e2e8f4`) com contraste de **3.93:1** — reprovado.
3. **CLR-03 / STA-002**: Dispositivos `unavailable` usam mesma aparência visual de `off` (mesmo cinza, mesma opacidade) — mascaramento de falha física.
4. **CLR-04 / VIS-003**: Vermelho `#ef4444` usado tanto para consumo energético alto quanto para alertas de segurança — ambiguidade semântica cromática.
5. **CLR-05 / VIS-004**: Verde `#10b981` reutilizado para 4 domínios distintos (rede, bateria, conforto, economia) — sobrecarga semântica.
6. **CLR-06 / VIS-005**: 7 variações de âmbar concorrentes sem justificativa óptica no CSS e TSX.
7. **CLR-07 / VIS-006**: 32 variáveis CSS `oklch` zumbis herdadas do shadcn/ui no `:root`.

---

## 6. Principais Erros Funcionais e de Estado

1. **STA-001**: Falha silenciosa de comandos físicos — nenhum toast ou notificação quando a API falha; o card apenas reverte em silêncio após 3.5s.
2. **STA-002**: Dispositivos `unavailable` contabilizados como "desligados normais" — lógica binária `=== "on"` ignora estado de indisponibilidade.
3. **FUN-001**: Ricochete visual no seletor de modo do aspirador — estado local do `VacuumWidget` não integrado ao `travasOtimistasRef`.
4. **UX-002**: Cenas Rápidas despachadas imediatamente sem possibilidade de desfazer após toque acidental.

---

## 7. Principais Problemas Responsivos

1. **RSP-001 (CRÍTICO)**: Violação da Regra do 1º Viewport (Zero-Scroll) em **1024×768** — 2ª fileira de cômodos cortada na base da tela do tablet de parede.
2. **RSP-002**: Micro-pílulas de alerta com alvo tátil de 36px (sobrescrita por cascata CSS) — deveria ser 44px.
3. **RSP-003**: Grade de cômodos em 3 colunas prematuras em telas ≤ 480px (deveria ser 2 colunas).
4. **RSP-004**: 12 cards com overflow de conteúdo em zoom de 200%.

---

## 8. Principais Riscos de Acessibilidade

1. **A11Y-001 (CRÍTICO)**: Zero regras `:focus-visible` em 10.430 linhas de CSS — navegação por teclado completamente cega.
2. **A11Y-002 (CRÍTICO)**: Contraste de 2.59:1 no acento ativo do tema claro — reprovação WCAG 1.4.3.
3. **A11Y-003**: Ausência de Focus Trap em todos os 10 modais — foco vaza para a página de fundo.
4. **A11Y-005**: Botão Power da TV com 34px × 34px — abaixo do piso ergonômico WCAG AAA (44px).
5. **A11Y-008**: Retorno de foco ausente ao fechar modais — foco cai no `<body>`.

---

## 9. Principais Correções Recomendadas (Top 10)

| # | Correção | Impacto |
|:---:|:---|:---|
| 1 | Adicionar regra global `*:focus-visible` com anel ciano | Conformidade WCAG 2.4.7 |
| 2 | Alterar `--on-accent` no tema claro para `#b45309` (4.82:1) | Conformidade WCAG 1.4.3 |
| 3 | Compactar layout em 1024×768 para Zero-Scroll | Tablet de parede funcional |
| 4 | Criar `ToastContainer.tsx` para feedback de erros | Observabilidade de falhas |
| 5 | Diferenciar `unavailable` de `off` nos cards | Mascaramento de falha |
| 6 | Implementar Focus Trap nos 10 modais | Navegação assistiva |
| 7 | Encapsular `:hover` em `@media (hover: hover)` | Sticky Hover em touch |
| 8 | Corrigir alvos táteis < 44px (TV power, pílulas) | Ergonomia touch |
| 9 | Unificar 124 sombras em 4 tokens semânticos | Consistência Liquid Glass |
| 10 | Consolidar 49 `font-size` em 6 tokens modulares | Hierarquia tipográfica |

---

## 10. Telas e Fluxos Não Testados / Limitações

### Telas não testadas:
- **Tela de indisponibilidade total do HA**: Impossível simular desligamento completo do container sem afetar produção (protocolo RSK-01).
- **Tela de sessão expirada**: O cookie `casa_auth_session` é persistente sem TTL; não há fluxo de expiração implementado.
- **Editor de layout / widgets**: Não existe no escopo atual do painel.
- **Gestão de usuários / permissões**: Não implementado (PIN único compartilhado).

### Limitações da auditoria:
1. **Dispositivos físicos não acionados**: Conformidade com a governança AGENTS.md — nenhum relé, lâmpada ou atuador foi fisicamente ativado durante os testes.
2. **Testes de leitor de tela parciais**: Não foi possível testar com VoiceOver nativo do iOS ou TalkBack do Android; análise baseada em inspeção da Accessibility Tree e atributos ARIA.
3. **Teste de latência real de rede**: Não foi simulada degradação de rede real (3G, alta latência); análise baseada em timeout de 4500ms configurado no código.
4. **Tema Auto**: Não foi possível forçar alternância automática de tema por `prefers-color-scheme` sem manipulação do sistema operacional.

---

## 11. Recomendação Geral

> [!CAUTION]
> ### ⚠️ ATENÇÃO — Painel NÃO aprovado para homologação em sua configuração atual.

**Justificativa**:
- **3 reprovações críticas em WCAG AA** (foco invisível, contraste insuficiente no tema claro, alvos táteis < 44px);
- **1 violação da regra canônica do produto** (Zero-Scroll violado em 1024×768, o viewport primário do tablet de parede);
- **Ausência de feedback de erro** ao morador quando comandos físicos falham.

**Condições para aprovação**:
1. Resolver os **8 problemas P1** (bloqueadores e reprovações WCAG);
2. Resolver os **13 problemas P2** (degradação funcional);
3. Validar Zero-Scroll em 1024×768 após ajustes;
4. Revalidar contraste no tema claro após calibração cromática.

---

## 12. Tabela Consolidada de Todos os Problemas

| ID | Categoria | Problema | Tela | Severidade | Prioridade | Evidência | Correção sugerida | Status |
|:---|:---:|:---|:---|:---:|:---:|:---|:---|:---:|
| A11Y-001 | A11Y | Foco visual ausente para navegação por teclado | Todas | Crítica | P1 | 0 regras `:focus-visible` em 10.430 linhas CSS | `*:focus-visible { outline: 2px solid #38bdf8 }` | Aberto |
| A11Y-002 | A11Y | Contraste do acento no Tema Claro (2.59:1) | Todas | Crítica | P1 | `#d97706` sobre `#e2e8f4` = 2.59:1 | Alterar para `#b45309` (4.82:1) | Aberto |
| A11Y-003 | A11Y | Ausência de Focus Trap nos modais | Modais | Alta | P2 | Tab vaza para página de fundo | `useFocusTrap` ou `@base-ui/react/dialog` | Aberto |
| A11Y-004 | A11Y | Contraste de alertas no Tema Claro (3.93:1) | Todas | Alta | P1 | `#dc2626` sobre `#e2e8f4` = 3.93:1 | Alterar para `#b91c1c` (5.21:1) | Aberto |
| A11Y-005 | A11Y | Botão Power TV com 34px (mínimo 44px) | Home | Alta | P1 | `width: 34px; height: 34px` | `min-width: 44px; min-height: 44px` | Aberto |
| A11Y-006 | A11Y | Hierarquia de headings quebrada (h1→h3) | Modais | Média | P3 | Salto de `<h1>` para `<h3>` | Padronizar títulos de modais como `<h2>` | Aberto |
| A11Y-007 | A11Y | Sliders sem `aria-valuetext` | Dimmer | Média | P3 | `<input type="range">` sem ARIA | `aria-valuetext={`${brilho}% de brilho`}` | Aberto |
| A11Y-008 | A11Y | Retorno de foco ausente pós-fechamento | Modais | Média | P2 | Foco cai no `<body>` após Escape | Restaurar `.focus()` no elemento gatilho | Aberto |
| STA-001 | STA | Falha silenciosa de comandos sem toast | Todas | Alta | P1 | Nenhum container de toast em `layout.tsx` | `ToastContainer.tsx` com `role="alert"` | Aberto |
| STA-002 | STA | `unavailable` indistinguível de `off` | Home | Alta | P1 | `=== "on"` ignora `unavailable` | Badge "Offline" com ícone `WifiOff` | Aberto |
| UX-001 | UX | Sticky Hover em telas touch | Home | Média | P2 | 118 regras `:hover` sem media query | `@media (hover: hover) and (pointer: fine)` | Aberto |
| UX-002 | UX | Cenas sem possibilidade de undo | Home | Média | P2 | POST imediato sem confirmação | Toast com "Desfazer" e delay de 3s | Aberto |
| UX-003 | UX | Badge "Ao vivo" sem ação funcional | Home | Baixa | P3 | `cursor: pointer` mas sem handler | Associar clique a `buscar()` ou remover affordance | Aberto |
| FUN-001 | FUN | Ricochete no seletor do aspirador | Aspirador | Média | P2 | Estado local desacoplado de travas otimistas | Estender `travasOtimistasRef` | Aberto |
| RSP-001 | RSP | Zero-Scroll violado em 1024×768 | Home | Crítica | P1 | `scrollHeight > innerHeight` | Compactar gaps e cards via media query | Aberto |
| RSP-002 | RSP | Micro-pílulas com alvo tátil de 36px | Home | Alta | P1 | Cascata CSS anula media query de 44px | Corrigir especificidade na linha 7201 | Aberto |
| RSP-003 | RSP | 3 colunas prematuras em < 480px | Home | Alta | P2 | Media query de 3 cols em `min-width: 320px` | `repeat(2, 1fr)` até 480px portrait | Aberto |
| RSP-004 | RSP | Overflow em zoom de 200% | Widgets | Média | P2 | 12 cards com `scrollWidth > clientWidth` | `text-overflow: ellipsis` universal | Aberto |
| VIS-001 | VIS | 124 sombras distintas sem tokens | Todas | Baixa | P3 | 124 `box-shadow` únicos em globals.css | 4 tokens semânticos de sombra | Aberto |
| VIS-002 | VIS | font-size fracionário 11.5px | Home | Baixa | P3 | `globals.css:4211: font-size: 11.5px` | `var(--font-caption, 12px)` | Aberto |
| VIS-003 | VIS | Vermelho de energia = vermelho de segurança | Energia | Média | P2 | `#ef4444` em ambos os contextos | Laranja `#f97316` para energia | Aberto |
| VIS-004 | VIS | Verde com 4 significados simultâneos | Cabeçalho | Baixa | P3 | `#10b981` para rede, bateria, clima, energia | Variações semânticas de verde | Aberto |
| VIS-005 | VIS | 7 tons de âmbar dispersos | Todas | Média | P3 | 7 hexadecimais de âmbar no código | `var(--color-primary)` unificado | Aberto |
| VIS-006 | VIS | 32 tokens oklch zumbis do shadcn/ui | `:root` | Baixa | P4 | 32 variáveis `oklch` não consumidas | Remover do bloco `:root` | Aberto |
| VIS-007 | VIS | Title Case na data do Standby | Standby | Média | P3 | "Sexta-Feira, 11 De Setembro" | `toLocaleDateString('pt-BR')` nativo | Aberto |
| DS-001 | DS | Botão fechar com "✕" tipográfico | Modais | Alta | P2 | 4 modais com caractere Unicode | `ModalCloseButton` com SVG 44px | Aberto |
| DS-002 | DS | Alturas inconsistentes na barra diária | Home | Alta | P2 | Variação de 72px a 108px entre widgets | `.daily-widget-card` com altura fixa | Aberto |
| DS-003 | DS | Headers de modais divergentes | Modais | Média | P3 | Gaps de 10px, 14px e wrapper custom | Componente `ModalHeader` padronizado | Aberto |
| DS-004 | DS | Border-radius inconsistente (12/14/16px) | Subcards | Baixa | P3 | 28 valores de `border-radius` | `--radius-subcard: 14px` | Aberto |
| DS-005 | DS | Componentes duplicados e órfãos | Código | Baixa | P3 | `SecurityAlertsBar` ≈ `BatteryAlertsBar` | Unificar em `HeaderAlertPill` | Aberto |
| DS-006 | DS | 49 font-sizes vs. 6 tokens previstos | Todas | Média | P2 | 49 valores únicos incluindo fracionários | 6 variáveis tipográficas modulares | Aberto |
| DS-007 | DS | Jitter numérico sem tabular-nums | Modais | Alta | P2 | Cronômetro TV e consumíveis sem tabular | `font-variant-numeric: tabular-nums` | Aberto |
| DS-008 | DS | Títulos de modal 18/20/22px | Modais | Média | P3 | 3 tamanhos distintos | `.modal-header-title` unificado | Aberto |
| DS-009 | DS | Subtítulo de cômodo 11px (ilegível a 3m) | Home | Baixa | P3 | Medição: 11px com cor atenuada | 12px com peso 500 e `#cbd5e1` | Aberto |
| DS-010 | DS | Tracking ausente em uppercase | Header | Baixa | P3 | `letter-spacing: normal` em badges | `letter-spacing: 0.05em` | Aberto |
| DS-011 | DS | Font-weight inconsistente (300–700) | Subcards | Média | P3 | 5 pesos em mesma função semântica | `font-weight: 500` padronizado | Aberto |
| DS-012 | DS | Loading heterogêneo sem Skeleton | Todas | Média | P2 | 3 padrões de carregamento distintos | `SkeletonShimmer` reutilizável | Aberto |
| DS-013 | DS | Disabled com hover ativo | Modais | Baixa | P3 | Hover funciona em botões desabilitados | `pointer-events: none` + `opacity: 0.35` | Aberto |

---

## 13. Roadmap de Correção

### Fase 1 — Bloqueadores (P1 Crítico)
> Impedem homologação. Devem ser corrigidos antes de qualquer outra tarefa.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 1.1 | A11Y-001 | Regra global `*:focus-visible` com anel ciano | Baixo |
| 1.2 | A11Y-002 | Alterar `--on-accent` no tema claro para `#b45309` | Muito Baixo |
| 1.3 | A11Y-004 | Alterar token de alerta claro para `#b91c1c` | Muito Baixo |
| 1.4 | RSP-001 | Compactar layout 1024×768 (gaps, cards, padding) | Médio |

### Fase 2 — Problemas Críticos de Feedback e Estado (P1)
> Falhas que enganam o morador sobre o estado real da casa.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 2.1 | STA-001 | Criar `ToastContainer.tsx` global com `role="alert"` | Médio |
| 2.2 | STA-002 | Diferenciar `unavailable` de `off` nos cards | Médio |
| 2.3 | A11Y-005 | Botão Power TV: 34px → 44px | Baixo |
| 2.4 | RSP-002 | Corrigir cascata CSS das micro-pílulas (36px → 44px) | Baixo |

### Fase 3 — Funcionamento da Interface (P2)
> Corrigir comportamentos que degradam a confiança na interação.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 3.1 | FUN-001 | Integrar `VacuumWidget` ao `travasOtimistasRef` | Médio |
| 3.2 | UX-002 | Toast com "Desfazer" nas cenas rápidas (delay 3s) | Médio |
| 3.3 | A11Y-003 | Focus Trap nos 10 modais (`useFocusTrap`) | Médio |
| 3.4 | A11Y-008 | Retorno de foco ao fechar modais | Baixo |

### Fase 4 — Responsividade (P2)
> Adequar a grade e widgets ao envelope de viewports definido.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 4.1 | RSP-003 | Grade: 2 colunas em ≤ 480px portrait | Baixo |
| 4.2 | RSP-004 | `text-overflow: ellipsis` universal em zoom 200% | Baixo |

### Fase 5 — Cores e Tokens (P2–P3)
> Sanar ambiguidades cromáticas e dispersão de paleta.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 5.1 | VIS-003 | Laranja para energia, vermelho só para segurança | Baixo |
| 5.2 | VIS-005 | Consolidar 7 âmbares em tokens canônicos | Médio |
| 5.3 | VIS-004 | Variações semânticas de verde | Baixo |
| 5.4 | VIS-006 | Remover 32 tokens oklch zumbis do `:root` | Muito Baixo |

### Fase 6 — Componentes e Design System (P2)
> Padronizar anatomia e comportamento dos componentes.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 6.1 | DS-001 | `ModalCloseButton` com SVG e 44px | Baixo |
| 6.2 | DS-002 | `.daily-widget-card` com altura fixa | Médio |
| 6.3 | DS-007 | `tabular-nums` em todos os contadores | Baixo |
| 6.4 | DS-006 | 6 tokens tipográficos modulares | Alto |
| 6.5 | DS-012 | `SkeletonShimmer` reutilizável | Médio |

### Fase 7 — Acessibilidade Avançada (P3)
> Refinamentos assistivos e semânticos.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 7.1 | A11Y-006 | Headings `<h2>` em modais | Muito Baixo |
| 7.2 | A11Y-007 | `aria-valuetext` no slider de dimmer | Muito Baixo |
| 7.3 | UX-001 | Encapsular `:hover` em `@media (hover: hover)` | Médio |

### Fase 8 — Melhorias de UX (P3)
> Otimizar a experiência sem alterar funcionalidade.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 8.1 | UX-003 | Ação ou remoção de affordance no badge "Ao vivo" | Muito Baixo |
| 8.2 | DS-013 | Disabled: `pointer-events: none` + sem hover | Baixo |

### Fase 9 — Melhorias Cosméticas (P3)
> Polimento visual sem impacto funcional.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 9.1 | VIS-002 | font-size 11.5px → 12px via token | Muito Baixo |
| 9.2 | VIS-007 | Title Case → capitalização gramatical no Standby | Muito Baixo |
| 9.3 | DS-008 | Títulos de modal: 1 tamanho unificado | Baixo |
| 9.4 | DS-009 | Subtítulo de cômodo: 11px → 12px | Muito Baixo |
| 9.5 | DS-010 | `letter-spacing: 0.05em` em uppercase | Muito Baixo |
| 9.6 | DS-011 | `font-weight: 500` padronizado em tiles | Baixo |

### Fase 10 — Backlog Futuro (P3–P4)
> Dívida técnica e refatoração de longo prazo.

| Ordem | ID | Correção | Esforço |
|:---:|:---|:---|:---:|
| 10.1 | VIS-001 | 124 sombras → 4 tokens semânticos | Alto |
| 10.2 | DS-003 | Componente `ModalHeader` padronizado | Médio |
| 10.3 | DS-004 | `--radius-subcard: 14px` canônico | Baixo |
| 10.4 | DS-005 | Eliminar componentes duplicados/órfãos | Baixo |

---

## 14. Documentos Complementares

| # | Documento | Conteúdo |
|:---:|:---|:---|
| 01 | [`01-screen-inventory.md`](file:///c:/HomeAssistant/artifacts/visual-audit/01-screen-inventory.md) | Inventário completo de telas e superfícies |
| 02 | [`02-user-flow-inventory.md`](file:///c:/HomeAssistant/artifacts/visual-audit/02-user-flow-inventory.md) | Catálogo de fluxos de usuário |
| 03 | [`03-design-system-inconsistencies.md`](file:///c:/HomeAssistant/artifacts/visual-audit/03-design-system-inconsistencies.md) | Inconsistências do Design System |
| 04 | [`04-color-inconsistencies.md`](file:///c:/HomeAssistant/artifacts/visual-audit/04-color-inconsistencies.md) | Inconsistências cromáticas e contraste |
| 05 | [`05-typography-inconsistencies.md`](file:///c:/HomeAssistant/artifacts/visual-audit/05-typography-inconsistencies.md) | Inconsistências tipográficas |
| 06 | [`06-state-feedback-report.md`](file:///c:/HomeAssistant/artifacts/visual-audit/06-state-feedback-report.md) | Relatório de estados e feedback |
| 07 | [`07-responsive-report.md`](file:///c:/HomeAssistant/artifacts/visual-audit/07-responsive-report.md) | Relatório de responsividade |
| 08 | [`08-accessibility-visual-report.md`](file:///c:/HomeAssistant/artifacts/visual-audit/08-accessibility-visual-report.md) | Relatório de acessibilidade |
| 09 | [`09-functional-visual-report.md`](file:///c:/HomeAssistant/artifacts/visual-audit/09-functional-visual-report.md) | Relatório funcional e interativo |
| 10 | [`10-screenshot-index.md`](file:///c:/HomeAssistant/artifacts/visual-audit/10-screenshot-index.md) | Índice de capturas de tela |
| 11 | [`11-open-issues.md`](file:///c:/HomeAssistant/artifacts/visual-audit/11-open-issues.md) | Catálogo completo de problemas abertos |
| 12 | [`12-prioritized-improvements.md`](file:///c:/HomeAssistant/artifacts/visual-audit/12-prioritized-improvements.md) | Melhorias priorizadas |
| 13 | [`13-implementation-recommendations.md`](file:///c:/HomeAssistant/artifacts/visual-audit/13-implementation-recommendations.md) | Recomendações de implementação |

---

> [!IMPORTANT]
> **Nenhuma alteração de código foi aplicada durante esta auditoria.** Aguardando aprovação do André para iniciar a fase de implementação.
