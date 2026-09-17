# Relatório de Auditoria de Consistência Visual (Fase 4)

**Documento**: `artifacts/audit/visual-consistency-report.md`  
**Escopo**: Painel de Automação Residencial (`dashboard-app`)  
**Data**: 16/09/2026 · **Status**: Concluído (Modo Somente Leitura — sem alteração de código)  
**Referência Canônica**: [`dashboard-app/DESIGN.md`](file:///c:/HomeAssistant/dashboard-app/DESIGN.md) (*Nocturnal Observatory*)

---

## 1. Visão Geral da Auditoria

A consistência de um painel de automação residencial de alta fidelidade depende de previsibilidade geométrica, hierarquia visual coerente e uniformidade nos padrões de interação. Quando o usuário toca em um botão de fechar, num chip de status ou num seletor de velocidade, o componente deve responder com as mesmas dimensões, raio de curvatura, tempos de transição e feedback tátil.

Esta auditoria comparou componentes equivalentes em todas as telas (`page.tsx`, `comodo/[id]`, `standby`) e nos 24 componentes da aplicação, identificando divergências injustificadas de anatomia, estilos e comportamentos.

---

## 2. Matriz de Inconsistências entre Componentes Equivalentes

### 2.1. Cabeçalhos de Modais e Overlays

| Componente A | Componente B | Diferença Identificada | Padrão Recomendado | Proposta de Unificação | Risco da Alteração | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`RoomPopup`** (`popup-header`) | **`WeatherForecastModal`** (`weather-modal-header`) | `RoomPopup` usa `gap: 14px`, flexbox horizontal e botão de expansão de tela cheia; `WeatherForecastModal` encapsula ícone e títulos em `.weather-modal-title-box` com margens distintas. | Estrutura unificada com slot de ícone à esquerda, grupo de título/subtítulo ao centro e slot de ações à direita. | Criar componente base `ModalHeader` compartilhando a classe `.modal-header-canonical`. | Baixo | **Média** |
| **`EnergyWidget`** (Modal) | **`VacuumWidget`** (Modal) | No `EnergyWidget`, o botão mestre (`.popup-master-btn`) possui padding `8px 14px` e borda arredondada `12px`; no `VacuumWidget`, o botão de ação rápida (`.vacuum-locate-btn`) usa padding `6px 12px` e raio `9999px`. | Raio `12px` (`var(--radius-base)`) para botões de ação contextual de cabeçalho. | Padronizar a classe utilitária `.modal-header-action-btn`. | Baixo | **Média** |

### 2.2. Botões de Fechamento de Modais (`Close Button`)

| Componente A | Componente B | Diferença Identificada | Padrão Recomendado | Proposta de Unificação | Risco da Alteração | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`RoomPopup` / `BatteryAlertsBar` / `EnergyWidget`** | **`MediaHubModal` / `TodoListWidget` / `VacuumWidget` / `WeatherForecastModal`** | Metade dos modais usa um SVG `<path d="M18 6L6 18M6 6l12 12" />` com stroke de 2.5px; a outra metade usa o caractere tipográfico literal `"✕"` (unicode U+2715). Além disso, `RoomPopup` possui dimensão 36x36px enquanto `WeatherForecastModal` usa 32x32px. | Ícone SVG padronizado em botão com alvo tátil de **44px × 44px** (WCAG AAA para wall-mounts). | Unificar em um componente compartilhado `ModalCloseButton` com SVG intrínseco. | Muito Baixo | **Alta** |

### 2.3. Micro-Pílulas e Chips de Alerta no Cabeçalho

| Componente A | Componente B | Diferença Identificada | Padrão Recomendado | Proposta de Unificação | Risco da Alteração | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`SecurityAlertsBar`** (`.security-micro-pill`) | **`BatteryAlertsBar`** (`.battery-micro-pill`) | Mesma geometria visual, mas declarados em classes separadas e arquivos duplicados. Sofrem o defeito **F-01**: a regra de 44px na media query é anulada por regra posterior de 36px. Tipografia fracionária `11.5px` no Security contra `12px` no Battery. | Alvo mínimo de toque de **44px** em mobile/tablet e tipografia com token `--font-caption` (`12px` / `0.75rem`). | Unificar no componente canônico `HeaderAlertPill` com suporte a variantes (`security`, `battery`, `sync`). | Baixo | **Alta** |
| **`HeaderQuickActions`** (`.status-sync-micro-pill`) | **`SecurityAlertsBar`** (`.security-micro-pill`) | O botão de status de conexão usa `border-radius: 9999px` com padding `6px 12px`, enquanto a pílula de segurança usa `border-radius: 12px`. | Raio de pílula total (`9999px` / `full`) para todos os chips de status do cabeçalho superior. | Aplicar `border-radius: var(--rounded-full)` a todos os micro-chips do header. | Muito Baixo | **Média** |

### 2.4. Cards Compactos de Panorama Diário (`daily-panorama-bar`)

| Componente A | Componente B | Diferença Identificada | Padrão Recomendado | Proposta de Unificação | Risco da Alteração | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`WeatherWidget` / `VacuumWidget`** | **`TodoListWidget`** | `WeatherWidget` e `VacuumWidget` utilizam altura fixa de `84px`, com ícone à esquerda em container circular de 36px; `TodoListWidget` usa container arredondado quadrado (`border-radius: 10px`) e altura variável se o texto quebrar. | Altura fixa uniforme de **88px** no desktop/tablet e **76px** no mobile, com box de ícone padronizado (`border-radius: 12px`). | Criar layout canônico `.daily-widget-card` com slots: `Icon`, `Content`, `Badge/Action`. | Baixo | **Alta** |
| **`EnergyWidget`** (Compacto) | **`TvRemoteWidget`** (Compacto) | `EnergyWidget` renderiza uma sparkline SVG dinâmica na base com linha de progresso; `TvRemoteWidget` renderiza botões de ação rápida sobrepostos que competem com o clique do card inteiro. | Hierarquia clara: toque no corpo abre o modal; botões secundários internos isolados com `e.stopPropagation()`. | Padronizar a separação entre superfície de abertura e ações filhas. | Médio | **Média** |

### 2.5. Cards de Cômodos (`RoomCard`) vs. Subcards de Dispositivos (`DeviceTile`)

| Componente A | Componente B | Diferença Identificada | Padrão Recomendado | Proposta de Unificação | Risco da Alteração | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`RoomCard`** (Grade Principal) | **`DeviceTile`** (Subpágina e Modal) | `RoomCard` usa `border-radius: 20px` (`--rounded-xl`) e padding `16px`; `DeviceTile` usa `border-radius: 16px` (`--rounded-lg`) e padding `12px 14px`. O `RoomCard` possui botão de toggle circular interno com efeito de pulso (`.radio-pulse-ring`); o `DeviceTile` alterna o card inteiro. | Manter a diferenciação de nível hierárquico (Cômodo = macro / Dispositivo = micro), porém uniformizar sombras de elevação e brilho ativo (`--on-glow`). | Documentar o contrato de raio: Macro-container = 20px; Micro-tile = 14px. | Baixo | **Média** |
| **`DeviceButton`** | **`DeviceTile`** | `DeviceButton` é um arquivo minimalista de 35 linhas sem tratamento de indisponibilidade (`unavailable`) e sem suporte a dimmer/cores, mas que ainda existe na pasta de componentes. | Utilizar exclusivamente `DeviceTile` em toda a aplicação. | Depreciar e remover `DeviceButton.tsx`, redirecionando qualquer menção para `DeviceTile`. | Muito Baixo | **Baixa** |

### 2.6. Botões de Ação Rápida e Cenas (`QuickScenesPanel`)

| Componente A | Componente B | Diferença Identificada | Padrão Recomendado | Proposta de Unificação | Risco da Alteração | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`QuickScenesPanel`** (`.scene-card-btn`) | **`HeaderQuickActions`** (`.quick-action-btn--off`) | Os botões de cena usam transição de escala (`transform: scale(0.97)` em `:active`), enquanto o botão de apagar tudo do header usa um preenchimento por anel de progresso via hold de 800ms. | O padrão de hold de segurança (800ms) é excelente para ações destrutivas globais, mas cenas pontuais devem ter acionamento imediato com feedback háptico. | Manter a distinção funcional, padronizando a tipografia dos botões de cena com `--font-body-sm` (`13px`). | Muito Baixo | **Baixa** |

### 2.7. Controles de Seleção e Sliders

| Componente A | Componente B | Diferença Identificada | Padrão Recomendado | Proposta de Unificação | Risco da Alteração | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **`LightDimmerModal`** (Sliders) | **`FanControlCard`** (Seletor de Velocidades) | O dimmer de iluminação usa slider de arraste contínuo (`<input type="range">`) estilizado com gradiente de brilho/temperatura; o ventilador usa uma grade de botões discretos (`0 • Desl`, `1 • Baixo`, `2 • Médio`, `3 • Alto`). | Ambos os padrões são adequados para suas naturezas físicas (luz = contínua; ventilador Tuya = velocidades discretas). Porém, o slider de luz não possui indicador de foco por teclado (`:focus-visible`). | Adicionar outline de foco no slider de luz (`--color-focus-ring: #38bdf8`). | Baixo | **Alta** |

---

## 3. Inconsistências de Tipografia, Espaçamento e Elevação

### 3.1. Escalas Tipográficas Fora do Design System
* **Valores Fracionários**: `globals.css:4211` define `font-size: 11.5px` para `.security-micro-pill`. O valor deve ser ajustado para o token canônico `--font-caption: 0.75rem` (`12px`).
* **Textos Hardcoded em Pixels**: Foram identificadas declarações dispersas de `13.5px`, `15px`, `17px` e `22px` em widgets individuais em vez dos tokens semânticos `--font-body`, `--font-body-sm` e `--font-h2`.

### 3.2. Caos nas Sombras de Elevação (`box-shadow`)
* O `DESIGN.md` prevê o modelo de elevação *Liquid Glass* baseado em luz física (refração de borda e brilho âmbar/ciano).
* No código real existem **124 sombras distintas** declaradas em 157 regras de CSS.
* **Proposta de Unificação**: Estabelecer 4 níveis canônicos de elevação:
  1. `--shadow-glass-flat`: `0 2px 8px rgba(0, 0, 0, 0.25)` (cards em repouso);
  2. `--shadow-glass-elevated`: `0 8px 24px rgba(0, 0, 0, 0.45)` (cards em hover / modais);
  3. `--shadow-radiance-amber`: `0 0 24px rgba(251, 191, 36, 0.22)` (dispositivos ligados);
  4. `--shadow-radiance-cyan`: `0 0 20px rgba(56, 189, 248, 0.20)` (mídia ativa).

---

## 4. Auditoria de Estados e Feedbacks de Interação

| Estado | Situação Atual no Projeto | Diagnóstico de Consistência |
| :--- | :--- | :--- |
| **Hover (`:hover`)** | Presente na maioria dos cards, mas sem segregação para `@media (hover: hover)`. | Causa "sticky hover" em painéis de parede e tablets touch (o card permanece aceso ou elevado após o toque). |
| **Active / Pressed** | Varia entre `transform: scale(0.98)` (`RoomCard`), `scale(0.96)` (`scene-card-btn`) e nenhum efeito em modais. | Falta de padronização na escala de compressão tátil (`scale(0.97)` uniforme). |
| **Foco de Teclado (`:focus-visible`)** | Quase ausente em todo o CSS (presente apenas no input do `TodoListWidget`). | Navegação assistiva e por teclado completamente cega. |
| **Loading / Carregando** | Presente em botões de toggle via spinners SVG e opacity 0.5. | Razoavelmente consistente, mas widgets de telemetria ficam estáticos sem skeleton. |
| **Erro de Rede / Comando** | Restrito a micro-vibração háptica e animação de 400ms `shake-fail`. | **Crítico**: ausência de banner, toast ou indicador visual persistente de falha. |
| **Offline / Desconectado** | Tratado no cabeçalho com dot vermelho, mas ignorado dentro dos cards de cômodo. | Se o Home Assistant cair, os cards mantêm aparência de dados frescos. |

---

## 5. Plano Priorizado de Harmonização Visual

1. **Prioridade 1 (Alta - Ergonomia e Acessibilidade)**:
   - Padronizar todos os botões de fechar modal para SVG uniforme com alvo mínimo de `44px × 44px`.
   - Resolver o conflito de cascata CSS **F-01** nas pílulas do cabeçalho garantindo `min-height: 44px`.
   - Adicionar anéis de foco (`:focus-visible`) com `outline: 2px solid var(--color-focus-ring)`.

2. **Prioridade 2 (Média - Consistência de Componentes)**:
   - Unificar `SecurityAlertsBar` e `BatteryAlertsBar` no componente compartilhado `HeaderAlertPill`.
   - Padronizar alturas (`88px`) e raios de curvatura dos 5 widgets da barra panorâmica diária.
   - Reduzir as 124 sombras arbitrárias para a escala de 4 tokens de elevação física.

3. **Prioridade 3 (Baixa - Limpeza e Higienização)**:
   - Excluir o componente não utilizado `DeviceButton.tsx`.
   - Migrar os seletores com tipografia fracionária (`11.5px`) para tokens semânticos rem.
