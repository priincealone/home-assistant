# Especificação Arquitetural · Painel de Controle Dinâmico e Adaptativo Multiplataforma
**Documento de Engenharia & UX**: `specs/features/responsive-adaptive-dashboard.md`  
**Autor**: Antigravity (Arquiteto de UX & Engenharia de Frontend)  
**Status**: Proposta Arquitetural (Aguardando Aprovação Prévia)  
**Data**: 16/09/2026  
**Versão**: 1.0.0  

---

## 1. Princípios de Responsividade e Adaptação Contextual

A automação residencial de alta fidelidade exige uma interface que não se limite a "encolher ou esticar" elementos conforme a largura da viewport. Um painel doméstico opera em ecossistemas físicos radicalmente distintos: desde um smartphone de 360px operado com uma só mão na calçada até um tablet industrial de 10 polegadas montado permanentemente na alvenaria da cozinha, passando por monitores Ultrawide de estações de trabalho e Smart Displays de baixa altura (Nest Hub / Echo Show).

Para atingir verdadeira excelência adaptativa, estabelecemos sete princípios inegociáveis:

1. **Glanceability & Regra do 1º Viewport (Zero-Scroll em Wall Mounts)**:
   - Em tablets e monitores montados em parede na orientação paisagem (landscape), a visão geral da residência (todos os cômodos, telemetria diária, alertas de segurança e cenas rápidas) deve ser legível e acionável imediatamente em **100dvh**, sem exigir qualquer rolagem vertical.
2. **Não-Destrutividade da Informação Crítica**:
   - Reduzir o espaço nunca pode significar omitir telemetria de segurança ou controles vitais. Em telas compactas, a informação se compacta semanticamente (ex.: ícone + micro-dot de status em vez de rótulo textual longo), mas o dado e o gatilho de ação permanecem sempre acessíveis em 1 toque.
3. **Tipografia e Espaçamentos Fluidos (`CSS Clamp` & Matemática Escalar)**:
   - Eliminar quebras abruptas de fontes baseadas unicamente em media queries fixas. As dimensões de títulos, ícones, gaps e raios de borda devem ser expressas em escalas fluidas contínuas calculadas via `clamp(min, val, max)`.
4. **Priorização Contextual por Orientação (Retrato vs. Paisagem)**:
   - No **Modo Retrato (Portrait)**, o layout favorece a ergonomia vertical, otimizando a "Zona do Polegar" (Thumb Zone) para uso tátil individual móvel.
   - No **Modo Paisagem (Landscape)**, o layout favorece a visão panorâmica dividida, operando como centro de comando tático.
5. **Ergonomia Híbrida de Entrada (`pointer: coarse` vs. `pointer: fine`)**:
   - Telas de toque exigem alvos de acionamento generosos (mínimo de 44px × 44px, idealmente 48px para painéis de parede) e zero dependência de estados `:hover` para visualização de dados ou botões.
   - Desktops com mouse e teclado ganham micro-elevação em hover, cursores semânticos e atalhos rápidos (`Esc`, `Space`, `Enter`).
6. **Arquitetura Orientada a Containers (Container Queries `@container`)**:
   - Os componentes devem responder à largura do seu container pai imediato, e não à largura da janela do navegador (`window.innerWidth`). Isso permite que um card de ventilador ou de iluminação funcione perfeitamente dentro de um modal lateral, dentro de um grid panorâmico ou em uma subpágina dedicada sem nenhuma linha de CSS redundante.
7. **Resiliência a Safe Areas, Notches e Dobráveis**:
   - O layout deve respeitar nativamente recortes de câmera (Dynamic Island, entalhes laterais em paisagem) e barras de navegação gestual do iOS/Android via variáveis `env(safe-area-inset-*)`.

---

## 2. Diagnóstico Forense dos Problemas Atuais

A inspeção detalhada do código existente em [`dashboard-app/app/globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css), [`dashboard-app/app/page.tsx`](file:///c:/HomeAssistant/dashboard-app/app/page.tsx) e nos componentes modais revelou as seguintes fragilidades estruturais:

| ID | Área / Componente | Sintoma / Fragilidade Identificada | Causa Raiz Técnica |
| :--- | :--- | :--- | :--- |
| **F-01** | **Ventilador / `FanControlCard`** | Botão toggle transborda em telas móveis estreitas; seletor de velocidades quebra linha vertical em textos compostos ("2 • Médio"). | Ausência de `min-width: 0; flex: 1 1 auto; overflow: hidden;` no header; padding horizontal excessivo de 24px consumindo espaço do card; falta de `white-space: nowrap;` nas pílulas de velocidade. |
| **F-02** | **Iluminação / `RoomPopup`** | Quando o cômodo possui apenas 1 ponto de luz (ex.: Quarto), o card vira um bloco vertical esticado com 80% de vazio. | Regra legada `@media (max-width: 380px) { .subcard-grid { grid-template-columns: 1fr; } }` que destruía a grade de 2 colunas e esticava cards de altura fixa (120px). |
| **F-03** | **Tablets em Retrato (Portrait 768px–1024px)** | O modo paisagem zero-scroll (`orientation: landscape`) não dispara. O dashboard entra em layout vertical não otimizado com cards esticados e cabeçalho desproporcional. | Inexistência de regras dedicadas a `@media (min-width: 768px) and (orientation: portrait)`, forçando o tablet vertical a cair em fallbacks genéricos de mobile. |
| **F-04** | **Smartphones em Paisagem (< 500px de altura)** | Quando o celular é girado na horizontal, o cabeçalho fixo, as cenas rápidas e a barra de widgets ocupam 100% da altura visível, escondendo totalmente os cômodos. | Falta de colapso do cabeçalho em viewports de altura ultra-baixa (`max-height: 480px`) e ausência de layout em duas colunas horizontais (menu à esquerda, grid à direita). |
| **F-05** | **Monitores Ultrawide (21:9 e 32:9 > 2000px)** | Grid de 5 colunas estica indefinidamente, afastando excessivamente os controles táticos dos olhos do usuário e quebrando o foco. | Falta de contenção de largura máxima (`max-width: 1720px; margin: 0 auto;`) no container central `.dashboard`. |
| **F-06** | **Dependência de Hover em Telas Touch** | Botões de ajuste de dimmer (`.device-tile__tune-btn`, `.subcard-dim-badge`) e tooltips de gráficos SVG dependem de hover para exibição ou feedback visual. | Falta de segregação estrita entre `@media (hover: hover)` e `@media (pointer: coarse)`. Em painéis de parede, o hover gera o fenômeno de "sticky hover" (o card fica aceso ou destacado mesmo após soltar o dedo). |
| **F-07** | **Zoom de Acessibilidade do Sistema (125%–150%)** | O aumento da fonte do sistema ou zoom do navegador causa sobreposição de texto sobre ícones em cartões com alturas rígidas em pixels (`min-height: 155px; height: 100%`). | Uso de unidades absolutas (`px`) em alturas de cards onde deveria haver flexibilidade baseada em linhas de conteúdo e `em`/`rem` relativos. |
| **F-08** | **Cálculo Fixo de Colunas no React (`arranjoGrade`)** | O cálculo de colunas no `page.tsx` (`cols: 5, rows: 2`) é baseado apenas na quantidade estática de cômodos (`comodos.length`), desconsiderando a orientação ou resolução real do viewport. | Lógica de apresentação fixada em JavaScript no componente principal em vez de governada fluidamente pelo CSS e Container Queries. |

---

## 3. Breakpoints e Regras de Adaptação Multidimensional

A adaptação não deve depender de limites arbitrários de modelos específicos de celulares. Empregaremos uma matriz de **quatro eixos ortogonais**:

```
                              EIXO DE LARGURA (Width)
             Compact (<=480px) │ Medium (481-1024px) │ Expanded (>1024px)
          ┌────────────────────┼─────────────────────┼────────────────────┐
Landscape │ Smart Display /    │ Tablet Parede /     │ Desktop / TV /     │
          │ Phone Paisagem     │ iPad Paisagem       │ Ultrawide          │
EIXO DE   ├────────────────────┼─────────────────────┼────────────────────┤
ORIENTAÇÃO│ Smartphone Padrão  │ Tablet Retrato /    │ Display Vertical / │
Portrait  │ (iPhone, Android)  │ iPad Vertical       │ Totem Residencial  │
          └────────────────────┴─────────────────────┴────────────────────┘
```

### 3.1. Matriz Canônica de Viewport

```css
/* 1. Smartphones Compactos (iPhone SE, Galaxy Fold tela externa) */
@media (max-width: 360px) { ... }

/* 2. Smartphones Padrão (iPhone 13/14/15/16, Pixel, Galaxy S) */
@media (min-width: 361px) and (max-width: 480px) { ... }

/* 3. Tablets Retrato & Telas Médias Verticais (iPad Mini, iPad 10", Totens) */
@media (min-width: 481px) and (max-width: 1024px) and (orientation: portrait) { ... }

/* 4. Tablets Paisagem & Painéis de Parede Wall-Mount (iPad Pro, Tablets 10-15") */
@media (min-width: 768px) and (min-height: 580px) and (orientation: landscape) { ... }

/* 5. Smartphones em Paisagem / Displays de Baixa Altura (Nest Hub, Echo Show 5/8) */
@media (max-height: 520px) and (orientation: landscape) { ... }

/* 6. Desktops & Laptops Padrão (1280px a 1600px) */
@media (min-width: 1025px) and (max-width: 1720px) { ... }

/* 7. Monitores Ultrawide & Telas 4K (> 1720px) */
@media (min-width: 1721px) { ... }
```

### 3.2. Regras de Entrada e Interação Tátil

```css
/* Dispositivos Primariamente Táteis (Smartphones, Tablets, Telas de Parede) */
@media (pointer: coarse) {
  /* Alvos mínimos de toque WCAG AAA: 48px */
  .quick-action-btn,
  .room-icon-wrapper,
  .popup-close,
  .fan-toggle-btn {
    min-width: 48px;
    min-height: 48px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  
  /* Elimina completamente o estado sticky-hover */
  *:hover {
    transform: none !important;
    box-shadow: none !important;
  }
}

/* Dispositivos de Precisão (Desktop, Notebook com Touchpad, Caneta Stylus) */
@media (pointer: fine) and (hover: hover) {
  /* Habilita micro-elevações táteis ópticas e iluminação difusa suave */
  .room-card:hover {
    transform: translateY(-3px);
  }
}
```

---

## 4. Arquitetura de Container Queries (`@container`)

Para garantir modularidade absoluta, os componentes não olharão para a largura da tela do navegador, mas sim para o espaço onde foram inseridos.

### 4.1. Definição dos Containers Principais

```css
/* Container do Grid de Cômodos */
.rooms-section {
  container-type: inline-size;
  container-name: rooms-container;
}

/* Container de Modais e Bottom-Sheets */
.popup-sheet,
.control-modal-dialog {
  container-type: inline-size;
  container-name: modal-container;
}

/* Container do Panorama de Widgets Diários */
.daily-panorama-bar {
  container-type: inline-size;
  container-name: widgets-container;
}
```

### 4.2. Comportamentos Modulares por Container

#### A. Card de Cômodo (`RoomCard`) dentro de `@container rooms-container`
- **Largura < 160px**: Exibe apenas ícone central (44px) + micro-indicador de luzes ativas + nome truncado. Oculta chips de temperatura/umidade.
- **Largura 161px a 240px**: Exibe ícone (52px) + nome + chip de temperatura condensado (`24°`).
- **Largura > 240px**: Exibe layout completo com ícone expandido (64px), nome em destaque, badges individuais de clima e botão de acesso rápido à subpágina.

#### B. Seletor de Ventilador dentro de `@container modal-container`
- **Largura < 310px**: Grade de 4 velocidades quebra de forma simétrica em **2 colunas × 2 linhas** (`repeat(2, 1fr)`), botões com altura tátil de 44px e textos inteiros ("1 • Suave", "2 • Médio").
- **Largura >= 310px**: Grade linear em **4 colunas** (`repeat(4, 1fr)`), alinhadas horizontalmente em uma única linha contínua.

#### C. Subcards de Iluminação e Tomadas dentro de `@container modal-container`
- **Item Único (`:only-child` ou `.is-single`)**: Layout horizontal executivo (`min-height: 68px; flex-direction: row; align-items: center; justify-content: space-between;`). Ícone à esquerda, textos no centro e botão "Ajustar" à direita.
- **Múltiplos Itens em Container < 420px**: Grade de 2 colunas proporcionais com cartões compactos (`min-height: 100px`).
- **Múltiplos Itens em Container >= 420px**: Grade flexível fluida (`repeat(auto-fill, minmax(170px, 1fr))`).

---

## 5. Comportamento Específico por Cenário Operacional

### 5.1. Smartphones em Retrato (Portrait: 320px a 430px)
- **Cabeçalho**: Rigorosamente limitado a **2 linhas**:
  - *Linha 1*: Marca ("Casa") + pílulas de segurança e bateria em modo calmo compacto (ícones sem texto) + relógio digital à direita.
  - *Linha 2*: Barra de ações rápidas ("Apagar Tudo", status "Ao vivo", seletor de tema).
- **Widgets Diários**: Disposição em **grade 2×2** com o widget de Clima ocupando a largura total (span 2) no topo, seguido por TV, Aspirador, Energia e Lista de Compras em pares simétricos. O sparkline gráfico de energia é ocultado para preservar 100% de legibilidade dos textos.
- **Cômodos**: Grade uniforme de **2 colunas** com cartões alinhados com `min-height: 138px` e chips condensados.
- **Modais**: Abertura em formato **Bottom-Sheet deslizante com alça tátil (Drag Handle)**. Ocupa até 92dvh, com rolagem inercial interna suave e safe areas de rodapé para evitar sobreposição com o Home Indicator do sistema.

### 5.2. Smartphones em Paisagem (Landscape: altura < 500px)
- **Desafio**: A altura extremamente reduzida (360px–412px) inviabiliza cabeçalhos altos fixos.
- **Solução Adaptativa**:
  - O cabeçalho se contrai para uma barra ultra-slim de 38px ou transiciona para uma coluna lateral compacta (estilo HUD automotivo).
  - A barra de widgets e o grid de cômodos passam para rolagem vertical contínua com 3 colunas de cards compactos (`min-height: 110px`).
  - O modal passa de bottom-sheet para painel centralizado de largura total com altura adaptativa.

### 5.3. Tablets de Parede e iPad Pro em Paisagem (Landscape: 1024px a 1440px)
- **Modo 1º Viewport Zero-Scroll Ativo**:
  - `.dashboard` trava em `height: 100dvh; overflow: hidden;`.
  - O cabeçalho, cenas rápidas, 5 widgets diários em linha panorâmica e os 10 cômodos da residência distribuem-se proporcionalmente usando `flex: 1` e `min-height: 0`.
  - Cada cômodo ganha destaque visual, ícones de grande porte (64px–74px) com refração óptica Liquid Glass e visualização instantânea de todos os sensores ambientais.

### 5.4. Tablets em Retrato (Portrait: 768px a 1024px)
- **Solução Adaptativa**:
  - Cabeçalho em linha única ampla.
  - Barra de widgets diários em linha única de 5 colunas ou 3 colunas com quebra equilibrada.
  - Grid de cômodos em **3 colunas regulares** (com a última linha distribuindo os cômodos restantes harmoniosamente).
  - Modais em caixas de diálogo suspensas e centralizadas (Floating Dialogs) com largura travada em `min(680px, 90vw)`, sem ocupar a tela inteira desnecessariamente.

### 5.5. Estações de Trabalho e Telas Ultrawide (> 1720px)
- **Contenção Óptica Central**:
  - O conteúdo central é limitado a `max-width: 1720px; margin: 0 auto;`.
  - Isso impede o espalhamento excessivo dos cômodos para os extremos da visão periférica do usuário, mantendo o controle ergonômico idêntico ao de uma central de comando de aviação civil.
  - Modais recebem largura máxima de 960px com backdrop blur intensificado.

---

## 6. Componentes Críticos e Proteção de Informações Vitais

Determinados subsistemas de automação residencial possuem implicações físicas e de segurança patrimonial direta. Em nenhuma hipótese de adaptação responsiva ou redimensionamento de tela estes componentes poderão ser ocultados, suprimidos ou desativados:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMPONENTES DE PROTEÇÃO INEGOCIÁVEL                 │
├───────────────────────┬─────────────────────────────────────────────────┤
│ Componente            │ Função Crítica de Segurança Residencial         │
├───────────────────────┼─────────────────────────────────────────────────┤
│ SecurityAlertsBar     │ Alerta em tempo real de portas/portões abertos  │
│ BatteryAlertsBar      │ Monitoramento de baterias críticas de sensores │
│ Status de Conexão     │ Indicador vital Online / Offline / Sincronizando│
│ Master Toggle         │ Botão "Apagar Tudo" e "Apagar Cômodo"          │
│ Ventilação PS5 Cooler │ Prevenção física de superaquecimento de console │
│ Condicional TV Samsung│ Proteção contra ligar a TV ao enviar turn_off   │
│ Travas Otimistas 3.5s │ Proteção anti-ricochete de relés Tuya/Zigbee    │
└───────────────────────┴─────────────────────────────────────────────────┘
```

### Regra de Proteção Visual:
Caso o espaço horizontal seja severamente reduzido (ex.: viewport de 320px com sensor de porta aberta simultaneamente a sensor de bateria fraca), os chips de alerta nunca são ocultados:
- O texto explicativo longo é recolhido;
- O ícone pulsante com anel de alerta âmbar/vermelho permanece ativo;
- Ao tocar no ícone, um micro-modal ou tooltip expansivo exibe os detalhes imediatamente.

---

## 7. Matriz de Testes de Homologação Multiplataforma

Antes da aprovação de qualquer alteração de código, os seguintes cenários devem ser formalmente validados e auditados via Browser Sandbox:

| ID | Dispositivo / Resolução Típica | Viewport (px) | Orientação | Critérios de Sucesso e Pontos de Atenção |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | iPhone SE / Galaxy Fold externo | `320 × 568` | Retrato | Zero rolagem horizontal; grade de ventilador em 2×2 sem cortes; cabeçalho em 2 linhas. |
| **T-02** | iPhone 13/14/15/16 Padrão | `375 × 812` | Retrato | Botão toggle do ventilador 100% contido; "2 • Médio" em linha única; luz única horizontal. |
| **T-03** | iPhone Pro Max / Galaxy Ultra | `430 × 932` | Retrato | Grade equilibrada, proporções tipográficas sem estiramento. |
| **T-04** | Smartphone em Paisagem | `844 × 390` | Paisagem | Acesso pleno a todos os cômodos sem bloqueio por cabeçalho fixo; safe-area lateral respeitada. |
| **T-05** | iPad Mini / Tablet Vertical | `768 × 1024` | Retrato | Grid de cômodos em 3 colunas niveladas; modais flutuantes centralizados (não bottom-sheet). |
| **T-06** | iPad Pro / Wall Mount 10" | `1024 × 768` | Paisagem | **Modo 1º Viewport Zero-Scroll**: 100% da tela preenchida sem barra de rolagem vertical. |
| **T-07** | Smart Display (Nest Hub / Echo) | `1024 × 600` | Paisagem | Layout compacto com altura controlada, todos os cards acessíveis sem sobreposições. |
| **T-08** | Desktop / Laptop Full HD | `1440 × 900` | Paisagem | Visualização panorâmica de alto luxo; microinterações em hover ativas. |
| **T-09** | Desktop Ultrawide | `2560 × 1080` | Paisagem | Contenção de largura máxima a 1720px; centralização de visão. |
| **T-10** | Zoom de Acessibilidade 150% | `1440 × 900` @150% | Qualquer | Fontes e textos escalados sem truncamentos destrutivos ou vazamento de bordas. |

---

## 8. Critérios de Aceitação (Definition of Done - DoD)

A implementação da arquitetura responsiva será considerada concluída quando:

- [ ] **Nenhum elemento vazar horizontalmente** em qualquer largura entre 320px e 3840px (`overflow-x: hidden` verificado programaticamente).
- [ ] **Modais e bottom-sheets se adaptarem automaticamente**:
  - Em telas móveis: bottom-sheet deslizável com drag-handle, seguro contra notch e home indicator.
  - Em telas médias/grandes: caixas de diálogo flutuantes centralizadas com contenção de largura.
- [ ] **O seletor de velocidades de ventilação** comportar-se perfeitamente em 1 linha contínua para larguras >= 310px e em 2×2 simétrico para larguras inferiores, com zero quebra textual em "2 • Médio".
- [ ] **Cards com dispositivo único** adotarem layout horizontal executivo (`is-single`) sem espaços vazios verticais desproporcionais.
- [ ] **O modo de 1º Viewport Zero-Scroll** permanecer 100% funcional e estável em tablets montados em parede na orientação paisagem.
- [ ] **Zero dependência de hover** em telas com `pointer: coarse`, garantindo que todos os controles finos (dimmer, velocidade, rotação) sejam acessíveis por toque direto.
- [ ] **Zero quebras no contrato de dados canônico** de [`dashboard-app/lib/rooms.ts`](file:///c:/HomeAssistant/dashboard-app/lib/rooms.ts) e [`dashboard-app/manifesto-comodos.json`](file:///c:/HomeAssistant/dashboard-app/manifesto-comodos.json).
- [ ] **Validação de tipos**: `npx tsc --noEmit` executado com código de saída 0.
- [ ] **Validação visual completa**: screenshots capturados e arquivados para cada resolução da matriz de testes.

---

## 9. Plano de Ação & Proposta de Solução Modular

A execução seguirá cinco fases ordenadas para garantir estabilidade sem regressões:

### Fase 1: Fundação do Sistema de Container Queries & Variáveis Fluidas
- Configuração de `container-type: inline-size` em `.rooms-section`, `.popup-sheet`, `.daily-panorama-bar` e `.control-modal-dialog`.
- Definição de tokens de espaçamento e tipografia fluidos escaláveis via `clamp()`.

### Fase 2: Modularização dos Cards de Cômodos e Modais de Controle
- Refatoração dos subcards de iluminação, ventilação e sensores para regras orientadas a `@container`.
- Estabelecimento do comportamento executivo horizontal para grupos de 1 único item.

### Fase 3: Adaptação Avançada de Retrato e Alturas Baixas
- Criação das regras específicas para tablets em orientação retrato (`min-width: 768px and orientation: portrait`).
- Refinamento do comportamento de smartphones em paisagem (`max-height: 520px`).

### Fase 4: Otimização de Entrada Tátil vs. Mouse
- Isolamento estrito de regras `:hover` dentro de `@media (hover: hover) and (pointer: fine)`.
- Elevação dos envelopes de toque para padrão industrial de 48px em `@media (pointer: coarse)`.

### Fase 5: Auditoria Multiplataforma e Testes Automatizados
- Execução de bateria de testes automatizados com captura de evidências visuais em todas as resoluções da matriz.

---

## 10. Matriz de Propriedade de Arquivos e Governança

Conforme as diretrizes de governança multi-agente estabelecidas em [`AGENTS.md`](file:///c:/HomeAssistant/AGENTS.md) e [`artifacts/antigravity/file-ownership.md`](file:///c:/HomeAssistant/artifacts/antigravity/file-ownership.md):

### 10.1. Arquivos Permitidos para Modificação (Escopo do Frontend / UX)
- [`dashboard-app/app/globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css) — Folha de estilos global, design system Liquid Glass e regras de media/container queries.
- [`dashboard-app/app/page.tsx`](file:///c:/HomeAssistant/dashboard-app/app/page.tsx) — Estrutura e layout responsivo do dashboard principal.
- [`dashboard-app/app/components/RoomCard.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/RoomCard.tsx) — Card individual de cômodo.
- [`dashboard-app/app/components/RoomPopup.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/RoomPopup.tsx) — Modal expansivo do cômodo.
- [`dashboard-app/app/components/FanControlCard.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/FanControlCard.tsx) — Card de controle de ventilação.
- [`dashboard-app/app/components/DeviceTile.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/DeviceTile.tsx) — Tile reutilizável de dispositivos.
- [`dashboard-app/app/components/HeaderQuickActions.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/HeaderQuickActions.tsx) — Ações rápidas do cabeçalho.
- [`dashboard-app/app/components/QuickScenesPanel.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/QuickScenesPanel.tsx) — Painel de cenas rápidas.
- [`dashboard-app/app/components/WeatherWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/WeatherWidget.tsx) — Widget de clima.
- [`dashboard-app/app/components/EnergyWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/EnergyWidget.tsx) — Widget de energia.
- [`dashboard-app/app/components/TvRemoteWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/TvRemoteWidget.tsx) — Widget de TV e PS5.
- [`dashboard-app/app/components/VacuumWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/VacuumWidget.tsx) — Widget do aspirador.
- [`dashboard-app/app/components/TodoListWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/TodoListWidget.tsx) — Widget de lista de tarefas.
- [`dashboard-app/app/components/MediaHubModal.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/MediaHubModal.tsx) — Modal central de mídia.
- [`dashboard-app/app/comodo/[id]/page.tsx`](file:///c:/HomeAssistant/dashboard-app/app/comodo/[id]/page.tsx) — Subpágina dedicada do cômodo.

### 10.2. Arquivos Estritamente Proibidos de Modificação
- `config/automations.yaml` — Automações físicas reais da residência (gerenciadas por Claude Code).
- `config/configuration.yaml` — Configuração central do Home Assistant Core.
- `config/secrets.yaml` — Chaves de criptografia e credenciais privadas.
- `config/.storage/*` — Registros internos do Home Assistant Core (sujeitos ao protocolo de segurança RSK-01).
- `dashboard-app/.env.local` — Tokens de acesso e portas de comunicação com o HA.
- `dashboard-app/lib/rooms.ts` e `dashboard-app/manifesto-comodos.json` — **Contrato Canônico da Casa**: Nenhuma entidade pode ser renomeada, removida ou alterada sem sincronização com os dispositivos físicos reais.
