# Briefing — Fase 1 (dashboard V1, sem planta)

Para a sessão Impeccable no Antigravity, apontada pra esta pasta
(`C:\HomeAssistant\dashboard-app`).

## Objetivo

Construir um painel de automação residencial **moderno, sofisticado e robusto** — com
animações, efeitos visuais, hierarquia e motion de verdade — que substitua a experiência
de lista/grid crua que o Home Assistant/Lovelace entrega de fábrica. Não é floorplan
ainda (ver "Fora de escopo" abaixo): é o dashboard em grid, mas tratado como um produto
de verdade, não uma lista funcional.

## Por que existe uma sessão de design separada

O sistema de cards nativo do HA (Lovelace/`button-card`) tem teto baixo pra craft visual
— é o que documenta `C:\HomeAssistant\CLAUDE.md`/`ESTADO_DASHBOARD.md` sobre o dashboard
Lovelace existente ("Casa"). Esta interface nova é construída por fora, em React/Next,
exatamente pra não esbarrar nesse teto. A sessão Impeccable é o motor de craft visual
desse trabalho — iteração por screenshot, refinamento visual — enquanto a base de
dados/API já está pronta e não precisa ser tocada.

## O que já está pronto (não recriar)

- **`lib/rooms.ts`** — fonte de verdade dos dados: 10 cômodos, 16 pontos `light`/`switch`,
  gerado do manifesto ao vivo do HA. Ver `DECISOES-V1.md` pras decisões de escopo (Quarto
  vazio, Entrada=alias do Circulação, domínio limitado a light/switch).
- **`lib/ha.ts`** — cliente HA server-side (nunca importar em componente client).
- **`app/api/state`** (GET) — estado ao vivo dos 16 pontos, `{ estados, atualizado_em }`.
- **`app/api/toggle`** (POST, `{ entityId }`) — alterna um ponto, restrito aos 16 do V1.
- **Next.js 16.3.3 + React 19**, App Router, Turbopack, 0 vulnerabilidades.
- **`app/page.tsx`** — página funcional atual, SEM craft visual (é o ponto de partida a
  substituir/evoluir, não o alvo final).

## O que fazer nesta fase

Redesenhar `app/page.tsx` (e quebrar em componentes conforme fizer sentido) consumindo os
dados de `lib/rooms.ts` e a rota `app/api/state`/`app/api/toggle` já prontas — construir a
experiência visual: layout, hierarquia entre cômodos, estado ligado/desligado com
motion real (não só troca de cor), micro-interações no toque/clique, efeitos que dão
sensação de produto acabado.

## Restrições funcionais (de `DESIGN.md`, o projeto no Cowork — valem também aqui)

- **Legibilidade à distância**: uso principal é tablet fixo na parede, visto de alguns
  passos — contraste e tamanho de estado (ligado/desligado) precisam funcionar nessa
  distância.
- **Dois modos de uso**: ambiente/passivo (tela sempre ligada, só mostrando estado) e
  interativo (toque pra controlar) — a estética não pode virar ruído visual no modo
  passivo.
- **Estado instantaneamente legível**: cor/ícone/animação por dispositivo, sem precisar
  ler texto.
- **Tema claro/escuro**: o tablet fica ligado o dia todo; precisa funcionar bem em
  ambiente iluminado e escurecido (casa à noite).

## Em aberto — decidir nesta sessão

Paleta, tipografia, estilo de ícone/representação por dispositivo, motion (transições de
estado, feedback de toque). Nada disso está travado — `DESIGN.md` deixou essas decisões
justamente pra esta sessão, guiadas por briefing na hora em vez de pré-definidas.

## Fora de escopo nesta fase

- **Planta real (floorplan)**: fica pra depois do scan LiDAR da casa (ainda não feito).
  Não desenhar planta, não simular planta — o layout desta fase é em grid/cards.
- Novos domínios além de `light`/`switch` (fan, media_player etc.) — fica pra depois do
  V1 validado.
- Mudar `lib/rooms.ts`, `lib/ha.ts` ou as rotas de API — são a base já validada; se algo
  ali precisar mudar pra viabilizar o design, registrar a necessidade em vez de editar
  direto (o Cowork cuida da camada de dados/infra).
