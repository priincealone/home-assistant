# Auditoria visual e de interação — dashboard "Casa"

Feita em 07/09/2026 sobre as 13 páginas, medindo no navegador (viewport de
celular 375px e desktop 1027px) e lendo o storage do Lovelace. Método: um
coletor percorre todos os shadow roots e mede caixa, fonte, contraste contra o
fundo real e alvos de toque; a parte estática lê `lovelace.minha_casa` e o
registro de entidades. Nada foi alterado — este documento é só o diagnóstico.

Régua: as cinco dimensões do `audit.md` da skill impeccable (acessibilidade,
performance, tema, responsivo, integridade), adaptadas a uma dashboard que é
JSON + card-mod em vez de código de frontend.

---

## P1 — Erros visíveis na tela ✅ CORRIGIDO em 07/09/2026

> Os cinco foram corrigidos por `scripts/lovelace/p1_erros_visiveis.py` e
> `p1_passos_sem_unidade.py`. Verificação final nas 13 páginas, em 375px e
> 1027px: **zero transbordos, zero textos truncados, zero textos mortos**.

| # | Onde | O que está errado |
|---|---|---|
| 1 | Sala de Estar | O card de temperatura mostra **"NaN °C"**. O sensor (`sensor_temperatura_e_humidade_*`) está `unavailable`, e o template imprime a conta em vez de um estado vazio. |
| 2 | Quarto | Card exibindo **"Indisponível"** — é o `fan.luz_ventilador` do LocalTuya, que está offline desde sempre (pendência 1). Ocupa espaço sem informar nada. |
| 3 | Geral | O item da lista de compras **transborda o card**: o `span` mede 352px e termina em 1087px numa viewport de 1027px. Acontece nos dois tamanhos de tela. |
| 4 | Sala de Estar | **"Sensor de Luz TV"** é cortado no celular (único texto truncado da dashboard). |
| 5 | Storage | Duas entidades citadas **não existem mais**: `binary_sensor.sensor_banheiro_movimento` e `binary_sensor.sensor_closet_movimento`. Os cards que dependem delas nunca vão acender. |

## P2 — Toque e legibilidade

| # | Onde | Medido |
|---|---|---|
| 6 ✅ | **Página Luzes** | ~~**18 botões de 32×32px**~~ **corrigido**: alvo de 44×44 com o círculo pintado ainda em 32px. O mínimo confortável é 44×44 (WCAG 2.5.5 / HIG). É a tela com pior ergonomia da casa, e é justamente a que se usa com a mão ocupada. |
| 7 | Geral | 5 alvos abaixo de 44: chips de status (36×36), botões do card de mídia (42×42 e 32×32) e um `ha-icon-button` de 32×32. |
| 8 | Sala de Estar | 2 alvos pequenos, incluindo um `button-card` de 22px de altura. |
| 9 ✅ | Geral | ~~**7 textos abaixo de 11px**~~ **corrigido**: os quatro chips do topo a 10,8px, "Atualizado / há 8 horas" a 10,5px e "Lista de compras" a **10px**. No iPhone isso fica no limite do ilegível. |
| 10 ✅ | Closet, PC, Quarto do Luca | ~~3 a 6 textos abaixo de 11px em cada~~ **corrigido**. |

**Contraste**: nenhum problema. Medindo contra o fundo real de cada elemento,
as 13 páginas passam em AA — inclusive os cards claros com texto escuro.

## P3 — Consistência e dívida acumulada

| # | Achado | Número |
|---|---|---|
| 11 ✅ | ~~**Templates órfãos**~~ arquivados — definidos e não usados por nenhum card: `divider`, `heading`, `room_row`, `weather_widget`, `device_tile`, `room_tile`, `panel_tile` | 7 de 15 |
| 12 ✅ | ~~**CSS repetido**~~ virou 4 templates de estilo literalmente card a card: o bloco "sem borda/sombra" aparece 36 vezes, o "nude" 28, outro 16 | 43 blocos distintos, 16 repetidos 5+ vezes |
| 13 ✅ | ~~**Cores fora da paleta**~~ consolidadas declarada no CLAUDE.md (`#FF9F0A`, azul, verde, vermelho, roxo) | 10 cores; `#ff375f` sozinha com 12 usos |
| 14 ⏸ | **Escala tipográfica**: caiu de 12 para 13 tamanhos, todos agora ≥11px (11 / 11,5 / 12 / 12,5 / 13 / 13,5 / 14 / 15 / 17 / 19 / 30 / 32 / 40). Consolidar os pares vizinhos mexeria em alinhamentos já medidos, com ganho invisível — **adiado por decisão de custo/risco**. | 13 tamanhos |

## P4 — Densidade e propósito das páginas

As páginas de cômodo simples têm **muito pouco conteúdo**: Cozinha e Copa com
3 textos na tela inteira, Circulação com 5, Banheiro com 6, Lavanderia com 7.
Cada uma é essencialmente um interruptor numa página inteira — a navegação
custa mais que a ação. Vale decidir se elas continuam existindo como página ou
viram popup a partir da Geral, como já acontece com o PC.

Para comparação: a Geral tem 73 textos, Luzes 29, Closet 19, PC 17.

## Performance

13 elementos com `backdrop-filter` ativo na Geral (nenhum nas páginas de
cômodo). É o custo do vidro e está concentrado onde faz efeito; não vi sinal de
excesso, mas é o número a vigiar se a dashboard começar a engasgar no iPad.

---

## Ordem sugerida

1. ~~P1 inteiro~~ — **feito**.
2. ~~#6 (botões de 32px na página Luzes)~~ — **feito**.
3. ~~#9 e #10 (tipografia abaixo de 11px)~~ — **feito**. O #14 (escala dispersa)
   continua aberto.
4. ~~P3~~ — **feito**, menos o #14 (escala tipográfica), adiado de propósito.
5. **P4** — decisão de produto, não de código: precisa da sua opinião antes.
