# Casa — Home Assistant

Base de automação residencial do André: Home Assistant self-hosted (Docker
Desktop no PC Windows, porta 8123, acesso remoto via Tailscale), com as
integrações, os dispositivos e as automações da casa.

Responder sempre em português do Brasil.

## Dois projetos, uma direção

- **Esta pasta** é a base: dispositivos, integrações, áreas, automações e
  sensores de template. É onde se trabalha aqui.
- **`dashboard-app/`** é o **painel principal** desde 15/09/2026 — interface
  própria em Next.js que consome a API do HA, desenvolvida pelo André no
  Antigravity, com git próprio. **Não editar sem pedido inequívoco.**

A dashboard Lovelace "Casa" foi retirada em 15/09/2026. Não recriar, não propor
melhorias visuais no Lovelace.

## Mapa

| Caminho | O que é |
| --- | --- |
| `CASA.md` | **Ponto de partida**: infraestrutura, dispositivos por cômodo, automações ativas e propostas, pendências |
| `ESTADO_DASHBOARD.md` | Diário completo, com o raciocínio de cada decisão (inclui a história da dashboard retirada) |
| `config/automations.yaml` | As automações — cada uma explica a si mesma na `description` |
| `config/template_sensors.yaml` | Sensores de luzes por cômodo, TV e saúde. **O `dashboard-app` depende deles** |
| `config/.storage/` | Registros de dispositivos, entidades e áreas |
| `scripts/diagnostico/` | Quem acendeu o quê, e por quê |
| `scripts/music_assistant/` | Cliente da API do Music Assistant e setup do YouTube Music |
| `scripts/tuya_map.py` | Mapeia aparelhos Tuya na LAN |
| `backups/` | Cópias dos registros antes de cada edição |

## O que o `dashboard-app` consome desta base

Não quebrar sem avisar:

- `sensor.luzes_<comodo>`, `sensor.tv_fonte`, `sensor.saude_*` — de
  `config/template_sensors.yaml`
- o token do Music Assistant, lido direto de `config/.storage/core.config_entries`
- entidades de luz, ventilador, mídia e aspirador pelos `entity_id` atuais —
  **renomear uma entidade quebra o painel**

## Como alterar

**Automações e sensores (YAML):** editar o arquivo e recarregar pelo serviço
(`automation.reload`, `template.reload`) — sem reiniciar.

**Registros (`core.entity_registry`, `core.device_registry`, `core.area_registry`,
`core.config`):** o Home Assistant os **reescreve no desligamento**. Script
versionado, validações antes de parar, `docker stop`, editar, `docker start`.
Nunca `docker restart`.

**Ao terminar:** registrar no fim de `ESTADO_DASHBOARD.md`, atualizar `CASA.md` se
mudou dispositivo, automação ou pendência, e commitar:

```bash
git add -A && git commit -m "<o que mudou>"
```

Repositório local sem remote. Fora do versionamento: banco, logs, caches, HACS,
`dashboard-app/`, e tudo que carrega credencial (`secrets.yaml`, `.storage/auth*`,
`core.config_entries`, `.storage/sonoff/`, dados do Music Assistant e do anisette).

## Armadilhas conhecidas

- **Comando de desligar não é idempotente.** Nesta TV Samsung, `turn_off` é a
  tecla POWER, que alterna — com a TV desligada, liga. Condicionar ao estado.
- **Nuvem Tuya tem automações próprias** (app Smart Life), que agem sem passar
  pelo HA. Antes de criar automação de presença, checar se já existe uma lá.
  Desativar a entidade `scene.*` no HA não para a rotina na nuvem.
- **Rede do Docker Desktop:** multicast não chega à LAN (sem mDNS, AirPlay,
  Chromecast, descoberta). Dentro de container, `127.0.0.1` é o próprio container.
- **Glances:** o patch de timeout some quando o container é recriado do zero:
  ```bash
  docker exec homeassistant sed -i "s/client.get(url)/client.get(url, timeout=15)/g" /usr/local/lib/python3.14/site-packages/glances_api/__init__.py
  ```
- **O Python do Windows às vezes não responde.** Scripts de leitura rodam pelo do
  container: `docker exec -i homeassistant python - < script.py`.
- **Estados iguais escondem inversões** — conferir interruptores ligando um de
  cada vez.

## Comandos frequentes e validações

```bash
docker logs --tail 50 homeassistant
docker exec -i homeassistant python - < scripts/diagnostico/quem_acendeu.py
docker ps --format '{{.Names}} | {{.Status}}'
# Validação de sintaxe antes de recarregar
docker exec -i homeassistant python -m homeassistant --script check_config -c /config
```

## Governança e Alçadas (proprietário André)

- **Documento mestre de governança:** `artifacts/antigravity/multi-agent-governance.md`
- **Matriz de propriedade de arquivos:** `artifacts/antigravity/file-ownership.md`
- **Registro de riscos (RSK-01 a RSK-10):** `artifacts/antigravity/risk-register.md`
- **Nível 1 (Autônomo):** Scripts read-only, recarga de automações já existentes.
- **Nível 2 (Plano prévio /plan):** Novas automações em YAML, edição de `.storage`, alteração de contratos.
- **Nível 3 (Exclusivo do André):** Segredos (`secrets.yaml`), tokens, regras na nuvem Tuya e rede.
