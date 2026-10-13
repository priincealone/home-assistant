# Painel: "Resumo da casa" recolhível no celular

Origem: auditoria `impeccable` de 13/10/2026 (item "primeira tela do celular") e decisão do André pela
opção (b): recolher o Resumo em vez de reordenar as seções.

## Problema

A 375 × 812 px os cômodos, que são a tarefa principal do painel (PRODUCT.md), só começam em y ≈ 622
(77% da altura): cabeçalho de 244 px, cenas de 96 px e o "Resumo da casa" de ~206 px vêm antes. O
cabeçalho já foi compactado ao mínimo sem perder informação nem alvos de 44 px; o que sobra é conteúdo.
Reordenar as seções com CSS `order` faria o foco do teclado deixar de coincidir com a ordem visual
(WCAG 2.4.3), por isso foi descartado.

## Comportamento esperado

Só em tela de **até 640 px** (celular); tablet de parede e desktop não mudam.

- O título "Resumo da casa" vira um botão com seta (`aria-expanded`, `aria-controls`). O padrão é **recolhido**.
- Recolhido, os cinco cartões (energia, mídia, câmera, aspirador, compras) **não são renderizados**. Isso
  também para o player da câmera, que não deve baixar vídeo escondido no celular.
- Aberto, tudo como hoje. A escolha fica gravada no navegador (`localStorage`, em `try/catch`): quem abre
  continua vendo aberto na próxima visita. Sem `localStorage`, vale o padrão.
- A primeira pintura já sai recolhida: a regra de CSS esconde a faixa até o React marcar a seção como aberta,
  então não há "pisca" de conteúdo que depois some.
- A ordem do DOM não muda: foco do teclado e leitor de tela seguem a ordem visual.
- Acima de 640 px o título volta a ser um `h2` comum, sem botão.

### Resumo de uma linha (entregue em 13/10/2026)

Enquanto recolhido, uma linha de apoio sob o título: `133 W · Mídia em standby · Aspirador pronto`.

- **O que mostra**: potência instantânea (soma dos dois medidores que respondem), estado da mídia (TV e PS5) e do
  aspirador. Só o que o painel já lê (`lib/resumoCasa.ts`, função pura).
- **Estado desconhecido nunca vira zero** (CLAUDE.md §12): os dois medidores fora = "Energia sem leitura"; TV sem
  leitura = "TV sem leitura" (não "standby"); aspirador `unavailable`/`unknown`/ausente = "Aspirador sem leitura".
  Zero watt de verdade continua "0 W".
- **Acessibilidade**: o botão do título aponta a linha com `aria-describedby` (o título do `h2` continua só
  "Resumo da casa"); tocar na linha também abre, como conveniência para o dedo. Some quando aberto.
- **Fora**: a lista de compras e a câmera (não estão no estado lido pelo painel; a lista tem busca própria) e
  qualquer dado em tablet ou desktop.
- **Testes**: `tests/resumo-casa.test.mjs` (15) e, no teste de contrato, as 5 entidades do resumo precisam estar no
  polling (`todasEntidades`) e no registro do HA, senão a linha leria "sem leitura" para sempre.

## Entidades envolvidas

Nenhuma entidade nova nem comando: é só interface. Os cartões continuam lendo os mesmos estados.

## Fora desta entrega

- Reordenar as seções, mudar o cabeçalho de novo, qualquer mudança em tablet ou desktop.

## Se o HA reiniciar no meio

Não se aplica: o recolhimento é estado de tela, não de casa. Com o Resumo recolhido, o estado de conexão do
painel continua nos selos do cabeçalho (rede, DVR), que não são recolhidos.

## Como se verifica

1. A 375 px: primeira pintura com o Resumo recolhido, sem salto de layout; primeiro cômodo acima de y ≈ 400.
2. Tocar no título abre e fecha; `aria-expanded` acompanha; a preferência sobrevive a recarregar a página.
3. Recolhido: nenhum elemento `.daily-panorama-bar` no DOM e nenhuma requisição de vídeo da câmera.
4. A 641 px ou mais: título sem botão, faixa sempre visível, nada mudou.
5. Teclado: Tab chega ao botão do título, Enter e Espaço alternam, o foco não se perde ao recolher.
6. `npx tsc --noEmit` e `npm test`.
