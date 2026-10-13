# ARCHITECTURE — como o sistema está montado

Última revisão: 15/09/2026 · Base: `artifacts/claude/code-map.md` (medições) e `CASA.md`.
Tudo aqui foi verificado contra o código e os containers. O que não foi, está marcado.

## As três camadas

```
   FÍSICO / AUTOMAÇÃO            BORDA / TRANSPORTE          INTERFACE
   Home Assistant :8123          Next.js :3002               navegador / tablet

   automations.yaml              app/api/*/route.ts          app/page.tsx
   template_sensors.yaml         lib/ha.ts  (HA_TOKEN)       app/comodo/[id]
   .storage/core.*                                           app/standby
   custom_components/*                                       app/components/*
          ▲                             ▲                          │
          │  REST :8123                 │  fetch HTTP              │
          └─────────────────────────────┴──────────────────────────┘
                                        │
                                 lib/rooms.ts
                              (contrato canônico)
```

**Regra da camada**: o token do HA nunca cruza para o navegador. `lib/ha.ts` roda só no servidor; as
rotas em `app/api/*` são o único ponto de contato. Verificado: nenhuma rota devolve o token.

## Serviços em execução

| Serviço | Onde | Porta | Papel |
| :--- | :--- | :--- | :--- |
| `homeassistant` | container | 8123 | Núcleo da automação; `config/` montado do disco |
| Painel Next.js | processo do Windows | 3002 | Interface, sob watchdog PowerShell |
| Glances | serviço do Windows | 61208 | Telemetria do PC, lida pelo HA |

O Music Assistant e o `bgutil-provider` foram removidos em 09/10/2026.

## Rede — o limite que define o resto

Docker Desktop sobre WSL2 em modo NAT. **Unicast atravessa; multicast não.**

- Funciona: Tuya, TV, PS5, aspirador, Glances — tudo por IP direto
- Não funciona: mDNS, descoberta automática, AirPlay, Chromecast
- Dentro de um container, `127.0.0.1` é o próprio container, nunca o Windows

Consequência prática: áudio multiroom sincronizado não é configurável neste hospedeiro. É a razão
técnica da migração para hardware dedicado no roadmap.

⚠️ O IP do PC (`192.168.31.22`) é **DHCP**. Já não está fixo no painel, mas se mudar o webhook de saúde
para de chegar.

## Fluxos, como medidos

### Leitura (painel → HA)

```
navegador → :3002 /api/state → HA GET /api/states   (1 requisição, filtro em memória)
```

Polling de 5 s, suspenso quando a aba fica oculta. Travas otimistas de 5 s evitam que a resposta antiga
sobrescreva o toque recente.

### Comando (painel → HA → aparelho)

```
navegador → :3002 /api/toggle|control|scene|tv|vacuum → HA POST /api/services/<domínio>/<serviço>
```

`toggle` e `control` validam a entidade contra a lista de permissão de `lib/rooms.ts`.

### Tempo real (servidor → HA → navegador)

```
HA :8123 ──WebSocket (só leitura)──▶ lib/haStream.ts ──SSE /api/stream──▶ navegador
```

Ver `specs/features/painel-tempo-real.md`. **Não há WebSocket no navegador**; o polling de 5 s é a reserva.
O áudio por Music Assistant (`/api/mass`) foi removido em 09/10/2026.

### Entrada externa

```
iPhone (Atalhos) → HA POST /api/webhook/<webhook_saude> → sensor.saude_*
```

## Estado dos dados

| Onde | O que guarda |
| :--- | :--- |
| `config/.storage/core.*_registry` | Dispositivos, entidades e áreas. **Reescritos pelo HA no desligamento** |
| `config/home-assistant_v2.db` | Histórico e eventos. SQLite em modo WAL, ~70 MB |
| `config/*.yaml` | Automações, sensores derivados, configuração |

## Integrações ativas (22, verificadas em `core.config_entries`)

`tuya`, `localtuya`, `switch_as_x` (×11), `sonoff`, `xiaomi_home` (×2 regiões), `smartthings`,
`samsungtv`, `ps5`, `browser_mod`, `findmy`, `glances`, `mobile_app` (×2), `met`, `sun`, `ping`,
`wake_on_lan`, `radio_browser`, `google_translate` (×2), `shopping_list`, `go2rtc`, `hacs`, `backup`,
`analytics`.

**Instalada e não concluída**: `alexa_media` (barrada pela chave de acesso da conta Amazon).

O Music Assistant (container, painel e scripts) foi removido em 09/10/2026. A entrada `music_assistant`
já não existia em `core.config_entries` desde antes; restavam só lápides em `deleted_entities` e
`deleted_devices`, que o HA descarta sozinho.

## Fragilidades estruturais conhecidas

| Ponto | Efeito |
| :--- | :--- |
| Painel roda `npm run dev` sob watchdog | A casa depende de um servidor de desenvolvimento |
| Pasta do projeto sincronizada pelo Google Drive | Injeta `desktop.ini` no build; há expurgo defensivo |
| Patch do Glances é volátil | Some quando o container é recriado do zero; a tarefa `CasaGlancesPatch` reaplica (e reinicia o HA) |
| HA depende do PC ligado | Se o PC dorme, a casa perde a automação |
| Sem multicast | Sem multiroom sincronizado, sem descoberta |
