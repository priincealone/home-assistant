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
`backup` · `generic` (câmeras do DVR Intelbras, ver seção **Câmeras**).

Instaladas mas **sem configuração concluída**: `alexa_media` (barrada pela chave de
acesso da conta Amazon) e o provedor YouTube Music no Music Assistant (faltam
usuário e cookie).

## Dispositivos por cômodo

| Cômodo | Entidades |
| --- | --- |
| **Sala de estar** | `light.luz_sala` e `fan.ventilador_sala` (LocalTuya, um aparelho aberto em dois) · `light.painel` · `media_player.tv_un65du8000gxzd` (local) e `media_player.sala_de_estar_tv` (nuvem, oculta) · `media_player.sala_de_estar_ps5` (liga por WAKEUP; **repouso por Remote Play** desde 25/09/2026, com as chaves gravadas no repareamento — só age com o console ligado, ver `specs/features/ps5-desligar-remote-play.md`) · `switch.ventilacao_ps5` (alimenta o ventilador externo do console) |
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

## Câmeras

DVR **Intelbras MHDX 1204-C Dual Audio** (`192.168.31.216`, **IP fixo configurado no próprio
DVR** em 24/09/2026 — antes era DHCP e mudou `.216`→`.217` em 20/09 e `.217`→`.216` em 24/09,
derrubando as câmeras; ver `ESTADO_DASHBOARD.md` e K-06). Sem reserva no roteador, o `.216`
segue livre na faixa de DHCP: se outro aparelho o receber, haverá conflito. 4 canais, dos quais 2
ativos — canais 2 e 4, ambos com visão externa para a rua. Câmeras físicas:
Intelbras VHD 3230 (analógicas, ligadas por coaxial ao DVR; não têm IP próprio).

Integrado via **Câmera genérica** (`generic`), não ONVIF — o DVR aceita conexão
na porta ONVIF padrão (80) mas fecha `/onvif/device_service` sem responder,
então o ONVIF está desabilitado ou indisponível nesse firmware. RTSP direto
funcionou de primeira, no formato que o próprio DVR expõe em
Configurações → Rede → Porta:

```
rtsp://<usuário>:<senha>@192.168.31.216:554/cam/realmonitor?channel=<N>&subtype=0
```

`subtype=0` é o stream principal (alta qualidade) — trocado de `subtype=1`
(stream extra, menor) em 18/09/2026 a pedido do André, que achou a imagem
ruim demais tanto ao vivo quanto nos clipes gravados. "Sem HD" sobreposto na
imagem é aviso do próprio DVR de **disco não instalado**, não indicador de
qualidade de stream — não muda com o `subtype`.

Entidades: `camera.rua_canal_2` e `camera.rua_canal_4`.

⚠️ **A URL de stream precisa da senha embutida de verdade — `{{ username }}` /
`{{ password }}` como template não funciona.** Esses dois placeholders só são
resolvidos na pré-visualização da própria tela de configuração (por isso
pareciam funcionar); na operação real (gravação, visualização ao vivo), o
Home Assistant renderiza o template sem essas variáveis no contexto, e a URL
vira `rtsp://:@IP:554/...` — falha silenciosa que gerou horas de diagnóstico.
A correção é digitar a credencial real na própria URL (`rtsp://usuario:senha@IP:...`),
não usar os campos separados "Usuário"/"Senha" do formulário (esses só valem
para autenticação HTTP de imagem estática, não para o stream RTSP). **Efeito
colateral**: o campo de URL, ao reabrir "Opções" da integração, mostra a senha
em texto claro, sem máscara — evite tirar captura de tela dessa tela.

### Clipe de movimento → e-mail → gravação (18/09/2026)

Pipeline funcionando ponta a ponta (ver `specs/features/clipes-movimento-nuvem.md`):

1. DVR detecta movimento nos canais 2 e 4 → manda e-mail (SMTP Gmail,
   `an.diogo98@gmail.com`) com foto anexada
2. Filtro do Gmail arquiva e aplica o marcador "DVR" — não notifica o André
3. Integração `imap` do HA lê esse marcador, dispara o evento `imap_content`
   a cada e-mail novo
4. Automação **"Movimento nas câmeras da rua grava clipe de 30s"**
   (`config/automations.yaml`) grava 30s de cada câmera via `camera.record`,
   salvando em `config/www/clipes_movimento/<câmera>_<data>_<hora>.mp4`

Testado disparando o evento `imap_content` manualmente (Ferramentas de
Desenvolvedor → Eventos) — os dois clipes gravaram com tamanho e conteúdo
válidos. Como o assunto do e-mail é igual para os dois canais, a automação
grava as **duas** câmeras a cada alarme, em vez de tentar identificar qual
disparou.

### Upload para o Google Drive (18/09/2026)

**Conta de serviço do Google Cloud não funciona para isso** — contas de
serviço não têm cota de armazenamento em Drive pessoal (só em Google
Workspace, com "shared drives"). Tentei primeiro por esse caminho
(`config/google_drive_service_account.json`, projeto `casa-cameras` no Google
Cloud) e o upload falhava com `storageQuotaExceeded`.

**O que funciona**: `rclone`, autenticado como a própria conta do André
(OAuth, autorização feita uma vez no navegador — não uma conta de serviço).
Remoto `gdrive_cameras` configurado em `%APPDATA%\rclone\rclone.conf`. A
sincronização roda **fora do container**, numa Tarefa Agendada do Windows
("CameraClipesDriveSync", a cada 5 minutos, script em
`scripts/camera_upload/sincronizar_clipes_drive.ps1`):

```
rclone move config/www/clipes_movimento gdrive_cameras:"Câmeras - Clipes de Movimento" --include "*.mp4" --min-age 30s
rclone delete gdrive_cameras:"Câmeras - Clipes de Movimento" --min-age 7d
```

`--min-age 30s` evita pegar um clipe que o ffmpeg ainda esteja gravando;
`rclone delete --min-age 7d` é a limpeza semanal pedida pelo André — sem
precisar de lógica própria de retenção. Testado ponta a ponta: evento →
gravação → sincronização → arquivo aparece na pasta certa do Drive → clipe
local apagado.

⚠️ **Aviso do próprio rclone**: o `client_id` compartilhado que ele usa por
padrão "está sendo desativado, deve parar de funcionar durante 2026" —
quando isso quebrar, criar um client_id próprio
(https://rclone.org/drive/#making-your-own-client-id) e rodar
`rclone config reconnect gdrive_cameras:`.

### Card com vídeo ao vivo no "Painel de controle" (19/09/2026)

Na tela **Dispositivos** (dashboard `dashboard-dispositivos`, estratégia
`original-states`), o card de câmera só mostra imagem depois de clicar —
essa dashboard é gerada automaticamente e não permite configurar `camera_view`
por card. Tentei primeiro evitar Lovelace: testar se o DVR aceita snapshot
HTTP puro (`/cgi-bin/snapshot.cgi?channel=N`), o que resolveria em qualquer
tela sem editar nenhum dashboard. A autenticação Digest funcionou (testado
por script rodando dentro do container, sem a senha passar pela conversa),
mas o DVR recusou com `ErrorCode 268632081` (permissão insuficiente para essa
API) — ajuste de conta no próprio DVR, fora de alçada do agente.

Como o André não quis converter a dashboard "Dispositivos" para manual (perde
a atualização automática quando um dispositivo novo é adicionado), a solução
ficou no **"Painel de controle"** (`lovelace.painel_de_controle`, já é uma
dashboard manual/`sections`, sem estratégia — editar aqui não desativa nada
automático). Adicionei uma seção "Câmeras" com dois cards **Entidade de
imagem** (`picture-entity`), um por câmera, com `camera_view: live` — assim a
imagem já aparece tocando ao vivo, sem precisar abrir o card.

### Reprodução na TV da sala — descartado e removido (19/09/2026)

Tentativa de mostrar as câmeras da rua na TV Samsung via DLNA. Chegou a funcionar
parcialmente (negociação DLNA aceita), mas travava ao decodificar de fato — a
câmera manda H.264 **High Profile** e a TV só decodifica **Main/Baseline** por
esse caminho. Resolver exigiria transcodificar (CPU real) ou trocar de hardware
(Fire TV Stick). André decidiu não seguir e **remover tudo**, não só pausar:

- Integração `dlna_dmr` excluída pela UI do HA (era a entidade
  `media_player.sala_de_estar_tv_sala_dlna`).
- Containers `go2rtc-cameras` e `go2rtc-tv-proxy` parados e removidos, junto com
  as imagens Docker (`alexxit/go2rtc`, `nginx:alpine`) que só existiam para isso.
- Pasta `go2rtc-cameras/` apagada do disco (guardava a senha do DVR em texto
  puro — mais um motivo pra não deixar resquício).
- `specs/features/reproducao-cameras-tv.md` mantida só como registro histórico
  do diagnóstico (perfil H.264 incompatível), marcada como descartada no topo.

Nada físico foi tocado (é a TV e os containers, não um atuador de risco).

### Vídeo ao vivo no painel (dashboard-app) — 23/09/2026

`CameraLivePlayer` (HLS via `hls.js` 1.5.17, dependência local) ← proxy `app/api/camera/[id]/hls/[...file]` ←
HA (`camera/stream` por WebSocket, componente `stream`/PyAV — **não** depende do go2rtc). Modos: `live` (LL-HLS,
modal) e `glance` (miniatura). Detalhes e medições em `ESTADO_DASHBOARD.md` (23/09). Fora disso, `snapshot` e
`stream` do painel são código morto e o go2rtc embutido do HA falha em `frame.jpeg` (K-15 em `planning/BLOCKED.md`).
As rotas `/api/camera*` do painel são públicas (sem PIN) — ver K-11.

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
quando o console entra em uso (~1 s); desliga **um minuto** depois que ele sai
(era dois, até 25/09/2026). Decide pelo **estado atual**, não pelo gatilho, e se
reconcilia **a cada minuto** e na partida do Home Assistant — a primeira versão
perdia o desligamento quando o container reiniciava no meio da espera, e em 25/09
se mediu que só o gatilho `for` não desligava no prazo. Só chama a tomada quando
ela está no estado contrário. Ao entrar em repouso o console oscila entre
`unavailable` e `off` por ~50 s, então o desligamento sai ~2 min depois do comando.

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
Apaga só com **dez minutos sem movimento na Lavanderia e na Área Gourmet** (desde
23/09/2026); os dois sensores têm gatilho, então a luz apaga quando o último dos
dois esvazia.

**5. Movimento na Área Gourmet acende as luzes à noite.** As quatro luzes, mesma
regra.

**6. Muro e Painel acesos do pôr do sol à meia-noite** (19/09). Acende
`light.circulacao_switch_1` e `light.painel` no evento de pôr do sol; apaga às
00h. O acender é de borda — dispara uma vez e não reacende, então o que for
apagado à mão fica apagado. Se o HA voltar de um reinício entre 00:00 e 00:30,
apaga o que ficou aceso. Spec: `specs/automations/luzes-muro-painel-noite.md`.

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
- **AirTags** — integração `findmy` (conta `an.diogo98@gmail.com`) segue configurada, mas o
  servidor anisette que gerava a autenticação Apple foi **removido em 20/09/2026** a pedido do
  André ("não será mais usado no projeto"). A integração deve parar de renovar autenticação sem
  ele. Fica pendente decidir: recriar o anisette se quiser retomar os AirTags, ou remover também a
  integração `findmy` já que a dependência dela não existe mais.
- **Larissa no HA** — depende de acesso remoto fora da tailnet.
- **Termostato e calendário** — sem `climate.*` nem `calendar.*`.
- **Migração para dispositivo dedicado** — o HA cai quando o PC dorme, e a rede do
  Docker Desktop é o teto do som ambiente.
- **Client ID compartilhado do rclone será desativado em 2026.** O upload dos
  clipes de movimento (ver seção **Câmeras**) usa o client_id padrão do
  rclone, que o próprio rclone avisa que vai parar de funcionar durante 2026.
  Quando quebrar: criar um client_id próprio no Google Cloud e rodar `rclone
  config reconnect gdrive_cameras:`.

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
