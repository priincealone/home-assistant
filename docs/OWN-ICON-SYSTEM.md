# Sistema Autoral de Ícones — "AeroGlyphs Home"

> ⚠️ **SUBSTITUÍDO em 25/09/2026** por `specs/features/icones-phosphor.md` e pela seção "Ícones" do `dashboard-app/DESIGN.md`. Os desenhos autorais aqui descritos foram removidos do código.

**Documento**: `docs/OWN-ICON-SYSTEM.md`  
**Autor**: Direção de Design de Produto & Human Interface Engineering  
**Versão**: 1.0 (Autoral & Proprietário)  
**Data**: 17 de Setembro de 2026  
**Status**: Proposta Aprovada para Arquitetura e Engenharia de Interface  
**Repositório Alvo**: `c:\HomeAssistant\dashboard-app`  

---

## 1. Visão Geral e Princípios Fundamentais

O **AeroGlyphs Home** é o sistema canônico de ícones vetoriais desenhado especificamente para o painel de automação residencial. Sua missão é fornecer **legibilidade instantânea (reconhecimento visual em < 150ms)**, elegância geométrica e clareza física tanto em telas fixas de parede (operadas a distâncias de 1 a 3 metros) quanto em dispositivos móveis touch.

### 1.1 Princípios Conceituais
1. **Clareza Imediata**: A forma do glifo deve representar com fidelidade o objeto físico ou a ação digital, sem abstrações esotéricas.
2. **Simplicidade Estrutural**: Cada ícone é reduzido às suas linhas e curvas essenciais; qualquer elemento gráfico que não contribua para o reconhecimento é descartado.
3. **Consistência Ótica (Optical Balance)**: Ícones circulares, quadrados e retangulares possuem compensações óticas de área para transmitir o mesmo peso visual (*optical weight*).
4. **Escala e Precisão Subpixel**: Desenhado em grade inteira para prevenir borrões de anti-aliasing em telas industriais e monitores de alta densidade.
5. **Ergonomia Tátil**: O glifo vetorial é desacoplado do container interativo, garantindo sempre a área de toque (*hitbox*) de no mínimo 44×44px.

### 1.2 Barreira de Propriedade Intelectual (O Que NÃO Fazer)
- ❌ **Proibido usar SF Symbols**: Conforme a licença restrita da Apple (`Apple-Design-Resources-License-20230621-English.pdf`), SF Symbols só podem ser executados em sistemas nativos Apple.
- ❌ **Proibido copiar formas de produtos Apple**: Não desenhar controles no formato da Siri Remote, AirPods, telas de Apple TV, silhuetas de iMac ou HomePod.
- ❌ **Proibido clonar superelipses exclusivas da Apple**: As curvas e raios do AeroGlyphs baseiam-se em geometria euclidiana pura (círculos tangenciais perfeitos e chanfros calibrados), não na curva contínua *squircle* proprietária da Apple.
- ❌ **Proibido imitar layouts do Apple Home**: Nossa metáfora visual reflete a arquitetura física e a automação real da residência brasileira (ex: tomada tripolar padrão NBR 14136, ventilação de teto com pás circulares e ar-condicionado split).

---

## 2. Geometria de Construção e Grid Canônico

```
  0    2          8             16         22   24
0 ┌────┬──────────┬──────────────┬──────────┬────┐
  │    │          │  Live Area   │          │    │
2 ├────┼──────────┼──────────────┼──────────┼────┤
  │    │  ┌───────┴──────────────┴───────┐  │    │
  │    │  │       Círculo Guia (Ø20)     │  │    │
  │    │  │    Quadrado Guia (18x18)     │  │    │
  │    │  │    Retângulo H (20x16)       │  │    │
  │    │  │    Retângulo V (16x20)       │  │    │
  │    │  └───────┬──────────────┬───────┘  │    │
22├────┼──────────┼──────────────┼──────────┼────┤
  │    │          │  Live Area   │          │    │
24└────┴──────────┴──────────────┴──────────┴────┘
```

### 2.1 Especificações da Grade
- **ViewBox Base**: `0 0 24 24` (24px × 24px).
- **Área Viva de Desenho (Live Area)**: `20px × 20px` (do pixel 2 ao pixel 22 nos eixos X e Y).
- **Margem de Respiro de Segurança (Padding)**: `2px` periféricos em todas as bordas para acomodar dispersão ótica e espessuras de traço sem corte (*clipping*).
- **Módulo Subpixel**: Coordenadas ancoradas em passos de **0.5px** ou **1px**, evitando frações imperfeitas que causem degradação de renderização.

### 2.2 Formas-Guia de Compensação Ótica (Key Shapes)
Para que ícones de diferentes geometrias transmitam a mesma massa visual, seus limites devem coincidir com as formas-guia calibradas:

| Forma-Guia | Dimensões | Área Aproximada | Uso Canônico |
|:---|:---:|:---:|:---|
| **Círculo Guia** | Diâmetro de 20px | ~314 px² | Lâmpadas de teto, ventiladores, relógio, câmera |
| **Quadrado Guia** | 18px × 18px | 324 px² | Mídia player, tomadas, fechaduras, caixas de som |
| **Retângulo Horizontal** | 20px × 16px | 320 px² | Smart TV, consoles horizontais, persianas, baterias |
| **Retângulo Vertical** | 16px × 20px | 320 px² | Termostato de parede, sensores magnéticos, celulares |

---

## 3. Parâmetros Morfológicos: Traço, Cantos e Preenchimento

### 3.1 Espessura de Traço (Stroke Width)
A espessura de traço é escalonada geometricamente para preservar a proporção de peso conforme o ícone cresce ou diminui:

| Tamanho do Ícone | Escala | Stroke Width | Stroke Alignment |
|:---:|:---:|:---:|:---:|
| **16px (Micro)** | `0.667x` | `1.50px` | Center |
| **20px (Small)** | `0.833x` | `1.65px` | Center |
| **24px (Base / Regular)** | `1.000x` | `1.75px` | Center |
| **24px (Medium / Enfatizado)** | `1.000x` | `2.00px` | Center |
| **32px (Large)** | `1.333x` | `2.00px` | Center |
| **48px (Hero / Display)** | `2.000x` | `2.50px` | Center |

> [!IMPORTANT]
> O alinhamento de traço é sempre **Center** (`stroke-alignment: center`), com as coordenadas do SVG posicionadas nos nós centrais do grid.

### 3.2 Cantos e Terminações (Caps and Joins)
- **Terminações (Linecap)**: `stroke-linecap="round"`. Pontas arredondadas humanizam a interface, evitam arestas pontiagudas agressivas e suavizam o render em baixas resoluções.
- **Junções (Linejoin)**: `stroke-linejoin="round"`. Dobras de linhas suaves previnem vértices pontiagudos que ultrapassariam a margem de segurança.
- **Raios de Curvatura em Polígonos**:
  - Cantos externos de cards e carcaças: `rx="2.5"` ou `rx="3"`.
  - Cantos internos e detalhes de botões: `rx="1"` ou `rx="1.5"`.
  - Círculos de conectores ou nós de telemetria: círculos perfeitos (`r="1.5"` a `r="2.5"`).

### 3.3 Filosofia de Preenchimento (Fill)
O sistema AeroGlyphs utiliza **Traço Primário (Line-dominant)** por padrão. O preenchimento só é acionado com propósitos semânticos específicos:
1. **Outline (Padrão Repousado)**: `fill="none"`, traço contínuo em cor secundária ou terciária.
2. **Active / Energized (Ativo / Ligado)**: O traço assume a cor de ouro solar (`#fbbf24`), e áreas internas críticas recebem preenchimento gradiente ou semitransparente (`rgba(251, 191, 36, 0.16)`).
3. **Solid / Filled (Confirmação ou Destaque Extremo)**: Preenchimento total com `fill="currentColor"`, reservado exclusivamente para botões selecionados na barra de navegação inferior ou toggles de alta relevância.

---

## 4. Variantes Estruturais do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VARIANTES DO SISTEMA                           │
├───────────────────┬─────────────────────────────────────────────────────┤
│ 1. OUTLINE        │ Traço limpo de 1.75px, fill="none".                 │
│    (Linha)        │ Indicado para navegação, repouso e telemetria.      │
├───────────────────┼─────────────────────────────────────────────────────┤
│ 2. FILLED         │ Geometria sólida fechada, fill="currentColor".       │
│    (Sólido)       │ Indicado para abas selecionadas e confirmações.     │
├───────────────────┼─────────────────────────────────────────────────────┤
│ 3. DUOTONE        │ Traço de 1.75px + preenchimento translúcido (15%).  │
│    (Dois Tons)    │ Indicado para cartões de cômodo e dispositivos On.  │
├───────────────────┼─────────────────────────────────────────────────────┤
│ 4. ENCLOSED       │ Glifo inscrito em cápsula circular ou squircle      │
│    (Confinado)    │ de 36px a 44px com fundo translúcido (Subsurface).  │
└───────────────────┴─────────────────────────────────────────────────────┘
```

---

## 5. Matriz de Estados Operacionais do Glifo

| Estado | Tratamento Visual do Glifo | Exemplo Semântico |
|:---|:---|:---|
| **1. Desligado (Off / Idle)** | Traço neutro translúcido (`rgba(248, 250, 252, 0.55)` no dark, `#64748b` no light). `fill="none"`. | Lâmpada desligada, TV em standby. |
| **2. Ligado (On / Active)** | Traço Ouro Solar vibrante (`#fbbf24` no dark, `#b45309` no light). Núcleo com brilho suave e duotone translúcido. | Luz acesa, tomada fornecendo 120W. |
| **3. Indisponível (Offline)** | Opacidade atenuada em `0.40`. Opcionalmente cortado por traço diagonal suave a 45° ou ícone de antena desconectada. | Luminária desconectada da tomada. |
| **4. Alerta Crítico (Alert)** | Traço e glow em Vermelho Perimétrico (`#f87171` no dark, `#dc2626` no light). Pulso suave de opacidade (1.0 a 0.6). | Porta de entrada aberta, sensor de fumaça. |
| **5. Transição (Loading / Busy)** | Elemento concêntrico com rotação contínua (750ms linear) ou traço em interpolação de escala. | Ativando cena, reconectando Wi-Fi. |

---

## 6. Comportamento Cromático em Tema Claro e Escuro

Os ícones herdam sua cor primária via `stroke="currentColor"` e `fill="currentColor"`, sendo controlados pelas variáveis de tokens semânticos do **AeroGlass Home System**:

```css
/* Tokens de Aplicação em Ícones */
.icon-glyph {
  stroke: currentColor;
  stroke-width: var(--icon-stroke, 1.75px);
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  transition: stroke 0.2s cubic-bezier(0.16, 1, 0.3, 1), 
              fill 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.2s ease;
}

/* Modo Escuro (Midnight Slate) */
[data-theme="dark"] .icon-glyph--idle {
  color: rgba(248, 250, 252, 0.65);
}
[data-theme="dark"] .icon-glyph--active {
  color: #fbbf24;
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.35));
}
[data-theme="dark"] .icon-glyph--danger {
  color: #f87171;
  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.40));
}

/* Modo Claro (Frosted Day) */
[data-theme="light"] .icon-glyph--idle {
  color: #64748b;
}
[data-theme="light"] .icon-glyph--active {
  color: #b45309;
  filter: drop-shadow(0 1px 3px rgba(180, 83, 9, 0.20));
}
[data-theme="light"] .icon-glyph--danger {
  color: #dc2626;
  filter: drop-shadow(0 1px 4px rgba(220, 38, 38, 0.25));
}
```

---

## 7. Escala de Tamanhos e Aplicação Ergonômica

| Token de Tamanho | Dimensão Exata | ViewBox | Área Tátil Mínima (Hitbox) | Onde Utilizar |
|:---|:---:|:---:|:---:|:---|
| `--icon-size-xs` | **16px × 16px** | `0 0 24 24` | 44px × 44px (via padding) | Badges de telemetria, chips de status, eixos de gráficos. |
| `--icon-size-sm` | **20px × 20px** | `0 0 24 24` | 44px × 44px | Ações secundárias do cabeçalho, micro-botões de fechar. |
| `--icon-size-md` | **24px × 24px** | `0 0 24 24` | 44px × 44px | **Tamanho padrão universal**: Cards de cômodo, tiles, lista de dispositivos. |
| `--icon-size-lg` | **32px × 32px** | `0 0 24 24` | 48px × 48px | Ícone hero em cards de cômodo expandidos e headers de widget. |
| `--icon-size-xl` | **48px × 48px** | `0 0 24 24` | 56px × 56px | Modais dedicados (seletor de ventilador, controle de mídia, hero de aspirador). |

---

## 8. Catálogo Canônico de Ícones por Domínio

Todos os glifos abaixo possuem geometria própria, balanceada ótica e tecnicamente independente:

### 8.1 Dispositivos Físicos (Devices)

1. **Iluminação Principal (`LightCeilingIcon`)**:
   - *Conceito*: Plafon circular moderno com 3 raios de difusão de luz descendente tangenciais. Não utiliza a lâmpada incandescente do século XIX estilo bulbo de vidro.
   - *Geometria*: Cúpula superior horizontal achatada (`M4 9h16v1a8 8 0 0 1-16 0v-1z`) com feixe de luz sutil.
2. **Fita LED / Iluminação de Efeito (`LightStripIcon`)**:
   - *Conceito*: Linha ondulada contínua com nós circulares equidistantes denotando pontos de diodo.
3. **Ventilador de Teto (`CeilingFanIcon`)**:
   - *Conceito*: Núcleo circular central concêntrico de 6px cercado por 4 pás simétricas com curvatura aerodinâmica tangencial perfeita.
   - *Regra*: A rotação é sempre concentricamente ancorada no centro (`transform-origin: 12px 12px`).
4. **Climatizador / Ar Condicionado (`AirConditionerIcon`)**:
   - *Conceito*: Unidade split retangular com defletor inferior semiaberto emitindo 3 ondas suaves de fluxo de ar refrigerado descendente.
5. **Smart TV (`SmartTvIcon`)**:
   - *Conceito*: Tela retangular ampla proporção 16:9 (`rx="2"`), borda fina milimétrica e base de apoio plana horizontal de 10px.
6. **Console de Videogame (`GameConsoleIcon`)**:
   - *Conceito*: Silhueta geométrica horizontal contemporânea com fenda frontal de disco e LED de status discreto. Não copia os contornos de nenhuma marca proprietária.
7. **Tomada de Parede NBR 14136 (`PowerOutletIcon`)**:
   - *Conceito*: Espelho retangular arredondado com o hexágono rebaixado oficial brasileiro contendo os 3 orifícios circulares perfeitamente alinhados.
8. **Sensor Magnético de Porta / Janela (`DoorSensorIcon`)**:
   - *Conceito*: Dois blocos retangulares paralelos verticais (`rx="1.5"`); bloco transmissor maior à esquerda (16px) e bloco magnético menor à direita (12px) com gap de 3px indicando estado fechado ou aberto.
9. **Câmera de Segurança (`SecurityCameraIcon`)**:
   - *Conceito*: Corpo cilíndrico angulado a 30°, lente de anel duplo e suporte de parede articulado com indicador de gravação.
10. **Fechadura Inteligente (`SmartLockIcon`)**:
    - *Conceito*: Escudo retangular de metal com teclado numérico matricial em 4 pontos e maçaneta geométrica.

### 8.2 Ações e Controles (Actions)

1. **Alternar Energia (`PowerToggleIcon`)**:
   - *Conceito*: Arco circular aberto em 270° com haste vertical de acionamento de 10px entrando pelo ápice. Diferenciação ótica: haste não toca o fundo do círculo.
2. **Inspecionar / Ajuste Fino (`InspectSlidersIcon`)**:
   - *Conceito*: Três trilhos paralelos verticais com marcadores deslizantes em posições alternadas (esquerdo alto, centro baixo, direito médio).
3. **Botão Fechar Padronizado (`DismissCloseIcon`)**:
   - *Conceito*: Cruz geométrica simétrica de 14px de envergadura com pontas perfeitamente arredondadas (`stroke-linecap="round"`), substituindo qualquer caractere tipográfico `"✕"`.
4. **Sincronizar / Atualizar (`RefreshSyncIcon`)**:
   - *Conceito*: Duas setas curvas circulares formando um anel contínuo de 360° em sentido horário.
5. **Silenciar Áudio (`VolumeMuteIcon`)**:
   - *Conceito*: Cone acústico com cruz oblíqua compacta posicionada à direita, sem encavalar com a onda sonora.

### 8.3 Indicadores de Status e Telemetria (Status)

1. **Sinal Wi-Fi / Rede (`ConnectivityWifiIcon`)**:
   - *Conceito*: Nó pontual inferior de 3px com 3 arcos concêntricos de sinal ascendente de 90° de abertura.
2. **Nível de Bateria (`BatteryLevelIcon`)**:
   - *Conceito*: Cápsula retangular horizontal (`20×10px`, `rx="2"`) com pino de contato no bordo direito (`2×4px`) e barra interna de carga proporcional.
3. **Pico de Potência / Consumo Elétrico (`EnergyBoltIcon`)**:
   - *Conceito*: Raio dinâmico estilizado com 3 segmentos lineares em ângulos precisos de 60°, denotando fluxo de elétrons instantâneo.
4. **Ponto de Estado (`StatusDotGlyph`)**:
   - *Conceito*: Círculo de diâmetro 6px ou 8px com halo externo semitransparente de 3px para feedback de alta luminosidade.

### 8.4 Navegação Estrutural (Navigation)

1. **Visão Geral / Casa (`NavHomeIcon`)**:
   - *Conceito*: Silhueta arquitetônica contemporânea: teto com inclinação assimétrica limpa, fachada geométrica e porta central retangular.
2. **Ambientes / Cômodos (`NavRoomsGridIcon`)**:
   - *Conceito*: Grid modular simétrico de 4 quadrados arredondados de 7×7px separados por gaps de 3px.
3. **Telemetria e Histórico (`NavTelemetrySparklineIcon`)**:
   - *Conceito*: Eixo em "L" com curva de pulso ascendente de telemetria conectando 3 vértices com nós circulares.
4. **Central de Mídia (`NavMediaIcon`)**:
   - *Conceito*: Círculo contínuo com triângulo equilátero de reprodução inscrito e centrado opticamente (deslocado 1px à direita para compensar peso visual).
5. **Chevrons de Retorno e Avanço (`ChevronLeftIcon` / `ChevronRightIcon`)**:
   - *Conceito*: Ângulo reto de 90° com haste de 8px e pontas arredondadas.

---

## 9. Regras Rígidas de Acessibilidade (a11y)

### 9.1 Ícones Decorativos vs. Ícones Semânticos
1. **Ícone Decorativo (Acompanhado de Texto Visível)**:
   - **Obrigatório**: `aria-hidden="true"` e `focusable="false"`.
   - *Exemplo*: Um botão com o texto `"Desligar Sala"` e o ícone de lâmpada. O leitor de tela lê apenas o texto; o ícone é invisível à árvore de acessibilidade.
2. **Ícone Semântico / Interativo Isolado (Icon-Only Button)**:
   - **Proibido**: Botão contendo apenas `<svg>` sem acessibilidade textual.
   - **Obrigatório**: O `<button>` deve possuir `aria-label="Descrição clara da ação"` ou um `<span>` interno com classe `.sr-only`.
   - *Exemplo*: `<button aria-label="Fechar configurações da sala"><DismissCloseIcon aria-hidden="true" /></button>`.

### 9.2 Contraste Mínimo de Cor (WCAG 2.1 AA)
- Ícones que comunicam status crítico ou que servem de atuadores visuais devem manter contraste de no mínimo **3.0:1** contra o plano de fundo imediato (em conformidade com WCAG 1.4.11 — Non-text Contrast).
- O traço do ícone nunca deve ser mais fino que **1.5px** em resoluções padrão para garantir discernimento por usuários com acuidade visual reduzida.

### 9.3 Alvos de Toque (Hitbox WCAG 2.5.5)
O SVG em si pode medir 20px ou 24px, mas o seu elemento hospedeiro interativo (`<button>` ou `<a>`) **deve ter dimensões externas mínimas de 44px × 44px**. Isso é garantido via padding transparente ou dimensões estruturais rígidas (`min-w-[44px] min-h-[44px]`).

---

## 10. Regras de Direcionalidade e Localização RTL (Right-to-Left)

Ao preparar o painel para ambientes com leitura da direita para a esquerda (como árabe ou hebraico):

| Categoria do Ícone | Comportamento em RTL | Justificativa Física / Semântica |
|:---|:---:|:---|
| **Setas e Chevrons (`ChevronLeft`, `Back`)** | **INVERTER (Mirror)** | Representam fluxo temporal e direção de leitura da interface. |
| **Gráficos de Telemetria Histórica** | **INVERTER (Mirror)** | O tempo flui da direita para a esquerda em contextos RTL. |
| **Dispositivos Físicos da Casa (Lâmpada, TV, Ventilador, Ar)** | **NÃO INVERTER** | Objetos tridimensionais do mundo real não mudam de forma física com a direção do idioma. |
| **Tomada Elétrica NBR 14136** | **NÃO INVERTER** | Padrão elétrico regulatório físico com posição de terra imutável. |
| **Fechadura e Câmera** | **NÃO INVERTER** | Hardware mecânico real. |

---

## 11. Regras de Animação e Física de Micro-interações

```
        ┌────────────────────────────────────────────────────────┐
        │             ANIMAÇÕES BREVES E CONCÊNTRICAS            │
        ├────────────────────────────────────────────────────────┤
        │  • Rotação: Apenas em círculos (transform-origin: 50%) │
        │  • Duração: 180ms a 240ms                              │
        │  • Curva: cubic-bezier(0.16, 1, 0.3, 1)                │
        │  • Reduced-motion: Fade estático instantâneo           │
        └────────────────────────────────────────────────────────┘
```

1. **Origem da Transformação**: Toda animação de rotação (ex: hélices do ventilador) deve ter `transform-origin: center center` (ou `12px 12px` em coordenadas relativas). É terminantemente proibido girar caixas retangulares ou elipses excêntricas.
2. **Duração**: Transições de estado do ícone (de inativo para ativo) duram **200ms**, utilizando curva de decaimento natural (`cubic-bezier(0.16, 1, 0.3, 1)`).
3. **Respeito ao `prefers-reduced-motion`**:
   - Qualquer rotação contínua é imediatamente interrompida.
   - O estado do ícone é alternado via cross-fade simples de opacidade (0ms a 100ms) sem translações nem rotações.

---

## 12. Matriz de Decisão: Quando Usar Ícone, Texto ou Ambos

```
                       [ NOVO ELEMENTO DE INTERFACE ]
                                     │
                 ¿O espaço físico é menor que 44px de largura?
                                ├── SIM ──► Apenas Ícone (com aria-label)
                                └── NÃO
                                     │
                  ¿A ação é universalmente compreensível?
                    (Ex: Fechar, Alternar Tema, Início)
                                ├── SIM ──► Ícone + Tooltip opcional
                                └── NÃO
                                     │
                   ¿É um card principal ou botão de comando?
                                ├── SIM ──► Ícone + Rótulo Textual (Ambos)
                                └── NÃO ──► Apenas Texto
```

1. **Apenas Ícone (`Icon-Only`)**:
   - Permitido apenas para ações universais consagradas: Fechar modal (`DismissCloseIcon`), Alternar Tema (`ThemeToggleIcon`), Voltar (`ChevronLeftIcon`), Silenciar som (`VolumeMuteIcon`).
   - **Exigência Inegociável**: Deve conter `aria-label` descritivo.
2. **Apenas Texto (`Text-Only`)**:
   - Indicado para links de navegação secundária, termos de política, notas de rodapé ou botões com verbos de ação compostos complexos (ex: `"Reverter para parâmetros de fábrica"`).
3. **Ícone + Texto (`Icon + Text`) — O Padrão Ouro do Painel**:
   - Obrigatório para cards de cômodo (`RoomCard`), tiles de dispositivos (`DeviceTile`), botões de ação do cabeçalho (`HeaderQuickActions`) e linhas de alerta. O ícone âncora a atenção visual periférica e o texto confirma com precisão semântica.

---

## 13. Guia Prático de Uso: O Que Fazer (Do) e O Que Não Fazer (Don't)

### O Que Fazer (Do ✅)
- ✅ **DO**: Manter a espessura de traço consistente de **1.75px** em todos os ícones de 24px no mesmo contexto.
- ✅ **DO**: Ancorar todas as coordenadas na grade base de 24px com 2px de respiro perimétrico.
- ✅ **DO**: Usar `aria-hidden="true"` quando o ícone estiver acompanhado de um título de texto legível.
- ✅ **DO**: Assegurar que o botão hospedeiro tenha no mínimo 44×44px de área de clique, mesmo que o ícone tenha 20px.
- ✅ **DO**: Utilizar rotação concêntrica com `transform-origin: center` em ícones circulares.
- ✅ **DO**: Reservar o preenchimento cromático Ouro Solar (`#fbbf24`) exclusivamente para dispositivos fisicamente ligados.

### O Que Não Fazer (Don't ❌)
- ❌ **DON'T**: Copiar a biblioteca SF Symbols ou reproduzir ícones proprietários de hardwares da Apple.
- ❌ **DON'T**: Misturar espessuras de traço díspares na mesma barra de navegação (ex: um ícone com 1px fino e outro com 2.5px pesado).
- ❌ **DON'T**: Deixar botões sem texto sem `aria-label`, tornando-os invisíveis para pessoas que utilizam leitores de tela.
- ❌ **DON'T**: Aplicar animação contínua em formato geométrico não-circular, o que provoca cantos saindo da caixa.
- ❌ **DON'T**: Inverter em modo RTL representações de objetos do mundo físico (lâmpadas, tomadas, ar-condicionado).
- ❌ **DON'T**: Reduzir ícones de 24px para 12px sem trocar a espessura de traço, gerando borrão ótico ilegível.
