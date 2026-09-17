# Inconsistências Tipográficas & Hierarquia Visual (typography-inconsistencies.md)

**Documento**: `artifacts/visual-audit/typography-inconsistencies.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído (Fase 4)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Referência Canônica**: [`dashboard-app/DESIGN.md`](file:///c:/HomeAssistant/dashboard-app/DESIGN.md) (*Nocturnal Observatory*)

---

## 1. Visão Geral da Tipografia e Legibilidade Residencial

Em um painel de automação residencial operando em display de parede e smartphones, a tipografia desempenha dois papéis vitais:
1. **Legibilidade Rápida à Distância (Glanceability)**: O usuário deve identificar a hora, temperatura, alertas e lâmpadas acesas a passos de distância (2 a 3 metros) sem esforço de acomodação visual.
2. **Estabilidade Numérica em Tempo Real**: Métricas oscilantes (clocks, Watts, temperatura, baterias e percentuais) devem empregar rigorosamente **numerais tabulares (`tabular-nums`)** para erradicar o jitter (tremor mecânico de layout) provocado por caracteres proporcionais de larguras desiguais (ex: o dígito `1` sendo mais estreito que o `8`).

---

## 2. Métricas de Dispersão Tipográfica no Código

* **Total de Tamanhos de Fonte Distintos no CSS**: **49 valores de `font-size` únicos** identificados ao longo de `globals.css` e estilos de componentes.
* **Valores Fracionários Arbitrários**: Identificados tamanhos como `11.5px` (em `.security-micro-pill`), `13.5px` e `14.5px` resultantes de ajustes pontuais empíricos.
* **Tamanhos Arbitrários Fora da Escala Modular**: Presença de declarações de `15px`, `17px`, `19px` e `22px` em vez dos tokens da escala canônica (`11px`, `13px`, `14px`, `16px`, `20px`, `28px`).
* **Variação de Pesos (`font-weight`)**: Convivência não padronizada de 5 pesos distintos (`300`, `400`, `500`, `600`, `700`) em elementos com a mesma função semântica (ex: rótulos de subcards alternando entre 400 e 600).
* **Ausência de Tabular Numerals**: Identificada em 4 widgets de telemetria secundária (cronômetro da TV, contadores de itens do `TodoListWidget` e percentual de vida útil de consumíveis do aspirador).

---

## 3. Escala Canônica do Design System vs. Realidade do Código

| Nível Semântico | Token no DESIGN.md | Tamanho Canônico | Peso Canônico | Ocorrências Desviantes Encontradas no Código |
| :--- | :--- | :---: | :---: | :--- |
| **Display Clock** | `display` | `clamp(1.85rem, 2.8vw, 2.35rem)` | 700 | `globals.css` varia entre 2.2rem, 36px e 40px em diferentes viewports |
| **Título de Seção / H1** | `h1` | `clamp(1.45rem, 2.0vw, 1.85rem)` | 700 | Presença de `font-size: 22px`, `font-size: 26px` e `font-weight: 600` |
| **Título de Card / H2** | `h2` | `clamp(1.15rem, 1.5vw, 1.35rem)` | 600 | Títulos de cômodos variando entre 15px, 16px e 17px com tracking nulo |
| **Corpo Primário / Body**| `body` | `0.875rem` (14px) | 400 | Rótulos de dispositivos usando 13.5px, 14px e 15px com pesos 500/600 |
| **Corpo Secundário / Body-SM**| `body-sm` | `0.8125rem` (13px) | 600 | Botões de cena e abas variando entre 12px e 13px |
| **Micro-Tags / Caption** | `caption` | `0.6875rem` (11px) | 500 | Pílulas de segurança usando 11.5px e chips de bateria usando 12px |

---

## 4. Tabela Estruturada de Inconsistências Tipográficas

| ID | Tela / Superfície | Componente | Padrão Observado | Padrão Esperado | Exemplo Equivalente | Impacto | Sugestão de Correção | Prioridade |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TYP-01** | Cabeçalho (Home) | Pílula de Segurança (`.security-micro-pill`) | Tamanho fracionário `font-size: 11.5px` definido em `globals.css:4211`. | Token canônico `--font-caption: 0.75rem` (`12px`) com `font-weight: 500`. | O chip de bateria vizinho utiliza `font-size: 12px`. | Renderização imperfeita de rasterização de subpixel em telas de baixa densidade (DPI). | Substituir por `font-size: var(--font-caption, 12px)`. | **Alta** |
| **TYP-02** | Widgets Secundários | Cronômetros e Telemetria sem Tabular | Cronômetro de tempo ligado da TV (`MediaHubModal`) e consumíveis do aspirador (`VacuumWidget`) não usam `tabular-nums`. | Numerais monoespaçados obrigatórios em todas as métricas em tempo real (`font-variant-numeric: tabular-nums`). | O relógio principal (`Clock.tsx`) e o mostrador de Watts do `EnergyWidget` usam tabular-nums. | Jitter constante: o texto "treme" horizontalmente a cada segundo conforme os dígitos mudam de largura. | Adicionar classe `tabular-nums` em todos os elementos contendo contadores ou tempos. | **Alta** |
| **TYP-03** | Standby OLED | Relógio e Data Noturna | A data na tela de descanso exibia capitalização em Title Case ("Sexta-Feira, 11 De Setembro") com dois pontos (`:`) com espessura pesada. | Formatação gramatical padrão em português ("Sexta-feira, 11 de setembro") e tipografia refinada ultra-leve (`font-weight: 200` ou `300`). | A data do cabeçalho da Home é apresentada corretamente. | Sensação de tela inacabada e poluição visual excessiva durante a madrugada no quarto. | Aplicar `toLocaleDateString('pt-BR')` formatado e ajustar o peso tipográfico dos dois pontos. | **Média** |
| **TYP-04** | Subcards de Cômodo | Rótulos de Dispositivos (`DeviceTile`) | Variação de pesos: lâmpadas com `font-weight: 600` e tomadas com `font-weight: 400` em telas equivalentes. | Padronização com `font-weight: 500` para títulos de atuadores e `400` para status secundário. | Os cards de cômodo mantêm `font-weight: 600` unificado nos títulos. | Hierarquia visual confusa sugerindo que alguns interruptores são mais importantes que outros. | Unificar a classe `.device-tile-title` com `font-weight: 500`. | **Média** |
| **TYP-05** | Micro-Tags e Badges | Textos em Caixa Alta (Uppercase) | Várias pílulas em maiúsculas (ex: "AO VIVO", "STANDBY", "OFFLINE") não declaram `letter-spacing` positivo. | Textos em caixa alta exigem obrigatoriamente tracking positivo (`letter-spacing: 0.04em` a `0.06em`) para evitar aglomeração de caracteres. | O `DESIGN.md` prescreve tracking de `0.04em` para captions. | Caracteres maiúsculos colados dificultam a leitura rápida em painéis a 2 metros de distância. | Aplicar `letter-spacing: 0.05em; text-transform: uppercase;` na classe utilitária de badges. | **Média** |
| **TYP-06** | Todos os Modais | Título dos Modais | Títulos variando entre `font-size: 18px` (`RoomPopup`), `20px` (`MediaHubModal`) e `22px` (`WeatherForecastModal`). | Título de modal unificado em **18px** (`1.125rem`), `font-weight: 600` e line-height `1.3`. | `RoomPopup` possui o tamanho mais harmonioso em relação ao botão fechar. | Sensação de descontinuidade estrutural ao navegar entre diferentes widgets da barra panorâmica. | Padronizar a classe `.modal-header-title` em todos os diálogos flutuantes. | **Média** |
| **TYP-07** | Grade de Cômodos | Subtítulo e Contadores em Parede | Subtítulos dos cômodos (ex: "2 lâmpadas acesas") utilizam tamanho de 11px com cor cinza atenuada. | Mínimo de **12px** (`0.75rem`) com contraste reforçado (`#cbd5e1`) para garantir leitura sem óculos a 3 metros no painel de parede. | O contador `X/Y` da pílula âmbar possui excelente contraste e tamanho legível. | O morador precisa se aproximar fisicamente do tablet para conseguir ler o subtítulo explicativo. | Elevar o subtítulo do cômodo para 12px com peso `500`. | **Baixa** |

---

## 5. Recomendações de Consolidação Tipográfica

1. **Expurgo dos 49 Tamanhos em CSS**: Consolidar todo o arquivo `globals.css` em apenas 6 variáveis tipográficas modulares:
   - `--text-display`: `clamp(1.85rem, 2.8vw, 2.35rem)`
   - `--text-h1`: `clamp(1.45rem, 2.0vw, 1.85rem)`
   - `--text-h2`: `clamp(1.15rem, 1.5vw, 1.35rem)`
   - `--text-body`: `0.875rem` (14px)
   - `--text-body-sm`: `0.8125rem` (13px)
   - `--text-caption`: `0.75rem` (12px)
2. **Obrigatoriedade do Utilitário `tabular-nums`**: Aplicar a regra global `font-variant-numeric: tabular-nums` a qualquer classe com prefixo `.counter-`, `.clock-`, `.timer-` ou `.telemetry-`.
3. **Harmonização de Tracking**: Vincular `letter-spacing: 0.05em` a todas as classes que utilizam `text-transform: uppercase`.
