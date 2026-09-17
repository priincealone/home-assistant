# 12 — Melhorias Priorizadas e Roadmap de Correção

**Documento**: `artifacts/visual-audit/12-prioritized-improvements.md`  
**Data**: 16/09/2026  
**Total de Problemas**: 32  
**Estimativa Global**: ~80–120 horas de desenvolvimento frontend

---

## Roadmap de Correção em 10 Fases

---

### Fase 1 — Bloqueadores

> **Objetivo**: Remover as barreiras que impedem a homologação do painel.  
> **Critério de Conclusão**: WCAG AA aprovado + Zero-Scroll válido em 1024×768.  
> **Esforço Estimado**: 4–6 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 1.1 | A11Y-001 | Foco visual ausente | Regra global `*:focus-visible` | Baixo | Nulo |
| 1.2 | A11Y-002 | Contraste acento claro 2.59:1 | `--on-accent` → `#b45309` | Muito Baixo | Nulo |
| 1.3 | A11Y-004 | Contraste alerta claro 3.93:1 | Token alerta → `#b91c1c` | Muito Baixo | Nulo |
| 1.4 | RSP-001 | Zero-Scroll violado 1024×768 | Compactar gaps, cards e padding | Médio | Baixo |

**Dependências**: Nenhuma. Pode ser executado imediatamente.  
**Validação**: `tsc --noEmit` + inspeção visual em 1024×768 + medição de contraste.

---

### Fase 2 — Problemas Críticos de Feedback e Estado

> **Objetivo**: Garantir que o morador saiba o estado real da casa.  
> **Critério de Conclusão**: Falhas de API exibem toast; `unavailable` distinguível de `off`.  
> **Esforço Estimado**: 8–12 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 2.1 | STA-001 | Falha silenciosa sem toast | `ToastContainer.tsx` global | Médio | Baixo |
| 2.2 | STA-002 | `unavailable` = `off` | Badge "Offline" + `WifiOff` | Médio | Baixo |
| 2.3 | A11Y-005 | Power TV 34px | Alvo → 44px | Baixo | Nulo |
| 2.4 | RSP-002 | Micro-pílulas 36px | Corrigir cascata CSS | Baixo | Nulo |

**Dependências**: STA-001 requer definição de posição do toast (base da tela) e duração de auto-dismiss.  
**Validação**: Simular falha de API; verificar toast visível; medir alvos táteis.

---

### Fase 3 — Funcionamento da Interface

> **Objetivo**: Eliminar comportamentos que degradam a confiança do usuário.  
> **Esforço Estimado**: 10–14 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 3.1 | FUN-001 | Ricochete aspirador | Integrar ao `travasOtimistasRef` | Médio | Baixo |
| 3.2 | UX-002 | Cenas sem undo | Toast "Desfazer" + delay 3s | Médio | Médio |
| 3.3 | A11Y-003 | Sem Focus Trap | `useFocusTrap` em 10 modais | Médio | Baixo |
| 3.4 | A11Y-008 | Retorno de foco | Restaurar foco no gatilho | Baixo | Nulo |

**Dependências**: 3.2 depende da existência do `ToastContainer` (Fase 2).  
**Validação**: Testar ricochete no aspirador; verificar Focus Trap por Tab; confirmar retorno de foco.

---

### Fase 4 — Responsividade

> **Objetivo**: Adequar o painel ao envelope de viewports documentado.  
> **Esforço Estimado**: 4–6 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 4.1 | RSP-003 | 3 colunas < 480px | `repeat(2, 1fr)` portrait | Baixo | Nulo |
| 4.2 | RSP-004 | Overflow zoom 200% | `text-overflow: ellipsis` | Baixo | Nulo |

**Validação**: Verificar em 320×568, 375×812, 430×932 e zoom 200%.

---

### Fase 5 — Cores e Tokens

> **Objetivo**: Sanar ambiguidades cromáticas e consolidar a paleta.  
> **Esforço Estimado**: 6–8 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 5.1 | VIS-003 | Vermelho de energia | Laranja `#f97316` para energia | Baixo | Nulo |
| 5.2 | VIS-005 | 7 âmbares dispersos | Consolidar em tokens canônicos | Médio | Baixo |
| 5.3 | VIS-004 | Verde sobrecarregado | Variações semânticas de verde | Baixo | Nulo |
| 5.4 | VIS-006 | 32 tokens oklch zumbis | Remover do `:root` | Muito Baixo | Nulo |

**Validação**: Verificar contraste de todas as novas cores; confirmar zero variáveis zumbis.

---

### Fase 6 — Componentes e Design System

> **Objetivo**: Padronizar anatomia e comportamento dos componentes.  
> **Esforço Estimado**: 16–20 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 6.1 | DS-001 | Botão fechar "✕" | `ModalCloseButton` com SVG | Baixo | Nulo |
| 6.2 | DS-002 | Alturas barra diária | `.daily-widget-card` fixa | Médio | Baixo |
| 6.3 | DS-007 | Jitter numérico | `tabular-nums` universal | Baixo | Nulo |
| 6.4 | DS-006 | 49 font-sizes | 6 tokens tipográficos | Alto | Médio |
| 6.5 | DS-012 | Loading heterogêneo | `SkeletonShimmer` global | Médio | Baixo |

**Dependências**: 6.4 é a tarefa mais abrangente; requer refatoração em massa do globals.css.  
**Validação**: `npm run build` sem erros; inspeção visual de todos os componentes.

---

### Fase 7 — Acessibilidade Avançada

> **Objetivo**: Refinamentos assistivos e conformidade semântica.  
> **Esforço Estimado**: 3–4 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 7.1 | A11Y-006 | Headings h1→h3 | Títulos `<h2>` em modais | Muito Baixo | Nulo |
| 7.2 | A11Y-007 | Slider sem aria | `aria-valuetext` | Muito Baixo | Nulo |
| 7.3 | UX-001 | Sticky Hover | `@media (hover: hover)` | Médio | Baixo |

**Validação**: Inspeção da Accessibility Tree; teste em dispositivo touch real.

---

### Fase 8 — Melhorias de UX

> **Objetivo**: Otimizar a experiência sem alterar funcionalidade.  
> **Esforço Estimado**: 2–3 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 8.1 | UX-003 | Badge "Ao vivo" | Ação de refresh ou remover affordance | Muito Baixo | Nulo |
| 8.2 | DS-013 | Disabled com hover | `pointer-events: none` | Baixo | Nulo |

---

### Fase 9 — Melhorias Cosméticas

> **Objetivo**: Polimento visual sem impacto funcional.  
> **Esforço Estimado**: 4–6 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 9.1 | VIS-002 | font-size 11.5px | Token `12px` | Muito Baixo | Nulo |
| 9.2 | VIS-007 | Title Case standby | Capitalização gramatical | Muito Baixo | Nulo |
| 9.3 | DS-008 | Títulos modal 18/20/22px | Unificar em 18px | Baixo | Nulo |
| 9.4 | DS-009 | Subtítulo 11px | Elevar para 12px | Muito Baixo | Nulo |
| 9.5 | DS-010 | Tracking uppercase | `letter-spacing: 0.05em` | Muito Baixo | Nulo |
| 9.6 | DS-011 | Font-weight 300–700 | Padronizar 500 | Baixo | Nulo |

---

### Fase 10 — Backlog Futuro

> **Objetivo**: Dívida técnica e refatoração de longo prazo.  
> **Esforço Estimado**: 16–24 horas.

| Ordem | ID | Problema | Correção | Esforço | Risco |
|:---:|:---|:---|:---|:---:|:---:|
| 10.1 | VIS-001 | 124 sombras | 4 tokens semânticos | Alto | Médio |
| 10.2 | DS-003 | Headers modais | `ModalHeader` padronizado | Médio | Baixo |
| 10.3 | DS-004 | Border-radius | `--radius-subcard: 14px` | Baixo | Nulo |
| 10.4 | DS-005 | Duplicados/órfãos | Eliminar arquivos | Baixo | Nulo |

---

## Resumo de Esforço por Fase

| Fase | Foco | Problemas | Horas Est. | Prioridade |
|:---:|:---|:---:|:---:|:---:|
| 1 | Bloqueadores | 4 | 4–6h | 🔴 P1 |
| 2 | Feedback e Estado | 4 | 8–12h | 🔴 P1 |
| 3 | Funcionamento | 4 | 10–14h | 🟡 P2 |
| 4 | Responsividade | 2 | 4–6h | 🟡 P2 |
| 5 | Cores e Tokens | 4 | 6–8h | 🟡 P2–P3 |
| 6 | Componentes | 5 | 16–20h | 🟡 P2 |
| 7 | Acessibilidade | 3 | 3–4h | 🔵 P3 |
| 8 | UX | 2 | 2–3h | 🔵 P3 |
| 9 | Cosméticos | 6 | 4–6h | 🔵 P3 |
| 10 | Backlog | 4 | 16–24h | ⚪ P3–P4 |
| **Total** | — | **32** | **73–103h** | — |

---

## Marcos de Entrega Sugeridos

| Marco | Fases | Critério de Aceite |
|:---|:---:|:---|
| **M1 — Homologação WCAG** | 1 + 2 | Contraste ≥ 4.5:1, foco visível, Zero-Scroll, toast de erro |
| **M2 — Usabilidade Funcional** | 3 + 4 | Focus Trap, undo de cenas, ricochete eliminado, 2 colunas mobile |
| **M3 — Consistência Visual** | 5 + 6 | Paleta consolidada, tokens tipográficos, skeleton loading |
| **M4 — Polimento Final** | 7 + 8 + 9 | ARIA completo, hover corrigido, cosméticos finalizados |
| **M5 — Refatoração** | 10 | Sombras tokenizadas, headers padronizados, sem duplicados |
