# Instruções de Implementação — Painel "iOS Inspired Tablet Dashboard" (Home Assistant)

> Este documento reúne **tudo** que é necessário para replicar fielmente o
> projeto de dashboard descrito abaixo, a partir do material já pesquisado e
> limpo pelo André. Ele foi escrito para ser lido e executado por um agente
> de código (Claude Code ou equivalente) que já está trabalhando na
> automação residencial do André. Siga a ordem das seções — cada uma existe
> para evitar um erro específico que já foi antecipado.

## 0. Objetivo e critério de sucesso

Replicar, dentro da instância Home Assistant do André, o dashboard estilo
iOS/"Liquid Glass" descrito no post original do Reddit (ver fontes abaixo),
adaptado às entidades reais dele — **sem** copiar nenhuma credencial, IP,
token ou URL pessoal do autor original (ele nunca publicou essas partes, e
elas não existem em nenhum arquivo fornecido aqui).

Está "perfeito" quando:
- O `dashboard.yaml` resultante carrega sem erro no Lovelace (modo YAML).
- Todos os `button_card_templates` usados nos cards da view existem e estão
  corretamente referenciados (sem template "fantasma").
- Todo `entity_id` referenciado é uma entidade real do André (nunca um
  placeholder esquecido tipo `sensor.x` ou `input_select.camera_selecter`
  sem opções configuradas).
- As dependências HACS necessárias para os componentes usados estão
  documentadas como pré-requisito (instalação é passo manual do André, o
  agente não instala HACS sozinho, mas deve avisar quando um template exigir
  algo ainda não confirmado como instalado).
- Nenhum dado sensível (senha de câmera, token, IP interno) aparece no
  arquivo final — nem mesmo comentado.

## 1. Contexto do projeto mais amplo do André (para não implementar o oposto do que ele quer)

O André está construindo uma plataforma de automação residencial híbrida:
Home Assistant como motor de dispositivos + camada própria (API) por cima.

- Ele tem iPhone e iPad Pro com LiDAR — o iPad é o candidato natural para
  ser o tablet fixo na cozinha (o projeto original do Reddit também usa um
  iPad Pro em Guided Access).
- **Ponto de atenção importante:** para o dashboard geral da casa, o André
  já disse (em outra conversa) que no fim prefere uma **planta baixa visual
  (floorplan) com os dispositivos plotados em cima**, não apenas cards
  organizados por cômodo/grid. O painel "iOS Inspired" replicado aqui usa
  um **grid 2x4 com swipe entre páginas**, não um floorplan. Isso não é uma
  contradição — trate este pacote como a *referência visual e técnica*
  (estilo "vidro" translúcido, `button-card`, `card-mod`, kiosk mode, troca
  dinâmica de cards) a ser replicada fielmente como pedido, e não
  descaracterize o layout por conta própria. Só vale a pena levantar o
  assunto do floorplan com o André mais adiante, se/quando ele mesmo trouxer
  o tema de novo — não é bloqueante pra este trabalho.

## 1-bis. Ambiente real já confirmado (use isto, não suposições genéricas do README)

Este ambiente **já está rodando e já tem progresso real** — não é uma
instalação do zero. Confirmado diretamente no host:

- Home Assistant roda em **Docker** (container `homeassistant`), com a
  pasta de config montada como pasta normal do Windows em
  `C:\HomeAssistant\config`.
- **O dashboard NÃO é um `dashboard.yaml` em modo YAML puro** — é um
  dashboard em **modo storage**, guardado como JSON em
  `.storage/lovelace.minha_casa`. Ele já tem uma chave
  `button_card_templates` e, no momento em que este documento foi escrito,
  já contém **133 usos de `custom:button-card`, 45 de `card_mod` e 5 de
  `custom:bubble-card`** — ou seja, boa parte do trabalho de tema e cards já
  está implementada. **Antes de adicionar qualquer template novo, verifique
  se ele já existe em `button_card_templates`** (mesmo nome ou equivalente)
  para não duplicar ou conflitar.
- Outros arquivos relevantes na mesma pasta: `.storage/lovelace_resources`
  e `.storage/lovelace_dashboards` (recursos JS e lista de dashboards),
  `configuration.yaml`, `themes/apple_home.yaml` (**tema "Liquid
  Glass"/Apple já criado e em uso** — cores, `ha-card-border-radius: 26px`,
  `ha-card-box-shadow`, fundo translúcido — reaproveite e estenda este tema
  em vez de criar um novo do zero), `template_sensors.yaml`.
- Cards customizados já instalados em `www/custom-cards/`:
  `stack-in-card.js` e `swipe-card.js` — o `swipe-card` já cobre a
  necessidade de "swipe entre 2 páginas" do grid original, não precisa
  procurar alternativa.
- `custom_components/browser_mod/` já foi instalado manualmente — pode
  cobrir parte do que o `custom:bubble-card` faria (popups no lado do
  navegador); avalie qual faz mais sentido para cada caso em vez de assumir
  que precisa instalar `custom:bubble-card` via HACS do zero.
- **Forma de editar o dashboard:** não editar o JSON à mão pelo editor RAW
  do navegador (ele corrompe colagens grandes — o autocomplete apaga
  valores depois dos dois-pontos). Editar via **script Python descartável**
  que carrega `.storage/lovelace.minha_casa`, altera a parte específica
  (ex: adiciona/atualiza uma entrada dentro de `button_card_templates`) e
  regrava o JSON.
- **Mudanças em `.storage` não recarregam a quente.** Depois de editar,
  validar com `docker exec homeassistant <comando de check_config>` antes
  de aplicar, e então `docker restart homeassistant` para o dashboard
  refletir a mudança. Cada ajuste no dashboard implica um restart — é
  esperado, não é sinal de erro.
- Validação visual: abrir `http://localhost:8123` no navegador embutido,
  inspecionar o DOM quando algo não renderizar como esperado (já foram
  encontrados bugs assim: coluna de ícone colapsando para 0px, `hass` não
  chegando em cards aninhados).
- **Regra de segurança inegociável:** este ambiente tem controle de
  dispositivos reais da casa (luzes, TV, etc.). Qualquer chamada de serviço
  feita para testar um card (`hass.callService` ou equivalente) precisa
  **reverter o estado real do dispositivo logo depois do teste** — nunca
  deixar uma luz ligada/desligada ou a TV em estado diferente do que
  estava antes só por causa de um teste de dashboard.

## 2. Fontes originais (para consulta, nunca para scraping automático de dados pessoais)

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

Autor original: u/Pivotonian (designer gráfico). Ele publicou o YAML
especificamente para a comunidade replicar ("Enjoy!") — está tudo público e
o uso aqui é o pretendido pelo próprio autor.

**Regra importante:** o YAML completo do GitHub tem ~1,5 milhão de
caracteres / ~34.500 linhas, e a seção `views:` sozinha tem ~23.700 linhas —
a maior parte é repetição das 4 variantes de câmera para as 9 câmeras do
autor, mais URLs RTSP com usuário/senha embutidos, tokens de endpoint do NVR
Scrypted dele, IPs internos e URLs de imagem de fundo por condição
climática. **Nunca copie a seção `views:` inteira do link do GitHub para
dentro da config do André** — isso traria lixo específico da rede do autor
original e nenhum valor de design. Se precisar consultar o link do GitHub
para entender a estrutura de um template específico que não está no arquivo
`templates-exemplo.yaml` (seção 5), extraia **apenas o bloco do template**
(procure pelo nome dele — lista completa na seção 4) e generalize
qualquer entidade/URL pessoal antes de usar.

## 3. Visão geral do design e comportamento (como o autor descreveu)

- Roda em tela cheia num iPad Pro fixo na bancada da cozinha, com **Guided
  Access** ativado (trava o iPad no app do HA, só sai com senha).
- Estilo visual: iOS + efeito "Liquid Glass" (vidro fosco do iOS 26) —
  bordas arredondadas, fundos semi-transparentes com blur, gradientes
  sutis nas bordas, fonte San Francisco, paleta de cores da Apple. Descrito
  pelo autor como uma versão open-source do Amazon Echo Show 15.
- Quase tudo construído com `custom:button-card` + helpers `input_select` +
  templates YAML reaproveitáveis guardados no topo do arquivo
  (`button_card_templates:`), evitando repetir YAML em todo canto.
- **Header (topo):** chips condicionais — "Lavagem terminada", "Louça:
  faltam X min", "Portão da garagem aberto", há quanto tempo o filho de 1
  ano está dormindo. Vêm de sensores/automações reais da casa do autor —
  o André precisa definir os equivalentes dele (ou remover os que não se
  aplicam).
- **Corpo (meio):** grid 2 linhas x 4 colunas, com swipe entre 2 páginas.
  Cada slot muda de card dinamicamente via `input_select`, dependendo de
  condições reais:
  - Previsão de chuva → card de Calendário vira Radar de Chuva.
  - Jogo ao vivo → card de Shortcuts vira placar ao vivo (Shortcuts
    continua acessível pelo rodapé).
  - Música tocando no HomePod da cozinha → o tile de música "salta" para a
    primeira página, trocando de lugar com o Shortcuts.
- **Footer (rodapé):** fixo em todas as páginas — acesso rápido a popups de
  luz/clima (via `custom:bubble-card`), "now playing" da cozinha/sala,
  status e controle do portão da garagem, atalho para abrir o Assist (voz
  ou texto).
- **Notificação "invisível":** uma notificação push é disparada pelo HA
  quando detecta movimento na cozinha; como o iPad está em Guided Access, a
  notificação acorda a tela mas não aparece visualmente (só fica registrada
  na Central de Notificações) — dá sensação de painel "vivo" sem precisar
  tocar.
- Integrações extras citadas nos comentários do post:
  - **LLM Vision** (HACS) gera legenda/resumo por IA (usando ChatGPT) da
    imagem da câmera.
  - Integração **KIA/Hyundai** (HACS) alimenta o card "Vehicle" — só
    relevante se o André tiver um carro compatível; senão, pule esse card.
  - Calendário: lado esquerdo usa `custom:today-card`, lado direito usa
    `custom:atomic-calendar-revive` — ambos HACS, fonte é Google Calendar.
  - Status "bebê dormindo": não é sensor dedicado, é um `input_boolean`
    setado por automação (persiana fechada + porta fechada + luz apagada =
    dormindo; inverso = acordado). Não aplicável ao André a menos que ele
    peça — não invente esse card se ele não tiver essa necessidade.
  - Tema: 100% customizado via `card-mod` em quase todo card, sem theme
    HACS pronto — o efeito "vidro" vem inteiramente do CSS custom.

## 4. Dependências HACS necessárias

**Confirme o que já está instalado antes de tentar instalar algo de novo**
(ver seção 1-bis — `button-card`, `card-mod`, `stack-in-card`, `swipe-card`
e `browser_mod` já estão presentes neste ambiente). Lista completa de
referência do projeto original:

- `custom:button-card` — base de quase todos os cards (**já instalado**)
- `card-mod` — CSS custom em quase todo card (**já instalado**, é de onde
  vem o efeito "vidro" do tema `apple_home`)
- `custom:bubble-card` — popups de luz/clima no rodapé (verificar se já
  está instalado; se `browser_mod` já cobre o mesmo caso de uso, não
  duplicar)
- `custom:today-card` — metade esquerda do card de calendário (verificar)
- `custom:atomic-calendar-revive` — metade direita do card de calendário
  (verificar)
- `custom:modern-circular-gauge` — gauges circulares (ex: card de saúde)
  (verificar)
- `kiosk-mode` (módulo de frontend) — esconde header/sidebar em modo
  standby (verificar)
- Câmeras — **escolher apenas uma** variante, conforme o setup real do
  André (perguntar se não estiver claro):
  - `custom:frigate-card` (se usar Frigate NVR)
  - `custom:webrtc-camera` (RTSP direto via WebRTC)
  - `picture-entity` nativo do HA (mais simples, **sem** HACS — comece por
    esta se o André não tiver Frigate/WebRTC configurado, é o caminho de
    menor atrito)
  - (existe também variante `iframe` para NVR próprio tipo Scrypted no
    projeto original — não recomendado replicar, é específico da rede do
    autor)
- Integração **LLM Vision** — opcional, só se o André quiser legendas de
  câmera por IA
- Integração **KIA/Hyundai** — opcional, só se aplicável ao carro do André

## 5. Helpers / entidades que precisam ser criadas

Antes de escrever qualquer card que referencie estes helpers, crie-os em
**Configurações → Automações e Cenas → Helpers**:

- `input_select.column_ab1` — controla qual template aparece em cada slot
  do grid (motor da troca dinâmica de cards no corpo)
- `input_select.camera_selecter` — controla qual câmera aparece no card de
  câmeras (as opções devem ser os nomes reais dos cômodos/câmeras do André)
- `input_boolean.standby_kiosk_mode` — liga/desliga o modo kiosk (esconde
  cabeçalho do HA) — já usado no bloco `kiosk_mode:` do arquivo de
  templates (seção 6)
- `input_text.popup_entity` — usado em alguns taps de câmera para abrir popup
- Um sensor de notícias/RSS (o autor original usa
  `sensor.the_age_detailed`, um sensor RSS de um jornal australiano, com
  atributo `entries`: lista de `title`/`summary`/`link`/`image`) — troque
  pela fonte de notícias que o André preferir, ou remova o card se ele não
  quiser essa seção
- Um `input_boolean` equivalente a "dormindo", **apenas se** o André tiver
  o mesmo caso de uso (filho pequeno) — não crie por padrão

## 6. Arquivo de templates limpos (ponto de partida real)

O arquivo **`templates-exemplo.yaml`** (anexo a estas instruções) já contém,
prontos para colar no `dashboard.yaml` do André (modo YAML do Lovelace):

- `kiosk_mode:` (bloco de configuração de nível raiz, não é um template)
- `divider` — linha translúcida separadora
- `camera_list` — botão-pílula da lista lateral do card de câmeras
- `heading` / `subheading` — título/subtítulo alinhados à esquerda
- `gauge` — gauge circular reaproveitável (via `custom:modern-circular-gauge`)
- Estrutura de topo da `view` original (tipo `sections`, background com
  imagem, grid de header com áreas nomeadas)

Estes templates **não contêm nenhuma credencial** — foram generalizados com
placeholders (`seu-wallpaper.jpg`, variáveis `var_*`). Use-os como estão,
substituindo apenas as entidades/variáveis pelas do André.

## 7. Índice completo dos templates do arquivo original (para os que faltam)

O YAML original tem ~54 templates nomeados. Os principais, por categoria —
use este índice para localizar cada bloco no link do GitHub (seção 2) **só
quando o André pedir aquele card específico** e ele não estiver em
`templates-exemplo.yaml`:

- **Câmeras:** `cameras_frigate`, `cameras_frigate_letterbox`,
  `cameras_webrtc`, `cameras_picture_entity`, `cameras`, `camera_list`,
  `camera_events`, `camera_event`
- **Info/Layout:** `news_headlines`, `calendar`, `weather`, `radar`,
  `divider`, `heading`, `subheading`, `subheading_caps`
- **Casa/Automação:** `shortcuts`, `thermostat`, `rooms`,
  `sidebar_room_cards`, `room_header`, cards de cômodo, `lights_bubble`,
  `motion_bubble`, `HomeKit_tall`, `apple_scene`, `apple_card`
- **Saúde/Diversos:** `health`, `health_template`, `gauge`, `lux_gauge`,
  `sports_tall`, `shopping`
- **Música:** `artist`, `horizontal_song`, `horizontal_song_v2/v3`,
  `stacked_song`, `stacked_song_v1`, `compilations`, `compilations_small`,
  `playlist`, `channel_card`

## 8. Plano de implementação passo a passo (adaptado ao ambiente real — seção 1-bis)

1. **Antes de tocar em qualquer coisa, ler o estado atual:**
   - Inspecionar `.storage/lovelace.minha_casa` (via script Python, nunca
     editando à mão) para ver quais `button_card_templates` já existem, e
     quais views/cards já foram montados.
   - Ler `themes/apple_home.yaml` para saber que variáveis de cor/estilo já
     existem e reaproveitá-las (não recriar uma paleta paralela).
   - Conferir `www/custom-cards/` e `custom_components/` pra não sugerir
     instalar algo que já está lá.
2. **Confirmar com o André** (só o que realmente for ambíguo, sem travar o
   trabalho por isso):
   - Qual variante de câmera ele vai usar (Frigate, WebRTC, ou
     `picture-entity` nativo). Se não houver resposta ainda, seguir com
     `picture-entity` como padrão de menor atrito.
   - Se ele quer o card de calendário ligado ao Google Calendar dele.
   - Se ele quer os cards "Vehicle" (KIA/Hyundai), "Health" e "bebê
     dormindo" (prováveis "não" para os dois últimos, mas confirmar antes
     de implementar).
3. Instalar via HACS só o que faltar da seção 4 (a maior parte já está
   instalada neste ambiente — ver seção 1-bis).
4. Criar os helpers da seção 5 que ainda não existirem, com as opções reais
   do André (nomes de cômodos/câmeras) — Configurações → Automações e
   Cenas → Helpers.
5. Integrar os templates de `templates-exemplo.yaml` (divider, camera_list,
   heading, subheading, gauge, kiosk_mode) dentro da chave
   `button_card_templates` já existente em `.storage/lovelace.minha_casa`,
   via script Python de leitura-modificação-escrita — **sem sobrescrever
   templates que já existem com o mesmo nome**, só adicionar os que
   faltam.
6. Adaptar as entidades nos templates para os sensores/câmeras reais do
   André (nunca deixar `sensor.x`/placeholder genérico no arquivo final).
7. Adicionar, um de cada vez, os templates que faltam (seção 7) conforme o
   André for confirmando quais cards ele quer — puxando do GitHub apenas o
   bloco específico do template, generalizando qualquer dado pessoal antes
   de colar.
8. Montar/completar a `view` com grid 2x4 usando os templates como blocos
   (`swipe-card` já instalado cobre o swipe entre páginas) — testar card
   por card em vez de tentar tudo de uma vez, validando com
   `docker exec homeassistant <check_config>` antes de cada
   `docker restart homeassistant`.
9. Validar visualmente em `http://localhost:8123` (navegador embutido),
   testar as trocas dinâmicas de card (chuva, jogo ao vivo, música) se as
   automações correspondentes já existirem, e **reverter qualquer estado
   real de dispositivo alterado durante o teste**.
10. Ao final, se fizer sentido, comentar com o André sobre o ponto da
    seção 1 (grid vs. floorplan) — sem bloquear a entrega por isso.

## 9. O que nunca fazer

- Nunca colar a seção `views:` inteira do YAML original do GitHub.
- Nunca inventar `entity_id` — se não souber o nome real, perguntar ao
  André ou deixar um placeholder claramente marcado como `# TODO: substituir`.
- Nunca adicionar cards/automações que dependem de contexto pessoal do
  autor original (filho pequeno, carro específico) sem confirmar antes que
  se aplicam ao André.
- Nunca commitar/salvar IPs, tokens, usuário/senha de câmera ou qualquer
  credencial em texto plano no `dashboard.yaml` — usar `secrets.yaml` do
  Home Assistant para isso.
