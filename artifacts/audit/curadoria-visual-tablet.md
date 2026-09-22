# Curadoria visual do painel — alvo: tablet

- **Data**: 22/09/2026
- **Escopo**: `dashboard-app` rodando em `localhost:3002`, medido ao vivo no navegador
- **Uso principal declarado**: tablet
- **Natureza**: curadoria e proposta. Nenhum dispositivo foi acionado — o único toque na casa foi
  abrir e fechar o detalhe da Cozinha, que não liga nada.
- **Atualização de 22/09**: as medições abaixo descrevem o estado **antes** das correções. **C-01 a
  C-04 foram aplicadas depois**, a pedido do André, e verificadas ao vivo (§5 e `ESTADO_DASHBOARD.md`).
  Uma ressalva vale para a §2.2: os sete botões de 34px **já tinham** área de toque de 44 por
  pseudo-elemento — a medição olhou só a caixa visível. O defeito era de mira, não de alcance.

Medições feitas em três viewports reais: **1024×768** (tablet de parede 4:3), **1280×800** (tablet
10" paisagem, o formato mais comum) e **768×1024** (retrato).

---

## 1. O diagnóstico em uma frase

O painel está **desenhado para a distância de um celular e usado à distância de uma parede**.

Tudo o mais decorre disso. A arquitetura visual é boa: a grade de 10 cômodos cabe sem rolagem,
não há vazamento horizontal em nenhuma largura, o vidro é coerente, a hierarquia entre cena,
telemetria e cômodo é legível. O que falha é a **escala**: 54% do texto visível está abaixo de 12px
e 28% dos controles estão abaixo do alvo de toque mínimo.

### A conta que explica o problema

Um tablet de 10" a 1280×800 tem cerca de **149 pixels por polegada**. Nessa tela:

| Tamanho no CSS | Altura física | Ângulo visual a 40 cm (mão) | Ângulo visual a 1,5 m (parede) |
| :--- | :--- | :--- | :--- |
| 11px | 1,9 mm | ~16 arcmin — **no limite aceitável** | ~4 arcmin — **ilegível** |
| 16px | 2,7 mm | ~23 arcmin — confortável | ~6 arcmin — ilegível |
| 28px | 4,8 mm | folgado | ~11 arcmin — no limite |
| 40px | 6,8 mm | grande demais | ~16 arcmin — **confortável** |

A referência é a mesma dos padrões de ergonomia de display: caractere crítico deve subtender
**16 a 24 arcmin**. O painel de hoje cumpre isso **na mão** e não cumpre **na parede** — e o
`DESIGN.md` do próprio projeto declara, no primeiro tenet, que a leitura precisa funcionar
"a 3 metros de distância".

**Decidido pelo André em 22/09: o tablet é fixo na parede.** Vale a coluna de 1,5 m da tabela acima,
e é por ela que as próximas decisões se medem. A proposta da §4 continua valendo como o caminho para
aplicar essa decisão em escala.

---

## 2. O que foi medido

### 2.1. Tipografia — o achado principal

Contagem de nós de texto **efetivamente renderizados** na tela inicial, a 1024×768:

| Faixa | Nós | Exemplos |
| :--- | :--- | :--- |
| **Abaixo de 12px** | **42 (54%)** | 7,5px ×1 · 9px ×2 · 9,5px ×3 · 10px ×8 · 10,5px ×2 · **11px ×26** |
| 12px a 14px | 25 | rótulos de cômodo, legendas de cena |
| 16px ou mais | 11 | relógio, temperatura, potência |

Há **um texto de 7,5px** na tela. Isso é 1,3 mm de altura física — menor que o ponto final desta
frase impressa. Na folha de estilo inteira são **33 tamanhos distintos** de fonte, com valores
fracionários como 10,5px, 9,5px e 12,5px, que não vêm de nenhuma escala.

O `DESIGN.md` define seis degraus tipográficos. A implementação usa 33. **Os tokens existem e são
contornados.**

### 2.2. Alvos de toque — 13 dos 47 abaixo do mínimo

Medido a 1280×800, que é o cenário mais favorável:

| Controle | Alvo | Situação |
| :--- | :--- | :--- |
| Canal 2 / Canal 4 da câmera | **27×17px** e **28×17px** | Pior caso do painel. Um dedo adulto cobre ~9 mm; este alvo tem 2,9 mm de altura |
| Galeria de planos de fundo | 43×31px | — |
| Sete botões "abrir widget" (tempo, energia, TV, mídia, CFTV, aspirador, compras) | **34×34px** | São a porta de entrada de todos os painéis de detalhe |
| Tema, Kiosk, descanso de tela | 38×38px | — |
| "Acender todos", dentro do modal | 119×**32px** | Aciona luz de verdade |

O piso é 44×44px — não por norma abstrata, mas porque é a medida aproximada da polpa do dedo. Um
alvo de 17px de altura num painel de parede não é um detalhe estético: é um toque que erra e acerta
o vizinho.

### 2.3. Texto cortado

Seis elementos são truncados a 1024×768, dois ainda a 1280×800:

| Texto | Visível | Real |
| :--- | :--- | :--- |
| `Volume 9% • Sala` | **22px de 90px** | some quase inteiro |
| `Monitoramento HD` | 48px de 95px | metade |
| `3 itens a comprar` | 26px de 92px | um terço |
| `Portão (C2)` | 48px de 68px | corta o canal |

O texto não está grande demais: a **caixa é que é estreita demais** para o conteúdo que recebe. É o
mesmo erro do tamanho de fonte visto por outro ângulo — a faixa de widgets tenta caber sete cartões
numa linha de 1024px, e cada um recebe ~140px para dizer o que faz.

### 2.4. Tema claro — reprovação grave

Ativando o tema claro (fundo `#e2e8f4`), **11 elementos ficam ilegíveis**:

| Elemento | Contraste | Mínimo exigido |
| :--- | :--- | :--- |
| `digital_tv` e `Portão (C2)` | **1,1:1** | 4,5:1 |
| `Moderado` (energia) | 1,67:1 | 4,5:1 |
| `2 alertas` (segurança) | **1,9:1** | 4,5:1 |
| `Baterias 30%` | 1,92:1 | 4,5:1 |
| `CFTV`, `C2`, `Chuva`, `Muito quente` | 2,1 a 2,8:1 | 4,5:1 |

1,1:1 é texto branco sobre branco. A causa é estrutural: os cartões do tema claro ganharam fundo
`rgba(255,255,255,0.76)`, mas o texto continuou com a cor do tema escuro (`#f1f5f9`). **Os dois
alertas de segurança e de bateria estão nessa lista** — são exatamente os avisos que o painel existe
para dar.

Num tablet isso não é hipotético: é o tema que se quer de dia, com a sala clara.

### 2.5. Tema escuro — contraste correto, legibilidade insuficiente

O texto secundário (`rgba(241,245,249,0.5)`) dá **4,96:1** sobre o fundo. Passa na norma. Só que a
norma pressupõe leitura a 40 cm — e esse texto, a 10,5px, é justamente o que diz "Volume 9% • Sala"
e "3 itens a comprar". **Aprovar no contraste e falhar na distância é o resumo do painel inteiro.**

### 2.6. Retrato inverte a hierarquia

A 768×1024 não há vazamento e nada quebra, mas a página passa a ter **713px de rolagem** e os
cartões de cômodo — o conteúdo principal — começam **abaixo da dobra**. A primeira tela fica inteira
para cabeçalho, cenas e telemetria. Quem pega o tablet em retrato para acender uma luz precisa
rolar; quem quer ver a temperatura, não.

Em paisagem, nos dois tamanhos, a regra do primeiro viewport é cumprida: **zero rolagem**.

### 2.7. Modal — proporção e foco

Abrindo o detalhe da Cozinha a 1280×800: o diálogo ocupa **1080×339px** para mostrar **uma única
lâmpada**, num cartão de 1028px de largura. O `DESIGN.md` prevê o caso de card único, mas o
resultado prático é uma faixa larga e vazia.

Dois comportamentos merecem correção:

1. **O foco inicial cai em "Acender todos"**. Abrir o detalhe e apertar Espaço acende o cômodo. O
   foco de abertura deve ir para o título ou para o botão de fechar — nunca para um atuador.
2. **Ao fechar com Esc, o foco volta para o corpo da página**, não para o card que abriu o modal.
   Quem navega por teclado perde o lugar.

O que está correto: `Esc` fecha, `aria-modal` e `aria-label` presentes, botão de fechar com 44×44px
exatos, e o clique no fundo fecha.

### 2.8. Higiene da folha de estilo

`globals.css` tem **12.551 linhas** e cresceu 2.100 desde a auditoria de 16/09.

| Indicador | Hoje | Comentário |
| :--- | :--- | :--- |
| `!important` | **192** | Cada um é uma regra futura que vai falhar em silêncio |
| `box-shadow` | 197 declarações, **145 valores distintos** | O `DESIGN.md` define 3 |
| Raios de borda | 25 valores | O `DESIGN.md` define 12 |
| Tamanhos de fonte | 33 valores | O `DESIGN.md` define 6 |
| `:hover` | **157 regras** | Contra **uma única** media query `pointer: coarse` |
| `focus-visible` | 4 ocorrências | Para 47 controles na tela inicial |
| Cores fixas no TSX | **49 tons** | Contra 12 canônicas |

As 157 regras de hover contra uma regra de ponteiro grosso é o item que mais incomoda no uso
diário em tablet: o estado de hover **cola** depois do toque e o cartão fica parecendo ativo quando
não está.

### 2.9. O que melhorou desde 16/09

Registro por honestidade de comparação:

- **Existe autenticação** por PIN, que não existia. A tela é boa: teclas de 95×60px, bem acima do
  mínimo.
- **Existe sistema de toast** (`ToastContainer`, com `aria-live` e `role="alert"`), acionado em
  falha de comando. O "comando que falha em silêncio" deixou de ser verdade.
- Nenhum vazamento horizontal em nenhuma das três larguras.

⚠️ **Mas a autenticação é decorativa**: o `middleware.ts` verifica apenas que o cookie **existe**, e
o token não é assinado nem validado contra nada. Qualquer cookie com esse nome passa. O PIN padrão é
`1234` quando `DASHBOARD_PIN` não está definido, e `/api/state` está na lista pública — o estado
inteiro da casa é legível sem login. Isso é segurança, não estética, e por isso está fora da
priorização abaixo; mas precisa entrar no backlog de segurança.

---

## 3. Direção de curadoria

Não proponho redesenhar o painel. A identidade — vidro noturno, âmbar quente para luz acesa, ciano
para mídia — está resolvida e é boa. Proponho **três movimentos**, nesta ordem.

### Movimento 1 · Escala antes de estética

Nada de reorganizar telas enquanto o texto não for legível de onde o painel é olhado. Escala primeiro.

### Movimento 2 · Densidade como decisão explícita, não como acidente

Hoje a densidade é resultado de 33 tamanhos de fonte e 30 breakpoints brigando. Deve ser **um token
único**, com dois presets declarados.

### Movimento 3 · Um lugar para cada valor

Toda cor, sombra, raio e tamanho passa a sair de token. Não por pureza: porque foi a falta disso que
já anulou uma correção de alvo de toque em silêncio, e vai anular a próxima.

---

## 4. A proposta central: modo mão e modo parede

Um token de densidade no `:root`, com dois valores, e toda a tipografia derivando dele.

```css
:root {
  /* 1 = painel na mão (hoje). 1.6 = painel na parede, leitura a 1,5–2 m */
  --escala: 1;

  --txt-micro:  calc(0.6875rem * var(--escala));  /* 11px → 17,6px */
  --txt-legenda: calc(0.8125rem * var(--escala)); /* 13px → 20,8px */
  --txt-corpo:  calc(0.875rem  * var(--escala));  /* 14px → 22,4px */
  --txt-titulo: calc(1.125rem  * var(--escala));
  --alvo-min:   calc(44px * var(--escala));
}

/* O tablet de parede é identificado pelo que ele é, não por largura:
   tela grande, toque grosso e sem mouse. */
@media (pointer: coarse) and (min-width: 1000px) {
  :root { --escala: 1.6; }
}
```

Com `--escala: 1.6`, o texto de 11px que domina a tela vira 17,6px — **13 arcmin a 1,5 m**, na
faixa utilizável — e o alvo mínimo vira 70px, que é o tamanho que um botão de parede merece.

**O custo é real e precisa ser dito**: com tudo 60% maior, os 10 cômodos, as 4 cenas e os 7 widgets
**não cabem mais** na mesma tela sem rolagem. A regra do primeiro viewport e a legibilidade de parede
são objetivos que se contradizem, e essa contradição nunca foi decidida — foi resolvida em favor da
densidade, por omissão. As saídas possíveis:

| Saída | O que muda | Custo |
| :--- | :--- | :--- |
| **A — Widgets viram uma tela** | A faixa de 7 widgets sai da inicial e vira uma segunda página, acessível por um botão grande. A inicial fica com cenas + 10 cômodos, grandes | Telemetria deixa de ser glanceável |
| **B — Cômodos em duas páginas** | Grade de 10 vira 2×3 com paginação por deslize | Dois gestos para chegar no Quarto |
| **C — Só o essencial cresce** | `--escala` aplicada apenas a nome de cômodo, estado e alertas; o resto continua pequeno | Mantém tudo na tela; aceita que o secundário seja ilegível de longe |

**Minha recomendação é a C como primeiro passo e a A como destino.** A C é reversível, cabe numa
tarde e resolve 80% do incômodo real — que é não conseguir ler *qual* cômodo está aceso. A A é a
resposta certa, mas exige decidir o que é painel de controle e o que é painel de informação.

---

## 5. Correções pontuais, independentes da decisão acima

Estas valem em qualquer cenário e não dependem de escolher mão ou parede.

| # | Correção | Onde | Esforço |
| :--- | :--- | :--- | :--- |
| ~~**C-01**~~ | ✅ **Aplicada em 22/09.** 13 elementos medidos depois, todos entre 4,72:1 e 16,78:1. O rótulo do tempo exigiu trocar cor inline por variável em `WeatherWidget.tsx` | `globals.css` + `WeatherWidget.tsx` | Feito |
| ~~**C-02**~~ | ✅ **Aplicada em 22/09.** Pílula de 36×32px com área de toque de 44×44px e espaçamento de 8px, para que as áreas não se sobreponham | `globals.css` | Feito |
| ~~**C-03**~~ | ✅ **Aplicada em 22/09.** Círculo de 44px e ícone de 18px. Ressalva: a área de toque já era 44 por `::after`; o que mudou é o desenho, que é onde se mira | `globals.css` | Feito |
| ~~**C-04**~~ | ✅ **Aplicada em 22/09.** Foco entra pelo botão fechar via `[data-foco-inicial]`; aplicado também no `MediaHubModal`, cujo primeiro focável era o liga/desliga da TV | `useFocusTrap.ts`, `RoomPopup.tsx`, `MediaHubModal.tsx`, `ModalCloseButton.tsx` | Feito |
| ~~**C-05**~~ | ✅ **Aplicada em 22/09** (44×122px). Ressalva: sob `pointer: coarse` já recebia 48px — no tablet o alvo já estava certo; os 32px eram do navegador com mouse | `globals.css` | Feito |
| ~~**C-06**~~ | ✅ **Aplicada em 22/09** por script (`scripts/manutencao/hover_so_com_mouse.py`): 121 regras envolvidas. Guarda reforçada duas vezes no mesmo dia: primeiro `(hover: hover) and (pointer: fine)`, depois a marca `html[data-toque]` — o Safari do iPad roda em modo desktop e relata ponteiro fino mesmo sendo dedo, e só a segunda camada resolveu. **Confirmado no iPad Pro 10.9" do André.** Com toque, as regras ficam inertes; com mouse, o hover segue igual | `globals.css` | Feito |
| ~~**C-07**~~ | ✅ **Aplicada em 22/09** — e a premissa era falsa: o anel já cobria os 49 controles (varredura com 50 Tabs). O que mudou foi a medida: 3px com 3px de afastamento e halo escuro, para leitura de parede | `globals.css` | Feito |
| **C-08** | Eliminar o texto de 7,5px e os fracionários (9,5 / 10,5 / 12,5px) | `globals.css` | Médio |
| **C-09** | Dar largura ao texto truncado, ou reduzir de 7 para 5 widgets na faixa. **Parcial em 22/09**: o widget de câmera passou a ocupar 2 colunas entre 768 e 1400px, e o truncamento a 1024 caiu de 6 para 3 elementos | `globals.css` | Médio |
| **C-10** | Em retrato, subir a grade de cômodos para antes da telemetria | `globals.css` | Médio |

**Ordem sugerida**: C-01 e C-02 primeiro (são reprovações, não preferências), depois C-03 a C-05,
depois o resto.

**Estado em 22/09**: C-01, C-02, C-03 e C-04 aplicadas e verificadas ao vivo, mais as quatro ações
do cabeçalho (38px → 44px) e metade do C-09 (ver `ESTADO_DASHBOARD.md`). **Nenhum controle do painel
tem mais alvo abaixo de 44px** — a única exceção é a pílula de canal da câmera, com 36×32 visíveis e
44×44 de toque, por decisão do C-02. A próxima sem dependência é a C-05.

---

## 6. Higiene estrutural, quando houver fôlego

| # | Item | Por quê |
| :--- | :--- | :--- |
| **H-01** | Reduzir os 192 `!important` | Foi um par deles que anulou a correção de alvo de toque de 44px em silêncio, em setembro |
| **H-02** | 145 sombras para as 3 do `DESIGN.md` | — |
| **H-03** | 49 cores fixas no TSX para tokens | Uma mudança de paleta hoje exige editar 30 arquivos |
| **H-04** | Remover os 32 tokens `oklch` mortos do shadcn no `:root`, incluindo `--background: oklch(1 0 0)` | Inofensivos hoje porque `components/ui/` não é importado; um componente novo nasce com fundo branco |
| **H-05** | Instalar ESLint | `npm run lint` continua quebrado desde o Next 16; não há análise estática nenhuma |

---

## 7. O que não foi testado

| Item | Por quê |
| :--- | :--- |
| Modo Kiosk e descanso de tela | Mudam o estado da tela que está na parede; não acionei sem seu aval |
| Modais de mídia, energia, CFTV e aspirador | Abrir alguns desses toca em aparelho real (a Central de Mídia comanda a TV) |
| Estados `unavailable` renderizados | Exigiria derrubar um dispositivo de propósito. Pela leitura do código, **4 de 30 componentes** tratam o estado |
| Toque físico real | O navegador simula ponteiro grosso, não o dedo. A medição de alvo é geométrica |
| Zoom do sistema e fonte grande do Android | Não alcançável pela automação |
| Desempenho em tablet real | O navegador aqui roda no PC; 60fps de vidro com `backdrop-filter` num tablet de 2019 é outra história |

---

## 8. Resumo

| | |
| :--- | :--- |
| **O que está bom** | Identidade visual, zero vazamento, zero rolagem em paisagem, autenticação e toasts novos, semântica ARIA consistente |
| **O que reprova** | Tema claro com 11 elementos abaixo de 4,5:1 (pior: 1,1:1) · 13 de 47 alvos abaixo de 44px · 54% do texto abaixo de 12px |
| **A decisão tomada** | **Parede** (22/09). A régua passa a ser a leitura a 1,5–2,5 m |
| **O primeiro passo** | C-01 e C-02 — **feitas em 22/09**. As próximas sem dependência são C-03, C-04 e C-05 |
