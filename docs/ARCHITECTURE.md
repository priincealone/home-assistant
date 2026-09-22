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
| `music-assistant` | container | 8095 | Biblioteca e fila de áudio |
| `bgutil-provider` | container | 4416 | Provedor de token do YouTube (só para o Music Assistant) |
| Painel Next.js | processo do Windows | 3002 | Interface, sob watchdog PowerShell |
| Glances | serviço do Windows | 61208 | Telemetria do PC, lida pelo HA |

`homeassistant`, `music-assistant` e `bgutil-provider` estão na rede Docker `casa-net` e se enxergam
pelo nome.

## Rede — o limite que define o resto

Docker Desktop sobre WSL2 em modo NAT. **Unicast atravessa; multicast não.**

- Funciona: Tuya, TV, PS5, aspirador, Glances — tudo por IP direto
- Não funciona: mDNS, descoberta automática, AirPlay, Chromecast
- Dentro de um container, `127.0.0.1` é o próprio container, nunca o Windows

Consequência prática: áudio multiroom sincronizado não é configurável neste hospedeiro. É a razão
técnica da migração para hardware dedicado no roadmap.

⚠️ O IP do PC (`192.168.31.22`) é **DHCP** e está escrito fixo em `app/api/mass/route.ts`. Se mudar, o
painel perde o Music Assistant e o webhook de saúde para de chegar.

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

### Áudio (servidor → Music Assistant)

```
:3002 /api/mass → ws://192.168.31.22:8095/ws   (WebSocket sob demanda, autenticado)
```

**Não há WebSocket no navegador.** A tela atualiza por polling.

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
| `music-assistant/data` | Dados do container |

## Integrações ativas (22, verificadas em `core.config_entries`)

`tuya`, `localtuya`, `switch_as_x` (×11), `sonoff`, `xiaomi_home` (×2 regiões), `smartthings`,
`samsungtv`, `ps5`, `browser_mod`, `findmy`, `glances`, `mobile_app` (×2), `met`, `sun`, `ping`,
`wake_on_lan`, `radio_browser`, `google_translate` (×2), `shopping_list`, `go2rtc`, `hacs`, `backup`,
`analytics`.

**Instaladas e não concluídas**: `alexa_media` (barrada pela chave de acesso da conta Amazon) e o
provedor YouTube Music dentro do Music Assistant (faltam usuário e cookie).

⚠️ **A entrada `music_assistant` não existe mais** em `core.config_entries`, embora o container esteja
no ar e o painel continue falando com ele pelo token do `.env.local`.
❓ **DESCONHECIDO** — quando e por que essa entrada saiu.

## Fragilidades estruturais conhecidas

| Ponto | Efeito |
| :--- | :--- |
| Painel roda `npm run dev` sob watchdog | A casa depende de um servidor de desenvolvimento |
| Pasta do projeto sincronizada pelo Google Drive | Injeta `desktop.ini` no build; há expurgo defensivo |
| Patch do Glances é volátil | Some quando o container é recriado do zero |
| HA depende do PC ligado | Se o PC dorme, a casa perde a automação |
| Sem multicast | Sem multiroom sincronizado, sem descoberta |
