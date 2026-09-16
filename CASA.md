# Casa — base do Home Assistant

A camada de dispositivos, integrações e automações da casa do André. Desde
15/09/2026 o **painel** é o `dashboard-app/` (Next.js, desenvolvido no
Antigravity), que consome esta base pela API do Home Assistant. A dashboard
Lovelace "Casa", que existiu de 03/09 a 15/09, foi retirada — o histórico dela
continua no git e em `ESTADO_DASHBOARD.md`.

Este arquivo é o ponto de partida. `ESTADO_DASHBOARD.md` é o diário completo, com
o raciocínio de cada decisão.

## Infraestrutura

| Peça | Onde |
| --- | --- |
| Home Assistant 2026.9 | container `homeassistant`, Docker Desktop (WSL2), porta 8123, config em `config/` |
| Music Assistant 2.10.2 | container `music-assistant`, porta 8095, dados em `music-assistant/data` |
| Servidor de PO token (YouTube) | container `bgutil-provider`, alcançado como `http://bgutil-provider:4416` |
| Servidor anisette (FindMy) | container `anisette`, porta 6969, dados em `anisette/data` |
| Painel | `dashboard-app/`, porta 3002, git próprio |
| Acesso remoto | Tailscale |
| IP do PC na LAN | `192.168.31.22` (DHCP — **precisa de reserva**) |

⚠️ **Rede.** Os containers rodam em *bridge* sobre o WSL2 em modo NAT. Unicast
chega à LAN (é por isso que Tuya, TV e aspirador funcionam), mas **multicast não**:
mDNS, descoberta automática, AirPlay e Chromecast não enxergam os aparelhos.
`homeassistant`, `music-assistant` e `bgutil-provider` estão na rede `casa-net` e
se enxergam pelo nome. Dentro de um container, `127.0.0.1` é o próprio container,
nunca o Windows.

⚠️ **Glances.** O patch de timeout se perde sempre que o container é recriado do
zero (só sobrevive a `docker restart`). Se as métricas do PC caírem:

```bash
docker exec homeassistant sed -i "s/client.get(url)/client.get(url, timeout=15)/g" /usr/local/lib/python3.14/site-packages/glances_api/__init__.py
```

## Integrações

`tuya` (nuvem) e `localtuya` · `switch_as_x` (11×, transforma interruptor em luz) ·
`sonoff` · `xiaomi_home` (duas regiões: China e Estados Unidos) · `smartthings` e
`samsungtv` · `ps5` · `music_assistant` · `browser_mod` · `findmy` · `glances` ·
`mobile_app` (iPhone e iPad do André) · `met` · `sun` · `ping` · `wake_on_lan` ·
`radio_browser` · `google_translate` (TTS em inglês e em português) · `hacs` ·
`backup`.

Instaladas mas **sem configuração concluída**: `alexa_media` (barrada pela chave de
acesso da conta Amazon) e o provedor YouTube Music no Music Assistant (faltam
usuário e cookie).

## Dispositivos por cômodo

| Cômodo | Entidades |
| --- | --- |
| **Sala de estar** | `light.luz_sala` e `fan.ventilador_sala` (LocalTuya, um aparelho aberto em dois) · `light.painel` · `media_player.tv_un65du8000gxzd` (local) e `media_player.sala_de_estar_tv` (nuvem, oculta) · `media_player.sala_de_estar_ps5` · `switch.ventilacao_ps5` (alimenta o ventilador externo do console) |
| **Quarto** | `light.luz_quarto` e `fan.ventilador_quarto` (LocalTuya, mesma separação da Sala) · `binary_sensor.porta_do_quarto_porta` |
| **Quarto Luca** | `light.quarto_luca_switch_1` · luminária Yeelink `light.yeelink_cn_581528686_bslamp2_s_2_light` · tomada `switch.tomada_inteligente_socket_1/2` |
| **Closet** | `light.closet_switch_1` · `light.led_escritorio_sonoff_1001dff472` · tomada `switch.computador_socket_1/2` · aspirador `vacuum.dreame_us_415783444_mc1808` · roteador "Roteador Closet" |
| **Cozinha** | `light.cozinha_copa_varanda_switch_1` |
| **Copa** | `light.cozinha_copa_varanda_switch_2` |
| **Lavanderia** | `light.cozinha_copa_varanda_switch_3` · `binary_sensor.sensor_lavanderia_movimento` |
| **Área Gourmet** | `light.luzes_externas_switch_1` Plafon Área Gourmet · `_2` Pendente · `_3` Led · `_4` Spots · `binary_sensor.sensor_area_gourmet_movimento` |
| **Circulação** | `light.circulacao_switch_1` Muro · `light.circulacao_switch_2` Corredor |
| **Banheiro** | `switch.banheiro_switch_1` e `_2` |

⚠️ O interruptor de três teclas da Cozinha/Copa/Lavanderia chama-se
`cozinha_copa_varanda`; a tecla 3 é a Lavanderia. Cozinha e Lavanderia já
estiveram trocadas, e **estados iguais escondem inversões** — confira ligando uma
de cada vez.

### Sensores que o painel consome

Criados em `config/template_sensors.yaml` — **o `dashboard-app` depende deles**:

  - `sensor.luzes_<comodo>` e `sensor.luzes_acesas_total` — quantas luzes acesas
  - `sensor.tv_fonte` e `sensor.sala_atividade` — o que está passando na sala
  - `sensor.saude_*` — passos, distância, calorias, FC de repouso, sono e
    horário da última atualização, alimentados por webhook (id em
    `secrets.yaml`, chave `webhook_saude`)

O `dashboard-app` também lê o token do Music Assistant direto de
`config/.storage/core.config_entries` (`app/api/mass/route.ts`).

## Automações ativas

Todas em `config/automations.yaml`, cada uma com a justificativa na `description`.

**1. Ventilação do PS5 acompanha o console.** Liga `switch.ventilacao_ps5`
quando o console entra em uso; desliga dois minutos depois que ele sai. Decide
pelo **estado atual**, não pelo gatilho, e se reconcilia a cada 5 minutos e na
partida do Home Assistant — a primeira versão perdia o desligamento quando o
container reiniciava no meio da espera.

**2. Porta do quarto fechada à noite apaga a casa.** Das 22h às 6h, fechar a
porta apaga todas as luzes e desliga a TV. As luzes vêm de template (luz nova
entra sozinha), excluindo as luzes de fundo dos interruptores, os LEDs dos
roteadores e a tela do navegador. **A luz do próprio quarto está incluída.**

⚠️ Esta TV Samsung desliga com a tecla POWER, que **alterna**: com a TV já
apagada, "desligar" a acende. A automação só manda o comando com a TV ligada, e
por um caminho de cada vez — local, e a nuvem só se o local não responder.

**3. Porta do quarto aberta à noite acende o painel.** Das 22h às 6h, abrir a
porta acende `light.painel` como luz de guia.

**4. Movimento na Lavanderia acende a luz à noite.** Do pôr do sol ao amanhecer.
Dez minutos sem movimento, apaga.

**5. Movimento na Área Gourmet acende as luzes à noite.** As quatro luzes, mesma
regra.

Nas automações 4 e 5, o temporizador é o `for: '00:10:00'` do próprio gatilho
(reinicia sozinho a cada movimento) e a condição de sol guarda **só o acender** —
no apagar, uma luz acesa perto do amanhecer ficaria acesa para sempre. Nas
automações 2 e 3, a janela vai até as 6h porque uma condição só com
`after: 22:00` para à meia-noite.

## Automações propostas, ainda não feitas

1. **Saiu de casa → apaga tudo**, incluindo os ventiladores, quando
   `person.andre` vira `not_home`. Seguro enquanto houver uma pessoa só; quando a
   Larissa entrar, vira "ninguém em casa".
2. **Chegando à noite → luz de acolhimento**, com `person.andre` mudando para
   `home` e o sol já posto.
3. **Aspirador quando a casa esvazia** — presença combinada com o `vacuum`, melhor
   que horário fixo.
4. **Um interruptor para suspender cada automação** no painel. Automação de
   movimento sem jeito fácil de desligar vira incômodo no dia em que se quer a luz
   apagada.

Adiadas de propósito: alertas de consumo pelas tomadas (sem semanas de histórico
não há como saber o que é anômalo) e usar o sensor de luz da TV como referência
de claridade (mede a sala, não o cômodo do movimento).

## Pendências

- **Conflito com a nuvem Tuya.** O app Smart Life tem automações de presença
  próprias (`scene.lavanderia_em_uso` / `_vazia`, `scene.banheiro_em_uso` /
  `_vazio`, `scene.acender_apagar`). A da Lavanderia **disputa a mesma luz** com a
  automação 4. Desligar no app a que sobrar. As cenas do banheiro estão
  desativadas no HA, mas **continuam rodando na nuvem** — desativar a entidade
  daqui não para a rotina de lá.
- **Reserva de DHCP** no roteador para o PS5 e para o PC (`192.168.31.22`), que
  virou endereço de serviço do Music Assistant.
- **Alexa Media Player** — a conta Amazon usa passkey, que não atravessa o proxy
  da integração. Caminho: trocar para senha + verificação em duas etapas por app
  autenticador.
- **YouTube Music** — falta o usuário e o cookie; `scripts/music_assistant/ytmusic_setup.js`
  faz o resto sem passar pela interface do Music Assistant, que trava.
- **Som ambiente** — caixas embutidas (música, sincronizadas pelo Music Assistant)
  e Echos (voz e avisos). O ponto de som atual é o navegador via `browser_mod`,
  que só toca com a página aberta e depois de um toque na tela. Multiroom depende
  de resolver a rede multicast.
- **Atalho do Apple Saúde** no iPhone — os sensores funcionam, os valores ainda
  são do teste.
- **AirTags** — anisette e integração prontos; o arquivo de chaves só sai de um Mac.
- **Larissa no HA** — depende de acesso remoto fora da tailnet.
- **Termostato e calendário** — sem `climate.*` nem `calendar.*`.
- **Migração para dispositivo dedicado** — o HA cai quando o PC dorme, e a rede do
  Docker Desktop é o teto do som ambiente.

## Ferramentas

| Arquivo | Para quê |
| --- | --- |
| `scripts/diagnostico/quem_acendeu.py` | Quem acendeu cada luz: pessoa, automação do HA, ou fora do HA |
| `scripts/diagnostico/rajadas.py` | Distingue acendimento por retorno de energia de acendimento por comando |
| `scripts/tuya_map.py` | Decifra os anúncios UDP da Tuya e mapeia aparelho → IP |
| `scripts/music_assistant/api_console.js` | Cliente da API do Music Assistant, para quando a interface trava |
| `scripts/music_assistant/ytmusic_setup.js` | Adiciona o YouTube Music |

Os scripts de diagnóstico rodam pelo Python do container, sem depender do Python do
Windows:

```bash
docker exec -i homeassistant python - < scripts/diagnostico/quem_acendeu.py
```

## Regras de trabalho com os registros

`core.entity_registry`, `core.device_registry`, `core.area_registry` e
`core.config` são **reescritos pelo Home Assistant no desligamento**. Para editar:
validar antes, `docker stop`, editar, `docker start` — nunca `docker restart`.

**Ocultar não é desativar.** `hidden_by` tira das listagens e mantém estado, API e
automações; `disabled_by` tira de tudo. E o que uma integração viva ainda enxerga
**não se apaga, se desativa**: apagar um dispositivo reativa os filhos que ele
havia desativado.
