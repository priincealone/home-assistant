# Painel em tempo real: espelho por WebSocket + SSE

- **Pedido do André** (08/10/2026): eliminar o atraso entre a HA e o painel; atualização de estado de todos os dispositivos o mais próxima de zero possível.
- **Status**: implementado e verificado em 08/10/2026. Alçada 2 (rota nova, aprovada pelo André em chat).

## Problema

O painel lia `/api/state` por polling de 5 s (0–5 s de atraso, média 2,5 s) e cada leitura ia ao HA (`GET /api/states` completo). Baixar o intervalo só trocaria atraso por carga.

## Desenho

1. **Espelho no servidor** (`lib/haStream.ts`): um único WebSocket Node → HA, assinando `state_changed`, mantém o mapa de estados em memória (só as entidades de `lib/entidadesPainel.ts`). Singleton em `globalThis`.
2. **`GET /api/stream`** (SSE): `snapshot` no início e a cada ressincronização; `diff` com só o que mudou (janela de agrupamento de 15 ms); `ping` a cada 15 s.
3. **`GET /api/state`**: lê do espelho quando sincronizado (cabeçalho `X-Fonte: espelho`); senão cai para o REST de sempre (`X-Fonte: rest`).
4. **Cliente** (`lib/useStreamEstados.ts`): `EventSource` em `/` , `/comodo/[id]` e `/standby`; fecha com a aba oculta, reabre ao voltar. O polling de 5 s fica de reserva e só age se o stream ficar mudo por 35 s. Travas otimistas continuam valendo (a fusão passa por `aplicarEstados`).

## Dono do quê / reinício

- A conexão **só lê**: nunca envia comando, nem ao reconectar.
- Reconexão com backoff exponencial 1 s → 30 s. `ping` WS a cada 20 s; sem `pong` em 10 s derruba e reconecta.
- **Se a HA reiniciar no meio**: o socket cai, `pronto` vira falso, `/api/state` volta ao REST (e devolve 502 se a HA não responde, como antes); ao reconectar, o `get_states` ressincroniza e todos os clientes recebem um `snapshot` novo.
- **Se o painel reiniciar**: o espelho recomeça na primeira requisição; os navegadores reconectam o `EventSource` sozinhos (`retry: 2000`).
- Automação nunca depende do painel; nada aqui toca a HA.

## Limites

- O painel agora reflete o HA em ~30–50 ms. Aparelhos em nuvem (Tuya, Xiaomi, Sonoff) e sensores de intervalo têm o atraso próprio da integração; isso é anterior ao HA e não dá para o painel remover.
- `/api/stream` não é comprimida (`no-transform`); o tráfego é de diffs pequenos.
- Rotas fora do contrato (`energy`, `mass`, `todo`, `weather`) seguem com polling próprio.

## Verificação

- `npx tsc --noEmit` = 0.
- Desenvolvimento (3010) e produção (3002): `X-Fonte: espelho`, `/api/state` em ~8 ms; mudanças reais da HA (câmeras, energia do PC) chegaram no stream 26–51 ms após o `last_updated` da HA; `ping` a cada 15 s; página aberta deixou de chamar `/api/state` (polling suspenso).
- Nenhum dispositivo foi acionado.
