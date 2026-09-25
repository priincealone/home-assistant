# Automação · Cenas rápidas como scripts do Home Assistant

- **Data**: 24/09/2026
- **Pedido**: melhoria nº 5 — levar Cinema, Chegar, Dormir e Gamer para o HA (B-09), com o painel chamando o HA
- **Status**: aprovado pelo André em 24/09 (opção "scripts no HA, painel chama o HA"); alçada 2
- **Substitui**: a lógica de `dashboard-app/app/api/scene/route.ts`, que hoje comanda as lâmpadas direto

## Comportamento

| Script | Ações |
| :--- | :--- |
| `script.cena_cinema` | `light.luz_sala` off · `light.painel` on a 20% (brilho 51) |
| `script.cena_chegar` | `light.circulacao_switch_1` e `_2` on · `light.luz_sala` on · `light.painel` on a ~70% (brilho 180) |
| `script.cena_dormir` | apaga as 11 luzes da lista da cena "boa_noite" (sala, painel, cozinha/copa/varanda 1-3, externas 1-4, circulação 1-2) |
| `script.cena_gamer` | `light.luz_sala` off · `light.painel` on a 30% (brilho 76). **Não toca** em `switch.ventilacao_ps5` |

## Dono de cada atuador (resolve B-04)

A ventilação do PS5 tem dono: a automação "Ventilação do PS5 acompanha o console". A cena Gamer dava
`turn_on` cego no atuador dela; passa a deixar a decisão com a automação (console em uso → liga, fora de
uso há 2 min → desliga). As luzes não têm outro dono além de "Muro e Painel" (pôr do sol → meia-noite) e das
automações de porta do quarto; cena é ação manual e tem precedência no momento do toque.

## Se o Home Assistant reiniciar

Scripts são declarativos e recarregam com o HA; nada roda na partida. Uma cena em andamento (as ações são
imediatas, sem `delay`) não deixa estado pendente.

## Painel

`POST /api/scene` recebe `{ cena }`, mapeia para o `script.*` da tabela acima por lista de permissão fixa e chama
`script.turn_on`. A atualização otimista de `page.tsx` permanece. Se o HA não responder, a rota devolve 502
como hoje.

## Fora do escopo

Cena "Saí de casa"/"Cheguei" e qualquer gatilho automático (item 6, pulado pelo André).
