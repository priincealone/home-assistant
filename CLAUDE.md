# Casa — Home Assistant

Projeto da casa inteligente do André: instalação self-hosted de Home Assistant
(Docker Desktop no PC Windows, imagem `ghcr.io/home-assistant/home-assistant:stable`,
porta 8123, acesso remoto via Tailscale) e a dashboard **"Casa"** — 14 páginas em
estilo Apple Home / iOS, construída com `button-card` + `card-mod` sobre o tema
`apple_home`.

Responder sempre em português do Brasil.

## Mapa do projeto

| Caminho | O que é |
| --- | --- |
| `ESTADO_DASHBOARD.md` | Diário técnico completo: o que foi construído, por quê, o que falhou e as pendências. Fonte de verdade do histórico. |
| `config/` | Config real do HA (montada no container). |
| `config/.storage/lovelace.minha_casa` | **A dashboard** (JSON). É aqui que as mudanças visuais acontecem. |
| `config/themes/apple_home.yaml` | Tema "Liquid Glass". |
| `config/custom_components/` | `browser_mod`, `localtuya`, `ps5`, `sonoff`, `alexa_media`, `hacs`. |
| `backups/` | Cópias do lovelace antes de cada alteração (`lovelace.minha_casa.bak_<tag>`). |
| `scripts/ha.py` | Utilitário: `load` / `save` / `backup` / `restart` / `views` / `templates` / `get`. |
| `scripts/lovelace/` | Scripts das alterações já aplicadas — histórico executável e base para os próximos. |
| `referencias/reference_ios_dashboard.yaml` | Dashboard de referência de design (34,5 mil linhas). |
| `referencias/` | Pesquisa e templates de exemplo extraídos dessa referência. |

## Como alterar a dashboard (fluxo obrigatório)

O editor RAW do navegador corrompe blocos grandes de YAML — a dashboard é sempre
editada pelo arquivo de storage, via script Python:

```bash
python scripts/ha.py views          # descobrir o índice da página
python scripts/ha.py get views.0    # inspecionar o trecho antes de mexer
```

Depois, um script novo em `scripts/lovelace/<assunto>.py`:

```python
import sys; sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
# ... alterações em cfg['data']['config'] ...
save(cfg, tag='assunto')   # faz backup automático em backups/
restart()                  # docker restart homeassistant
```

**O `docker restart homeassistant` não é opcional**: mudanças no `.storage` não
entram com recarregamento de YAML. Ao terminar, registrar o que mudou no fim do
`ESTADO_DASHBOARD.md`.

## Regras de design

- A referência padrão de estilo e estrutura é `referencias/reference_ios_dashboard.yaml`.
  Todo pedido de mudança visual segue esse modelo por padrão, salvo se o André
  pedir algo fora do padrão ou der uma referência nova.
- Replicar uma referência significa **reconstruir a arquitetura da tela**
  (proporção, densidade, hierarquia, modo de exibição) — não enxertar componentes
  soltos da referência sobre o que já existe.
- A referência foi feita para outra casa (câmeras Frigate, saúde, esportes,
  Spotify, radar de chuva — nada disso existe aqui). Extrair o design genérico e
  adaptar às entidades reais; quando um trecho depender de integração inexistente,
  dizer isso cedo em vez de preencher com substituto genérico.
- Botão de luz ligada usa `#FF9F0A`; apagada, `transparent`. Tomadas e não-luzes
  mantêm cor própria via `var_color`.
- Templates disponíveis em `button_card_templates` (dentro do próprio storage):
  `apple_scene`, `device_tile`, `divider`, `entity_card`, `heading`, `light_row`,
  `now_playing`, `panel_tile`, `room_header`, `room_mini`, `room_row`, `room_tile`,
  `sensor_tile`, `shortcut_tile`, `weather_widget`.

## Armadilhas conhecidas

- **Glances**: o patch de timeout dentro do container se perde sempre que ele é
  recriado do zero (só sobrevive a `docker restart`). Se o card do PC ficar
  "Indisponível", reaplicar:
  ```bash
  docker exec homeassistant sed -i "s/client.get(url)/client.get(url, timeout=15)/g" /usr/local/lib/python3.14/site-packages/glances_api/__init__.py
  ```
- **Browser Mod (popups)**: o campo do service é `content`, não `card`. Dentro do
  popup, usar cards nativos (`conditional`, `tile`) ou `button-card` simples —
  `button-card` com `custom_fields` aninhados não recebe `hass` e abre em branco.
- **Tema**: nunca aplicar `background: ... !important` genérico em `ha-card` —
  isso mata os gradientes dos `button-card`.
- **`min-content`** em `grid-template-rows/columns` zera a linha/coluna do ícone
  em `button-card`.
- Sidebar e cabeçalho não aceitam blur (`card-mod-root` não alcança esses
  elementos) — só `body` e cards.

## Comandos frequentes

```bash
docker restart homeassistant
docker logs --tail 50 homeassistant
python scripts/ha.py views
python scripts/ha.py backup <tag>
```

## Estado atual e pendências

Ver `ESTADO_DASHBOARD.md` (seção "Pendências"): luz/ventilador do quarto via
LocalTuya, scan 3D da casa, IP fixo do PS5, login do Alexa Media Player,
migração para um dispositivo dedicado, foto de fundo real e widgets de
termostato/calendário (sem entidades ainda).
