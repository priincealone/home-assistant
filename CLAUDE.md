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
`ESTADO_DASHBOARD.md` e fechar o ciclo com um commit:

```bash
git add -A && git commit -m "<o que mudou na dashboard>"
```

A pasta é um repositório git local (sem remote). Ficam fora do versionamento o
banco, logs, caches, HACS e tudo que carrega credencial (`secrets.yaml`, os
tokens em `.storage/auth*`, `core.config_entries`, `.storage/sonoff/`) — ao
adicionar arquivo novo com segredo, incluir no `.gitignore` antes do commit.

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
- Paleta: `#FF9F0A` (laranja/aceso), `#0A84FF` (azul), `#30D158` (verde),
  `#FF453A` (vermelho/alerta), `#5E5CE6` (roxo). As escalas dos medidores vão
  verde → laranja → vermelho. Cores de marca (Netflix, Prime, Spotify, Disney)
  são exceção legítima; fora isso, não introduza tom novo.
- Templates disponíveis em `button_card_templates` (dentro do próprio storage):
  `apple_scene`, `entity_card`, `light_row`, `now_playing`, `room_header`,
  `room_mini`, `sensor_tile`, `shortcut_tile`.
- Quatro templates **só de estilo**, criados para acabar com o CSS copiado card
  a card — use-os em vez de repetir `card_mod`: `nu` (transparente, sem moldura),
  `sem_moldura` (sem borda/sombra/blur e sem arredondamento), `sem_fundo`
  (transparente mantendo o arredondamento) e `borda_fina` (sem sombra/blur, com
  a borda de 1px do vidro). Num `button-card` que já usa template, some na lista:
  `"template": ["room_mini", "nu"]`. ⚠️ Não combine com `shortcut_tile` nem
  `room_header`: eles trazem `card_mod` próprio, e um sobrescreve o outro.
- Sete templates sem uso foram para `referencias/templates-arquivados.json`
  (`device_tile`, `room_tile`, `weather_widget`, `divider`, `heading`,
  `room_row`, `panel_tile`) — para reativar, é só colar de volta.

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

Em aberto também, do trabalho recente: o **Atalho do Apple Saúde** no iPhone
(os sensores e o deck já estão prontos, esperando dados reais), a **Larissa**
como usuária do HA com o app no iPhone dela — o que depende de resolver o
**acesso remoto** para fora da tailnet — e os **AirTags** no FindMy, parados
até haver um Mac para exportar as chaves.
