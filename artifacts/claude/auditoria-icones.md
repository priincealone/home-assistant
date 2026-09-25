# Auditoria de ícones do painel — 25/09/2026

Somente leitura. Nada em `dashboard-app/` foi alterado (território do Antigravity, §6 do CLAUDE.md).

> **Correção na mesma data, ao montar o plano** (`specs/features/icones-phosphor.md`):
> - **Clima**: vai com o próprio Phosphor, não com Meteocons. O pacote oficial é `@bybas/weather-icons` 2.0.0;
>   `@meteocons/svg` é prova de conceito. Além disso, os Meteocons trazem cores fixas.
> - **Marcas**: ficam fora do escopo. O Simple Icons retirou Prime Video, Disney+ e Globoplay.
> - **Next 16**: o Phosphor não está na lista padrão de `optimizePackageImports`; é preciso declará-lo.

## 1. Inventário — o que existe hoje

| Sistema | Onde | Uso real |
| :--- | :--- | :--- |
| Ícones legados (`LightIcon`, `SwitchIcon`, `FanIcon`, `RoomIcon`…) | `app/components/icons.tsx` (20 SVGs) | **Produção**: DeviceTile, RoomCard, RoomPopup, EnergyWidget, FanControlCard, câmeras, HeaderAlertPill |
| AeroGlyphs (`<Icon name state>`, 14 glifos + fallback) | `app/components/icons/` | **Só em `/icons-preview`**. Zero adoção em produção |
| SVG inline solto | 20 componentes, ~130 ocorrências (MediaHubModal 38, WeatherWidget 13, WallpaperGallery 9…) | Produção |
| `lucide-react` 1.42 | `package.json` | **Instalado e nunca importado** |
| Emoji como ícone | LightDimmerModal (💼 🌙 🕯️), VacuumWidget (⚙️ ⚡ 🚀), EnergyWidget (⚡), TodoList (✓) | Produção |
| Logotipos de marca desenhados à mão | `TvAppLogos.tsx` (35 cores fixas) | Produção |

São **cinco linguagens visuais** convivendo, e o sistema que se declara canônico é o único que não está na tela.

## 2. Medições

- **12 valores distintos de `strokeWidth`** (1.5, 1.6, 1.75, 1.8, 2, 2.2, 2.4, 2.5, 2.6, 3, 0.8…).
- **Traço renderizado** (strokeWidth × tamanho/24) vai de **1,04 px a 2,55 px** — 2,5× de variação sem regra.
  Os cômodos (36 px × 1.6) saem com 2,4 px; o cabeçalho (15 px × 2.2) com 1,38 px; o clima (32 px × 1.8) com 2,4 px.
  A hierarquia até existe, mas é acidente, não decisão.
- **Tamanhos**: 10, 11, 14, 15, 16, 18, 20, 22, 24, 28, 30, 32, 34, 36, 44 px — 15 tamanhos para um painel.
- **Consistente**: `viewBox 0 0 24 24` (157/159) e `strokeLinecap="round"` (100%). É a única regra que já vale e deve ser mantida.
- **Cores fixas em ícone**: AmbientNightMode (9), WeatherWidget (6), EnergyWidget (1) — `#93c5fd`, `#fde047`, `#60a5fa` fora dos tokens do DESIGN.md; não acompanham o tema claro.

## 3. Crítica semântica (vista no painel renderizado)

| Ícone | Problema |
| :--- | :--- |
| Circulação → seta `→` | Lê como "avançar". E o card já tem um botão chevron `>` ao lado: **duas setas no mesmo card**, uma decorativa e outra acionável |
| Área Gourmet → "grill" | Semicírculo sobre haste com pés: lê como **guarda-sol** ou água-viva |
| Copa → "cup" | Trapézio com alça sobre base: lê como **liquidificador / prensa francesa** |
| Sala → "sofa" | Retângulo sobre retângulo: lê como **banco ou bancada** |
| Banheiro → chuveiro | Gotas de 1 px somem a 3 m — falha no princípio de legibilidade à distância |
| `SwitchIcon` = raio | O mesmo raio significa "interruptor" no DeviceTile e "energia" no EnergyWidget e no cabeçalho. Um símbolo, dois sentidos |
| `MotionIcon` | Cabeça com arcos: lê como **Wi-Fi / transmissão** |
| Quarto e Quarto Luca | Mesmo ícone; aceitável, mas o quarto da criança podia ser distinguível |

## 4. Crítica de estado (o problema mais sério)

O PRODUCT.md exige: *"o estado (on/off) deve ser apreensível por cor, brilho e ícone sem leitura de texto"*.
Cada ícone legado resolve "ligado" de um jeito diferente:

- **Luz**: vira sólida + raios. O raio superior começa em `y=0` e é cortado pela borda do viewBox.
- **TV**: a tela inteira vira um retângulo sólido — mancha, não ícone.
- **Porta**: sobreposição a 25% de opacidade — invisível em vidro escuro.
- **Ventilador**: sólido com traço 0.4.
- **Tomada, sensor de gás, câmera**: não têm estado.

Não há regra. A escolha do pacote precisa resolver isso primeiro: **todo ícone precisa ter par contorno ↔ preenchido**
desenhado pelo mesmo autor, para que "ligar" seja sempre a mesma transformação.

## 5. Emoji como ícone

Renderizam diferente no tablet Android, no Windows e no iPhone; trazem cor própria que quebra a linguagem monocromática
do vidro; 🚀 para "Turbo" e 💼 para "Foco" são clichês. Devem sair todos.

## 6. AeroGlyphs — vale manter?

**A API sim, os desenhos não.** O wrapper é bom: nome semântico tipado, `state`, traço óptico por tamanho, contrato de
acessibilidade discriminado. Mas 14 glifos autorais não cobrem as ~90 necessidades do painel, e manter um conjunto
próprio exige desenhista. O `SceneGlyph` (estrela de 4 pontas + ponto) é o clichê de "IA" de 2025–26, não "cena".

Proposta: **manter a fachada `<Icon name state>` e trocar o motor por um pacote.**

## 7. Critérios derivados do projeto

1. **Par contorno/preenchido para todo ícone** — on/off sem texto (PRODUCT.md)
2. **Pesos múltiplos** — tablet a 3 m pede traço mais grosso que o celular na mão
3. **Cobertura do domínio**: aspirador robô, ventilador de teto, churrasqueira, cabide, máquina de lavar, câmera, sensor de movimento
4. **Terminação arredondada** — única regra já consistente, combina com o vidro líquido
5. **React com tree-shaking, compatível com RSC** (Next 16)
6. **Licença livre** (MIT/Apache/OFL)
7. **Estética sóbria e premium**, sem cara de Lovelace (que foi retirado de propósito)

## 8. Candidatos avaliados

| Pacote | Pares on/off | Pesos | Domínio casa | Estética p/ Liquid Glass | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phosphor** (MIT) | ✅ todos (regular ↔ fill) | 6: thin, light, regular, bold, fill, duotone | Bom (Couch, Bed, CookingPot, WashingMachine, Fan, Television, SecurityCamera, CoatHanger, Shower, Robot) | ✅ duotone = vidro tingido | **Recomendado** |
| Material Symbols (Apache) | ✅ eixo FILL 0→1 animável | Eixos wght, GRAD, opsz | Excelente (é o do Google Home) | Cara de Google Home; entrega por fonte | Alternativa técnica forte |
| Tabler (MIT) | ⚠️ ~1/6 tem filled | Traço ajustável | Excelente (5.900+) | Neutra, parecida com Lucide | Bom para cobertura, fraco em estado |
| Lucide (ISC) — já instalado | ❌ só contorno | 1 (traço ajustável) | Médio; sem aspirador robô nem cabide | "Cara de shadcn", genérica | Não resolve on/off |
| Fluent System Icons (MIT) | ✅ regular ↔ filled | 2 | Bom | Amigável demais, tom Windows | Segunda linha |
| Remix Icon (Apache) | ✅ line ↔ fill | 2 | Médio | Boa, mais geométrica | Segunda linha |
| Solar (CC BY 4.0) | ✅ linear ↔ bold | 6 incl. duotone | Médio | Muito bonita, exige atribuição | Segunda linha |
| MDI (Apache) — o do HA | ✅ parcial (`-outline`) | 1 | Total (7.000+) | Pesada, comunitária, **é o visual do Lovelace** | Só como reserva pontual |
| SF Symbols | — | — | — | Referência do DESIGN.md | ❌ **Licença proíbe uso fora de plataformas Apple** |

## 9. Recomendação

### Base: Phosphor (`@phosphor-icons/react`)

- **Estado mapeia direto em peso**: `idle → regular`, `active → fill`, `disabled → light` + opacidade,
  `alert → fill` + cor de perigo, `offline → regular` + selo `WifiSlash`. Uma regra, em um lugar só (o `IconBase`).
- **`duotone` para o estado ativo em vidro**: a camada de fundo a 20% de opacidade vira o "brilho interno" do Amber Aura
  sem sombra extra.
- **Escala de peso por tamanho** (grade de 256, traço regular = 16 u):
  - ≤ 16 px → `bold` (≈1,5 px renderizado; regular sairia com 1 px e some no escuro)
  - 20–24 px → `regular` (1,25–1,5 px)
  - ≥ 32 px (cômodos, clima) → `regular` (2–2,25 px) — já dá leitura a 3 m
- **Tamanhos**: fechar em 16 / 20 / 24 / 32 / 40. Hoje são 15.

### Clima: Meteocons (Bas Milius, MIT)

Conjunto dedicado de clima, com variantes em linha e animadas. Casa com o "Nocturnal Observatory" e com o modo
ambiente noturno. Respeitar `prefers-reduced-motion`. Substitui os 13 SVGs do WeatherWidget e os 5 do AmbientNightMode,
e elimina as cores fixas.

### Marcas: Simple Icons (CC0)

Netflix, YouTube, Apple Music, Spotify etc. com traçado oficial, em vez de aproximações desenhadas à mão.

### Lacunas: desenhar na grade do Phosphor

Churrasqueira e aspirador robô provavelmente precisarão de glifo próprio (ou `mdi:grill` / `mdi:robot-vacuum` redesenhados
na grade de 256 com traço 16). Aqui o AeroGlyphs volta a ter papel: registrar as poucas exceções.

### Remover

`lucide-react` (dependência morta), todos os emoji-ícone, as cores fixas em SVG.

## 10. Mapa sugerido (Phosphor)

| Conceito | Hoje | Sugestão |
| :--- | :--- | :--- |
| Sala de Estar | banco | `Couch` |
| Cozinha | garfo+faca | `CookingPot` (garfo/faca é "restaurante") |
| Copa | liquidificador | `Coffee` ou `ForkKnife` |
| Lavanderia | máquina | `WashingMachine` |
| Área Gourmet | guarda-sol | glifo próprio (churrasqueira) ou `Fire` |
| Quarto / Quarto Luca | cama / cama | `Bed` / `Baby` ou `Bed` + distintivo |
| Banheiro | chuveiro fino | `Shower` ou `Bathtub` |
| Circulação | seta | `Footprints` ou `Path` |
| Closet | cabide | `CoatHanger` |
| Luz | lâmpada | `Lightbulb` (regular ↔ fill) |
| Interruptor | raio | `ToggleRight` ou `Power` — liberar o raio para energia |
| Energia | raio | `Lightning` |
| Tomada | rosto | `Plug` |
| Movimento | Wi-Fi | `PersonSimpleWalk` |
| Porta | retângulo | `Door` ↔ `DoorOpen` (estado pela forma, não por opacidade) |
| TV | retângulo sólido | `Television` |
| Câmera | filmadora | `SecurityCamera` |
| Aspirador | — | `Robot` ou glifo próprio |
| Cena Cinema / Chegar / Dormir / Gamer | variados | `FilmSlate` / `HouseLine` / `Moon` / `GameController` |
| Bateria | desenho próprio | `BatteryFull/High/Medium/Low/Warning` |
| Offline | — | `WifiSlash` |

Nomes a conferir no catálogo antes de implementar — o Phosphor renomeia e acrescenta ícones entre versões.

## 11. Ordem de migração sugerida

1. Ligar a fachada `<Icon>` ao Phosphor e definir a regra de peso/estado no `IconBase`
2. Cômodos e dispositivos (maior visibilidade e onde o on/off importa)
3. Emoji e cores fixas
4. Clima (Meteocons)
5. SVGs inline do MediaHubModal e demais modais
6. Apagar `icons.tsx` legado e `lucide-react`

Cada passo: `npx tsc --noEmit` + conferência visual no tema escuro e claro, em 375 px e no tablet.
