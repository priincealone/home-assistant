# Critique — dashboard-app / app/page.tsx (painel de parede)

Method: dual-agent (Assessment A design review + Assessment B detector/browser), agentes isolados.
Nenhum dispositivo físico foi acionado.

## Design specificity: autoral embaixo, intercambiável em cima

Autoral: a grade de cômodos é ancorada na casa física (badge conta pontos elétricos reais),
travas otimistas com TTL de 5 s dimensionadas ao tempo de comutação do relé, hold de 800 ms
calibrado à consequência. Intercambiável: a faixa de 6 widgets de telemetria e os 4 cards de
cena são a composição padrão de qualquer dashboard de IoT. O DESIGN.md promete "Nocturnal
Observatory" e nada na tela é observatório.

Deriva do sistema, medida em produção: DESIGN.md declara 6 degraus tipográficos e 12 raios;
a tela executa 15 tamanhos (30 → 7.5px) e 18 raios (999px convivendo com 9999px). O relógio
mestre mede 28.16px, abaixo do mínimo do próprio token display (29.6px).

## Heurísticas de Nielsen

| # | Heurística | Nota | Achado-chave |
|---|---|---|---|
| 1 | Visibilidade do estado | 3 | Otimista em 0 ms com rollback real; mas a pílula de queda do HA é 11px a 50% de opacidade |
| 2 | Linguagem do mundo real | 3 | Vaza `digital_tv`/`DIGITAL_TV`; concordância invertida ("0 de 1 luz acesas") |
| 3 | Controle e liberdade | 2 | Zero ocorrências de "Desfazer" no app; `Dormir` apaga a casa com um toque |
| 4 | Consistência | 2 | `Apagar (9)` exige hold 800 ms, `Dormir` (mais destrutivo) exige 1 tap |
| 5 | Prevenção de erro | 2 | Card 238×212; toggle só 66×66 (13% da área). 87% abrem modal |
| 6 | Reconhecer vs lembrar | 2 | 4 botões do header só-ícone; consequência da cena só no `title` (hover inexistente na parede) |
| 7 | Flexibilidade | 3 | Camadas reais cena → casa → cômodo → dispositivo |
| 8 | Estética e minimalismo | 2 | 41 alvos no 1º viewport; a grade só começa em y=366 de 800 |
| 9 | Diagnosticar e recuperar | 3 | Toast + `role="alert"` + shake do card + haptic; falta "Tentar de novo" |
| 10 | Ajuda | 2 | A dica que desambigua o card é o texto menos legível da tela (12px, 4.96:1) |

**Total: 24/40** — banda média-baixa.

## Audit técnico

| # | Dimensão | Nota | Achado-chave |
|---|---|---|---|
| 1 | Acessibilidade | 2 | 10 reprovações de contraste (7 escuro + 3 claro); `.section-meta` 3,13 estático |
| 2 | Desempenho | 3 | 75 fps, p95 13,5 ms, 0 long tasks; 1 `<img>` sem lazy, `transition: width` |
| 3 | Tematização | 2 | No tema claro, aceso vs apagado = 1,11:1 de luminância; 31 tokens oklch mortos |
| 4 | Responsivo | 2 | Sobreposição real a 1024×768; 11 elementos truncados a 1280 |
| 5 | Integridade de implementação | 2 | `backdrop-filter` servido só com `-webkit-` → zero elementos borrados no Chrome; build quebrada |
| **Total** | | **11/20** | **Aceitável — trabalho significativo pela frente** |

## O que funciona

1. Modelo de estado otimista de padrão de produto: trava com TTL, coalescência de 140 ms,
   fila serializada, reversão com snapshot, re-fetch de confirmação em 1,2 s.
2. Modal com higiene completa: `role="dialog"`, foco vai ao fechar, Esc fecha, foco volta ao
   card de origem (verificado ao vivo), alvos internos em 44×44.
3. Tema claro é tradução semântica, não inversão: card aceso `#fef3c7` sobre `#78350f` = 8,15:1.

## Problemas prioritários

**P0 — `backdrop-filter` não existe em tempo de execução.** 38 declarações prefixadas contra 6
sem prefixo; o Chrome não suporta `-webkit-backdrop-filter` (`CSS.supports` = false) e o build
colapsou o par mantendo só a prefixada. Todo o vidro do painel está desligado em produção.

**P0 — `npx next build` quebrado.** `node_modules` danificado (8 pastas vazias, resíduo do Google
Drive): `Module not found: ./cjs/react-server-dom-turbopack-client.node.production.js`. Não há
como publicar. Correção: `npm ci`.

**P1 — A 2 m o painel não é legível.** `.room-name` 16px a 1280 cai para 13px a 768×1024;
badge 11px. A 2 m isso subtende ~3,3′ e ~2,2′ — abaixo do limiar de leitura confortável.
A tenet de "leitura a 3 metros" não está cumprida.

**P1 — O card tem duas ações de naturezas diferentes e a errada ocupa 87% da área.** A 2 m,
20px separam "olhar" de "mudar o estado físico da casa".

**P1 — Dez reprovações de contraste.** Escuro: `.section-meta` 3,13 (estático — `opacity: 0.72`
sobre `--text-dim` que já tem alfa 0,5), `.room-ambient-chip-label` 3,99,
`.vacuum-state-badge.is-idle` 4,22, `.camera-channel-btn` 4,37, `.clock-colon` 1,82.
Claro: `.clock-colon` 1,56, `.section-meta` 3,34, `.todo-compact-badge.is-pending` 4,34.

**P1 — Colisão de layout a 1024×768**, que é exatamente o tablet de parede 4:3:
`.energy-badge-pill` sobrepõe o `.energy-compact-open-btn` em 44×18px; idem no clima.

**P1 — `Dormir` é a ação mais destrutiva e a menos protegida.** Tap único, sem hold, sem
confirmação, sem undo — e apaga o próprio painel, então a evidência de sucesso é idêntica à de
falha.

**P2 — Em retrato (768×1024) a tarefa está toda abaixo da dobra.** `.rooms-section` começa em
y=869 de 1024; 734px de rolagem.

**P2 — Texto abaixo de 12px em 59,2% dos nós** (45 de 76) a 1280.

**P2 — Dois alvos abaixo de 44px**: `.camera-channel-btn` mede 36×32.

**P3 — 404 de `/favicon.ico`** — `layout.tsx` declara `icon: "/favicon.png"` e não existe
`.ico` em `public/`.

**P3 — `components/ui` importado por 0 arquivos**; 31 tokens `oklch` mortos.

## Bandeiras vermelhas de persona

- **Morador apressado:** custo do erro (modal de 1080px) maior que o custo da tarefa.
- **Visita:** 41 alvos, 4 ícones mudos, e a única frase que explica o card é a menos legível.
- **Alguém no escuro às 3h:** o maior alvo da tela é `Dormir`, que é o que mais o prejudica.
- **Tema claro sob sol / daltonismo:** aceso `#fef3c7` vs apagado `#ffffff` = 1,11:1;
  ícone aceso vs apagado = 1,06:1. No modo diurno o estado da casa some.

## Observações menores

Concordância invertida em `RoomCard.tsx:321-325`; "Acender todos" para um ponto; `.tv-compact-text`
transborda já a 1280 (52 para 107px); `.status-dot` de 6×6 carrega estado sem texto;
`.room-name` muda de `#fff` para `#f1f5f9` — distinção que existe no código e não no olho;
6 achados de raio do detector são ruído do parser (`"2.2vh,"`).

## Falsos positivos e limites

- Não houve overlay no navegador: o subcomando `live-server` não existe nesta build da skill
  (só `detect`, `ignores`, `help`, `install`, `link`, `update`, `check`).
- Estados que exigiriam acionar a casa (cena, transmissão, shake de falha, standby, aspirador)
  foram julgados só por leitura de código.
- Um clique real do painel sobre `.room-name` não abriu o popup (o evento sintético abriu) —
  pode ser artefato da automação ou a guarda de drag de 450 ms; verificar no tablet antes de
  tratar como defeito.
