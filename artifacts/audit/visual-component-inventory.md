# Auditoria visual · Fases 1 e 2 — contexto, arquitetura e inventário

Data: 16/09/2026 · Escopo: `dashboard-app` · **Somente leitura — nenhum arquivo de código foi alterado,
nenhum dispositivo acionado, nenhum commit feito.**

---

# FASE 1 — CONTEXTO E ARQUITETURA

## 1.1. Documentos lidos

| Documento | Situação |
| :--- | :--- |
| `CLAUDE.md` | ✅ lido |
| `docs/ARCHITECTURE.md` | ✅ lido |
| `docs/SYSTEM-MAP.md` | ✅ lido |
| **`docs/UI-DESIGN-SYSTEM.md`** | ❌ **não existe** |
| `docs/SECURITY.md` | ✅ lido |
| `docs/AUTOMATION-POLICY.md` | ✅ lido |
| `docs/UI-RESPONSIVE.md` | ✅ lido (não estava na lista; é a documentação de breakpoints) |
| `planning/ROADMAP.md`, `BACKLOG.md` | ✅ lidos |
| `specs/features/responsive-adaptive-dashboard.md` | ✅ lido |
| `specs/features/B-02-correcao-entidades-contrato.md` | ✅ lido |
| `dashboard-app/DESIGN.md` | ✅ lido — **é o design system canônico real** ("Nocturnal Observatory") |

⚠️ O documento de design system pedido não existe sob esse nome. A especificação canônica vive em
`dashboard-app/DESIGN.md`, com tokens declarados em *frontmatter* YAML.

## 1.2. Mapa da stack

| Camada | O que é |
| :--- | :--- |
| **Frontend** | Next.js 16.3.3 (App Router), React 19.2.0 |
| **Backend / borda** | Next.js Route Handlers — 10 rotas em `app/api/*` |
| **Backend real** | Home Assistant 2026.9 (fora deste repositório) |
| **Estilos** | Tailwind v4 + PostCSS + **`app/globals.css` com 10.404 linhas** |
| **Design tokens** | `:root` em `globals.css` — ver §2.2 |
| **Tema escuro** | Padrão (`#0d1117`) |
| **Tema claro** | Existe (`--bg-color: #e2e8f4`), via `ThemeContext` |
| **Estado** | `useState`/`useRef` locais + polling de 5 s. Sem Redux, Zustand ou Context de dados |
| **Dados reais** | HA por REST; Music Assistant por WebSocket **servidor→servidor** |
| **Dados simulados** | ❌ Nenhum *mock*. `.cache/estados-snapshot.json` existe mas é de 07/09 e **não é usado em runtime** |
| **API REST** | `/state`, `/toggle`, `/control`, `/scene`, `/vacuum`, `/tv`, `/todo`, `/energy`, `/weather`, `/mass` |
| **WebSocket** | Só servidor → Music Assistant, sob demanda, timeout 12 s, sem reconexão |
| **Permissões** | ❌ **Nenhuma.** Sem autenticação nas rotas (ver `docs/SECURITY.md` A-01) |
| **Modo kiosk** | CSS `.quick-action-btn--kiosk` + `lib/wakeLock.ts`. Não há integração com Fully Kiosk |
| **Responsividade** | 30 blocos `@media`, 5 regras `@container`, 3 containers |
| **Testes** | ❌ **Nenhum.** Zero arquivos, zero framework, zero dependências |

## 1.3. Mapa de telas

| Tela | Arquivo | Conteúdo |
| :--- | :--- | :--- |
| Painel | `app/page.tsx` (666 linhas) | Cabeçalho, alertas, cenas rápidas, widgets diários, grade de 10 cômodos |
| Cômodo | `app/comodo/[id]/page.tsx` | Subpágina dedicada por cômodo |
| Repouso | `app/standby/page.tsx` | Modo ocioso noturno |
| Casca | `app/layout.tsx` | Tema, fontes, metadados PWA |

**Navegação**: rotas do App Router + modais sobrepostos. **Não há menu, barra lateral ou abas** — a
navegação é por toque no card e por retorno. Não existe *breadcrumb* nem histórico visível.

## 1.4. O que não existe neste painel

Registrado porque a lista pedida presume que existam:

| Pedido | Situação |
| :--- | :--- |
| Formulários | Só um campo, o de adicionar item em `TodoListWidget` |
| Tabelas | Nenhuma |
| Toasts / notificações | **Nenhum sistema.** Erro não é comunicado ao usuário — ver F-06 |
| Menus | Nenhum |
| Biblioteca de UI | `components/ui/{button,card}.tsx` existem e **nunca são importados** |

---

# FASE 2 — INVENTÁRIO VISUAL

## 2.1. Componentes e estados tratados

24 arquivos em `app/components/`. A tabela mostra **quantas referências** cada estado tem no código —
zero significa que o estado não é tratado.

| Componente | Linhas | Função | load | erro | vazio | offline | indisp. | disab. | focus |
| :--- | ---: | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `MediaHubModal` | **1156** | Central de mídia | 7 | 0 | 1 | 0 | 0 | 4 | 0 |
| `EnergyWidget` | **839** | Energia e histórico | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| `VacuumWidget` | **622** | Aspirador | 1 | 2 | 0 | 1 | 4 | 2 | 0 |
| `RoomPopup` | 418 | Modal do cômodo | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| `AmbientNightMode` | 377 | Modo noturno | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `RoomCard` | 375 | Card de cômodo | 0 | 0 | 13 | 0 | 0 | 0 | 0 |
| `LightDimmerModal` | 375 | Dimmer | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `TvAppLogos` | 335 | Logos de apps | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `WeatherForecastModal` | 306 | Previsão | 6 | 0 | 1 | 0 | 0 | 0 | 0 |
| `HeaderQuickActions` | 303 | Ações do cabeçalho | 3 | 0 | 0 | **5** | 0 | 0 | 0 |
| `icons` | 297 | Biblioteca de ícones | — | — | — | — | — | — | — |
| `DeviceTile` | 283 | Tile de dispositivo | 0 | 0 | 0 | 0 | 5 | 1 | 0 |
| `TodoListWidget` | 281 | Lista de compras | 6 | 0 | 7 | 0 | 0 | 1 | **2** |
| `BatteryAlertsBar` | 260 | Alerta de bateria | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| `WeatherWidget` | 244 | Clima | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `TvRemoteWidget` | 220 | TV e PS5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `SmartTruncateText` | 180 | Truncamento | — | — | — | — | — | — | — |
| `SecurityAlertsBar` | 172 | Alerta de portas | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `FanControlCard` | 147 | Ventilador | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| `QuickScenesPanel` | 124 | Cenas rápidas | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `HealthWidget` | 62 | Saúde | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `Clock` | 43 | Relógio | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `DeviceButton` | 35 | Botão de dispositivo | 2 | 0 | 0 | 0 | 0 | 1 | 0 |
| `MusicAssistantAudioSink` | 32 | Saída de áudio | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Leitura da tabela

**Estado de erro: 2 referências em 24 componentes.** Só o `VacuumWidget` trata erro. As rotas devolvem
`{ erro }` com status 502, e **nenhum widget mostra isso ao usuário** — a falha vira silêncio ou dado
velho na tela.

**Estado de foco: 2 referências, todas no `TodoListWidget`.** Em 10.404 linhas de CSS há **1**
`focus-visible`. Navegação por teclado é praticamente invisível.

**Offline concentrado no cabeçalho.** As 5 referências estão no `HeaderQuickActions`. Os widgets não
sabem que a casa está fora de alcance — continuam exibindo o último valor como se fosse atual.

**Indisponível ignorado por 20 dos 24.** Só `DeviceTile`, `VacuumWidget` e `BatteryAlertsBar` tratam
`unavailable`. `RoomCard` — o componente mais repetido da tela, 10 instâncias — não trata.

---

## 2.2. Design tokens: declarado × praticado

### Dois sistemas de tokens convivendo no mesmo `:root`

| Sistema | Origem | Uso real |
| :--- | :--- | :--- |
| **Nocturnal Observatory** | Projeto (`--bg-color`, `--on-accent`, `--font-*`) | ✅ em uso |
| **shadcn/ui em `oklch`** | *Scaffold* (`--background`, `--primary`, `--card`, `--ring`, `--sidebar-*`, `--chart-1..5`) | ❌ **32 tokens mortos** |

⚠️ **`--background: oklch(1 0 0)` é branco puro** e `--foreground` é quase preto — o oposto de um painel
noturno. Convivem no `:root` com o tema escuro real. Hoje são inofensivos porque **nenhum componente
importa `components/ui/`**, mas qualquer componente shadcn adicionado no futuro nasce com a paleta
errada.

### Dispersão medida

| Dimensão | Canônico (`DESIGN.md`) | Real em `globals.css` | Divergência |
| :--- | ---: | ---: | :--- |
| Cores | 12 | **48 hex distintos** + **304 rgba distintos** | 4× a paleta |
| Raios | 12 | **36 valores distintos** | 3× |
| Sombras | não definido | **124 sombras distintas** em 157 declarações | quase uma por uso |
| Tipografia | 6 escalas | **49 tamanhos distintos** | 8× |

**Tipografia por token: 43 declarações. Hardcoded: 194.** Os tokens existem e são ignorados em **82%**
dos casos.

**Dois idiomas para a mesma intenção**: `border-radius: 9999px` (14×) e `999px` (9×) significam a mesma
coisa e coexistem. Idem `50%` (40×) para círculos.

---

## 2.3. Componentes que deveriam ser um só

### D-01 · `SecurityAlertsBar` × `BatteryAlertsBar` — **duplicação confirmada**

Mesma estrutura, dois arquivos (172 e 260 linhas), com famílias de classe espelhadas:
`security-micro-pill` / `battery-micro-pill`, `security-micro-dot` / `battery-micro-dot`,
`security-micro-label` / `battery-micro-label`.

**O próprio CSS já os trata como um só** — as regras aparecem agrupadas no mesmo seletor
(`globals.css:4211`). É o mesmo componente com dois nomes, e a duplicação já custou: as duas pílulas
foram medidas com **36px de alvo de toque**, abaixo do mínimo, e precisarão ser corrigidas duas vezes.

### D-02 · `DeviceButton` (35 linhas) × `DeviceTile` (283 linhas)

Ambos representam um dispositivo acionável. O menor trata `loading` e `disabled`; o maior trata
`unavailable` e `disabled`, mas **não** `loading`. Variantes do mesmo conceito, com conjuntos de estado
diferentes e nenhuma documentação de quando usar cada um.

### D-03 · Modais sem base comum

`MediaHubModal` (1156), `LightDimmerModal` (375), `WeatherForecastModal` (306), `RoomPopup` (418).
Todos abrem sobreposição com cabeçalho, fecho e corpo rolável, e **cada um implementa isso do zero**.
Só o `RoomPopup` usa as classes `popup-*`; o `SecurityAlertsBar` também as usa para o próprio modal,
sem ser um popup de cômodo — sinal de que a base existe e foi adotada pela metade.

### D-04 · Widgets de clima

`WeatherWidget` (244) e `WeatherForecastModal` (306) repetem a apresentação de condição e temperatura,
com formatação própria em cada um.

### D-05 · Componentes gigantes

`MediaHubModal` com **1156 linhas** e `EnergyWidget` com **839** concentram apresentação, formatação e
chamadas de rede num arquivo só. São os dois candidatos naturais a quebrar em partes reutilizáveis.

---

## 2.4. Incoerências visuais com evidência

### F-01 · A intenção de 44px é anulada pela ordem do arquivo — **Alto**

```
globals.css:4212  @media (max-width: 640px) { .security-micro-pill { min-height: 44px } }
globals.css:7201  .security-micro-pill { min-height: 36px }   ← vence: mesma especificidade, vem depois
```

Alguém já tentou corrigir o alvo de toque **e a correção não teve efeito**, silenciosamente. Medição ao
vivo a 375px: **36px**. O mesmo vale para `battery-micro-pill`.

### F-02 · Valor tipográfico fracionário

`.security-micro-pill` usa `font-size: 11.5px` — não pertence a nenhuma escala do `DESIGN.md` e é o
único valor fracionário encontrado.

### F-03 · 124 sombras distintas

Não há escala de elevação. Cada card resolveu a própria profundidade, o que impede coerência de
hierarquia visual entre componentes irmãos.

### F-04 · Ícones sem inventário

`icons.tsx` (297 linhas) convive com `lucide-react` nas dependências. **Não foi verificado** quais
componentes usam qual fonte de ícone — ver §3.

### F-05 · Cor fora da paleta com uso expressivo

`#34d399` (11×) e `#fca5a5` (14×) não constam do `DESIGN.md`; são variações claras de esmeralda e
vermelho introduzidas ad hoc.

### F-06 · Nenhum canal de erro para o usuário — **Alto**

Não existe sistema de toast ou notificação. As rotas devolvem `{ erro }` e apenas um componente em 24
trata erro. Em um painel que comanda a casa, **um comando que falha silenciosamente é indistinguível
de um comando que funcionou** — o usuário só descobre olhando a lâmpada.

---

## 3. Não testado nesta fase

| Item | Motivo |
| :--- | :--- |
| Estados visuais renderizados (hover, pressionado, desabilitado, loading, erro) | Exigiria abrir modais e acionar controles; **abrir modal a partir do card arrisca acionar dispositivo físico**, proibido nesta etapa |
| Tema claro renderizado | Alternar tema é interação de UI; não foi exercitado |
| Inventário de ícones por componente | Não levantado — fica para a Fase 3 |
| Contraste real de cada par cor/fundo | Exige medição na tela renderizada |
| Modo kiosk e wake lock | Exige tablet real ou emulação de `Fully Kiosk` |
| Formulário da lista de compras | Exige digitação e envio, que grava dado real |

---

## 4. Síntese

O painel tem **um design system bem definido no papel e pouco aplicado no código**: 4× mais cores, 3×
mais raios, 8× mais tamanhos de fonte que o canônico, e 82% da tipografia escrita à mão em vez de usar
os tokens que existem.

A ausência mais grave não é estética: **não há canal de erro para o usuário** e **20 de 24 componentes
ignoram o estado indisponível**. Num painel que liga e desliga coisas de verdade, silêncio diante da
falha é pior que mensagem feia.

O defeito mais instrutivo é o **F-01**: alguém já tentou corrigir o alvo de toque e a correção foi
anulada pela ordem do arquivo, sem erro nenhum. Em 10.404 linhas de CSS sem análise estática, é o tipo
de coisa que só aparece medindo.

**Próximas fases**: 3 (testar estados renderizados), 4 (comparar com o `DESIGN.md` item a item), 5
(documentar evidência visual), 6 (priorizar) e 7 (propor implementação).
