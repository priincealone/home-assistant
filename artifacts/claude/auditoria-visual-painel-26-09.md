# Auditoria visual e funcional do painel — 26/09/2026

Escopo: `dashboard-app/`, todas as páginas (`/`, 10 cômodos, `/standby`, `/login`, `/icons-preview`), em celular
(390×844), tablet vertical (768×1024), tablet horizontal / parede (1024×768). Auditoria: **não corrige nada**.

**Como foi medido.** Detector do impeccable sobre `app/`; carga real de cada rota em iframe do tamanho do aparelho
(overflow, alvos de toque, texto miúdo, rótulos, desfoques ativos, animações); contraste calculado contra o fundo
efetivo; tempos e bytes da home no navegador; tamanho do build de produção existente; leitura do código
(`globals.css`, `layout.tsx`, `lib/`, scripts de inicialização).

**Limites.** Emulação de viewport, não aparelho físico. O gesto de rolagem sintético da ferramenta não move a página
(o `scrollTo` e o evento de roda funcionam, então é limite da ferramenta e não defeito). **Gestos de toque
(arrastar controle deslizante, pressão longa, pinça) não foram exercitados.** Não medi FPS em tablet real.

## Nota

| # | Dimensão | Nota | Achado principal |
|---|---|---|---|
| 1 | Acessibilidade | 3 | Contraste excelente; só 9 regras `:focus-visible`; zoom bloqueado |
| 2 | Desempenho | 2 | Servidor roda em **modo dev**; 27 desfoques ao mesmo tempo; camada permanente no app inteiro |
| 3 | Responsivo | 3 | Zero estouro de largura em 3 tamanhos; alvos de 36–38 px |
| 4 | Tema | 3 | Tokens usados, mas 153 regras de tema claro mortas e ~1.750 cores literais |
| 5 | Integridade | 3 | Sistema coerente; 5 achados reais do detector e 481 avisos de deriva de cor |
| **Total** | | **14/20** | **Bom: atacar desempenho e alvos de toque** |

## Veredito de integridade

**Passa.** É um sistema com identidade própria (noturno, vidro fosco, âmbar para "aceso"), com contrato de dados
único (`lib/rooms.ts`) e tokens (`var(--` 621 usos). Nada de gabarito genérico. A deriva está em cores literais
fora do `DESIGN.md` (481 avisos), não na estrutura.

## Achados por gravidade

**P1 — Servidor de produção roda em modo de desenvolvimento** — ✅ CORRIGIDO em 26/09 (ver `ESTADO_DASHBOARD.md`)
- Local: `iniciar_servidor_background.ps1:52` (`npm run dev`); confirmado por processo `next dev -p 3002`.
- Medido na home: **21 scripts, 6,6 MB de JS descomprimido**, 340 KB de CSS, 57 requisições, selo "N" e aviso
  "Compiling…" visíveis na tela. O build de produção de 25/09 tem 1,5 MB de JS (**444 KB comprimido**) e CSS de
  264 KB (**45 KB comprimido**) para o app inteiro.
- Impacto: carga inicial e recarga lentas em tablet e celular por Wi-Fi, mais CPU e memória, além de recompilação
  sob demanda e HMR num aparelho fixo 24/7. O selo "N" cobre o canto inferior esquerdo.
- Correção: o watchdog passar a `next build` + `next start -p 3002` (ou o modo `standalone`, já configurado em
  `next.config.mjs`). Reconstruir a cada mudança de código. É configuração de inicialização: exige aprovação.
- Comando: `$impeccable optimize`.

**P1 — Camada de composição permanente no app inteiro** — ✅ CORRIGIDO em 26/09
- Local: `globals.css:187`, `.dashboard { will-change: transform, filter, opacity }`.
- Impacto: força uma camada de GPU do tamanho da tela inteira o tempo todo, mais memória de vídeo; em Safari de
  iPad antigo pode causar tremulação e texto borrado. A dica deveria valer só durante a transição de standby.
- Correção: aplicar `will-change` apenas enquanto a transição roda (classe temporária) ou remover.
- Comando: `$impeccable optimize`.

**P1 — 27 elementos com desfoque de fundo visíveis ao mesmo tempo na home** — ✅ CORRIGIDO em 26/09 (27 → 8–9)
- Medido: 27 em celular, 28 em tablet (40 regras `backdrop-filter` no CSS). É o custo mais caro do vidro fosco.
- Impacto: quedas de quadro na rolagem em celulares médios e tablets, aquecimento e bateria.
- Correção: manter desfoque só no cabeçalho, nos modais e no cartão hero; nos cartões de cômodo e resumo trocar
  por fundo translúcido sólido (mesma aparência a 4–18% de opacidade sobre o plano de fundo já desfocado).
- Comando: `$impeccable optimize`.

**P2 — Alvos de toque abaixo de 44 px nas páginas de cômodo** — ✅ CORRIGIDO em 26/09 (também nos modais do aspirador, mídia e galeria)
- Local: botão "Casa" (`.back-btn`, 86×38), "Acender luzes do cômodo" (`.room-subpage-master-btn`, 161×36),
  "Ajustar" (`.device-tile__tune-btn`, 38×38); em `/icons-preview`, 8 botões de 36 px.
- Impacto: erro de toque no celular e no tablet de parede, onde se toca a passos de distância.
- Correção: `min-height`/`min-width` de 44 px (a página tem 31 regras `min-height:44`; faltam estes três).
- Comando: `$impeccable adapt`.

**P2 — Texto de 8,5 a 10 px na home** — ✅ CORRIGIDO em 26/09 (token `--texto-minimo: 11px`, 75 regras)
- Medido: 9 elementos: `AO VIVO` 8,5 px (`.camera-live-text`), `MÍDIA`, `STANDBY`, `CFTV`, `Pronto`, `ativas`,
  `Tudo comprado` em 10 px. Nos cômodos, a bateria e rótulos em 10–10,5 px.
- Impacto: ilegível "à distância", que é princípio do produto; no tablet de parede é o texto que mais importa.
- Correção: piso de 11–12 px para rótulos e badges; 12 px para o que precisa ser lido de longe.
- Comando: `$impeccable typeset`.

**P2 — Foco de teclado quase sem indicador** — ❌ ACHADO INCORRETO (retificado em 26/09: há regra global `:focus-visible` de 3 px com `!important`; só faltavam `li`/`div` clicáveis sem foco, corrigidos)
- Local: `globals.css`: 9 regras `:focus-visible` contra 10 `outline: none/0`; 37 `<div onClick>` (18 com `tabIndex`).
- Impacto: navegação por teclado/leitor de tela sem saber onde está o foco. Menos grave em tela de toque.
- Correção: um estilo de foco único por token para botões e cartões; trocar `div onClick` por `button`.
- Comando: `$impeccable harden`.

**P2 — Zoom desabilitado** — ⏸ MANTIDO: decisão do André de 22/09 (`artifacts/audit/travamento-zoom-mobile.md`)
- Local: `layout.tsx:44–45` (`maximumScale: 1`, `userScalable: false`) e bloqueio de gestos no script de arranque.
- Impacto: decisão consciente para o tablet de parede, mas impede ampliar texto no celular (WCAG 1.4.4).
- Correção: manter só para o modo tablet/parede (por `navigator.maxTouchPoints` e tamanho), liberar no celular.
- Comando: `$impeccable adapt`.

**P2 — Vários temporizadores independentes de rede** — ✅ CORRIGIDO em 26/09 (pausa com aba oculta; `/api/state` 31,6 → 5,8 KB)
- Local: 15 `setInterval` (`page.tsx:128`, `comodo/[id]/page.tsx:59`, `MediaHubModal.tsx:374` a 3 s,
  `TvRemoteWidget.tsx:71`, `TodoListWidget.tsx:62`, `EnergyWidget.tsx:124`, `RoomActivity.tsx:51`, entre outros);
  23 `fetch` de API durante a vida da home; `/api/state` devolve **31,6 KB a cada 5 s** sem `Content-Encoding`.
- Impacto: bateria do celular e rede local; cada aba aberta multiplica o custo.
- Correção: pausar todos com a aba oculta (só a home faz), compartilhar um único laço de leitura e comprimir a
  resposta de `/api/state`.
- Comando: `$impeccable optimize`.

**P2 — CSS de 368 KB / 15 mil linhas em um arquivo, com 153 regras de tema claro mortas** — ✅ tema claro removido em 26/09 (118 regras, 363 → 341 KB); a divisão do arquivo em partes segue pendente
- Local: `app/globals.css`; 201 `!important`; 219 `box-shadow`; 53 `@keyframes`.
- Impacto: mais análise de estilo por página, difícil de manter e de auditar; o tema claro foi retirado em 25/09.
- Correção: apagar as regras `data-theme="light"`; dividir por área (cabeçalho, cômodos, modais, câmera).
- Comando: `$impeccable distill` e `$impeccable extract`.

**P3 — Achados do detector (todos em `globals.css`)** — ✅ CORRIGIDO em 26/09
- `cubic-bezier(0.34, 1.56, 0.64, 1)` (efeito de "pulo") em 5261, 5461, 5864 e 6883: trocar por curva expo-out.
- `transition: width` em 9105: anima layout; usar `transform: scaleX`.
- Comando: `$impeccable animate`.

**P3 — Cor e raio fora do sistema** — ✅ CORRIGIDO em 26/09
- 481 avisos: cores literais fora do `DESIGN.md` (azuis `#60a5fa`, `#3b82f6`, `#0369a1`; vermelhos `#b91c1c`) e raios
  22 px e 9 px. Muitas são de regras do tema claro morto (ver acima). Promover ao `DESIGN.md` o que é
  intencional e trocar o resto por token.
- Comando: `$impeccable extract`.

**P3 — Fonte declarada e não usada** — ✅ CORRIGIDO em 26/09
- Local: `layout.tsx:9` (`Geist`). Renderiza `Inter` em 432 elementos; `Geist` só aparece no selo do modo dev.
- Correção: remover a importação.
- Comando: `$impeccable optimize`.

**P3 — Texto cortado na barra de cenas em tablet horizontal** — ✅ CORRIGIDO em 26/09
- "Luzes de acolhime…" (cenário "Chegar") em 1024×768. Encurtar o texto ou permitir duas linhas.
- Comando: `$impeccable layout`.

**P3 — Erro recorrente no console** — ✅ DIAGNOSTICADO em 26/09: limite do navegador embutido, não do painel
- "An unknown error occurred when fetching the script" (9 vezes numa sessão). `/sw.js` responde 200; a causa
  **não foi determinada** (**não é** do modo dev: continua em produção; o service worker não registra no navegador embutido,
  `getRegistrations()` vazio). Provável limite desse navegador; conferir em tablet real.
- Comando: `$impeccable harden`.

## Padrões sistêmicos

- **Vidro fosco em tudo** custa mais do que entrega em telas pequenas; o efeito precisa de orçamento.
- **Desempenho decidido pelo modo de execução**, não pelo código: o maior ganho é trocar `dev` por produção.
- **Piso tipográfico inexistente**: 8,5–10 px se repete em widgets compactos.
- **Herança do tema claro**: código morto que polui o CSS e o detector.

## O que está bom

- **Nenhuma página estoura a largura** em 390, 768 e 1024 px (0 px de rolagem horizontal em 14 rotas × 3 tamanhos).
- **Contraste**: 0 falhas reais no texto da home; a única "falha" é o separador decorativo do relógio.
- Todos os elementos interativos da home e dos cômodos têm rótulo; 1 `h1` por página; `lang="pt-BR"`.
- `prefers-reduced-motion` preserva a comunicação de estado em vez de cortar tudo; segurança de área (`safe-area`,
  25 usos) e `100dvh` (12 usos) tratados; toque × mouse tratado com `data-toque`.
- Estado offline, travas otimistas e cômodos derivados do contrato único.
- Sem estouro de DOM: home com 476 nós, cômodos com 120–274.

## Ordem recomendada

1. **P1 `$impeccable optimize`**: passar o servidor para produção; tirar `will-change` do `.dashboard`; orçar o
   desfoque (27 → ~6).
2. **P2 `$impeccable adapt`**: alvos de 44 px; zoom liberado só no celular.
3. **P2 `$impeccable typeset`**: piso de 11–12 px para rótulos.
4. **P2 `$impeccable harden`**: foco de teclado, `div onClick` → `button`, erro do service worker.
5. **P2 `$impeccable distill`**: remover CSS do tema claro e o que sobrar.
6. **P3 `$impeccable animate`**, `extract`, `layout`.
7. **`$impeccable polish`** ao final, e nova auditoria para comparar a nota.
