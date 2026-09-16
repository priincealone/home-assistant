# Inventário do Repositório — Home Assistant & Dashboard Casa

Data do Levantamento: 15/09/2026  
Ambiente: Windows (Host) + WSL2 / Docker Desktop (Containers)  
Status do Projeto: Fase de Consolidação e Governança Multi-Agente

---

## 1. Visão Geral da Estrutura

O repositório `c:\HomeAssistant` abriga dois projetos com ciclos de vida e repositórios Git independentes:

1. **Base do Home Assistant (`c:\HomeAssistant`)**:
   - Repositório Git local (sem remote configurado).
   - Gerencia a infraestrutura de automação residencial, configurações YAML do HA, registros de entidades e dispositivos, integrações personalizadas e scripts de diagnóstico/manutenção.
2. **Painel Visual (`c:\HomeAssistant\dashboard-app`)**:
   - Repositório Git próprio (branch `chore/ai-governance`, commit recente `6da6f66`).
   - Aplicação web moderna em Next.js 16 (App Router) + React 19 + Tailwind CSS v4, consumindo a REST API e WebSockets dos serviços locais.

```
c:\HomeAssistant\
├── .claude\                   # Configurações de contexto do Claude
├── .git\                      # Git da base do Home Assistant
├── .gitignore                 # Regras de exclusão do Git raiz
├── CASA.md                    # Documento canônico de infraestrutura, cômodos e pendências
├── CLAUDE.md                  # Regras operacionais do Claude Code
├── ESTADO_DASHBOARD.md        # Diário histórico de decisões e arquitetura
├── anisette\                  # Dados persistentes do servidor Anisette (FindMy Apple)
├── backups\                   # Backups JSON de registros (.storage) antes de alterações
├── config\                    # Diretório /config montado no container Home Assistant
│   ├── .storage\              # Registros internos do HA (entidades, dispositivos, áreas)
│   ├── automations.yaml       # Automações físicas ativas
│   ├── configuration.yaml     # Entrada principal do Home Assistant
│   ├── custom_components\     # Integrações HACS / personalizadas
│   ├── home-assistant_v2.db   # Banco de dados SQLite de eventos e estados
│   ├── scenes.yaml            # Cenas locais (atualmente vazio)
│   ├── scripts.yaml           # Scripts locais (atualmente vazio)
│   ├── secrets.yaml           # Credenciais e tokens de webhooks/integrações
│   └── template_sensors.yaml  # Sensores sintéticos consumidos pelo dashboard
├── dashboard-app\             # Aplicação Next.js do painel visual (Git próprio)
│   ├── app\                   # App Router (páginas, layouts e rotas de API)
│   ├── components\            # Componentes visuais UI (Liquid Glass)
│   ├── lib\                   # Modelos de cômodos (rooms.ts), cliente HA (ha.ts), utilitários
│   ├── package.json           # Dependências e scripts do dashboard
│   ├── iniciar_servidor_*.ps1 # Scripts de inicialização e watchdog do dashboard
│   └── .env.local             # Tokens de longa duração (HA_TOKEN, MASS_TOKEN)
├── music-assistant\           # Dados persistentes do Music Assistant 2.10.2
└── scripts\                   # Ferramentas Python/Node de diagnóstico e rede
    ├── diagnostico\           # Scripts de auditoria forense do banco SQLite
    ├── manutencao\            # Scripts de remoção/migração de registros
    ├── music_assistant\       # Ferramentas de API WebSocket do Music Assistant
    └── tuya_map.py            # Descoberta UDP de dispositivos Tuya na LAN
```

---

## 2. Stack Tecnológica Completa

| Camada | Tecnologia | Detalhes da Implementação |
| :--- | :--- | :--- |
| **Frontend Web** | Next.js 16.3.3, React 19.2.0 | App Router, Server/Client Components, Turbopack, PWA icons |
| **Estilização UI** | Tailwind CSS v4, PostCSS, Base-UI | Design System "Nocturnal Observatory" (Liquid Glass, 60fps blur) |
| **Backend de Aplicação** | Next.js Route Handlers (`app/api/*`) | Endpoints intermediários de proteção de token (`/state`, `/toggle`, `/mass`, `/energy`, etc.) |
| **Gateway de Automação** | Home Assistant Core 2026.9 | Docker Container (`homeassistant`), montagem direta de `config/` |
| **Serviço de Áudio Multiroom** | Music Assistant Server 2.10.2 | Container `music-assistant`, porta 8095 (Web) e 8097 (Stream) |
| **Provedor de Tokens (YT)** | Bgutil Provider | Container `bgutil-provider` (`http://bgutil-provider:4416`) |
| **Emulador Apple / iCloud** | Anisette Server | Container `anisette`, porta 6969, para integração `findmy` |
| **Banco de Dados Relacional** | SQLite 3 | `config/home-assistant_v2.db` (~70 MB, modo WAL ativado) |
| **Telemetria de Host** | Glances Web Server | Serviço Windows porta 61208, consumido pelo HA via `glances_api` |
| **Rede & Acesso Remoto** | Tailscale VPN + Docker Bridge | Sub-rede `100.x` Tailscale, rede Docker `casa-net` |
| **Watchdog / Supervisão** | PowerShell + Mutex Windows | `iniciar_servidor_background.ps1` rodando em loop na porta 3002 |

---

## 3. Integrações de Comunicação e Protocolos

### A. Integração REST
1. **Dashboard → Home Assistant**:
   - `GET /api/states`: Consulta consolidada em lote (1 chamada HTTP para todas as entidades).
   - `POST /api/services/{domain}/{service}`: Acionamento de luzes, tomadas, ventiladores, aspirador e modos.
   - `POST /api/services/weather/get_forecasts`: Previsão diária com fallback para atributos legados.
   - `GET /api/history/period/...`: Histórico de potência horária para sparklines energéticos.
2. **Dispositivos Externos → Home Assistant**:
   - `POST /api/webhook/<webhook_saude>`: Webhook recebendo telemetria de passos, calorias, sono e batimento cardíaco vinda do Apple Saúde via Atalhos do iPhone.

### B. Integração WebSocket
1. **Dashboard → Music Assistant Server**:
   - `ws://192.168.31.22:8095/ws`: Conexão sob demanda autenticada via token lido de `core.config_entries`, despachando comandos de reprodução, fila e bibliotecas.
2. **Home Assistant Interno**:
   - API WebSocket nativa do HA (`/api/websocket`) utilizada pelo frontend Lovelace administrativo e pela integração `browser_mod`.

### C. Integração MQTT
- **Uso Interno**: A integração `xiaomi_home` (`miot_mips.py`) utiliza a biblioteca `paho-mqtt` para comunicação de barramento interno e sincronização com a nuvem Xiaomi.
- **Broker Externo**: Não há broker MQTT externo dedicado (ex: Mosquitto) instalado localmente; dispositivos Tuya, Sonoff e Samsung comunicam-se via HTTP/UDP/REST direto.

---

## 4. Integrações Instaladas no Home Assistant

Identificadas via `core.config_entries` e `config/custom_components`:

1. **Nativas do Core**:
   - `tuya`: Integração em nuvem para interruptores e lâmpadas Tuya.
   - `samsungtv`: Controle local via rede da Smart TV Samsung UN65DU8000GXZD.
   - `smartthings`: Controle via nuvem SmartThings da mesma TV (usada para ler fonte/HDMI).
   - `switch_as_x`: 11 instâncias convertendo switches físicos em entidades `light.*`.
   - `met`: Previsão meteorológica do serviço meteorológico norueguês.
   - `sun`: Posição do sol e detecção de dia/noite.
   - `ping`: Monitoramento de conectividade de rede.
   - `wake_on_lan`: Despertar de periféricos de rede.
   - `google_translate`: Síntese de voz TTS em português e inglês.
   - `radio_browser`: Estações de rádio online.
   - `mobile_app`: Telemetria e controle dos apps de iPhone e iPad do André.
   - `backup`: Rotinas de backup do Home Assistant.
2. **Personalizadas (`custom_components`)**:
   - `localtuya`: Comunicação local direta com lâmpada/ventilador da Sala e do Quarto.
   - `sonoff`: Controle via LAN/Cloud da fita LED do escritório (`light.led_escritorio_sonoff_1001dff472`).
   - `xiaomi_home`: Integração com as regiões China e EUA (Luminária Yeelight e Robô Aspirador Dreame).
   - `xiaomi_miot`: Componente auxiliar de suporte ao protocolo MIoT.
   - `ps5`: Monitoramento e controle de estado do PlayStation 5.
   - `browser_mod`: Transforma navegadores em players de mídia e sensores de presença de tela.
   - `findmy`: Rastreamento de AirTags e dispositivos Apple via servidor Anisette local.
   - `alexa_media`: Instalada mas pendente de autenticação (bloqueada por passkey da conta Amazon).
   - `hacs`: Home Assistant Community Store para atualização de componentes da comunidade.

---

## 5. Ferramentas e Scripts de Suporte

Localizados em `c:\HomeAssistant\scripts`:

- `scripts/diagnostico/quem_acendeu.py`: Analisa o banco `home-assistant_v2.db` e correlaciona o `context_user_id` e `context_parent_id` para identificar se uma luz acendeu por clique humano, por automação do HA ou por gatilho externo da nuvem Tuya.
- `scripts/diagnostico/rajadas.py`: Analisa eventos em massa ocorrendo no mesmo timestamp para diferenciar restabelecimento de energia elétrica de acionamento deliberado.
- `scripts/tuya_map.py`: Captura pacotes UDP broadcast (portas 6666/6667) cifrados com chave AES padrão para mapear endereços IP e IDs de hardware dos dispositivos Tuya na rede local.
- `scripts/manutencao/retira_dashboard_casa.py`: Script de migração que removeu o dashboard legado Lovelace dos arquivos de storage `.storage/lovelace*`.
- `scripts/music_assistant/api_console.js`: Console REPL interativo via WebSocket para depuração direta de filas e players do Music Assistant.
- `scripts/music_assistant/ytmusic_setup.js`: Automação para provisionamento do provedor YouTube Music no Music Assistant.
