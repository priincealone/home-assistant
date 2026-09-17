# UI-RESPONSIVE — breakpoints e regras de adaptação

Implementa `specs/features/responsive-adaptive-dashboard.md`. Última revisão: 16/09/2026.
Todos os números abaixo foram **medidos no navegador**, não estimados.

## Princípio

A adaptação responde a **quatro eixos**, não a um: largura, **altura**, orientação e tipo de ponteiro.
A altura é a mais esquecida, e foi a origem do pior defeito encontrado (ver "Armadilhas").

Onde a adaptação depende do espaço do **componente**, usa-se `@container`. Onde depende da **janela**,
media query. Nunca `user-agent`, nunca `innerWidth` em JavaScript.

## Breakpoints

| Faixa | Condição | Comportamento |
| :--- | :--- | :--- |
| Celular retrato | `max-width: 480px and (orientation: portrait)` | Grade de cômodos em **2 colunas** |
| Tablet retrato | `481px–1024px and (orientation: portrait)` | **3 colunas**; modal vira diálogo flutuante `min(680px, 90vw)` |
| Painel de parede | `min-width: 768px and min-height: 580px and (orientation: landscape)` | Zero-scroll em `100dvh` |
| Altura baixa deitado | `(orientation: landscape) and (max-height: 520px)` | 3 colunas, cabeçalho estático e compacto, rolagem liberada |
| Desktop | `1025px–1720px` | Layout panorâmico, hover ativo |
| Ultrawide | `min-width: 1721px` | Conteúdo contido em **1720px**, centralizado |

## Container queries

| Container | Nome | Regra |
| :--- | :--- | :--- |
| `.rooms-section` | `rooms` | ≤520px: altura do card encolhe por `clamp`; ≤340px: rótulo do chip some, o dado fica |
| `.popup-sheet` | `modal` | Ventilador: <310px vira 2×2, ≥310px fica em 4 colunas · Subcards: ≥420px viram `auto-fill minmax(170px, 1fr)` |
| `.daily-panorama-bar` | `widgets` | Reservado para a faixa de widgets diários |

`.subcard-grid.is-single` vira linha horizontal executiva — a classe já era aplicada pelo
`RoomPopup.tsx` em quatro lugares e **não tinha regra CSS correspondente**.

## Ponteiro

- `@media (pointer: coarse)`: alvos de 48px, `touch-action: manipulation`, realce de toque removido, e
  neutralização de *sticky hover* nos elementos interativos.
- `@media (hover: hover) and (pointer: fine)`: micro-elevação de 3px no card.

⚠️ **Desvio consciente da especificação.** Ela propõe `*:hover { transform: none !important }` dentro de
`pointer: coarse`. Um seletor universal com `!important` desliga também transições legítimas de estado
(um card que muda ao acender, por exemplo) e é praticamente impossível de sobrescrever depois. A
implementação restringe a neutralização aos cinco seletores interativos que realmente sofrem do
problema.

## Tokens fluidos

`--fluid-3xs` … `--fluid-lg` para espaçamento, `--fluid-text-xs` … `--fluid-text-lg` para tipografia,
todos em `clamp()`. `--touch-min: 44px` (mínimo WCAG) e `--touch-wall: 48px` (painel de parede).
`--shell-max: 1720px`.

## Matriz de homologação — resultados medidos em 16/09/2026

| ID | Viewport | Colunas | Card | Vazamento X | Rolagem V |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T-01 | 320×568 | 2 | 148px | 0 | sim (esperado) |
| T-02 | 375×812 | 2 | 176px | 0 | sim (esperado) |
| T-03 | 430×932 | 2 | 203px | 0 | sim (esperado) |
| T-04 | 844×390 | 3 | 264px | 0 | sim (esperado) |
| T-05 | 768×1024 | 3 | 237px | 0 | **não** |
| T-06 | 1024×768 | 5 | 189px | 0 | **não** — zero-scroll ✅ |
| T-07 | 1024×600 | 5 | 190px | 0 | **não** |
| T-08 | 1440×900 | 5 | 269px | 0 | **não** |
| T-09 | 2560×1080 | 5 | 329px | 0 | **não** — contido em 1720px ✅ |
| T-10 | 960×600 (≡1440 a 150%) | 5 | 177px | 0 | não · **0 textos truncados** |

**Vazamento horizontal zero em todas as dez.**

T-10 emula o zoom de 150% reduzindo o viewport em pixels CSS (1440 ÷ 1,5 = 960), porque o atalho de
zoom do navegador não é acessível pela automação. É equivalente para efeito de layout, **não** para o
tamanho real do texto renderizado.

## Armadilhas encontradas nesta implementação

**1. `@media (max-height: 579px)` sem orientação.** A regra existia para celular deitado e Smart
Display, mas pegava também o **iPhone SE em retrato** — 568px de altura é menor que 579px. Resultado:
3 colunas `!important` num viewport de 320px, com cards de 96px. Corrigido acrescentando
`and (orientation: landscape)`.

**2. `!important` em cascata.** Duas regras antigas usavam `!important` em `grid-template-columns`, o
que fazia qualquer regra nova ser silenciosamente ignorada — a mudança "não fazia efeito" sem erro
nenhum. Corrigido na origem, em vez de empilhar mais `!important`.

**3. Medir depois de recarregar.** O servidor de desenvolvimento recompila o CSS, mas a página precisa
recarregar para aplicá-lo. Uma medição feita cedo demais mostra o layout antigo e leva a conclusão
errada.

## Como validar de novo

```bash
cd dashboard-app && npx tsc --noEmit
```

Depois, no navegador, para cada viewport da matriz:

```js
const d = document.documentElement, g = document.querySelector('.room-grid');
({ vazamentoX: d.scrollWidth - d.clientWidth,
   colunas: getComputedStyle(g).gridTemplateColumns,
   rolagemV: d.scrollHeight > innerHeight + 2 })
```

Critério: `vazamentoX` sempre 0; `rolagemV` falso em T-05 a T-10.
