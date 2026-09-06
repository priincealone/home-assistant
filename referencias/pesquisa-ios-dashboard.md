# Painel "iOS Inspired Tablet Dashboard" — Pacote de Replicação

Pesquisa e extração feitas a partir do post original no Reddit e dos arquivos
que o autor disponibilizou publicamente. Este pacote reúne o que é
genuinamente reaproveitável (arquitetura, templates, dependências) e deixa de
fora o que é específico da rede/casa dele (credenciais de câmera, tokens,
IPs).

## Fontes originais

| O quê | Link |
|---|---|
| Post original (Reddit, r/homeassistant) | https://www.reddit.com/r/homeassistant/comments/1nodrsl/my_ios_inspired_tablet_dashboard/ |
| YAML completo (GitHub) | https://github.com/alistairmerritt/iOS-Tablet-Dashboard/blob/main/YAML |
| Card "Cameras" (Pastebin) | https://pastebin.com/C7C2KfZs |
| Card "Calendar" (Pastebin) | https://pastebin.com/1q2q2N1D |
| Card "Weather" (Pastebin) | https://pastebin.com/uMxxBBw2 |
| Card "Vehicle" (Pastebin) | https://pastebin.com/CZK462tZ |
| Card "Shortcuts" (Pastebin) | https://pastebin.com/SS8S5qV0 |
| Card "Thermostat" (Pastebin) | https://pastebin.com/82DyixdL |
| Card "Rooms" (Pastebin) | https://pastebin.com/UuLHLXyX |
| Card "Radar" (Pastebin) | https://pastebin.com/2kLjh4Ct |
| Card "Media Select Tile" (Pastebin) | https://pastebin.com/edgq2edj |
| Card "Music Now Playing" (Pastebin) | https://pastebin.com/Hbt6QRXx |
| Card "Health" (Pastebin) | https://pastebin.com/73GMAXij |
| Card "Sports" (Pastebin) | https://pastebin.com/S9U5J9UK |
| Ícones dos apps da Apple TV (Dropbox) | https://www.dropbox.com/t/Jz7f7du0jnerNFKM |
| Tutorial Arlo + HA citado num comentário (YouTube) | https://www.youtube.com/watch?v=Z3kk5N7VaCM |

Autor: u/Pivotonian (se descreve como designer gráfico de profissão). O post é
de cerca de 1 ano atrás e ele mesmo publicou o YAML especificamente para a
comunidade replicar ("Enjoy!").

## Visão geral do projeto (como o próprio criador descreveu)

- Roda em tela cheia num **iPad Pro** fixo na bancada da cozinha, com
  **Guided Access** ativado (trava o iPad no app da HA, só sai com senha).
- Estilo visual: inspirado em iOS + efeito "Liquid Glass" (vidro fosco do
  iOS 26) — bordas arredondadas, fundos semi-transparentes com blur,
  gradientes sutis nas bordas, fonte San Francisco, paleta de cores da Apple.
  Ele descreveu como uma versão open-source do **Amazon Echo Show 15**.
- Quase tudo construído com `custom:button-card` + helpers `input_select` +
  YAML com templates reaproveitáveis, guardados no topo do arquivo (evita
  repetir YAML em todo canto).
- **Header (topo):** chips condicionais — "Lavagem terminada", "Louça: faltam
  X min", "Portão da garagem aberto", há quanto tempo o filho de 1 ano está
  dormindo. Tudo isso vem de sensores/automações.
- **Corpo (meio):** grid 2 linhas x 4 colunas, com **swipe entre 2 páginas**.
  Cada slot muda de card dinamicamente via `input_select`, dependendo de
  condições reais:
  - Previsão de chuva → card de Calendário vira Radar de Chuva.
  - Jogo ao vivo → card de Shortcuts vira placar ao vivo (Shortcuts continua
    acessível pelo rodapé).
  - Música tocando no HomePod da cozinha → o tile de música "salta" pra
    primeira página, trocando de lugar com o Shortcuts.
- **Footer (rodapé):** fixo em todas as páginas — acesso rápido a popups de
  luz/clima (via `custom:bubble-card`), "now playing" da cozinha/sala, status
  e controle do portão da garagem, atalho pra abrir o Assist (voz ou texto).
- **Truque de notificação "invisível":** uma notificação push é disparada
  pelo HA quando detecta movimento na cozinha; como o iPad está em Guided
  Access, a notificação **acorda a tela mas não aparece visualmente** (só
  fica registrada na Central de Notificações) — dá a sensação de painel
  "vivo" sem precisar tocar.
- Integrações extras citadas nos comentários:
  - **LLM Vision** (integração HACS) gera a legenda/resumo por IA (usando
    ChatGPT) da imagem da câmera.
  - **Integração KIA/Hyundai** (HACS) alimenta o card "Vehicle" com dados do
    carro.
  - Calendário: lado esquerdo usa `custom:today-card`, lado direito usa
    `custom:atomic-calendar-revive` — ambos HACS, fonte é Google Calendar.
  - Status de "bebê dormindo": não é sensor dedicado, é um `input_boolean`
    setado por automação que assume que o filho está dormindo quando
    persiana fechada + porta fechada + luz apagada (e o inverso pra acordado).
  - Tema: **100% customizado**, sem theme pronto — CSS via `card-mod` em
    praticamente todo card. Não existe (ainda) como HACS theme pronto.

## Dependências (HACS) identificadas

Confirmadas no código-fonte ou nos comentários do post:

- `custom:button-card` — base de quase todos os cards
- `custom:bubble-card` — popups de luz/clima no rodapé
- `card-mod` — CSS custom em quase todo card (o efeito "vidro" vem daqui)
- `custom:today-card` — metade esquerda do card de calendário
- `custom:atomic-calendar-revive` — metade direita do card de calendário
- `custom:modern-circular-gauge` — gauges circulares (ex: card de saúde)
- Câmeras — ele manteve **4 variantes prontas** no YAML (você só precisa de
  uma, dependendo do que já usa):
  - `custom:frigate-card` (se usar Frigate NVR)
  - `custom:webrtc-camera` (RTSP direto via WebRTC)
  - `picture-entity` nativo do HA (mais simples, sem HACS)
  - `iframe` apontando pro visualizador do Scrypted/NVR dele (específico da
    stack dele, não recomendo replicar essa parte)
- Integração **LLM Vision** — descrição por IA da imagem da câmera
- Integração **KIA/Hyundai** — dados do veículo
- **kiosk-mode** (módulo de frontend) — esconde header/sidebar quando
  `input_boolean.standby_kiosk_mode` = on

## Helpers / entidades que você vai precisar criar

- `input_select.column_ab1` — controla qual template aparece em cada slot do
  grid (é o motor da troca dinâmica de cards no corpo)
- `input_select.camera_selecter` — controla qual câmera aparece no card de
  câmeras (as opções são os nomes dos cômodos/câmeras)
- `input_boolean.standby_kiosk_mode` — liga/desliga o modo kiosk (esconde
  cabeçalho do HA)
- `input_text.popup_entity` — usado em alguns taps de câmera pra abrir popup
- `sensor.the_age_detailed` — sensor RSS customizado (ele usa "The Age", um
  jornal australiano) com atributo `entries` (lista de title/summary/link/
  image) — você substituiria pela sua própria fonte de notícias/RSS
- Um `input_boolean` equivalente para status de "dormindo", alimentado por
  automação (ver acima) — não é entidade nativa de nenhum sensor

## Mapa dos templates (`button_card_templates`) no YAML original

O arquivo original tem ~54 templates nomeados reaproveitáveis. Os principais,
por categoria:

- **Câmeras:** `cameras_frigate`, `cameras_frigate_letterbox`,
  `cameras_webrtc`, `cameras_picture_entity`, `cameras`, `camera_list`,
  `camera_events`, `camera_event`
- **Info/Layout:** `news_headlines`, `calendar`, `weather`, `radar`,
  `divider`, `heading`, `subheading`, `subheading_caps`
- **Casa/Automação:** `shortcuts`, `thermostat`, `rooms`, `sidebar_room_cards`,
  `room_header`, `room_c...` (cards de cômodo), `lights_bubble`,
  `motion_bubble`, `HomeKit_tall`, `apple_scene`, `apple_card`
- **Saúde/Diversos:** `health`, `health_template`, `gauge`, `lux_gauge`,
  `sports_tall`, `shopping`
- **Música:** `artist`, `horizontal_song`, `horizontal_song_v2/v3`,
  `stacked_song`, `stacked_song_v1`, `compilations`, `compilations_small`,
  `playlist`, `channel_card`

Isso te dá o "índice" completo do arquivo original — se você abrir o link do
GitHub, procure por esses nomes pra achar cada bloco.

## O que ficou de fora deste pacote (e por quê)

O YAML completo tem **~1,5 milhão de caracteres / ~34.500 linhas**. Só a
seção final `views:` (onde tudo é montado na tela de verdade) tem ~23.700
linhas — a maior parte é repetição das 4 variantes de câmera para 9 câmeras
diferentes, mais especificidades da rede dele: URLs RTSP com usuário/senha
embutidos, tokens de endpoint do NVR Scrypted, IPs internos, URLs de imagem
de fundo por condição climática. Isso não é reaproveitável — é a config
pessoal da casa dele, não um padrão de design. Por isso não foi copiado
literalmente aqui; se quiser o arquivo 100% original, os links da fonte
acima são públicos e foi o próprio autor quem pediu pra comunidade copiar.

## Exemplos de templates limpos (sem credenciais)

Ver `templates-exemplo.yaml` — extraí e generalizei os templates mais
ilustrativos e seguros de reaproveitar tal como estão: `divider`,
`camera_list`, `heading`/`subheading`, `gauge` e a estrutura de
`kiosk_mode`. Servem de ponto de partida real — troque as entidades pelas
suas.

## Próximos passos sugeridos

1. Instalar via HACS: `button-card`, `bubble-card`, `card-mod`, `kiosk-mode`,
   e a variante de câmera que fizer sentido pro seu setup (`frigate-card` se
   usar Frigate; `webrtc-camera` se for RTSP direto; `picture-entity` nativo
   se quiser o caminho mais simples, sem depender de HACS).
2. Criar os helpers (`input_select`, `input_boolean`, `input_text`) listados
   acima em Configurações → Automações e Cenas → Helpers.
3. Colar o `kiosk_mode:` e os templates de `templates-exemplo.yaml` no seu
   `dashboard.yaml` (modo YAML do Lovelace).
4. Adaptar as entidades nos templates pros seus próprios sensores/câmeras.
5. Montar seu próprio `views:` com grid 2x4, usando os templates como blocos
   — comece simples (2-3 cards) e vá adicionando.
