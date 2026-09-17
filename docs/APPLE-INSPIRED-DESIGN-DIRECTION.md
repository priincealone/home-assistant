# Direção de Design — Princípios Apple Aplicados à Automação Residencial Autoral

**Documento**: `docs/APPLE-INSPIRED-DESIGN-DIRECTION.md`  
**Autor**: Direção de Design de Produto & Human Interface Engineering  
**Data**: 17 de Setembro de 2026  
**Status**: Aprovado para Arquitetura e Engenharia de Interface  
**Alvo**: Painel Web de Automação Residencial (`dashboard-app`, Next.js 16 + React 19)

---

## 1. Visão Geral e Fronteira Legal / Conceitual

Este documento estabelece os fundamentos conceituais e filosóficos para o redesign e refinamento do painel residencial da residência. O objetivo é alcançar o nível de sofisticação, legibilidade, calma visual e integração ergonômica consagrado pelas plataformas da Apple, **sem jamais infringir propriedade intelectual, direitos autorais ou patentes de design da Apple Inc.**

### 1.1 O que incorporamos (Princípios Universais de Design)
- **Clareza através da redução**: Tudo o que não comunica estado ou ação é ruído visual.
- **Hierarquia espacial e tipográfica**: O olho do usuário deve entender a prioridade das informações em menos de 250ms a uma distância de até 3 metros (painel de parede).
- **Materiais funcionais com propósito**: A translucidez e os materiais vítreos servem para manter a percepção de profundidade e o contexto espacial, nunca como mero ornamento.
- **Uso moderado e intencional de cor**: A cor é reservada para denotar energia viva, alerta ou interação ativa; superfícies neutras dominam o repouso.
- **Feedback físico e tátil instantâneo**: Resposta visual em 0ms com haptics correspondentes.
- **Acessibilidade como pilar estrutural**: Conformidade estrita com WCAG 2.1 AA/AAA em todas as combinações de tema e iluminação ambiental.

### 1.2 O que é expressamente proibido (Barreira de Propriedade Intelectual)
Em conformidade com a revisão de licenciamento de [`docs/APPLE-RESOURCES-LICENSE-REVIEW.md`](file:///c:/HomeAssistant/docs/APPLE-RESOURCES-LICENSE-REVIEW.md):
- ❌ **Não copiar telas ou layouts proprietários**: O aplicativo Apple Home / Casa oficial possui organização proprietária de seções, ícones de cômodos e layouts que não devem ser clonados.
- ❌ **Não utilizar a biblioteca SF Symbols**: A licença da Apple veta o uso de SF Symbols em aplicações web e ambientes operacionais não-Apple. Utilizaremos vetores SVG autorais e Lucide Icons refinados.
- ❌ **Não utilizar fontes proprietárias da Apple**: As fontes San Francisco (SF Pro, SF Compact, SF Mono) e New York têm licença restrita a sistemas Apple nativos. Utilizaremos tipografia modular pública moderna (Inter / Geist / system-ui neutro de alta fidelidade).
- ❌ **Não utilizar marcas, logotipos ou termos protegidos**: Proibido usar termos como "HomeKit", "Apple TV", "Control Center" ou elementos de marketing.
- ❌ **Não imitar componentes skeuomórficos ou idênticos**: Nossos controles deslizantes, cards, interruptores e modais possuem geometria, proporções e física de interação autorais.

---

## 2. Pilares Conceituais da Experiência

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA DA CALMA                            │
│           (A casa só se comunica visualmente quando relevante)         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│   │     CLAREZA      │  │    HIERARQUIA    │  │   MODERAÇÃO DE   │    │
│   │ Tipografia nítida│  │ Escala de planos │  │       COR        │    │
│   │  Sem aberrações  │  │   e elevações    │  │ Acentos apenas   │    │
│   │   geométricas    │  │   estruturados   │  │   onde há ação   │    │
│   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘    │
│            │                     │                     │              │
│            └─────────────────────┼─────────────────────┘              │
│                                  ▼                                    │
│                     ┌──────────────────────────┐                      │
│                     │  PROFUNDIDADE FUNCIONAL  │                      │
│                     │  (Liquid Glass Autoral)  │                      │
│                     │ Superfícies transmitem   │                      │
│                     │  contexto e hierarquia   │                      │
│                     └──────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Clareza e Eliminação de Aberrações
Toda forma geométrica no painel deve respeitar a física dos materiais digitais. Não são permitidas geometrias conflitantes (como rotações de retângulos arredondados fora de eixo, distorções de escala não-proporcionais em SVGs com fontes esticadas ou bordas com espessuras flutuantes). Se algo é circular, ele permanece concentricamente circular em qualquer estado de rotação ou escala.

### 2.2 Preservação de Contexto e Navegação Previsível
O usuário que opera um painel de parede (touch) ou celular nunca deve se sentir perdido. Ao abrir um controle aprofundado (como iluminação ou climatização de um cômodo), o plano de fundo é desfocado suavemente sem desaparecer, preservando a noção de que o usuário ainda está dentro daquele cômodo ou da visão geral da casa. O gesto de fechar deve ser sempre simétrico ao gesto de abertura.

### 2.3 Controles Separados do Conteúdo
Diferenciação clara entre **leitura de telemetria** (ex: temperatura, potência consumida, previsão do tempo) e **atuadores de controle** (ex: botões de ligar/desligar, seletores de velocidade, dimmers). Um card de dispositivo nunca deve mascarar se o toque alternará o dispositivo ou abrirá opções avançadas; affordances visuais distintas devem delimitar onde o toque aciona e onde ele abre parâmetros.

### 2.4 Animações Breves e com Inércia Natural
Transições não devem ultrapassar **240ms** na maioria dos estados de interface, utilizando curvas cúbicas naturais (`cubic-bezier(0.16, 1, 0.3, 1)` ou decaimento exponencial). O painel responde com latência zero (0ms perceptível); a física visual acompanha o usuário sem criar atraso na operação física dos relés da casa.

---

## 3. Avaliação Crítica dos 25 Aspectos no Painel Atual

Abaixo está o diagnóstico cirúrgico de cada um dos 25 itens avaliados no painel existente, acompanhado da diretriz de evolução autoral:

| # | Aspecto | Diagnóstico Atual | Diretriz de Evolução (Design System Autoral) |
|:---|:---|:---|:---|
| **1** | **Hierarquia de conteúdo** | Cabeçalho disputa atenção com o grid de cômodos; widgets diários competem entre si sem uma âncora clara de leitura primária. | Estabelecer 3 níveis rígidos de leitura: (1) Panorama Imediato (Status global, segurança e clima), (2) Núcleo de Operação (Grid de cômodos categorizados), (3) Telemetria Secundária (Consumo histórico e mídia sob demanda). |
| **2** | **Navegação** | Híbrida: modais no centro, rotas `/comodo/[id]` isoladas e sheets com comportamentos ligeiramente assimétricos. | Unificar a navegação em 2 modos: **Nível 1 (Visão Geral da Casa)** e **Nível 2 (Inspecionar / Modal Sheet Transparente)**. O usuário nunca perde a raiz da casa; rotas de subpáginas operam como transições de superfície contínua. |
| **3** | **Sidebar, Tab Bar ou Menu Inferior** | Atualmente não há barra de navegação global estruturada; ações rápidas ficam espalhadas no topo do cabeçalho. | Para telas compactas (smartphones e tablets estreitos em retrato), introduzir uma **Floating Dock / Bottom Bar** autoral, translúcida, destacando: Início, Ambientes, Energia e Segurança. Em landscape de parede (1024x768), manter a visualização direta sem sobreposição inferior. |
| **4** | **Cards e widgets** | Cards de cômodos com pesos visuais díspares; subcards de tomadas com preenchimento sólido laranja chocante quando ativas. | Cards adotam acabamento **Subsurface Glass**: fundo neutro translúcido escuro, com acentos de luz confinada nas bordas e ícones iluminados, eliminando totalmente blocos de cor sólida opaca. |
| **5** | **Botões** | Divergência de dimensões táteis (alguns com 34–36px, outros com 44px); botões de fechar com estilos heterogêneos. | Todos os elementos interativos possuem alvo tátil mínimo rígido de **44px × 44px**; botões de controle possuem superfícies em pílula com micro-relevo interno e feedback tátil padronizado. |
| **6** | **Controles de dispositivos** | Dimmers e seletores de ventilador operam bem, mas possuem estilos visuais diferentes entre os modais de cômodo e páginas dedicadas. | Controles de valor contínuo (dimmers de luz, volume, velocidade do ventilador) utilizam **Cápsulas de Controle Háptico** táteis e deslizantes, com preenchimento interno gradativo e feedback numérico tabular (`tabular-nums`). |
| **7** | **Estados: ligado, desligado, offline e indisponível** | Dispositivos em repouso (ex: PS5) causavam falso alarme de cômodo "Offline"; cartões ligados usavam marrom escuro sobre laranja saturado. | **Matriz Quadripolar Canônica**: <br>• **Desligado**: Superfície de vidro neutra repousada, ícone translúcido cinza.<br>• **Ligado**: Brilho interno âmbar-dourado sutil, ícone aceso, texto em alto contraste.<br>• **Indisponível / Offline**: Ícone de desconexão sutil, opacidade 0.45, sem alarmes falsos no cômodo inteiro.<br>• **Alerta / Atenção**: Acento perimétrico pontual âmbar/vermelho apenas em violações de segurança reais. |
| **8** | **Alertas** | Baterias baixas e portas abertas misturadas no cabeçalho; toasts de erro eram silenciosos. | Alertas categorizados em 2 faixas: **Crítico (Perímetro / Intrusão)** — pílula pulsante vermelha com fixação; **Operacional (Bateria / Atualização)** — pílula discreta com agrupamento numérico sem urgência visual. |
| **9** | **Tipografia** | Mistura histórica de até 49 font-sizes inline com valores fracionários (11.5px); textos de gráficos esticados horizontalmente por SVG. | Escala modular tipográfica estrita com 7 tokens semânticos (`micro`, `caption`, `body-sm`, `body`, `h3`, `h2`, `display`), todos com `tabular-nums` em dígitos e proporção 1:1 renderizada em HTML nativo. |
| **10** | **Espaçamento** | Gaps arbitrários em várias seções (ex: 5px, 6px, 14px, 18px), quebrando o ritmo vertical. | Escala modular geométrica base 4/8pt: `4px (xxs)`, `8px (xs)`, `12px (sm)`, `16px (md)`, `24px (lg)`, `32px (xl)`, `48px (xxl)`. |
| **11** | **Raios de curvatura (Border Radius)** | Cantos variando entre 8px, 11px, 12px, 14px, 15px, 18px, 20px, 26px, 28px de forma desconexa. | Escala hierárquica autoral baseada no container: <br>• Pílulas / Badges: `9999px`<br>• Controles pequenos / Ícones: `14px`<br>• Cards e Widgets: `20px`<br>• Modais e Sheets: `28px` |
| **12** | **Bordas** | Bordas duras competindo com sombras; bordas claras brancas com 0.42 de opacidade em temas escuros causando clarões. | Técnica de **Borda Especular Fina (Hairline Specular Border)**: borda de 1px com gradiente sutil simulando reflexo de luz superior (`rgba(255, 255, 255, 0.16)` no topo decaindo para `rgba(255, 255, 255, 0.04)` na base). |
| **13** | **Sombras** | Histórico de dezenas de box-shadows ad-hoc com pretos pesados que sujam o vidro. | Sistema de **Sombras Suaves em 3 Níveis**: Sombras compostas com raio de dispersão amplo (24–36px) e baixa opacidade (0.25–0.35), associadas a oclusão ambiente natural. |
| **14** | **Transparência** | Transparências opacas demais ou escuras demais, dependendo do card. | Transparências calibradas entre 6% e 14% para repouso em fundo escuro, garantindo que o plano de fundo sirva de guia espacial sem poluir o contraste de leitura. |
| **15** | **Materiais** | Falta de distinção entre o plano de fundo da casa, a camada de cômodos e as janelas modais sobrepostas. | **Arquitetura de Materiais em 4 Camadas**: <br>1. *Canvas Base*: Fundo escuro profundo.<br>2. *Glass Surface*: Cards de cômodos e widgets.<br>3. *Sheet Layer*: Modais com desfoque de 32px e saturação 180%.<br>4. *Overlay / Floating Controls*: Toasts e controles deslizantes suspensos. |
| **16** | **Contraste** | Antigos estados ativos tinham proporção de contraste de 2.59:1 (reprovado WCAG AA). | Todas as superfícies e textos garantem contraste mínimo de **4.8:1** (WCAG AA para texto normal e AAA para cabeçalhos e números). |
| **17** | **Tema claro** | Cores de acento desbotavam ou viravam marrom sem vida (`#b45309`). | **Frosted Day Material**: Vidro fosco claro de alta densidade (`#eef2f8`), acentos em âmbar-mel vibrante de alto contraste (`#b45309` com contraste 4.82:1) e textos em ardósia profunda (`#0f172a`). |
| **18** | **Tema escuro** | Cor de destaque em algumas tomadas gerava saturação pesada laranja-escura. | **Midnight Slate Material**: Fundo em ardósia-noite profunda (`#0b0f19`), luz confinada âmbar-ouro suave (`#fbbf24`), texto branco límpido (`#f8fafc`). |
| **19** | **Retrato (Portrait)** | Seletor de cômodos espremia informações ou forçava scroll em cabeçalhos densos. | Cabeçalho se reorganiza em pilha vertical elegante; botões secundários se condensam em micro-ações; grid de cômodos passa para 2 colunas perfeitamente proporcionadas. |
| **20** | **Paisagem (Landscape / Wall Mount)** | 1024×768 quebrava a regra do 1º Viewport (Zero-Scroll), forçando o usuário a rolar o painel na parede. | Regra estrita de **Zero-Scroll no Viewport Primário**: proporções dinâmicas calculadas para 1024×768, 1280×800 e 1920×1080, permitindo visualização de todos os cômodos sem qualquer rolagem. |
| **21** | **Touch (Toque de Parede e Celular)** | Efeito "Sticky Hover" mantinha cards iluminados após o dedo sair da tela. | Remoção universal de `:hover` em telas táteis através de `@media (hover: none) or (pointer: coarse)`, acionando feedback exclusivamente no momento exato do `:active`. |
| **22** | **Mouse e Cursor** | Cursores padrão sem indicação de arrasto em sliders ou cards clicáveis. | Feedback sutil de elevação e translação suave de 2px no hover fino de desktop, com cursor pointer apropriado. |
| **23** | **Teclado e Acessibilidade Assistiva** | Foco invisível e vazamento de tab fora de modais abertos. | Anel de foco com duplo contorno (`outline-offset: 2px`) de alta visibilidade e Focus Trap imutável em qualquer diálogo ou modal. |
| **24** | **Modo Kiosk (Painel Fixo de Parede)** | Falta de descanso de tela orgânico após períodos de inatividade prolongados. | Transição suave para **Ambient Night Mode** (relógio flutuante de baixo consumo, status discreto da residência e despertar instantâneo por sensor ou toque). |
| **25** | **Redução de movimento (`prefers-reduced-motion`)** | Algumas animações de rotação e pulso continuavam ativas. | Respeito integral à preferência do sistema: desativação completa de vórtices, rotações contínuas e translações, mantendo apenas cross-fades imediatos de opacidade. |

---

## 4. O que Torna Esta Proposta Autoral e Distinta da Apple

1. **Foco Estrito em Automação e Telemetria**: Interfaces da Apple para consumidores priorizam entretenimento e aplicativos; nossa interface foi desenhada para a **vida física de uma casa**, priorizando leitura de sensores, consumo energético instantâneo, segurança perimétrica e controle de relés em frações de segundo.
2. **Identidade Cromática Autoral**: Em vez dos gradientes pastéis multicoloridos da Apple, nosso sistema adota uma paleta restrita e calorosa: **Ardósia Profunda, Vidro Líquido Neutro e Acento em Ouro Solar / Âmbar**, transmitindo a sensação de conforto residencial, aconchego e hospitalidade.
3. **Controle Imediato em Zero Cliques**: Diferente do app Home da Apple, que frequentemente exige abrir submenus para controlar dispositivos individuais dentro de um grupo, nosso dashboard oferece acesso direto aos dispositivos principais no primeiro plano visual.
4. **Respeito às Restrições Físicas do Hardware de Parede**: Nosso sistema é calibrado para responder perfeitamente em telas touch fixas com ângulos de visão amplos e resoluções industriais (1024×768 a 60Hz), sem depender de processadores de última geração para renderizar blur pesado.
