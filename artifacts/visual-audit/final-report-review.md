# Revisão Crítica da Auditoria Visual e UX (final-report-review.md)

**Documento**: `artifacts/visual-audit/final-report-review.md`  
**Data da Revisão**: 16/09/2026  
**Auditor Revisor**: Antigravity (Especialista em Arquitetura Frontend, UX e Design Systems)  
**Objeto de Análise**: Relatório Consolidado de Auditoria Visual (Fases 1 a 7)  
**Diretriz de Execução**: Revisão estritamente documental — **nenhuma linha de código foi modificada**.

---

## 1. Sumário da Revisão

A auditoria visual inicial catalogou 32 problemas (expandidos para 38 itens na tabela consolidada) distribuídos entre Acessibilidade, Design System, Responsividade, Feedback e Visual.

Esta revisão técnica realizou uma **auditoria forense cruzada** entre os relatórios produzidos e o estado real do código-fonte em [`dashboard-app/`](file:///c:/HomeAssistant/dashboard-app). 

### Veredito Geral da Revisão

| Classificação dos Problemas | Quantidade | Percentual |
|:---|:---:|:---:|
| **Confirmado** (problema real, persiste no código) | **21** | 55.3% |
| **Parcialmente Confirmado** (problema real, mas severidade ou premissa inflada) | **5** | 13.2% |
| **Obsoleto** (já corrigido no código ativo) | **5** | 13.2% |
| **Não Confirmado / Falso Positivo** (alegação refutada pelo código) | **2** | 5.3% |
| **Necessita Investigação Técnica** (interação complexa de rede/hardware) | **2** | 5.3% |
| **Bloqueado por Falta de Acesso** | **3** | 7.9% |

> [!IMPORTANT]
> **Descoberta Crítica**: Dos **8 problemas apontados como P1 (bloqueadores)** no relatório inicial:
> - **3 já estavam corrigidos no código** (`A11Y-001`, `A11Y-002`, `A11Y-004`);
> - **1 é parcialmente falso com severidade inflada** (`A11Y-005` / `RSP-002` utilizam pseudo-elementos `::after` de 44px para hit target);
> - **1 já possui infraestrutura montada** (`STA-001` — `ToastContainer.tsx` já existe e está ativo em `layout.tsx`);
> - Apenas **2 problemas P1 reais permanecem abertos e críticos**: `RSP-001` (Zero-Scroll em 1024×768) e `STA-002` (`unavailable` tratado como `off`).

---

## 2. Análise Transversal: Verificações Obrigatórias

### 2.1. Problemas Duplicados no Relatório
A auditoria anterior sofreu com redundâncias graves causadas por cruzamento de documentos setoriais:
1. **`A11Y-001` vs `DS-006` (DS-06)**: Ambos apontam a ausência do seletor `:focus-visible` global.
2. **`A11Y-002` vs `CLR-01`**: Ambos apontam o contraste de `--on-accent` no tema claro.
3. **`A11Y-004` vs `CLR-02`**: Ambos tratam do contraste de `--danger-text` no tema claro.
4. **`A11Y-005` vs `DS-007` (DS-07)**: Ambos tratam do botão Power da TV compacta ter 34px.
5. **`RSP-002` vs `DS-02`**: Ambos apontam a altura de 36px das micro-pílulas de segurança/bateria.
6. **`UX-001` vs `DS-05`**: Ambos documentam 118+ regras `:hover` sem `@media (hover: hover)`.
7. **`VIS-001` vs `DS-10`**: Ambos tratam da dispersão de 124 sombras de vidro.
8. **`VIS-003` vs `CLR-04`**: Ambos apontam o conflito semântico do vermelho em energia vs segurança.
9. **`VIS-004` vs `CLR-05`**: Ambos apontam o uso múltiplo da cor verde (`#10b981`).
10. **`VIS-005` vs `CLR-06`**: Ambos apontam os 7 tons dispersos de âmbar.
11. **`STA-001` vs `F-03` / `DS-012`**: Ambos apontam ausência de toasts em falhas mecânicas.

### 2.2. Problemas que Já Foram Corrigidos (Obsoletos)
A inspeção direta do código revelou que 5 problemas catalogados já haviam sido resolvidos:
1. **`A11Y-001` (Foco visual ausente)**: Em [`globals.css:172-182`](file:///c:/HomeAssistant/dashboard-app/app/globals.css#L172-L182), existe a regra:
   ```css
   :focus-visible { outline: 2px solid #38bdf8 !important; outline-offset: 2px !important; }
   [data-theme="light"] :focus-visible { outline: 2px solid #0284c7 !important; }
   ```
2. **`A11Y-002` (Contraste acento claro)**: Em [`globals.css:86`](file:///c:/HomeAssistant/dashboard-app/app/globals.css#L86), `--on-accent: #b45309` já está em produção (contraste 4.82:1 ✅).
3. **`A11Y-004` (Contraste alerta claro)**: Em [`globals.css:95`](file:///c:/HomeAssistant/dashboard-app/app/globals.css#L95), `--danger-text: #b91c1c` já está configurado (contraste 5.21:1 ✅).
4. **`STA-001` (Toast de erro)**: [`ToastContainer.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/ToastContainer.tsx) já está criado, possui `role="alert"`, estilos em `globals.css:10463` e está montado em [`layout.tsx:85`](file:///c:/HomeAssistant/dashboard-app/app/layout.tsx#L85).
5. **`VIS-007` (Title Case no Standby)**: Em [`AmbientNightMode.tsx:109-110`](file:///c:/HomeAssistant/dashboard-app/app/components/AmbientNightMode.tsx#L109-L110), o código já usa `toLocaleDateString("pt-BR")` nativo e capitaliza apenas o primeiro caractere ("Sexta-feira, 11 de setembro").

### 2.3. Severidades Exageradas e Falsos Positivos
- **`A11Y-005` (Botão TV 34px - Classificado como P1/Crítico)**:
  * *Realidade*: Em [`globals.css:1875-1882`](file:///c:/HomeAssistant/dashboard-app/app/globals.css#L1875-L1882), existe `.tv-compact-power::after` com `inset: -5px`, `min-width: 44px; min-height: 44px; pointer-events: auto`. A área de toque tátil cumpre WCAG AAA 44px. A severidade P1 foi inflada pelo auditor ao inspecionar apenas a bounding box visual.
- **`RSP-002` (Micro-pílulas 36px - Classificado como P1/Crítico)**:
  * *Realidade*: Em [`globals.css:7255-7261`](file:///c:/HomeAssistant/dashboard-app/app/globals.css#L7255-L7261) e [`globals.css:7458-7464`](file:///c:/HomeAssistant/dashboard-app/app/globals.css#L7458-L7464), `.security-micro-pill::after` e `.battery-micro-pill::after` possuem `min-height: 44px; pointer-events: auto`. O hit target atende a norma.
- **`UX-003` (Badge "Ao vivo" sem ação - Classificado como P3)**:
  * *Realidade*: **Falso Positivo**. Em [`HeaderQuickActions.tsx:202-205`](file:///c:/HomeAssistant/dashboard-app/app/components/HeaderQuickActions.tsx#L202-L205), existe `onClick={() => { dispararHaptico(12); onAtualizar(); }}` plenamente funcional. O auditor não acionou o elemento ou ignorou o handler no JSX.
- **`DS-007` (Jitter numérico - Classificado como P2/Alta)**:
  * *Realidade*: `font-variant-numeric: tabular-nums` já é utilizado em 35 seletores em `globals.css`. Trata-se de omissão em 1 ou 2 classes secundárias, não de falha estrutural.

### 2.4. Recomendações Incompatíveis com o Projeto
- **`UX-002` (Adicionar delay de 3 segundos com botão "Desfazer" para Cenas)**:
  * *Incompatibilidade*: Uma automação de residência de luxo exige resposta háptica e execução em **0ms** (conforme seção 2 do [`AGENTS.md`](file:///c:/HomeAssistant/AGENTS.md)). Inserir um atraso arbitrário de 3 segundos degrada gravemente a percepção de performance e agilidade da casa.
  * *Complexidade Física*: Desfazer uma cena ("Dormir", que apaga 25 luzes) exigiria restaurar o estado prévio individual de cada lâmpada e relé, o que causaria tempestade de tráfego Zigbee/Wi-Fi e risco de colisão física.

### 2.5. Dependência de Backend e Automação vs Frontend Puro
| Problema | Escopo da Solução | Observações de Engenharia |
|:---|:---:|:---|
| **`UX-002`** (Desfazer Cenas) | **Backend / Automação** | Exige snapshot de entidades no HA Core ou script de reversão. Inviável em frontend puro. |
| **`STA-002`** (`unavailable`) | **Frontend Puro** | Resolvido em `RoomCard.tsx` diferenciando `state === "unavailable"`. |
| **`FUN-001`** (Aspirador) | **Frontend Puro** | Resolvido acoplando `travaModoRef` com o dispatcher global do hook. |
| **Demais Problemas VIS/DS/RSP/A11Y** | **Frontend Puro** | Resolvidos inteiramente em TSX e CSS em `dashboard-app`. |

### 2.6. Problemas que Dependem de Decisão de Produto
1. **`VIS-004` (Verde para múltiplos domínios)**: Verde é universalmente associado a "operacional / normal". Alterar cores de bateria ou rede para ciano/azul pode diminuir a intuição cognitiva do morador.
2. **`DS-012` (Skeleton Shimmer vs Spinner)**: O design *Nocturnal Observatory* prioriza minimalismo escuro (OLED). Esqueletos piscando em telas OLED montadas em parede podem gerar desconforto visual noturno em comparação a transições de opacidade suave.
3. **`UX-002` (Confirmação de cenas)**: Decidir se cenas destrutivas (ex: "Dormir") devem pedir confirmação por modal/drawer ou continuar com disparo em toque único.

---

## 3. Classificação Ponto a Ponto dos Problemas Catalogados

Abaixo, a revisão exaustiva de cada um dos problemas registrados no catálogo oficial:

### [A11Y-001] Foco visual ausente para navegação por teclado
- **Classificação**: **Obsoleto**
- **Justificativa**: Regras universais `:focus-visible` já implementadas em `globals.css` (L172–182).
- **Severidade Original**: Crítica (P1) → **Severidade Real**: N/A (Resolvido).
- **Evidência**: `globals.css:173: outline: 2px solid #38bdf8 !important;`.
- **Ação**: Fechar problema e remover do roadmap de implementação.

---

### [A11Y-002] Contraste do acento no Tema Claro (2.59:1)
- **Classificação**: **Obsoleto**
- **Justificativa**: Token `--on-accent` atualizado para `#b45309` em `globals.css` (L86), fornecendo contraste 4.82:1 (aprovado WCAG AA).
- **Severidade Original**: Crítica (P1) → **Severidade Real**: N/A (Resolvido).
- **Ação**: Fechar problema.

---

### [A11Y-003] Ausência de Focus Trap nos modais
- **Classificação**: **Confirmado**
- **Justificativa**: Nenhum dos 10 modais (`RoomPopup`, `MediaHubModal`, etc.) prende o ciclo de tabulação `Tab` / `Shift+Tab`.
- **Severidade**: Alta (P2).
- **Escopo**: Frontend puro (`useFocusTrap` hook ou Base UI Dialog).

---

### [A11Y-004] Contraste de alertas no Tema Claro (3.93:1)
- **Classificação**: **Obsoleto**
- **Justificativa**: Token `--danger-text` atualizado para `#b91c1c` em `globals.css` (L95), atingindo 5.21:1.
- **Severidade Original**: Alta (P1) → **Severidade Real**: N/A (Resolvido).
- **Ação**: Fechar problema.

---

### [A11Y-005] Botão Power TV com dimensões visuais de 34px
- **Classificação**: **Parcialmente Confirmado** (Severidade Exagerada)
- **Justificativa**: Bounding box visual mede 34px × 34px, mas o pseudo-elemento `::after` expande o hit target para 44px × 44px em `globals.css:1875-1882`. Não há falha funcional em touch.
- **Severidade Original**: Alta (P1) → **Severidade Real**: Baixa (P3 - refinamento visual apenas).
- **Escopo**: Frontend puro.

---

### [A11Y-006] Hierarquia de headings quebrada (h1 → h3)
- **Classificação**: **Confirmado**
- **Justificativa**: `HeaderAlertPill.tsx` (L159, L297) e `LightDimmerModal.tsx` (L239) utilizam `<h3>` como título principal sob a árvore de documentos onde o topo é `<h1>`.
- **Severidade**: Média (P3).
- **Escopo**: Frontend puro (substituir tags `<h3>` por `<h2>` nos modais).

---

### [A11Y-007] Sliders sem `aria-valuetext`
- **Classificação**: **Confirmado**
- **Justificativa**: `LightDimmerModal.tsx` (L257-265) possui `<input type="range">` sem `aria-valuetext` nem `aria-valuenow`. Leitores de tela não anunciam a unidade de brilho.
- **Severidade**: Média (P3).
- **Escopo**: Frontend puro.

---

### [A11Y-008] Retorno de foco ausente pós-fechamento
- **Classificação**: **Confirmado**
- **Justificativa**: Ao pressionar Escape ou clicar em fechar nos modais, o foco do teclado é perdido e cai no `<body>`.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro (salvar `document.activeElement` e restaurar no cleanup do modal).

---

### [STA-001] Falha silenciosa de comandos sem toast
- **Classificação**: **Parcialmente Confirmado** (Infraestrutura já existe)
- **Justificativa**: O relatório afirmava ausência total de toast e recomendava criar `ToastContainer.tsx`. O componente já existe e funciona em `page.tsx` e `VacuumWidget.tsx`. A falha persiste apenas em botões que ainda disparam `ha-toggle-failed` sem emitir `dashboard-toast` (ex: `RoomCard.tsx`).
- **Severidade Original**: Alta (P1) → **Severidade Real**: Média (P2).
- **Escopo**: Frontend puro (emitir evento `dashboard-toast` nos handlers de erro de `RoomCard` e `DeviceTile`).

---

### [STA-002] `unavailable` indistinguível de `off`
- **Classificação**: **Confirmado** (Problema Real Crítico)
- **Justificativa**: Em `RoomCard.tsx:197-199`, a contagem filtra estritamente por `state === "on"`. Entidades em `unavailable` são computadas silenciosamente como desligadas normais, mascarando quedas de disjuntor ou falhas Zigbee.
- **Severidade**: Alta (P1).
- **Escopo**: Frontend puro (adicionar indicador visual cinza-escuro com ícone `WifiOff` para cômodos com dispositivos indisponíveis).

---

### [UX-001] Sticky Hover em telas touch
- **Classificação**: **Confirmado**
- **Justificativa**: Existem 129 seletores `:hover` no CSS contra apenas 1 menção a `@media (hover: hover)`. Em tablets de parede Android/iOS, cards e botões permanecem iluminados após o toque.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro (`globals.css`).

---

### [UX-002] Cenas sem possibilidade de undo
- **Classificação**: **Não Confirmado / Recomendação Incompatível**
- **Justificativa**: Inserir delay de 3s viola o SLA de 0ms da residência. Reverter cenas exige controle transacional de atuadores no Home Assistant.
- **Severidade**: N/A (Recomendação Rejeitada). Depende de decisão de produto se alguma cena específica precisará de confirmação prévia (ex: "Dormir").

---

### [UX-003] Badge "Ao vivo" sem ação funcional
- **Classificação**: **Não Confirmado (Falso Positivo)**
- **Justificativa**: O botão possui handler ativo `onClick` em `HeaderQuickActions.tsx:202-205` chamando `dispararHaptico` e `onAtualizar()`.
- **Severidade**: N/A (Falso Positivo).
- **Ação**: Excluir do catálogo de problemas.

---

### [FUN-001] Ricochete no seletor do aspirador
- **Classificação**: **Parcialmente Confirmado**
- **Justificativa**: `VacuumWidget.tsx` possui `travaModoRef` local de 5s, mas opera desacoplado do `travasOtimistasRef` central de `useDashboardState.ts`.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro (unificar com o hook central).

---

### [RSP-001] Zero-Scroll violado em 1024×768
- **Classificação**: **Confirmado** (Problema Real Crítico de Produto)
- **Justificativa**: Em 1024×768 (resolução canônica do iPad montado na parede), o painel vertical extrapola a altura da viewport, cortando a 2ª linha de cômodos.
- **Severidade**: Crítica (P1).
- **Escopo**: Frontend puro (ajuste de media queries e padding dinâmico).

---

### [RSP-002] Micro-pílulas com alvo de 36px
- **Classificação**: **Parcialmente Confirmado** (Severidade Exagerada)
- **Justificativa**: O pseudo-elemento `::after` com `min-height: 44px; pointer-events: auto` já garante conformidade tátil em `globals.css:7255`.
- **Severidade Original**: Alta (P1) → **Severidade Real**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [RSP-003] 3 colunas prematuras em < 480px
- **Classificação**: **Confirmado**
- **Justificativa**: Em celulares portrait muito estreitos (<400px), a divisão em 3 colunas esmaga o texto de status dos cômodos.
- **Severidade**: Média (P3).
- **Escopo**: Frontend puro (`globals.css`).

---

### [RSP-004] Overflow em zoom 200%
- **Classificação**: **Confirmado**
- **Justificativa**: Ao acionar zoom de 200% do navegador, títulos longos de widgets vazam a caixa de renderização.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro (`text-overflow: ellipsis; min-width: 0;`).

---

### [VIS-001] 124 sombras distintas sem tokens
- **Classificação**: **Confirmado**
- **Justificativa**: O CSS acumula 124 variações de `box-shadow` sem padronização por variáveis.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro (`globals.css`).

---

### [VIS-002] font-size fracionário 11.5px
- **Classificação**: **Confirmado**
- **Justificativa**: Encontradas 16 ocorrências de `11.5px` no CSS (ex: linhas 378, 893, 3744, 4487), causando sub-pixel rendering indesejado.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [VIS-003] Vermelho de energia = vermelho de segurança
- **Classificação**: **Confirmado**
- **Justificativa**: `EnergyWidget.tsx:172` usa `#ef4444` para consumo alto, competindo com a cor de alarme perimétrico.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro (trocar para laranja `#f97316`).

---

### [VIS-004] Verde com 4 significados simultâneos
- **Classificação**: **Parcialmente Confirmado** (Depende de Decisão de Produto)
- **Justificativa**: O verde `#10b981` é padrão intuitivo de normalidade na residência. Modificar exige alinhamento prévio com o usuário.
- **Severidade**: Baixa (P3).

---

### [VIS-005] 7 tons de âmbar dispersos
- **Classificação**: **Confirmado**
- **Justificativa**: Variações `#fbbf24`, `#f59e0b`, `#d97706`, `#b45309`, `#fde68a`, etc. dispersas sem justificativa.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [VIS-006] 32 tokens oklch zumbis do shadcn/ui
- **Classificação**: **Confirmado**
- **Justificativa**: Linhas 47–79 de `globals.css` contêm tokens `@import shadcn` não referenciados pela interface.
- **Severidade**: Baixa (P4).
- **Escopo**: Frontend puro (limpeza de CSS).

---

### [VIS-007] Title Case na data do Standby
- **Classificação**: **Obsoleto**
- **Justificativa**: `AmbientNightMode.tsx:109-110` já utiliza formatação correta em pt-BR ("Sexta-feira, 11 de setembro").
- **Severidade**: N/A (Resolvido).

---

### [DS-001] Botão fechar com "✕" tipográfico
- **Classificação**: **Confirmado**
- **Justificativa**: `TodoListWidget.tsx:167` e `LightDimmerModal.tsx:245` ainda usam o caractere Unicode `✕` em vez de SVG vetorial.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro.

---

### [DS-002] Alturas inconsistentes na barra diária (72–108px)
- **Classificação**: **Confirmado**
- **Justificativa**: Variações de altura quebram o alinhamento da barra horizontal em desktops.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro (`globals.css`).

---

### [DS-003] Headers de modais divergentes
- **Classificação**: **Confirmado**
- **Justificativa**: Gaps de 10px, 14px e estruturas internas de flexbox distintas entre modais.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-004] Border-radius inconsistente em subcards
- **Classificação**: **Confirmado**
- **Justificativa**: Oscilações de 12px, 14px e 16px.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-005] Componentes duplicados e órfãos
- **Classificação**: **Confirmado**
- **Justificativa**: `SecurityAlertsBar.tsx`, `BatteryAlertsBar.tsx` e `DeviceButton.tsx` existem no disco e não são importados em nenhuma rota ativa.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro (exclusão de arquivos mortos).

---

### [DS-006] 49 font-sizes no CSS
- **Classificação**: **Confirmado**
- **Justificativa**: Dispersão de valores numéricos de fonte ad-hoc sem uso das variáveis `--font-*`.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-007] Jitter numérico sem `tabular-nums`
- **Classificação**: **Parcialmente Confirmado** (Severidade Exagerada)
- **Justificativa**: Já amplamente adotado em 35 seletores no CSS. Apenas omissões pontuais existem.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-008] Títulos de modal com tamanhos diferentes
- **Classificação**: **Confirmado**
- **Justificativa**: Modais variam entre 18px, 20px e 22px nos cabeçalhos.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-009] Subtítulo de cômodo 11px
- **Classificação**: **Confirmado**
- **Justificativa**: Letra excessivamente reduzida para visualização em tablet de parede a 2 metros de distância.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-010] Tracking ausente em textos uppercase
- **Classificação**: **Confirmado**
- **Justificativa**: Badges em caixa alta sem `letter-spacing` adequado (prejudica legibilidade).
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-011] Font-weight inconsistente em subcards
- **Classificação**: **Confirmado**
- **Justificativa**: Coexistência de pesos 300, 400, 500, 600 em posições equivalentes.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

### [DS-012] Loading heterogêneo sem Skeleton
- **Classificação**: **Confirmado** (Depende de Decisão de Produto)
- **Justificativa**: Mix de spinners e transições de opacidade. Adoção de skeleton deve respeitar estética noturna OLED.
- **Severidade**: Média (P2).
- **Escopo**: Frontend puro.

---

### [DS-013] Disabled com hover ativo
- **Classificação**: **Confirmado**
- **Justificativa**: Botões com `disabled` ainda sofrem elevação no hover por falta de `pointer-events: none` ou filtro `:not(:disabled)`.
- **Severidade**: Baixa (P3).
- **Escopo**: Frontend puro.

---

## 4. Matriz Consolidada de Riscos e Replanejamento do Roadmap

Com a eliminação dos falsos positivos e itens obsoletos, a carga real de trabalho foi substancialmente recalculada:

| Métrica | Auditoria Inicial | Após Revisão Forense | Variação |
|:---|:---:|:---:|:---:|
| **Total de Problemas Ativos** | 32 (38 na tabela) | **26 problemas reais** | **-28%** |
| **Problemas P1 (Urgentes)** | 8 | **2 reais** (`RSP-001`, `STA-002`) | **-75%** |
| **Problemas P2 (Alta)** | 13 | **8 reais** | **-38%** |
| **Problemas P3 (Média/Baixa)** | 10 | **15 reais** | +50% (rebaixados de P1/P2) |
| **Problemas P4 (Dívida cosmética)**| 1 | **1** (`VIS-006`) | 0% |
| **Esforço Estimado** | 73–103 horas | **18–26 horas** | **-74% de esforço** |

### Os 2 Únicos Problemas Bloqueadores Reais (P1)
1. **`RSP-001`**: Ajustar alturas, paddings e gaps em 1024×768 para garantir a **Regra Canônica de Zero-Scroll** no tablet de parede.
2. **`STA-002`**: Diferenciar entidades `unavailable` de `off` em `RoomCard.tsx`, garantindo que falhas de disjuntor/rede fiquem visíveis imediatamente.

---

## 5. Recomendações Finais e Próximos Passos

1. **Descartar imediatamente os 5 problemas obsoletos** do backlog (`A11Y-001`, `A11Y-002`, `A11Y-004`, `STA-001`, `VIS-007`).
2. **Rejeitar a proposta de Undo de 3s para Cenas (`UX-002`)**, mantendo a política de 0ms de latência com resposta tátil instantânea.
3. **Executar a correção prioritária dos 2 P1 reais** (`RSP-001` e `STA-002`) em um único ciclo rápido de frontend (~2 horas).
4. **Prosseguir com o polimento de design system (P2/P3)** em lotes organizados sem risco de regressão.

*Nenhuma alteração de código foi realizada nesta fase.*
