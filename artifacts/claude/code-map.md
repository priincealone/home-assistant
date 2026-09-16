# Mapa Real do Código — o que existe, e onde ficam as fronteiras

Data: 15/09/2026 · Auditor: Claude Code · Método: leitura direta dos arquivos e do registro do HA
Complementa `technical-audit.md`. **Nenhum arquivo foi alterado.**

---

## 1. Os três domínios, e o que de fato os separa

```
   FÍSICO / AUTOMAÇÃO               BORDA / TRANSPORTE            INTERFACE
   (Home Assistant)                 (Next.js server)              (React, navegador)

   config/automations.yaml          app/api/*/route.ts            app/page.tsx
   config/template_sensors.yaml     lib/ha.ts                     app/comodo/[id]/page.tsx
   config/.storage/core.*           (HA_TOKEN vive aqui)          app/standby/page.tsx
   custom_components/*                                            app/components/*.tsx
            ▲                              ▲                              │
            │   REST :8123                 │   fetch HTTP                 │
            └──────────────────────────────┴──────────────────────────────┘
                                           │
                                    lib/rooms.ts
                                  (contrato canônico)
```

A fronteira **token** está bem desenhada: `lib/ha.ts` declara no cabeçalho que nunca deve ser importado
por componente `"use client"`, e nenhuma rota devolve o token ao navegador. Essa parte está correta.

A fronteira **automação × interface** está furada em dois pontos, detalhados em
`automation-safety-audit.md` (§2): `app/api/scene/route.ts` e a cena "gamer".

---

## 2. Módulos que realmente existem

### Rotas de API — 10 (todas em `dashboard-app/app/api/<nome>/route.ts`)

| Rota | Métodos | O que faz | Valida entrada? |
| :--- | :--- | :--- | :--- |
| `state` | GET | 1 chamada a `/api/states` e filtragem em memória | — (leitura) |
| `toggle` | POST | `toggle` por domínio; desvia para aspirador | ✅ `todasEntidades` |
| `control` | POST | brilho, temperatura de cor, RGB, velocidade e direção | ✅ `todasEntidades` |
| `scene` | POST | 4 cenas com listas fixas de entidades | ⚠️ só o nome da cena |
| `vacuum` | POST | ações do robô e modo de sucção | ⚠️ `modo` livre |
| `tv` | POST | comando remoto, volume, mudo, fonte, apps | ⚠️ `comando` livre |
| `todo` | GET/POST | lista de compras | entidade fixa correta |
| `energy` | GET | histórico de potência em 24 baldes horários | — (leitura) |
| `weather` | GET | previsão com fallback para atributo legado | — (leitura) |
| `mass` | POST | ponte WebSocket com o Music Assistant | ⚠️ ação por `switch` |

### Biblioteca de transporte e contrato

| Arquivo | Conteúdo real |
| :--- | :--- |
| `lib/ha.ts` | 15 funções: estados, toggle, luz, ventilador, aspirador, TV (volume, mudo, fonte, app, remoto), PS5, lista de tarefas, previsão, histórico de energia |
| `lib/rooms.ts` | 10 cômodos, 68 `entity_id` distintos, `todasEntidades` (lista de permissão das rotas) |
| `lib/batteries.ts` | mapa de sensores de bateria |
| `lib/utils.ts`, `lib/wakeLock.ts` | utilidades e Screen Wake Lock para tablet |

### Componentes — 23 em `app/components/` (⚠️ **não** em `components/`)

`AmbientNightMode`, `BatteryAlertsBar`, `Clock`, `DeviceButton`, `DeviceTile`, `EnergyWidget`,
`FanControlCard`, `HeaderQuickActions`, `HealthWidget`, `LightDimmerModal`, `MediaHubModal`,
`MusicAssistantAudioSink`, `QuickScenesPanel`, `RoomCard`, `RoomPopup`, `SecurityAlertsBar`,
`SmartTruncateText`, `TodoListWidget`, `TvAppLogos`, `TvRemoteWidget`, `VacuumWidget`,
`WeatherForecastModal`, `WeatherWidget` (+ `icons.tsx`).

`components/` na raiz contém somente `ui/button.tsx` e `ui/card.tsx`.

### Páginas — 4

`app/page.tsx` (painel), `app/comodo/[id]/page.tsx` (cômodo), `app/standby/page.tsx` (repouso),
`app/layout.tsx`.

### Lado Home Assistant

| Arquivo | Conteúdo |
| :--- | :--- |
| `config/automations.yaml` | 5 automações ativas, cada uma com justificativa na `description` |
| `config/template_sensors.yaml` | `luzes_<cômodo>` (9), `luzes_acesas_total`, `tv_fonte`, `sala_atividade`, `saude_*` (6) |
| `config/configuration.yaml` | inclusões + tema; `scenes.yaml` e `scripts.yaml` existem e estão **vazios** |
| `scripts/diagnostico/`, `scripts/manutencao/`, `scripts/music_assistant/`, `scripts/tuya_map.py` | ferramentas, todas fora do caminho de execução da casa |

---

## 3. Fluxos de comunicação, como medidos

### REST — painel → Home Assistant (confirmado)

```
navegador --(HTTP)--> Next :3002 /api/state --(Bearer)--> HA :8123 GET /api/states
                                                          └─ 1 requisição, filtro em memória
navegador --(HTTP)--> Next :3002 /api/toggle -----------> HA POST /api/services/<dominio>/toggle
navegador --(HTTP)--> Next :3002 /api/control ----------> HA POST /api/services/light|fan/...
navegador --(HTTP)--> Next :3002 /api/energy -----------> HA GET  /api/history/period/...
navegador --(HTTP)--> Next :3002 /api/weather ----------> HA POST /api/services/weather/get_forecasts
                                                          └─ fallback para attributes.forecast
```

O lote em `/api/states` com filtragem local (`lib/ha.ts`, `getEstados`) é uma decisão acertada: uma
requisição em vez de ~68.

### WebSocket — apenas servidor → Music Assistant

```
Next :3002 /api/mass --(ws sob demanda)--> ws://192.168.31.22:8095/ws
                                            ├─ auth por token (env ou core.config_entries)
                                            └─ play, pause, next, previous, stop, volume,
                                               play_playlist, play_media
```

**Não existe WebSocket no navegador.** A atualização da tela é *polling* de 5 s
(`app/page.tsx:104-108`), suspenso quando a aba fica oculta (`visibilitychange`), com travas otimistas
de 5 s (`app/page.tsx:182`).

### Entrada externa

`POST /api/webhook/<webhook_saude>` no HA, alimentado pelo Atalho do iPhone → `sensor.saude_*`.

---

## 4. O contrato canônico, e seu estado

`lib/rooms.ts` cumpre dois papéis: descreve a casa para a interface **e** funciona como lista de
permissão das rotas `toggle` e `control`. Isso é bom para segurança e ruim para acoplamento: uma
entidade fora dela é inacessível pelo painel, inclusive para leitura.

Estado medido: **68 entidades citadas, 64 existem, 4 não** (D-02 na auditoria técnica) e **1 par
invertido** (D-01). Entidades fantasma não quebram o build — TypeScript não valida strings contra o HA
— e chegam à interface como estado nulo silencioso.

### Cruzamento cômodo a cômodo (registro do HA × `lib/rooms.ts`)

| Cômodo | Registro do HA | `lib/rooms.ts` | Situação |
| :--- | :--- | :--- | :--- |
| Sala de estar | `luz_sala`, `painel`, `ventilador_sala`, TV, PS5, `ventilacao_ps5` | idem + temperatura/umidade | ✅ |
| Cozinha | `..._switch_1` | `..._switch_3` | ❌ invertido |
| Copa | `..._switch_2` | `..._switch_2` | ✅ |
| Lavanderia | `..._switch_3` + sensor de movimento | `..._switch_1` + sensor | ❌ invertido |
| Área Gourmet | `luzes_externas_switch_1..4` + movimento | idem | ✅ |
| Circulação | `circulacao_switch_1/2` | idem | ✅ |
| Quarto | `luz_quarto`, `ventilador_quarto`, porta | idem | ✅ |
| Quarto Luca | luz, luminária Yeelink, tomadas | idem | ✅ |
| Closet | luz, LED Sonoff, tomadas PC, aspirador | idem + `sensor_closet_movimento` | ⚠️ sensor inexistente |
| Banheiro | `banheiro_switch_1/2` | idem + `sensor_banheiro_movimento` | ⚠️ sensor inexistente |

---

## 5. Onde o código contradiz os documentos de governança

| Documento diz | Código mostra |
| :--- | :--- |
| Biblioteca em `dashboard-app/components/` | Está em `app/components/`; `components/` só tem `ui/` |
| Trava otimista 3,5 s | 5000 ms |
| Tablet fala WebSocket com o painel | Só *polling* HTTP |
| Token do MASS vem de `core.config_entries` | Entrada não existe mais; vale o `.env.local` |
| `app/api/*` é fronteira neutra de transporte | `scene` e `vacuum` embutem decisões físicas |
| Cozinha = tecla 1 (canônico) | `rooms.ts` usa tecla 3 |
