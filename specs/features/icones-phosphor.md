# Ícones do painel sobre Phosphor

**Data**: 25/09/2026 · **Status**: **implementado em 25/09/2026** (commits `7e7ce45`, `781248d`, `d938129`, `ee44606` no git do `dashboard-app/`). Decisões do André: Quarto Luca = `Baby`; churrasqueira descartada (Área Gourmet = `ForkKnife`); aspirador redesenhado; execução pelo Claude Code como exceção ao §6 do CLAUDE.md
**Substitui**: `specs/features/own-icon-library.md` (AeroGlyphs com desenhos próprios)
**Origem**: `artifacts/claude/auditoria-icones.md`
**Território**: `dashboard-app/` — frontend (§6 do CLAUDE.md). Executa o Antigravity, ou o Claude Code
com pedido explícito do André por fase.

---

## 1. Problema

O painel usa cinco linguagens de ícone ao mesmo tempo:

- o `icons.tsx` legado;
- o AeroGlyphs, que só aparece em `/icons-preview`;
- ~130 SVGs soltos em 20 componentes;
- emoji;
- logotipos desenhados à mão.

Consequências:

- **Traço**: 12 valores de `strokeWidth`. Renderizado, vai de 1,04 px a 2,55 px.
- **Tamanho**: 15 tamanhos diferentes.
- **Estado**: "ligado" sem regra. A luz ganha raios, a TV vira bloco sólido, a porta ganha 25% de opacidade, a tomada não muda.
- **Sentido**: vários ícones ambíguos (lista na §6).

O PRODUCT.md exige que o estado se leia pelo ícone, sem texto. Hoje isso não acontece.

## 2. Decisão

| Camada | Escolha | Versão verificada (25/09) | Licença |
| :--- | :--- | :--- | :--- |
| Base | `@phosphor-icons/react` | 2.1.10 | MIT |
| Fachada | `<Icon name state>` do AeroGlyphs — **a API fica, os desenhos saem** | — | — |
| Exceções | Glifos próprios na grade 256 do Phosphor, via `IconBase` do pacote | — | — |
| Clima | Phosphor (`Sun`, `Moon`, `CloudSun`, `CloudMoon`, `Cloud`, `CloudRain`, `CloudLightning`, `CloudFog`, `CloudSnow`, `Wind`) | — | — |
| Marcas | **Fora do escopo** — `TvAppLogos.tsx` fica como está | — | — |

**Por que o clima não usa Meteocons**, ao contrário do que a auditoria sugeria: o pacote oficial é
`@bybas/weather-icons`, na versão 2.0.0. O que se chama `@meteocons/svg` (0.1.0) é prova de conceito. Além disso,
os Meteocons trazem paleta própria, o que reintroduz cor fixa. O Phosphor cobre as 10 condições do HA na mesma
linguagem. Meteocons animado pode voltar como experimento isolado no modo noturno (§8, fase 7).

**Por que as marcas ficam de fora**: o Simple Icons (16.32, CC0) cobre Netflix, YouTube, Apple Music, Apple TV,
Spotify, Max, Twitch e Crunchyroll. Porém **retirou Prime Video, Disney+ e Globoplay** por pedido das marcas.
Trocar só parte deixaria a grade de apps com duas linguagens. Logotipo de marca é exceção legítima à regra
monocromática.

## 3. Regras do sistema

### 3.1 Peso por estado

Uma função só, em `app/components/icons/peso.ts`:

| `state` | Peso Phosphor | Cor |
| :--- | :--- | :--- |
| `idle` | `regular` (ou `bold`, conforme a §3.2) | `currentColor` |
| `active` (dispositivo ligado) | `fill` | token de estado ativo |
| `active` em **cômodo** (algo aceso lá dentro) | `duotone` | token de estado ativo |
| `disabled` | `light` | `currentColor` + opacidade .45 |
| `alert` | `fill` | `--danger` |
| `offline` | `regular` esmaecido a 55% + selo `WifiSlash` no canto (a partir de 20 px) | `--text-dim` no selo |

Dispositivo usa `fill`; cômodo usa `duotone`. Isso separa "a luz está acesa" de "tem algo aceso neste cômodo",
sem texto.

`unavailable` e `unknown` **nunca** usam o peso de desligado (§12 do CLAUDE.md). Mapeiam para `offline`.

### 3.2 Tamanho e peso óptico

O Phosphor desenha numa grade de 256. O traço `regular` mede 16 unidades e o `bold` mede 24.

| Token | px | Peso em repouso | Traço renderizado | Uso |
| :--- | :--- | :--- | :--- | :--- |
| `xs` | 12 | `bold` | 1,1 px | Selos, chips de umidade/bateria, check |
| `sm` | 16 | `bold` | 1,5 px | Botões do cabeçalho, setas de abrir, fechar |
| `md` | 20 | `regular` | 1,25 px | Cenas, tiles de dispositivo, toasts |
| `lg` | 24 | `regular` | 1,5 px | Ícones de título de modal, cruzeta do controle |
| `xl` | 32 | `regular` | 2,0 px | Clima |
| `2xl` | 40 | `regular` | 2,5 px | Cômodos |
| `3xl` | 48 | `regular` | 3,0 px | Herói do aspirador (anel de 88 px) |

Os 15 tamanhos atuais viram 7. Os cômodos passam de 36 para 40 px: mantêm o traço de 2,4 px de hoje, que já é
legível a 3 m.

### 3.3 Proibições

- SVG inline em componente. Todo ícone passa por `<Icon>`.
- Emoji como ícone.
- Cor hexadecimal em ícone — só tokens.
- CSS que dependa da anatomia interna do SVG (ex.: `circle[stroke="#fbbf24"]`). O Phosphor desenha por
  **preenchimento**, não por traço, então seletores de `stroke` e `stroke-width` deixam de ter efeito.

## 4. Arquitetura

```
app/components/icons/
├── Icon.tsx          fachada <Icon name state size> — API atual preservada
├── peso.ts           state + tamanho → weight Phosphor (§3.1, §3.2)
├── registry.ts       nome semântico → componente Phosphor ou glifo próprio
├── types.ts          SemanticIconName ampliado para o vocabulário da §5
├── dominio.ts        iconeDoComodo(id), iconeDoDispositivo(tipo), iconeDoClima(condicao)
└── glyphs/           só exceções, desenhadas na grade 256 com os pesos regular e fill
    ├── Churrasqueira.tsx
    └── AspiradorRobo.tsx
```

- **Somente `registry.ts` importa `@phosphor-icons/react`.** Os componentes nunca importam o pacote direto — trocar
  de biblioteca no futuro custa um arquivo.
- Os consumidores são todos `"use client"`: importar de `@phosphor-icons/react`. Se algum componente de servidor
  precisar de ícone, usar `@phosphor-icons/react/ssr`.
- ~~`next.config.mjs` com `optimizePackageImports`~~ — **descartado na execução (25/09)**. A documentação do
  Next 16.3.3 (`node_modules/next/dist/docs/.../local-development.md`) diz que o Turbopack analisa os imports
  sozinho e dispensa a configuração. O painel usa Turbopack no dev e no build.
- Os nomes usam o sufixo `*Icon` (`CouchIcon`): os nomes sem sufixo estão marcados como obsoletos no pacote.
- Glifos próprios usam o `IconBase` exportado pelo Phosphor, com um `Map` de pesos. Assim respondem a `weight` como
  qualquer outro ícone.
- O contrato de acessibilidade do AeroGlyphs (`decorative` / `ariaLabel` obrigatório) é mantido.

## 5. Vocabulário e mapeamento

Nomes conferidos na exportação do `@phosphor-icons/react@2.1.10` em 25/09. Ausentes: `Grill`, `Candle`, `Microwave`.

### Cômodos (`lib/rooms.ts`)

| id | Hoje | Phosphor |
| :--- | :--- | :--- |
| `sala_de_estar` | banco | `Couch` |
| `cozinha` | garfo e faca | `CookingPot` |
| `copa` | "liquidificador" | `Coffee` |
| `lavanderia` | máquina | `WashingMachine` |
| `area_gourmet` | "guarda-sol" | **glifo próprio `Churrasqueira`** (reserva: `Fire`) |
| `quarto` | cama | `Bed` |
| `quarto_luca` | cama | `Baby` — **decisão do André** (alternativa: `Bed`) |
| `banheiro` | chuveiro fino | `Shower` |
| `circulacao` | seta → | `Footprints` |
| `closet` | cabide | `CoatHanger` |
| fallback | casa | `House` |

### Dispositivos e sensores

| Conceito | Hoje | Phosphor |
| :--- | :--- | :--- |
| Luz | lâmpada com raios | `Lightbulb` |
| Interruptor | raio (conflita com energia) | `ToggleRight` |
| Tomada | "rosto" | `Plug` |
| Energia | raio | `Lightning` |
| Ventilador | desenho próprio | `Fan` (gira com a classe atual `fan-blades-svg`) |
| TV | retângulo sólido | `Television` |
| Movimento | "Wi-Fi" | `PersonSimpleWalk` |
| Porta | retângulo / **casa** (HeaderAlertPill) | `Door` fechada ↔ `DoorOpen` aberta |
| Tranca | cadeado próprio | `Lock` ↔ `LockOpen` |
| Câmera | filmadora | `SecurityCamera` |
| Aspirador | "mira" | **glifo próprio `AspiradorRobo`** (reserva: `Robot`) |
| Bateria | desenho com largura calculada | `BatteryFull` / `High` / `Medium` / `Low` / `Warning` por faixa |
| Celular (alerta pessoal) | retângulo | `DeviceMobile` |
| Segurança | escudo | `ShieldCheck` / `ShieldWarning` |
| Gás / alarme | — | `Siren` |

### Cenas

| Cena | Phosphor |
| :--- | :--- |
| Cinema | `FilmSlate` |
| Chegar | `HouseLine` |
| Dormir | `Moon` |
| Gamer | `GameController` |

### Predefinições de luz e aspirador (hoje emoji)

| Onde | Emoji | Phosphor |
| :--- | :--- | :--- |
| Luz — Foco | 💼 | `Briefcase` |
| Luz — Noturna | 🌙 | `MoonStars` |
| Luz — Relaxar & Jantar | 🕯️ | `Wine` |
| Aspirador — Padrão | ⚙️ | `Gauge` |
| Aspirador — Forte | ⚡ | `Wind` |
| Aspirador — Turbo | 🚀 | `Tornado` |
| Energia — chip | ⚡ | `Lightning` |
| Lista — vazia | ✓ | `Check` |

### Interface e navegação

| Conceito | Hoje | Phosphor |
| :--- | :--- | :--- |
| Abrir widget | seta `→` em 7 widgets, chevron no RoomCard | `CaretRight` **em todos** |
| Voltar | seta ← | `ArrowLeft` |
| Anterior / próximo cômodo | chevrons | `CaretLeft` / `CaretRight` |
| Expandir detalhe | chevron ↓ | `CaretDown` |
| Fechar | X desenhado 4 vezes | `X` — **só via `ModalCloseButton`** |
| Ligar/desligar | power | `Power` |
| Ajustar | sliders | `SlidersHorizontal` |
| Tela cheia / sair | cantos | `CornersOut` / `CornersIn` |
| Papel de parede | imagem | `Image` |
| Tema claro / escuro / auto | sol / eclipse / eclipse tracejado | `Sun` / `Moon` / `CircleHalf` |
| Standby OLED | lua | `MoonStars` — hoje repete a lua da cena Dormir |
| Upload / apagar / restaurar | desenhos próprios | `UploadSimple` / `Trash` / `ArrowCounterClockwise` |
| Adicionar / buscar | + / lupa | `Plus` / `MagnifyingGlass` |
| Lista de compras | checklist | `ListChecks` |
| Inverter rotação | setas ↕ | `ArrowsDownUp` |
| Toast erro / aviso / sucesso | círculo, triângulo, check | `WarningCircle` / `Warning` / `CheckCircle` |
| Login | cadeado | `Lock` |
| Mídia: tocar, pausar, parar, voltar, avançar | preenchidos próprios | `Play` / `Pause` / `Stop` / `Rewind` / `FastForward` (peso `fill`) |
| Volume − / + | − / + | `SpeakerLow` / `SpeakerHigh` |
| Controle: voltar, início, menu | desenhos | `ArrowUUpLeft` / `House` / `List` |
| Cruzeta | 4 chevrons | `CaretUp` / `CaretDown` / `CaretLeft` / `CaretRight` |
| Música tocando | notas | `MusicNotes` |
| Umidade / vento (chips) | gota-blob / **traço "—"** | `Drop` / `Wind` |

**Todos os nomes Phosphor desta seção foram conferidos** na exportação da 2.1.10 em 25/09. Só `Churrasqueira` e
`AspiradorRobo` são próprios. Se a versão mudar, um nome errado aparece no `tsc` como erro de importação, e não
como ícone vazio.

## 6. Correções de sentido incluídas

1. **Circulação**: `Footprints`. Acaba o conflito com o chevron do card, que deixava duas setas no mesmo card.
2. **Área Gourmet**: churrasqueira de verdade.
3. **Raio** passa a significar só energia. Interruptor ganha `ToggleRight`.
4. **Porta** deixa de ser uma casa no HeaderAlertPill.
5. **Aspirador** deixa de ser uma mira, que hoje também serve de ícone de "alvo".
6. **Standby** deixa de repetir a lua da cena Dormir.
7. **Vento** deixa de ser um traço solto.
8. **"Abrir widget"** fica igual nos 8 widgets.

## 7. Fora do escopo

- Logotipos de marca (`TvAppLogos.tsx`)
- Gráficos (`energy-chart-svg`, sparkline): não são ícones
- Animações novas. As existentes (ventilador, aspirador, pulso do sol) são **preservadas ou adaptadas**, não criadas
- Alteração de tokens de cor além dos necessários para eliminar hex fixo

## 8. Plano de aplicação

Cada fase termina com as verificações da §9 e um commit no git do `dashboard-app/`. Cada fase pode ser revertida
sozinha.

### Fase 0 — Decisões do André (antes de tudo)
- [ ] Ícone do Quarto Luca: `Baby` ou `Bed`
- [ ] Autorização para editar `dashboard-app/`, ou delegação ao Antigravity
- [ ] Glifos próprios (Churrasqueira, Aspirador): desenhar agora ou usar a reserva (`Fire`, `Robot`) na primeira passada

### Fase 1 — Fundação (nada muda na tela)
- `npm i @phosphor-icons/react@2.1.10` (versão fixa)
- Reescrever `registry.ts`, `types.ts` e `Icon.tsx`; criar `peso.ts` e `dominio.ts`
- Confirmar todos os nomes da §5 com `tsc`
- Atualizar `/icons-preview` para mostrar o vocabulário inteiro × 5 estados × 6 tamanhos, nos dois temas
- **Pronto quando**: o preview mostra os ~90 ícones, `tsc` sai com 0 e o build passa

### Fase 2 — Cômodos e dispositivos (maior impacto visual)
- `RoomCard`, `RoomPopup`, `DeviceTile`, `FanControlCard`, `comodo/[id]/page.tsx`
- Estado pelas regras da §3.1: dispositivo `fill`, cômodo `duotone`, `unavailable` → offline
- Conferir que a animação do ventilador continua concêntrica e que `prefers-reduced-motion` a desliga
- **Pronto quando**: com a casa como está, cada cômodo mostra o ícone da §5, e acender uma luz muda o ícone
  sem depender da cor (conferir em escala de cinza). O teste de estado **lê o histórico ou usa um estado já
  existente** — não se acende a casa para demonstrar (§11 do CLAUDE.md).

### Fase 3 — Emoji e cores fixas
- `LightDimmerModal`, `VacuumWidget`, `EnergyWidget`, `TodoListWidget`
- Remover os hex de ícones do `AmbientNightMode` e do `WeatherWidget`, criando tokens de clima se preciso
- Remover o seletor `circle[stroke="#fbbf24"]` e reimplementar o pulso do sol no wrapper do ícone
- **Pronto quando**: `grep` de emoji em `.tsx` sai vazio e `grep` de `stroke="#`/`fill="#` só encontra `TvAppLogos`

### Fase 4 — Clima
- `WeatherWidget`, `AmbientNightMode` e `WeatherForecastModal` via `iconeDoClima(condicao)`
- Cobrir as 15 condições do HA (`clear-night`, `cloudy`, `exceptional`, `fog`, `hail`, `lightning`,
  `lightning-rainy`, `partlycloudy`, `pouring`, `rainy`, `snowy`, `snowy-rainy`, `sunny`, `windy`,
  `windy-variant`), mais um fallback explícito para condição desconhecida — **não** um sol
- **Pronto quando**: o preview mostra as 15 condições e o fallback

### Fase 5 — Cabeçalho, cenas, alertas, toasts
- `HeaderQuickActions`, `QuickScenesPanel`, `HeaderAlertPill`, `HealthPill`, `ToastContainer`,
  `CameraGlanceWidget`, `TvRemoteWidget`, `login/page.tsx`
- Unificar "abrir widget" em `CaretRight`

### Fase 6 — Modais grandes
- `MediaHubModal` (38 SVGs), `WallpaperGalleryModal`, `SurveillanceHubModal`, `VacuumWidget` (modal)
- Unificar o X de fechar no `ModalCloseButton`

### Fase 7 — Limpeza
- Apagar o `icons.tsx` legado e os glifos AeroGlyphs antigos
- `npm uninstall lucide-react`
- Atualizar o `DESIGN.md` com a seção de ícones (§3) e marcar `docs/OWN-ICON-SYSTEM.md` como substituído
- *Opcional, isolado*: experimentar Meteocons animado **só** no `AmbientNightMode`, atrás de um interruptor,
  e decidir vendo no tablet à noite

## 9. Verificação por fase

| Verificação | Como |
| :--- | :--- |
| Tipos | `npx tsc --noEmit` → 0 |
| Build | `npm run build` → sem erro (nunca rodado neste projeto; a fase 1 estabelece a linha de base **antes** de mexer) |
| Visual | Screenshot do painel e do `/icons-preview`: tema escuro e claro, 375 px e tablet em paisagem |
| Estado sem cor | Screenshot em escala de cinza: ligado ≠ desligado ≠ offline |
| Resto de SVG solto | `grep -c "<svg" app/components/*.tsx` cai a cada fase; ao fim, só gráficos e `TvAppLogos` |
| Peso do bundle | Tamanho de `.next/static/chunks`. **Teto revisto na execução**: ≤ 60 kB gz (ver nota abaixo) |

**Nota sobre o peso (medido em 25/09).** Base: 391 kB gz. Depois da fase 1: 443 kB gz (+52 kB), num único pedaço
compartilhado, baixado uma vez e guardado em cache. O teto original de 15 kB foi estimado sem saber que:

- um registro por nome impede o empacotador de descartar ícones que a tela não usa;
- cada ícone do Phosphor carrega os 6 pesos (~0,48 kB gz por ícone × 109).

A alternativa — cada componente importar o próprio ícone — economizaria pouco, porque o painel carrega quase todo
o vocabulário na tela inicial, e perderia o ponto único de troca. Num painel de rede local, servido como PWA,
52 kB em cache é aceitável. A remoção dos SVGs soltos nas fases seguintes devolve parte disso.
| Movimento | `prefers-reduced-motion` emulado: nada gira |

## 10. Riscos

| Risco | Mitigação |
| :--- | :--- |
| CSS existente estiliza `stroke` dos ícones (ex.: `.room-icon-svg`) e para de funcionar | Na fase 2, revisar os seletores `room-icon-svg`, `fan-blades-svg`, `vacuum-icon` e `scene-card-icon-box` do `globals.css` (13.748 linhas) |
| Phosphor `fill` visualmente pesado a 40 px no cômodo | Por isso o cômodo usa `duotone`, e não `fill` |
| Nome de ícone muda em versão futura do Phosphor | Versão fixada; só o `registry.ts` importa o pacote |
| Antigravity reintroduz SVG inline | Regra no `DESIGN.md` + checagem por `grep` (candidata a teste quando a suíte existir) |
| Tablet antigo sem suporte a algum recurso | O Phosphor é SVG puro, sem fonte nem JS de runtime além do React |

## 11. Resultado da execução (25/09/2026)

| Verificação | Resultado |
| :--- | :--- |
| `tsc --noEmit` | 0 |
| `npm run build` | passa (linha de base: **falhava** por arquivo ausente em `node_modules/next` — ver abaixo) |
| Emoji em `.tsx` | 0 |
| Hex em `<svg>` | 1 (gráfico de energia, fora do escopo) |
| `<svg>` restantes | 15: gráficos de energia (2), `TvAppLogos` (12), `HealthPill` (1, arquivo de outra frente) |
| Bundle JS cliente | 391 → 444 kB gz (+53 kB) |
| Painel real, escuro e claro | conferido: 10 cômodos, popup do Quarto, Central de Mídia |
| Escala de cinza | `ligado` ≠ `repouso`; `offline` só se distinguia por opacidade → **selo adicionado** |

**Descobertas na execução**
- O build do painel nunca tinha sido rodado (CLAUDE.md §4 marcava TODO) e **falhava**: faltavam 9 arquivos dentro
  de `node_modules/next` (entre eles `react-server-dom-turbopack-client.node.production.js`). Repostos a partir de
  `npm pack next@16.3.3`, byte a byte iguais aos vizinhos. Provável causa: a sincronização do Google Drive sobre
  `node_modules`. **Pode voltar a acontecer** — se `npm run build` falhar com "Module not found" dentro de
  `next/dist/compiled`, reinstalar o Next.
- Os nomes sem sufixo do Phosphor (`Couch`) estão obsoletos; o registro usa `CouchIcon`.
- `optimizePackageImports` não é necessário no Turbopack (ver §4).
- A checagem de estado sem cor **reprovou** a primeira versão do `offline`; foi ela que levou ao selo.
- Screenshots de rolagem profunda na `/icons-preview` (5.000 px, ~860 SVGs) falham de forma intermitente no painel
  de navegador embutido; o DOM está íntegro. Verificação do selo feita no painel real.

**Não verificado**: tablet e iPad reais; Safari; o modo `ambient` (standby) de noite; rolagem e desempenho no
tablet de parede (o dev-tools não mede o custo de ~30 SVGs duotone com `backdrop-filter`).

**Pendências**
- `globals.css` mantém regras mortas (`.weather-compact-icon-wrap circle[stroke="#fbbf24"]`, `.room-icon-svg` com
  `stroke`). Inofensivas; o arquivo tinha edição em andamento de outra frente e não foi tocado.
- `HealthPill.tsx` (não commitado, de outra frente) ainda tem 1 chevron solto.
- `TvAppLogos`: Prime Video, Disney+ e Globoplay não existem no Simple Icons; ficam como estão.
