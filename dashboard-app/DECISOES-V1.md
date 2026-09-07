# Decisões de escopo — V1 do painel

Registradas antes de gerar código, a partir do `manifesto-comodos.json`
(10 cômodos, 16 pontos de luz mapeados via `light`/`switch`).

## Escopo de domínio

V1 cobre só `light` e `switch` — bate exatamente com o que o manifesto já
mapeia. `fan`, `media_player` e os demais domínios existentes ficam de fora
por enquanto, entram em uma iteração seguinte.

## Cômodo "Quarto"

Não tem nenhuma luz integrada (`fan.luz_ventilador` do quarto, via LocalTuya,
está offline — ver ESTADO_DASHBOARD.md). Decisão: aparece na planta como
espaço identificado, **vazio** — sem nenhum ponto de controle plotado ainda.
Vira um placeholder visual até o ventilador/luz do quarto voltar.

## "Entrada" (Muro/Corredor) — resolvido

`switch.entrada_switch_1` ("Muro") e `switch.entrada_switch_2` ("Corredor")
são os **mesmos pontos físicos** de `light.circulacao_switch_1` ("Muro") e
`light.circulacao_switch_2` ("Corredor") — acionados por interruptores em
locais diferentes, não lâmpadas diferentes.

Consequência pro modelo de dados: não viram um cômodo/nó próprio na planta.
Cada ponto do Circulação é modelado com uma entidade primária
(`light.circulacao_switch_*`, já convertida via `switch_as_x`, é a fonte de
estado/controle) e a entidade `switch.entrada_switch_*` correspondente listada
como **alias físico** — mesmo ponto lógico, sem duplicar contagem nem plotar
dois ícones.

Isso resolve a divergência que estava em aberto desde ESTADO_DASHBOARD.md
("Pendências" → interruptor Entrada).
