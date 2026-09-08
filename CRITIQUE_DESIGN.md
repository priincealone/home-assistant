# Crítica de design — página Geral da dashboard "Casa"

Rodada em 08/09/2026 com o comando `critique` da skill impeccable, sobre
`http://localhost:8123/minha-casa/geral`. **Nada foi alterado.**

## Proveniência da execução

Declarada porque a própria skill exige, e porque muda o peso do que está escrito
aqui:

- **Assessment A (revisão de design)**: rodou em sub-agente isolado, sem ver
  nenhuma medição nem o detector. Julgamento limpo.
- **Assessment B (evidência)**: montado no contexto principal, não em sub-agente
  — as duas primeiras tentativas de sub-agente morreram no limite de sessão.
  ⚠️ **Isso é uma execução parcialmente degradada**: o contexto que sintetiza já
  tinha visto o detector antes de A terminar, o que a skill considera fonte de
  ancoragem. A foi preservado disso; a síntese, não.
- **Detector**: rodou de verdade (`impeccable detect` 0.1.3), em cinco páginas e
  nos arquivos de tema, depois que o binário foi instalado.

---

## Veredito

A tela é **específica na pele e genérica no esqueleto**. A pele é desta casa:
cômodos com nome próprio, estado em linguagem natural ("1 acesa", "Apagado"),
atalhos reais, lista de compras de verdade. Mas a arquitetura é a de qualquer
dashboard — três colunas de largura quase igual, cada uma um empilhamento de
cartões — e não diz "isto é uma casa e você veio acender uma luz".

O modo da tela é **Operate** (o visitante completa uma tarefa), mas a composição
está organizada como um **feed**.

---

## Problemas, do mais grave ao menos

### 1. A navegação sumiu, e o tile de cômodo assumiu duas funções

`views[0]` é `subview: true` e o cabeçalho está oculto, então **as outras 10
páginas não são anunciadas em lugar nenhum**. Sala de Estar, Lavanderia, Área
Gourmet, Quarto, Quarto do Luca, Banheiro, Circulação, Closet, PC e Luzes só
existem para quem já sabe que existem.

A consequência é o problema de interação mais sério da tela: o tile de cômodo
virou a única navegação **e** continua sendo o interruptor. Medido: o corpo do
tile (212×70) navega; o ícone dentro dele (52×56, círculo de 36px) chama
`turn_on`/`turn_off`. São dois alvos com significados opostos, no mesmo bloco,
sem nenhuma marca visual que os separe — e sem estado de hover que diferencie.

Errar por 3px acende uma luz quando se queria abrir uma página, ou o contrário.

> Isto é consequência direta da escolha de virar subview, feita na interface e
> mantida a pedido. A ambiguidade do tile é sintoma, não causa.

### 2. A coluna que abre a leitura não controla nada da casa

A coluna 1 (344px, primeira no fluxo de leitura e primeira no scroll do celular)
tem clima de 5 dias, saúde e Buscar. **Zero controles.**

Medido no celular (viewport 812px): o primeiro tile de cômodo aparece em
**y = 829px** — depois de uma tela inteira. Mídia em 1327px, lista de compras em
1617px, página com 1928px de altura (2,4 telas).

Quem pega o telefone no corredor para apagar a luz rola uma tela de sono e
batimentos antes de poder agir.

⚠️ Os três widgets dessa coluna (clima estendido, saúde, Buscar) vieram da
dashboard de referência, que era de **outra casa**. O `CLAUDE.md` proíbe
exatamente isso: "replicar uma referência significa reconstruir a arquitetura da
tela — não enxertar componentes soltos".

### 3. A hierarquia tipográfica está invertida em relação ao uso

Os três maiores elementos de texto da tela são o relógio (40px/300), o sono
(19px/600) e os batimentos (19px/600). **Nenhum dos três é acionável.**

Os tiles de cômodo — a ação principal — usam nome em 13,5px/550 e estado em
13,5px/400.

Medição complementar: a Geral tem **17 combinações distintas de tamanho + peso**
de fonte. Não é uma escala, são 17 exceções.

### 4. O tile "Quarto" é um controle quebrado servido como se estivesse pronto

Confirmado na configuração: `var_sensor: null` e `var_lights: []` — o único dos
10 sem entidade. Mostra "Sem luzes" e, ao toque, dispara `homeassistant.turn_on`
com lista vazia: não faz nada, sem avisar.

Ele tem o mesmo peso visual dos 9 que funcionam. É a pendência do ventilador via
LocalTuya vazando para a tela.

### 5. A lista de compras quebra a linguagem visual

O `todo-list` nativo entra sem estilização: checkboxes quadrados, cabeçalho
"Ativo", menu kebab, campo "Adicionar item" — Material Design dentro de uma tela
Apple. É o único ponto onde o sistema visual se rompe por completo.

Some a isso: o rótulo "LISTA DE COMPRAS" duplica o título que o card já carrega,
e no desktop o bloco é cortado pelo fim da viewport.

### 6. Ritmo e formas sem sistema

Medido na Geral:

| O que | Quantos valores distintos |
|---|---|
| Espaçamento vertical entre cards da mesma coluna | **5** (8, 12, 25, 34 e 56px) |
| Raio de borda | **3** (24px em 39 cards, 0px em 17, **12px em 1**) |
| Combinações tamanho+peso de fonte | **17** |

O raio de 12px num único card é a inconsistência mais fácil de eliminar.

### 7. Menores, mas visíveis

- **"1 luzes"** no chip do topo — o template não trata singular, embora o
  `room_mini` trate ("1 acesa"). Inconsistência do produto consigo mesmo.
- **"Bom dia" às 00:52** — confirmado: `h < 12 ? 'Bom dia'`, sem faixa de
  madrugada.
- **Clima duplicado** — o chip "Nublado · 20,7 °C" repete o cartão de clima 40px
  abaixo.
- **"Atualizado / há X"** desalinhado: as duas metades estão em elementos com
  tamanhos e baselines diferentes (11px em y=520 e 11,5px em y=515).
- **O relógio some no celular** (medido: 0×0). Se importa para o tablet de
  parede, está perdido justamente ali; se não importa, ocupa o canto mais nobre
  do desktop.

### 8. Privacidade — decisão, não defeito

A tela de entrada, que é a que fica ligada num tablet de parede, mostra por
padrão: **sono e batimentos**, **endereço de rua** dos dois aparelhos e a lista
de compras. Uma visita vê tudo isso antes de ver qualquer coisa que seja "a
casa". Vale ser decidido de propósito.

---

## O que **não** mexer

1. **Estado por cômodo em linguagem natural** — "Apagado" / "1 acesa" /
   "3 acesas" é melhor que a maioria das dashboards de HA, que mostram "on/off".
   Legível por quem não conhece a casa e escala sozinho.
2. **A disciplina cromática** — `#FF9F0A` significa exclusivamente luz acesa.
   Cor semântica de significado único é raro e está certo.
3. **O acabamento** — os fios de 1px com gradiente que apaga nas pontas, o raio
   de 22px, o vidro. É o que faz a tela parecer produto.

---

## O detector

Rodou em cinco páginas e nos temas. Dois achados, ambos verificados:

| Achado | Veredito |
|---|---|
| `[ai-color-palette]` "Cyan neon text on dark background", em todas as páginas | **Falso positivo.** Medi todas as cores de texto renderizadas: branco puro (40 usos), brancos translúcidos e cinza `#98989D`. Nenhum texto ciano. A cor farejada existe em **4 ícones** (`rgb(0,154,199)`), provavelmente o logo do Prime Video. O tema usa `#0A84FF`, azul de sistema da Apple. |
| `[bounce-easing]` `cubic-bezier(0.34, 1.56, 0.64, 1)` em `apple_home.yaml:106` | **Procede como observação, mas é escolha consciente.** É a animação elástica ao toque do tema. O detector considera bounce datado e prefere desaceleração exponencial. Trocar é questão de gosto, não de defeito. |

---

## Divergência entre as duas avaliações

**Contraste dos rótulos secundários.** A revisão de design aponta que os rótulos
de seção (`rgba(255,255,255,0.4)`, 11px) e o "Atualizado" (`0.35`) ficariam
abaixo de 4,5:1 sobre vidro translúcido em cima de uma foto de fundo variável. A
medição objetiva da auditoria anterior, comparando cada texto com o fundo do
ancestral opaco, deu **zero problemas de contraste em 13 páginas**.

As duas podem estar certas: minha medição usa o fundo do card, e a foto por trás
muda de luminância ao longo da largura. **Não está resolvido** — precisa de
medição sobre o pixel renderizado, não sobre a árvore de estilos.
