# Inconsistências do Design System & Componentes (design-system-inconsistencies.md)

**Documento**: `artifacts/visual-audit/design-system-inconsistencies.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído (Fase 4)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Referência Canônica**: [`dashboard-app/DESIGN.md`](file:///c:/HomeAssistant/dashboard-app/DESIGN.md) (*Nocturnal Observatory*)

---

## 1. Visão Geral da Anatomia e Geometria

A consistência de uma interface de automação residencial de luxo reside na previsibilidade milimétrica de sua linguagem visual. Quando o usuário interage com diferentes cômodos, rotinas ou configurações, a resposta material (raios de curvatura, bordas de refração, sombras de luminescência e alvos de toque) deve ser homogênea.

A auditoria identificou que, embora a estética geral de **Liquid Glass** seja marcante e sofisticada, o código acumula divergências estruturais decorrentes de implementações isoladas de widgets, coexistência de estilos legados e falta de componentes atômicos compartilhados.

---

## 2. Métricas de Dispersão no Código

* **Total de Sombras Distintas (`box-shadow`)**: **124 valores únicos** declarados ad-hoc em 157 regras de CSS, variando desde sombras pretas puras difusas até auras coloridas com múltiplos insets.
* **Total de Raios de Borda (`border-radius`)**: **28 valores numéricos arbitrários** no CSS (ex: 6px, 7px, 8px, 10px, 11px, 12px, 13px, 14px, 15px, 16px, 18px, 20px, 21px, 22px, 24px, 28px, 30px, 9999px) contra os 12 tokens previstos no `DESIGN.md`.
* **Componentes Duplicados / Órfãos**: 
  - `SecurityAlertsBar.tsx` (172 linhas) e `BatteryAlertsBar.tsx` (260 linhas) são o mesmo componente duplicado com pequenas variações de cópia.
  - `DeviceButton.tsx` (35 linhas) é um componente órfão não referenciado em nenhuma rota ativa do App Router.
* **Presença de Elementos Unicode como Ícones**: 4 componentes usam o caractere tipográfico cru `"✕"` (unicode U+2715) enquanto outros 3 usam vetores SVG dedicados para fechar modais.

---

## 3. Tabela Estruturada de Inconsistências de Design System

| ID | Tela / Superfície | Componente | Padrão Observado | Padrão Esperado | Exemplo Equivalente | Impacto | Sugestão de Correção | Prioridade |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **DS-01** | Todos os Modais | Botão Fechar (`CloseButton`) | `MediaHubModal`, `TodoListWidget`, `VacuumWidget` e `WeatherForecastModal` usam o caractere tipográfico `"✕"` (32px a 36px). | Botão com ícone vetorial SVG intrínseco `<path d="M18 6L6 18M6 6l12 12" />` e alvo tátil de **44px × 44px**. | `RoomPopup` e `EnergyWidget` já utilizam ícone SVG dedicado. | Baixa acessibilidade touch em parede; desalinhamento óptico do caractere de texto. | Criar componente atômico `ModalCloseButton` com alvo de 44px e SVG compartilhado. | **Alta** |
| **DS-02** | Cabeçalho (Home) | Chips de Alerta Perimétrico | `.security-micro-pill` e `.battery-micro-pill` possuem altura de 36px devido à colisão de cascata CSS (**F-01**), com raio de 12px. | Alvo mínimo de toque de **44px** e formato de pílula completa (`border-radius: 9999px`). | O botão de status de conexão `.status-sync-micro-pill` usa `9999px`. | Dificuldade de acionamento do chip de alerta em tablets de parede montados em altura. | Aplicar `min-height: 44px` e `border-radius: var(--rounded-full)` unificado em `HeaderAlertPill`. | **Alta** |
| **DS-03** | Barra Diária (Home) | Cards Panorâmicos Compactos | `WeatherWidget` e `VacuumWidget` fixam altura em 84px; `TodoListWidget` varia livremente de 72px a 108px conforme o texto; `TvRemoteWidget` sobrepõe botões. | Altura estrutural padronizada de **88px** no desktop/tablet e **76px** no mobile para todos os 5 widgets. | `WeatherWidget` apresenta proporção estável e previsível. | Quebra de alinhamento horizontal na barra panorâmica; saltos visuais durante a leitura. | Unificar a anatomia sob a classe `.daily-widget-card` com altura fixa e slots previsíveis. | **Alta** |
| **DS-04** | Todos os Modais | Cabeçalhos de Modal (`ModalHeader`) | `RoomPopup` usa `gap: 14px` e flex simples; `WeatherForecastModal` encapsula títulos em `.weather-modal-title-box` com margens distintas; `VacuumWidget` usa `gap: 10px`. | Estrutura padronizada de cabeçalho: ícone de 40px à esquerda, títulos centralizados e ações/fechar à direita. | `RoomPopup` possui a melhor organização espacial. | Assimetria visual e sensação de telas construídas por bibliotecas diferentes. | Padronizar a estrutura com componente base `ModalHeader`. | **Média** |
| **DS-05** | Home e Telas Touch | Efeito Hover em Cards (`:hover`) | 118 regras `:hover` aplicam elevação de 3px e brilho em cards sem encapsulamento sob `@media (hover: hover)`. | Hover reservado exclusivamente para mouses e ponteiros finos (`@media (hover: hover) and (pointer: fine)`). | A regra de ponteiro grosso em `UI-RESPONSIVE.md` prevê essa restrição. | Fenômeno de "Sticky Hover" em tablets de parede: o card permanece permanentemente elevado ou aceso após o toque. | Encapsular todas as regras decorativas de hover dentro de media queries de capacidade de ponteiro. | **Alta** |
| **DS-06** | Geral / Telas | Estados de Foco (`:focus-visible`) | Quase a totalidade dos botões, cards e switches não possui outline de foco assistivo por teclado. | Anel de foco visível com `outline: 2px solid #38bdf8` e `outline-offset: 2px` para navegação por teclado. | O campo de entrada de texto do `TodoListWidget` possui foco nativo. | Bloqueador de acessibilidade para navegação assistiva e controle por controle remoto/teclado. | Adicionar regra global `*:focus-visible` com anel ciano `#38bdf8`. | **Alta** |
| **DS-07** | TV Compacta (Home) | Botão Power da TV (`.tv-compact-power`) | Dimensões reduzidas para `34px × 34px`. | Piso mínimo ergonômico de **44px × 44px** (WCAG AAA). | Os botões circulares de ação rápida do cabeçalho medem 44px. | Erro de toque frequente ao tentar ligar a TV de passagem pelo painel de parede. | Elevar dimensões para 44px com `min-width: 44px; min-height: 44px`. | **Alta** |
| **DS-08** | Subcards (Modais) | Subcards de Dispositivos (`.subcard-item`) | Raio de curvatura oscila entre 12px, 14px e 16px dependendo do arquivo. | Raio canônico de **14px** (`var(--rounded-tile-sm)`) para micro-tiles de atuadores. | `DeviceTile.tsx` utiliza 14px de forma harmoniosa. | Incoerência geométrica entre subcards do `RoomPopup` e da subpágina `/comodo/[id]`. | Padronizar a variável `--radius-subcard: 14px` em todo o ecossistema de subcards. | **Média** |
| **DS-09** | Código Fonte | Componentes Duplicados e Órfãos | Convivência de `SecurityAlertsBar.tsx`, `BatteryAlertsBar.tsx` e `DeviceButton.tsx`. | Eliminação de redundâncias de código; uma única fonte de verdade por componente. | `HeaderAlertPill.tsx` substitui os dois alertas de cabeçalho. | Sobrecarga de manutenção e risco de correções aplicadas em um arquivo e esquecidas no outro. | Depreciar e excluir os arquivos duplicados, centralizando em `HeaderAlertPill` e `DeviceTile`. | **Baixa** |
| **DS-10** | Geral / CSS | Caos nas Sombras de Vidro | 124 declarações de `box-shadow` divergentes no CSS. | Redução para 4 níveis semânticos físicos: `--shadow-glass-flat`, `--shadow-glass-elevated`, `--shadow-radiance-amber`, `--shadow-radiance-cyan`. | O `DESIGN.md` define as auras físicas de radiação. | Perda da identidade óptica refinada do Liquid Glass; sombras cinzas lavadas competindo com auras âmbar. | Substituir declarações ad-hoc pelas 4 variáveis semânticas de sombra. | **Média** |

---

## 4. Auditoria de Estados Especiais

### A. Estados de Carregamento (Loading)
* **Padrão Observado**: O painel utiliza abordagens heterogêneas:
  - No cabeçalho: micro-spinner SVG no botão de atualização;
  - Nos cards de cômodos: opacidade estática `opacity: 0.7` sem esqueleto;
  - Nos modais: alguns possuem spinner centralizado, outros travam o estado anterior até o carregamento.
* **Padrão Esperado**: Efeito *Skeleton Shimmer* translúcido suave (`linear-gradient`) de mesma dimensão do conteúdo final.

### B. Estados Desabilitados (Disabled)
* **Padrão Observado**: A maioria dos botões desabilitados apenas reduz a opacidade para `0.4` ou `0.5`, sem alterar o cursor para `not-allowed` e sem remover o efeito de hover.
* **Padrão Esperado**: `opacity: 0.35`, `pointer-events: none` (ou `cursor: not-allowed`), remoção de auras de luminescência e preservação de contraste legível no texto.

### C. Estados de Erro e Alerta
* **Padrão Observado**: Falhas de comunicação física provocam apenas tremor mecânico (`.shake-fail`) de 400ms. Não há toast, banner ou mensagem persistente notificando o usuário que o comando não alcançou a lâmpada.
* **Padrão Esperado**: Sinalização visual sutil com retorno háptico imediato, seguida de toast explicativo na base da tela ("Falha ao comunicar com Luz Sala. Tentando reconectar...").
