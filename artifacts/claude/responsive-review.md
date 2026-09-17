# Revisão final de responsividade — 16/09/2026

Revisão somente leitura da implementação contra `specs/features/responsive-adaptive-dashboard.md`.
**Nenhum arquivo foi alterado e nenhum problema foi corrigido.** Nada foi acionado na casa.

⚠️ **`docs/UI-DESIGN-SYSTEM.md` não existe.** O documento pedido como referência nunca foi criado; o
sistema de design real é `dashboard-app/DESIGN.md`. Todos os itens que dependeriam exclusivamente dele
estão como **não testado**.

---

## 1. Critérios de aceitação da especificação (§8)

| # | Critério | Veredito | Evidência |
| :--- | :--- | :--- | :--- |
| 1 | Nenhum vazamento horizontal de 320px a 3840px | **Aprovado** | `scrollWidth - clientWidth = 0` nas 10 resoluções da matriz |
| 2 | Modais adaptativos (bottom-sheet ↔ diálogo flutuante) | **Não testado** | Regras existem no CSS (`min(680px, 90vw)` em tablet retrato), mas exigiria **abrir o modal** — evitei para não arriscar acionar dispositivo |
| 3 | Ventilador: 4 colunas ≥310px, 2×2 abaixo | **Não testado** | Container queries confirmadas na folha de estilo; não medidas ao vivo pelo mesmo motivo |
| 4 | Card único em layout horizontal (`is-single`) | **Não testado** | Regra existe e a classe já era aplicada em 4 pontos do `RoomPopup.tsx`; sem abrir o modal, não há medição |
| 5 | Zero-scroll em painel de parede paisagem | **Aprovado** | T-06 (1024×768) e T-07 (1024×600): `scrollHeight ≤ innerHeight` |
| 6 | Zero dependência de hover em `pointer: coarse` | **Reprovado** | Ver R-02 |
| 7 | Contrato canônico intacto | **Aprovado** | `git diff --name-only` não lista `lib/rooms.ts` nem `manifesto-comodos.json` |
| 8 | `npx tsc --noEmit` com saída 0 | **Aprovado** | Executado; exit 0 |
| 9 | Screenshots arquivados por resolução | **Reprovado** | Foram feitas **medições numéricas**, não capturas arquivadas. O critério pede evidência visual persistida |

---

## 2. Matriz de viewports (§7)

| ID | Viewport | Colunas | Card | Vazamento X | Rolagem V | Veredito |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| T-01 | 320×568 | 2 | 148px | 0 | sim | **Aprovado** |
| T-02 | 375×812 | 2 | 176px | 0 | sim | **Aprovado** |
| T-03 | 430×932 | 2 | 203px | 0 | sim | **Aprovado** |
| T-04 | 844×390 | 3 | 264px | 0 | sim | **Aprovado** |
| T-05 | 768×1024 | 3 | 237px | 0 | não | **Aprovado** |
| T-06 | 1024×768 | 5 | 189px | 0 | não | **Aprovado** |
| T-07 | 1024×600 | 5 | 190px | 0 | não | **Aprovado** |
| T-08 | 1440×900 | 5 | 269px | 0 | não | **Aprovado** |
| T-09 | 2560×1080 | 5 | 329px | 0 | não | **Aprovado** — contido em 1720px |
| T-10 | 1440×900 @150% | 5 | 177px | 0 | não | **Parcial** — ver R-05 |

Os critérios de sucesso de T-01 e T-02 citam a grade do ventilador e o texto "2 • Médio", que ficaram
**não testados** (item 3 acima). A parte medível de cada linha passou.

---

## 3. Achados

### R-01 · Breakpoints em excesso — **Reprovado**

**30 blocos `@media` e 34 larguras distintas** em `globals.css`, entre elas 340, 350, 380, 480, 520,
540, 580, 640, 768, 820 e 1200px. A especificação (§3.1) define **sete** faixas canônicas.

Consequência concreta: já aconteceu duas vezes de uma regra nova ser silenciosamente anulada por outra
que ninguém lembrava. Cada largura a mais é uma chance de conflito que só aparece no aparelho do
usuário.

### R-02 · Hover continua ativo em telas de toque — **Reprovado**

**118 regras `:hover`** no arquivo. A camada adaptativa neutraliza `transform` em apenas **cinco**
seletores sob `pointer: coarse`. Todo o resto — mudança de fundo, sombra, borda, brilho — continua
disparando no toque e **permanece após o dedo sair** (*sticky hover*).

**Nenhum conteúdo depende de hover para existir** (nenhuma regra `:hover` com `opacity: 0`,
`display: none` ou `visibility: hidden`): a informação está sempre acessível. O defeito é visual e de
percepção de estado, não perda de função.

### R-03 · Alvos de toque abaixo do mínimo — **Reprovado**

Medido a 375×812 com `pointer: coarse` ativo: **3 de 34 alvos abaixo de 44px**.

| Elemento | Menor dimensão | Observação |
| :--- | :--- | :--- |
| `.security-micro-pill` | **36px** | Alerta de porta aberta |
| `.battery-micro-pill` | **36px** | Alerta de bateria crítica |
| `.tv-compact-power` | **34px** | Liga/desliga da TV |

Agravante: os dois primeiros estão na lista de **componentes de proteção inegociável** da própria
especificação (§6). São justamente os controles que não podem falhar sob o dedo.

### R-04 · Alturas fixas em pixels — **Reprovado (parcial)**

**102 `height: Npx`** e **35 `min-height: Npx`** no arquivo. Nos cards de conteúdo: 104px, 120px,
138px `!important` e 155px. A correção da camada adaptativa (`min-height: max(8.5rem, 100%)`) só entra
em `min-width: 1025px` ou `min-resolution: 1.25dppx` — **o celular em retrato continua com altura
travada em pixels**, que é exatamente o cenário do F-07 da especificação.

### R-05 · Zoom de acessibilidade — **Parcial**

A 960×600 (equivalente de layout a 1440 com 150%) houve **zero textos truncados** e zero vazamento.
Mas o teste é uma **aproximação**: reduzir o viewport em pixels CSS reproduz o layout, não o tamanho
real do texto renderizado nem o zoom de fonte do sistema. O zoom real do navegador não é acessível pela
automação. **Não testado** no sentido estrito.

### R-06 · Teclado virtual — **Não testado**

Sinal positivo estrutural: **zero ocorrências de `100vh`** e **11 de `100dvh`**, que é a unidade que
encolhe quando o teclado abre. Mas não há campo de texto na tela principal além da lista de compras, e
o comportamento com o teclado aberto **não foi exercitado**.

### R-07 · Componentes que ainda deveriam usar container queries — **Reprovado (parcial)**

Há **5 regras `@container` ativas** e os três containers declarados. Continuam governados por media
query, quando deveriam responder ao espaço do componente:

- `.subcard-grid` nos blocos de 380px e 340px — o subcard vive dentro do modal, não da janela
- `.fan-speeds-grid` nos blocos de 520px e 640px, duplicando o que a container query já resolve
- `.daily-panorama-bar` — o container foi **declarado** (`container-name: widgets`) e **nenhuma regra o
  usa**

### R-08 · Acessibilidade por teclado — **Reprovado**

Apenas **1 ocorrência de `focus-visible`** em 10.400 linhas, para 34 elementos interativos. Quem navega
por teclado não enxerga onde está. `prefers-reduced-motion` está bem tratado (4 blocos), e o HTML usa
`aria-label`, `aria-modal`, `aria-pressed`, `aria-selected`, `role="dialog"`, `role="tablist"` — a
estrutura semântica é boa; falta o retorno visual de foco.

---

## 4. Itens verificados e corretos

| Item | Veredito | Evidência |
| :--- | :--- | :--- |
| Dependência de modelo de aparelho | **Aprovado** | Nomes de aparelho aparecem **só em comentários**; zero `navigator.userAgent`, zero `userAgentData` |
| Divergência desktop/mobile no JS | **Aprovado** | `matchMedia` é usado apenas para tema claro/escuro. Nenhuma bifurcação de layout em JavaScript, nenhuma lógica de negócio duplicada |
| Media query só de altura sem orientação | **Aprovado** | Nenhuma restante — era a causa do defeito do iPhone SE |
| Perda de funcionalidade ao encolher | **Aprovado** | Nenhum controle some por breakpoint; o que muda é densidade, não disponibilidade |
| Orientação sem recarregar | **Aprovado** | Adaptação 100% em CSS; o navegador reavalia ao girar, sem JS envolvido |
| Unidade de altura para teclado virtual | **Aprovado** | `100dvh` em toda parte, `100vh` em lugar nenhum |
| Contenção ultrawide | **Aprovado** | Exatamente 1720px a 2560px de largura |

---

## 5. Resumo

| Classificação | Quantidade |
| :--- | :--- |
| **Aprovado** | 12 |
| **Reprovado** | 6 (R-01, R-02, R-03, R-04, R-07, R-08) + 1 critério (screenshots) |
| **Não testado** | 5 (modais, ventilador, `is-single`, zoom real, teclado virtual) |

**O que a implementação resolveu**: vazamento horizontal, zero-scroll em parede, contenção ultrawide,
grade correta em todas as faixas, o defeito de orientação do iPhone SE e a base de container queries.

**O que não resolveu**: a dívida acumulada de 10.400 linhas — os 30 breakpoints, as 118 regras de
hover e as alturas em pixels vêm de antes e continuam lá. A camada adaptativa é uma correção por cima,
não uma reescrita.

**O mais urgente**, porque é segurança e não estética: **R-03**. Os alertas de porta aberta e de
bateria crítica têm 36px de alvo num painel operado com o dedo, e a própria especificação os declara
inegociáveis.
