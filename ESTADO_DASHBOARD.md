# Estado do Home Assistant — Referência Rápida

## ⭐ Referência de design padrão

Todas as mudanças visuais/estruturais no dashboard devem seguir como base o
YAML salvo em `C:\HomeAssistant\referencias\reference_ios_dashboard.yaml`
(fonte: https://github.com/alistairmerritt/iOS-Tablet-Dashboard/blob/main/YAML,
34,5 mil linhas — usa `custom:button-card` + `custom:layout-card` para um
visual estilo "Apple Home"/iOS: lista de cômodos com badges coloridos,
atalhos em tiles, widget de clima, dividers, cards translúcidos).

**Regra combinada com o usuário**: qualquer pedido de mudança no dashboard
usa esse arquivo como padrão de estilo/estrutura por padrão, a menos que o
usuário peça algo fora desse padrão ou dê uma referência nova explicitamente.
Como o arquivo original usa integrações que não existem aqui (câmeras
Frigate, saúde, esportes, Spotify, radar), a aplicação prática é: extrair os
templates/estilo genéricos (cards, cores, layout, glass) e adaptar às
entidades reais da casa — não colar literalmente.


Documento de referência do que foi construído nesta sessão, pra retomar rapidamente sem precisar reconstruir o raciocínio do zero.

## Infraestrutura

- **Instalação**: Docker Desktop (per-user, sem admin) rodando `ghcr.io/home-assistant/home-assistant:stable`, config em `C:\HomeAssistant\config`, porta 8123
- **Auto-start**: script `C:\Users\adoli\start_docker_clean.ps1` (limpa sockets travados) disparado via `.vbs` na pasta Startup do Windows — resolve o bug recorrente do Docker Desktop travar em `sailor-ingest.sock` ao reiniciar sem reboot completo
- **Glances**: rodando via `pythonw`/wrapper `.vbs` oculto (tarefa agendada `GlancesWebServer`), com patch de timeout aplicado em `/usr/local/lib/python3.14/site-packages/glances_api/__init__.py` dentro do container — **esse patch se perde toda vez que o container é recriado do zero** (`docker run`), só sobrevive a `docker restart`. Se o card do PC mostrar "Indisponível" após recriar o container, reaplicar:
  ```
  docker exec homeassistant sed -i "s/client.get(url)/client.get(url, timeout=15)/g" /usr/local/lib/python3.14/site-packages/glances_api/__init__.py
  ```
- **Tailscale**: acesso remoto configurado e funcionando

## Dashboard "Casa" (definido como padrão em Perfil > Dashboard)

- Editado **diretamente no arquivo** `C:\HomeAssistant\config\.storage\lovelace.minha_casa` (JSON) via scripts Python — método muito mais confiável que o editor RAW do navegador (que corrompe em blocos grandes de texto)
- **Sempre precisa `docker restart homeassistant`** depois de editar esse arquivo pra HA recarregar (recarregamento de YAML normal não pega mudanças de storage)
- 14 páginas: Geral, Sala de Estar, Cozinha, Copa, Lavanderia, Área Gourmet, Quarto, Quarto do Luca, Banheiro, Circulação, Closet, PC, **Luzes**, **Cômodos**. **Copa** foi adicionada depois — sua luz (`light.cozinha_copa_varanda_switch_2`) antes ficava escondida dentro da página da Cozinha; agora tem página própria e entrada na lista de cômodos da Geral

### Tema visual: `apple_home` (`C:\HomeAssistant\config\themes\apple_home.yaml`)

- Estilo "Liquid Glass" (Apple): fundo gradiente azul-marinho, cards com blur forte (36px), reflexo diagonal de luz, brilho na borda superior, animação elástica ao toque
- Sidebar/cabeçalho: translúcidos (sem blur — limitação técnica, `card-mod-root` não alcança esses elementos, só `body` e cards)
- Variáveis extras pra corrigir contraste de diálogos (Web Awesome `--wa-*` e campos MDC) — sem isso, título/campos de texto em diálogos ficam ilegíveis (branco sobre branco)
- **Cuidado**: nunca usar `background: ... !important` genérico em `ha-card` no tema — isso quebra os gradientes coloridos dos cards `button-card` (já aconteceu uma vez, foi corrigido)

### Componentes usados

- **HACS instalado**: Mushroom, Bubble Card, mini-graph-card, floor3d-card, **button-card** (novo), **card-mod** (novo), **Card-Mod Studio** (novo — editor visual de estilos)
- **button_card_templates** (definidos dentro do próprio `lovelace.minha_casa`, chave irmã de `views`): `divider`, `heading`, `apple_scene`, `room_row`, `shortcut_tile`, `weather_widget`, `device_tile`, `sensor_tile`
- Página **Geral**: clima grande + previsão 5 dias, lista de cômodos **dinâmica** (mostra só cômodos com pelo menos uma luz ligada — PC foi removido dessa lista por não ser item de iluminação), grade de atalhos (PS5, TV, Ligar PC via WoL, 2 cenas de lavanderia), barra de chips de status. **Sem títulos de seção** (removidos a pedido do usuário, pra bater com a referência visual). Lista dinâmica implementada no template `room_row`: variável `var_light_list` (lista de entidades de luz reais daquele cômodo, extraídas dos tiles com ícone `mdi:lightbulb`) + `styles.card.display` com template JS que oculta a linha (`display: none`) quando nenhuma luz da lista está `on`
- **Popup "Luzes acesas"** (flutuante de verdade): tocar no chip "X luzes" (barra de status da Geral) abre um popup modal via **Browser Mod** (`thomasloven/hass-browser_mod`, instalado manualmente em `config/custom_components/browser_mod/`, adicionado via Configurações → Integrações → "Browser mod" — não precisa registrar o navegador só pra popups locais via `tap_action`). Config do chip: `tap_action: {action: fire-dom-event, browser_mod: {service: popup, data: {title, content, initial_style: normal}}}` — **campo certo é `content`, não `card`** (erro comum, o service schema do Browser Mod usa `content`).
  - **Conteúdo do popup**: uma lista de `type: conditional` (condição: entidade == `on`) envolvendo `type: tile` nativo, uma entrada por luz individual (16 luzes mapeadas manualmente com nome/ícone). Só aparece o que está aceso, tudo reativo.
  - **Gotcha importante descoberto**: tentei reaproveitar o card complexo da lista de cômodos da Geral (`custom:button-card` com `custom_fields` aninhados e templates JS `[[[ states[e]... ]]]`) dentro do popup — o popup abria, mas o conteúdo ficava em branco. Diagnosticado via DOM: o Browser Mod não propaga `hass` corretamente pra esse tipo de card profundamente aninhado (confirmado: um `custom:button-card` simples, sem `custom_fields`, funciona bem; um card nativo `entities`/`tile` também funciona bem — o problema é específico da nossa estrutura de templates JS aninhados). Solução: reconstruir com cards nativos (`conditional` + `tile`), que são robustos e não dependem de propagação de `hass` em profundidade. Essa limitação vale pra qualquer popup futuro — prefira sempre cards nativos ou `custom:button-card` simples (sem `custom_fields` aninhados) dentro de popups do Browser Mod.
- **Tentativa revertida**: chegamos a testar um badge de lâmpada com contagem de luzes ligadas por área (`hass.areas`) no lugar do botão de liga/desliga, mas o usuário pediu pra reverter e manter só o botão de liga/desliga original — não repetir essa mudança a menos que ele peça de novo
- **Cor padronizada pra botões de luz**: todo botão de liga/desliga (`room_row`.toggle e `device_tile`) usa `#FF9F0A` (laranja) quando a luz está ligada e `transparent` quando apagada — antes cada cômodo tinha uma cor própria (azul, verde, roxo etc.) no toggle da Geral. Tomadas e outros dispositivos não-luz no `device_tile` (ex. `switch.tomada_*`, bloqueio infantil) mantêm suas cores próprias via `var_color`, só o estado "apagado" ficou transparente pra todos
- Páginas de cômodo: luzes/tomadas viram `device_tile` (glow colorido reativo ao estado), ventiladores/mídia com slider mantêm Mushroom, sensores de movimento/porta com `mushroom-template-card` (cor dinâmica via Jinja). Todo grid de tiles de dispositivo (Cozinha, Copa, Lavanderia, Área Gourmet, Quarto, Quarto do Luca, Banheiro, Circulação, Closet) fica dentro de um `custom:stack-in-card`, com `card_mod` removendo border/box-shadow/backdrop-filter de cada tile individual — só a borda externa do stack-in-card aparece, mantendo a cor de fundo de cada tile (ligado/desligado) intacta
- **Plano de fundo**: recurso NATIVO do HA (editor de visualização → aba "Plano de fundo" → upload ou selecionar da mídia). Só a página "Geral" tem foto configurada até agora (imagem temporária, tons combinando com o tema — trocar pela foto real da casa quando o usuário quiser)

### Editor visual (Card-Mod Studio)

- Botão **"🎨 Style"** aparece no editor de qualquer card → preview ao vivo + categorias (Fonte, Filtros Visuais, Cor de Destaque, Cor do Ícone) editáveis sem YAML
- Cards `button-card` com `template:` ainda mostram "Editor visual não compatível" pra campos base (entidade/nome/ícone) — é limitação do HA, não afeta o Style

## Pendências (não iniciadas ou aguardando o usuário)

- **Interruptor "Entrada"** (`switch.entrada_switch_1` / `_2`): existe na
  casa, não estava no dashboard, foi adicionado à página Luzes. Falta o André
  dizer se são as mesmas lâmpadas do "Circulação" — se não forem, entra também
  na contagem de luzes e ganha card de cômodo.

1. **Luz/ventilador do quarto** (`fan.luz_ventilador`) — Local Tuya configurado só pro da Sala de Estar; o do quarto está offline, repetir o processo (scan de rede + DPs) quando ele voltar
2. **Scan 3D da casa** — usuário vai escanear com LiDAR do iPad; `floor3d-card` já instalado, esperando o modelo
3. **IP fixo do PS5** — baixa prioridade, adiado a pedido do usuário
4. **Alexa Media Player** — login trava (verificação da Amazon); solução sugerida é resetar senha da Amazon; pausado a pedido do usuário
5. **Migração pra dispositivo dedicado** (Raspberry Pi/mini PC) — planejada, não iniciada; resolveria a limitação de HA parar quando o PC dorme
6. **Foto de fundo real** — trocar a imagem temporária da página Geral pela foto real da casa, e decidir se replica nas outras 10 páginas
7. **Termostato (clima)/Calendário** — sem entidades `climate.*` ou `calendar.*` no sistema ainda; usuário precisa integrar um termostato (tem um, mas está offline) e um serviço de calendário (ex. Google Calendar) antes de adicionar esses widgets à dashboard

## Polimento visual extraído da dashboard de referência

Em vez de portar literalmente as 34,5 mil linhas (o recipiente de "glass"
da referência usa uma técnica de máscara CSS diferente da nossa, e o padrão
de cor on/off dela — cartão vira branco — conflita com a escolha explícita
já feita aqui de laranja/transparente), extraí só os tokens de design
genéricos e aplicei:
- `border-radius` padronizado: 30px em cards grandes (era 28px), 20px em
  tiles médios (`device_tile`, `shortcut_tile`)
- Blur proporcional ao tamanho do elemento: botões pequenos (toggle 32px)
  usam `blur(10px)`, tiles médios usam `blur(20px)` — antes todo elemento
  herdava o mesmo `blur(36px)` do tema, deixando botões pequenos "borrados"
- Peso de fonte `550` (em vez de `600`) e `letter-spacing: -0.01em` nos
  nomes de cômodo/tile, mais fiel ao estilo "Apple Home" da referência
- Chip de ícone da lista de cômodos mais arredondado (`border-radius`
  9px → 12px)
- **Não alterado de propósito**: cores de estado on/off (mantido o padrão
  laranja/transparente já definido), a receita exata do efeito glass
  (nossa versão já era aprovada e funciona bem)

## Segunda referência: dashboard pessoal completo (Alistair Merritt)

O usuário baixou o config real (42,5 mil linhas) do mesmo autor da referência
original, salvo em `C:\Users\adoli\Downloads\home-assistant.txt` — mapeado
por um agente em 35 seções ao longo de 5 páginas (Home View, uma view "Rooms"
sem título, Lights, Input Booleans, Remote). Decisão combinada com o usuário:
**não** replicar as 35 seções literalmente (a maioria é específica da casa
dele — monitor de bebê, câmeras em todo cômodo, rastreador de carro, ChatGPT,
múltiplas caixas de som — sem equivalente aqui), só portar os padrões
estruturais aplicáveis, sem placeholders vazios. Primeira peça portada:
página **Luzes** (ver abaixo). Templates dele mapeados no arquivo (não usar
como conteúdo, só como inspiração de padrão): `room_card` (grid de cômodos
com badges), `entity_card` (linha luz/switch), `lights_headers` (linha de
lista plana de luzes — foi a base do nosso `light_row`), `toggle_switch`
(pill on/off), `apple_scene` (atalho redondo).

## Geral enxuta: PC no popup do chip + card único de cômodos acesos

Duas mudanças pedidas juntas, ambas para **tirar peso da tela inicial**.

### 1. Informações do PC saíram da Geral e foram para um popup

Os três gauges (CPU / RAM / Disco) que ficavam soltos na coluna do meio da
Geral foram **removidos da tela**. O chip do computador no cabeçalho deixou
de ser um `type: entity` (que só abria o more-info do `binary_sensor`) e
virou um `type: template` com `tap_action: fire-dom-event` →
`browser_mod.popup`, exatamente o mesmo mecanismo do popup do controle
remoto da TV.

Conteúdo do popup, montado com os presets do projeto (label minúsculo
maiúsculo + pills de 40px/raio 12px, `grid-template-rows: 1fr` para
centralizar):

- **Status** — pill de conexão (verde/cinza conforme o `binary_sensor`) e
  pill azul "Ligar PC" (`button.press` em `button.pc_andre`)
- **Desempenho** — os três `modern-circular-gauge` que estavam na Geral
- **Histórico** — `mini-graph-card` de RAM e Disco C:, compacto
  (`show.name/icon/state: false`, altura 90px, `line_color` azul/laranja)
- **Sistema** — uptime e threads

O uptime vinha cru do sensor (`2026-09-04T19:04:39+00:00`); agora um
template JS converte para "Ligado há 1d 1h".

A página "PC" continua existindo como aba completa — o popup é o atalho.

**Armadilha que reapareceu aqui**: o `card_mod` "nude" que eu uso para
achatar cards internos incluía `background: transparent !important`, e isso
**anula o `styles.card.background` do button-card**, deixando as pills sem
cor nenhuma. Para pills coloridas o card_mod só pode zerar `border`,
`box-shadow` e `backdrop-filter` — nunca o background. (Mesmo erro já
documentado no popup do controle remoto.)

### 2. Cards soltos de cômodo viraram um card único e dinâmico — REVERTIDO

Saíram da Geral: o grid de 4 `entity_card` (Sala/Cozinha/Área Gourmet/Closet)
e a lista de 6 `room_tile`. No lugar entrou **um único `custom:button-card`**
que mostra só os cômodos com luz acesa, como ícones sem legenda:

- Um `custom_field` monta a linha inteira em HTML a partir de um array de
  cômodos, filtrando por `states['sensor.luzes_<cômodo>'] > 0`
- Ícone por cômodo (`mdi:sofa`, `mdi:countertop`, `mdi:hanger`…) num quadrado
  de 58px, laranja `#FF9F0A` (o mesmo padrão de "luz acesa" do projeto), com
  badge de contagem no canto
- Cabeçalho com o total (`sensor.luzes_acesas_total`) e um ícone de grade que
  leva à página "Cômodos" — é o que preserva o acesso aos cômodos apagados,
  já que em modo painel as abas ficam escondidas
- Estado vazio: "Nenhuma luz acesa"

**Por que um `custom_field` único e não vários cards ocultos**: o `#container`
do button-card é um grid, então esconder um item com `display: none` deixaria
a coluna vazia no lugar. Montando tudo dentro de um campo só, os ícones ficam
num `display: flex; flex-wrap: wrap` e os ocultos simplesmente somem.

**Navegação sem card aninhado**: cards aninhados em `custom_fields` não
recebem o `hass`, então templates JS quebram dentro deles. A solução foi
`onclick` inline no HTML do próprio campo, fazendo navegação SPA:

```js
history.pushState(null,"","/minha-casa/sala-de-estar");
window.dispatchEvent(new CustomEvent("location-changed",{bubbles:true,composed:true}));
```

Testado: o clique troca de página sem recarregar. O CSS vai em
`extra_styles` (injetado no shadow root do card, então classes simples como
`.km-room` não vazam).

**Sensores usados** (de `template_sensors.yaml`): `sensor.luzes_sala_de_estar`,
`_cozinha`, `_copa`, `_lavanderia`, `_area_gourmet`, `_quarto_do_luca`,
`_banheiro`, `_circulacao`, `_closet`. O cômodo "Quarto" não tem luz
integrada, então nunca aparece.


## Página Luzes: bordas, nomes e um interruptor que faltava

### Espaçamento (medido, não estimado)

O `custom:stack-in-card` das duas colunas estava com `padding: 0` e as linhas
internas usam só 4px, então o texto ficava a **5px da borda do card** — o
padrão do resto do projeto é 12–17px. Corrigido com `padding: 6px 12px 12px`
no stack.

Medição depois: ícones e rótulos de seção a **17px** da borda esquerda,
botões de liga/desliga a **19px** da direita (os 2px de diferença vêm da
caixa do próprio botão redondo; a coluna é `min-content` e não responde
linearmente ao padding — testei 4px → 13, 6px → 19, 8px → 21).

### Nomes que repetiam o cômodo

Cada linha repetia o nome da seção: "Sala de Estar — Luz Sala" logo abaixo do
cabeçalho "SALA DE ESTAR". Além de redundante, comia largura útil. Os nomes
agora são só o que distingue a luz dentro do cômodo ("Luz Sala", "Fita LED",
"Muro", "Corredor"), e cômodos de uma luz só mostram "Luz".

### ⚠️ Achado: o interruptor "Entrada" não estava no dashboard

Varrendo `light.*` e `switch.*` contra o que a página lista, apareceu um
dispositivo **ausente de todo o dashboard**:

- `switch.entrada_switch_1` — "Muro"
- `switch.entrada_switch_2` — "Corredor"
- (mais `light.entrada_luz_de_fundo`, que é luz de fundo do botão e segue
  excluída, como as outras)

É um dispositivo Tuya real e vivo (`restored: false`), de id
`eb447abff959440f30tcfn`, modelo "Interruptor Inteligente lite-2 Botões
(Wi-Fi)" — **diferente** do "Circulação" (`eb3372f6c1f88e772d565c`, modelo
"WiFi+Bel 2gang"), então não é a mesma integração duplicada.

O que chama atenção: os dois têm canais com **os mesmos nomes** ("Muro" e
"Corredor") e foram observados ligados ao mesmo tempo. Ou são dois pontos de
comando das mesmas lâmpadas, ou são lâmpadas diferentes com nomes iguais.
Outro indício: os canais do Circulação foram convertidos em `light` via
`switch_as_x` (há config entries "Muro", "Corredor", "Cozinha"…), e os do
Entrada não — sugerindo que o Entrada nunca foi configurado.

**Estado atual**: a seção "ENTRADA" foi adicionada à página Luzes, para o
André conseguir ver e testar. **Não** foi incluída em
`sensor.luzes_acesas_total` nem nos cards de cômodo, justamente porque, se
forem as mesmas lâmpadas do Circulação, a contagem dobraria. Aguarda decisão.

## Cards de cômodo unificados (nome + contagem no mesmo card)

Os cards grandes com ícone de lâmpada e contagem (`room_tile`) saíram da
Geral. A contagem foi para os cards pequenos, que agora fazem as duas coisas:

- **Nome do cômodo** + **estado em texto**: "Apagado", "1 acesa", "3 acesas",
  ou "Sem luzes" quando o cômodo não tem iluminação integrada (Quarto)
- **Tocar no ícone**: acende/apaga todas as luzes daquele cômodo
- **Tocar no card**: abre a página do cômodo
- **Fundo branco** quando há luz acesa (mesmo padrão do `entity_card`)

Template novo `room_mini` (derivado do `entity_card`), com `entity` apontando
para o sensor de contagem e `state` com `operator: ">"` e `value: 0` — é isso
que troca o card para branco e pinta o ícone de laranja.

Os **10 cômodos** estão na tela agora (antes eram 4): Sala de Estar, Cozinha,
Copa, Lavanderia, Área Gourmet, Quarto Luca, Banheiro, Circulação, Closet e
Quarto. A coluna do meio da Geral virou uma grade 2×5 e as frações do corpo
mudaram de `1.15fr 1fr 1.25fr` para `1.05fr 1.35fr 1.2fr`, senão os nomes
maiores ("Sala de Estar", "Área Gourmet") ficavam cortados no iPad.

## Popups com vidro (glass)

O fundo do popup era sólido (`rgb(21,27,54)`, do `dialog-background-color` do
tema). Agora é translúcido com desfoque, igual aos cards.

O caminho até a superfície do diálogo:
`browser-mod-popup` → `ha-dialog` (shadow) → `wa-dialog` (shadow) →
`dialog.dialog`. O `wa-dialog` expõe `part="dialog"`, então **um nível de
piercing basta** — não precisa descer dois shadow roots:

```yaml
card_mod:
  style:
    ha-dialog$: |
      wa-dialog::part(dialog) {
        background: rgba(18,23,46,0.55) !important;
        backdrop-filter: blur(34px) saturate(170%) !important;
        border: 1px solid rgba(255,255,255,0.12) !important;
        border-radius: 26px !important;
      }
```

O `browser_mod.popup` aceita `card_mod` dentro do `data` — confirmado no
bundle (`applyToElement(this, "more-info", {style: this.card_mod.style})`).

As **caixas de texto dos popups** (as pills de 40px) ganharam a mesma moldura
da caixa "Adicionar item" da lista de compras: `1px solid
rgba(255,255,255,0.12)`. Para isso o `card_mod` das pills não pode mais zerar
a borda — ele só remove sombra e blur.

## Rolagem lateral entre páginas (swipe)

Instalado `hass-swipe-navigation` v1.16.0 em
`www/custom-cards/swipe-navigation.js` (baixado do release oficial no GitHub)
e registrado como recurso `/local/custom-cards/swipe-navigation.js`.

Config na raiz do dashboard:

```json
"swipe_nav": {
  "animate": "swipe", "animate_duration": 200, "swipe_amount": 15,
  "wrap": true, "prevent_default": false,
  "enable_mouse_swipe": false, "skip_hidden": true
}
```

`wrap: true` faz a última página voltar para a primeira. `enable_mouse_swipe`
fica desligado porque no PC existem a barra lateral e as abas — e arrastar com
o mouse atrapalharia os sliders.

**Testado** disparando eventos de toque sintéticos no `hui-view-container`
(é nele que o módulo escuta — não adianta despachar no `home-assistant`, o
evento sobe e não desce): Geral → Sala de Estar arrastando para a esquerda, e
de volta arrastando para a direita.

## Mesmo wallpaper em todas as páginas

A foto só existia na Geral (`background` da view); as demais caíam no
wallpaper padrão do dashboard, desfocado e a 20% de opacidade. Agora o mesmo
`background` da Geral está nas 14 views.

## Compactação e alinhamento em todas as páginas

Passada geral em cima de espaço desperdiçado e centralização, feita **medindo
cada `ha-card`** (altura do card × caixa de conteúdo real, via
`getBoundingClientRect` percorrendo os shadow roots) em vez de julgar no olho.

### Alturas revistas

| Componente | Antes | Depois | Motivo |
|---|---|---|---|
| `entity_card` (27 usos) | 78px | 70px | ícone de 38px + duas linhas de texto |
| `room_tile` (padrão, página Cômodos) | 140px | 102px | só nome + badge de 25px |
| `apple_scene` | 66px | 56px | uma linha de ícone + nome |
| `shortcut_tile` | 90px | 74px | ícone + nome |
| `sensor_tile` | 100px | 80px | ícone + nome + estado |
| `now_playing` | 130px | 98px | capa de 96px → 72px |
| `modern-circular-gauge` avulso | **485px** | 196px | ver abaixo |
| `mini-graph-card` | ~212px | ~150px | opção `height: 88` |

### O medidor de 485px

O `modern-circular-gauge` é quadrado e acompanha a largura do container — numa
coluna de 490px ele virava um card de 485×485 para mostrar "0,00 kWh"
(páginas Quarto do Luca e Closet). Ele não expõe opção de tamanho, então a
solução foi limitar o `.container` interno pelo `card_mod`:

```css
ha-card { padding: 10px !important; }
ha-card .container { max-width: 155px !important; margin: 0 auto !important; }
```

Aplicado nas 10 instâncias. Nos grids de 3 colunas (página PC e popup do PC)
não muda nada, porque lá o medidor já é mais estreito que 155px.

### Centralização do `entity_card`

O bloco de texto ficava 6px abaixo do centro (medido: 7px de folga em cima,
1px embaixo). A causa eram dois "empurrões" manuais — `padding-top: 15px` no
nome e `padding-bottom: 15px` no estado — que tentavam centralizar por
tentativa e erro. Trocado por centralização real:

```yaml
grid:  { grid-template-rows: "1fr 1fr", align-items: center }
name:  { align-self: end,   padding-top: 0 }
num:   { align-self: start, padding-bottom: 0 }
```

As duas linhas encostam no meio do card. Medido depois: **18px em cima, 18px
embaixo** nos 27 cards.

### ⚠️ Armadilha nova: `min-content` zera a linha/coluna do ícone

Ao compactar, troquei `grid-template-rows: 1fr` por `min-content` no
`shortcut_tile` e no `sensor_tile` — e **os ícones sumiram**. O `ha-icon` não
tem altura intrínseca (o tamanho vem de `width`/`--mdc-icon-size`), então
`min-content` resolve para **0px** e a linha colapsa. Medido:
`grid-template-rows: 0px 22px`, ícone com `h: 0`.

O mesmo acontecia na **coluna** do `apple_scene`, que usava
`grid-template-columns: min-content 1fr` — resolvia para `0px 276px` e os
ícones das cenas da Lavanderia nunca apareceram.

**Regra**: toda célula de ícone em `button-card` precisa de tamanho explícito
em px, tanto no `grid-template-rows`/`columns` quanto no `img_cell`. Nunca
`min-content` para ícone.

## Reversão: o card de ícones de cômodos foi desfeito

O usuário não gostou do resultado ("não me agradei do resultado dos icons
representando os comodos, retorne para como estava") e a Geral voltou ao
formato anterior: o grid de 4 `entity_card` (Sala / Cozinha / Área Gourmet /
Closet) na coluna 1 e a lista de 6 `room_tile` na coluna 2. A mudança do PC
(gauges → popup do chip) **permaneceu**, porque foi aprovada.

Restaurado a partir de `backups/lovelace.minha_casa.bak_pc_comodos`. A seção
técnica acima fica registrada porque a técnica (montar a linha inteira num
`custom_field` único, com `onclick` inline para navegação SPA) funciona e
pode ser reaproveitada — o que não agradou foi o resultado visual, ícones no
lugar dos nomes dos cômodos.

## Navegação em modo painel: botão de voltar no cabeçalho

Em modo painel as abas do HA ficam escondidas, então uma vez dentro de uma
página de cômodo não havia como voltar sem sair do HA. O template
`room_header` passou a ter um **chevron à esquerda do título**, num quadrado
de 38px com fundo `rgba(255,255,255,0.10)`, e o cabeçalho inteiro tem
`tap_action: navigate` para `/minha-casa/geral`.

Como todas as páginas de cômodo usam esse template, o botão apareceu nas 11
de uma vez. As páginas **Luzes** e **Cômodos** não tinham cabeçalho nenhum —
receberam um `room_header` próprio, com o mesmo botão.

## Botão do controle remoto padronizado com os controles da TV

O botão do controle remoto era um retângulo de 52px de largura e altura
total, sem fundo, desalinhado da linha de botões do
`mushroom-media-player-card`. Medidos os botões do mushroom (42×42,
`border-radius: 12px`, fundo `rgba(255,255,255,0.05)`, linha terminando 12px
antes da borda inferior do card), o botão do controle recebeu exatamente os
mesmos valores mais `align-self: end` no `ha-card`.

**Por que `align-self` funciona aqui**: o `hui-horizontal-stack-card` usa
`display: grid` e os `hui-card` intermediários são `display: contents` — quem
é o item do grid é o próprio `ha-card`. Verificado depois: os três botões
ficam em `y: 149`, altura 42, `bottom: 191`, com 12px de intervalo.

## Legenda da lista de compras

Adicionado um rótulo "LISTA DE COMPRAS" acima do `todo-list`, no mesmo preset
de legenda usado nos popups (10px, 700, maiúsculas, `letter-spacing: 0.08em`,
`rgba(255,255,255,0.45)`).

## Afastamento das extremidades no modo painel

Em modo painel o conteúdo encostava nas bordas (o usuário viu no iPad).
Adicionado `card_mod` no `vertical-stack` raiz **das 14 views**:

```css
@media (max-width: 1400px) {
  #root { padding: 18px 16px 28px 16px !important; box-sizing: border-box !important; }
}
@media (max-width: 500px) {
  #root { padding: 16px 14px 26px 14px !important; }
}
```

Acima de 1400px (o PC) nada muda — lá o chrome do HA já dá o respiro.

**Tentativa descartada**: `card-mod-view` no tema, mirando `:host` da
`hui-panel-view`. Medido depois de aplicar: `padding` continuava `0px` e
nenhuma tag `<style>` era injetada na view. Foi removido do tema. O que
funciona é o `card_mod` no card raiz da view.

**Cuidado ao testar**: logo depois de gravar o `card_mod` nas views, a
medição ainda dava `styleCount: 0` — o card-mod só reprocessou depois de um
`frontend.reload_themes`. Confirmado com reinício completo do container: a
margem continua aplicada, então é o `card_mod` das views que a produz.

## Modo painel (tela cheia) — automático por tamanho de tela

**Método atual, validado.** O bloco `kiosk_mode` na raiz do dashboard
(`.storage/lovelace.minha_casa`) usa `mobile_settings`, que o kiosk-mode
aplica sozinho comparando `window.innerWidth` com `custom_width`:

```json
"kiosk_mode": {
  "mobile_settings": {
    "custom_width": 1400,
    "hide_sidebar": true,
    "hide_header": true
  }
}
```

Sem parâmetro na URL, sem helper, sem botão: qualquer tela **até 1400px**
(iPhone e iPad em qualquer orientação) abre em tela cheia; acima disso o HA
aparece normal, com sidebar e abas. O padrão do kiosk-mode é 812px — 1400
foi escolhido para cobrir o iPad em paisagem (1024px) com folga.

Trecho do bundle que confirma o comportamento:

```js
mobile_settings; if(a){const e=a.custom_width?a.custom_width:812;
window.innerWidth<=e && (s=Object.assign(...,a))}
```

**Validado nas três larguras**: 375px (iPhone) e 1024px (iPad paisagem) →
tela cheia; 1600px (PC) → interface normal. Para mudar o corte, é só editar
`custom_width`.

## Histórico: abordagens de modo painel que não funcionaram

O botão "Modo painel" que existia no header foi **removido**. Ele nunca
funcionou de verdade, e as alternativas testadas caíram uma a uma:

| Abordagem | Resultado |
|---|---|
| `kiosk_mode: entity_settings` + `input_boolean.modo_painel` | A chave **não existe** neste fork (`NemesisRE/kiosk-mode` v14.1.0). Verificado no bundle: só `admin_settings`, `non_admin_settings`, `user_settings` e `mobile_settings`. `KioskMode.panelOptions` ficava `{}` — por isso o botão não fazia nada |
| `action: navigate` com `?kiosk` | O HA é SPA: a URL muda mas o kiosk-mode só aplica no *load*; com query string a view chegou a **renderizar vazia** |
| `action: url` com `?kiosk` | Funciona tecnicamente, mas **abre o navegador externo** — sai do app do HA. Foi o que o usuário reportou |
| `browser_mod.javascript` | Exige **registrar cada dispositivo** no Browser Mod (`registered: false` nos aparelhos) |
| URL manual `?kiosk&cache` | Grava no localStorage do dispositivo, mas o usuário colou e não funcionou |

O `input_boolean.modo_painel` foi removido do `configuration.yaml` — não é
usado por nada.

## Centralização aplicada também aos badges e toggles

Mesmo bug do `grid-template-rows` reapareceu nos badges dos cards de cômodo:
o pill de luzes tinha `16px 0px 0px 0px` num card de **25px**, deixando o
ícone **4,5px acima do centro**. Corrigido com `grid-template-rows: 1fr` +
`align-items/align-content: center` em:

- `room_tile` → badges `one` (luzes), `two` (movimento), `three` (temperatura)
- `light_row` → linha e o toggle redondo aninhado (página Luzes)
- `room_row` → toggle redondo (lista dinâmica da Geral)
- `entity_card` → badge circular do ícone (`btn`)

**Verificação numérica**: desvio 0,0px em todos os elementos de linha única —
14 badges na página Cômodos, 16 linhas na página Luzes e 15 elementos na
Geral.

> Este bug já apareceu **três vezes** no projeto (badge de luzes, popup do
> controle, badges dos cômodos). Regra: em qualquer `custom:button-card` cujo
> conteúdo ocupe **uma linha só**, definir `grid-template-rows: 1fr`
> explicitamente — o padrão de 4 linhas do button-card sempre ancora o
> conteúdo no topo.

## Campo "Adicionar item" da lista de compras

O `todo-list` nativo vinha com o input em `rgb(243,243,243)` (branco) e texto
branco por cima — ilegível e destoando do tema. Estilizado para o padrão do
projeto: fundo `rgba(255,255,255,0.07)`, borda `rgba(255,255,255,0.12)`,
raio 12px, altura 44px, texto branco, placeholder em 45% e um estado de foco
com borda azul (`rgba(10,132,255,0.6)`).

**Como foi feito** — o input é um `wa-input` (Web Awesome) dentro de
`ha-input`, dois níveis de shadow DOM abaixo do card. Nem as variáveis
`--wa-form-control-*` nem `--wa-color-neutral-fill-quiet` surtiram efeito
(o HA sobrescreve com CSS próprio, medido no DOM). A solução foi o
**shadow-piercing do card-mod** com `$`:

```yaml
card_mod:
  style:
    ha-input$wa-input$: |     # entra em dois shadow roots
      .text-field { background-color: ... !important; }
      input::placeholder { color: ... !important; }
    .: |                       # o próprio card
      .addRow { padding: ... }
      p.empty { color: ... }
```

> Regra geral para componentes `wa-*`: tentar variável primeiro, mas se não
> pegar, usar `elemento$elemento$` do card-mod em vez de insistir nos tokens.

## Popup do controle remoto: layout reformulado

Estava desalinhado (faixas atravessando o D-pad, rockers vazios, espaçamento
irregular). Reconstruído com grid e medidas consistentes:

- **Seções com legenda** (uppercase 10px, `rgba(255,255,255,0.45)`):
  Energia · Navegação · Volume e canal · Streaming
- **Pills de 46px** de altura, ícone 18px + rótulo 13px/600, sempre em pares
  alinhados (Ligar/Fonte, Voltar/Início, Mudo/Menu). O de energia usa
  `rgba(255,59,48,0.28)` como destaque.
- **D-pad**: disco de 208px (`border-radius: 50%` + `overflow: hidden`) com
  grid 3×3 de células **realmente transparentes** — antes os "spacers" tinham
  fundo e viravam faixas atravessando o círculo. Setas de 62px de altura,
  OK circular de 62px em `rgba(10,132,255,0.9)`.
- **Rockers** de volume e canal: rótulo no topo + duas metades de 46px
  separadas por linha de 1px, dentro de superfície `rgba(255,255,255,0.07)`.
- **Streaming**: 6 círculos de 46px com as cores de marca, em grid de 6.

**Três armadilhas encontradas aqui (valem para qualquer card_mod do projeto):**
1. `background: transparent !important` num card_mod "sem chrome" **anula
   todos os fundos** definidos em `styles.card` — o card_mod deve remover só
   borda, sombra e blur.
2. `height: 100%` numa célula de grid sem altura definida no pai resulta em
   **altura 0** (foi o que sumiu com as setas). Usar altura fixa.
3. O `border-radius: 24px !important` do tema vence o `styles.card` inline do
   button-card; para um círculo é preciso repetir `border-radius: 50%
   !important` no `card_mod` do próprio card.

### ⚠️ Centralização vertical em button-card — causa raiz e solução definitiva

O texto das pills ficava ~10px acima do centro. **Causa medida no DOM**: o
`#container` do button-card tem sempre **4 linhas de grid** (ícone, nome,
estado, label). Com só a primeira preenchida, o computed ficava
`grid-template-rows: 19px 0px 0px 0px` e, como `align-content` é `normal`,
o bloco inteiro ancora no **topo** do card — `align-items: center` sozinho
não resolve, porque centraliza dentro da linha de 19px, não dentro dos 40px.

**Solução definitiva** (aplicada nos 31 button-cards do popup):
```yaml
styles:
  grid:
    - grid-template-rows: 1fr      # colapsa as 4 linhas em uma só
      align-items: center
      align-content: center
```
Com isso o computed vira `grid-template-rows: 40px` (a altura total do card).

**Verificação numérica** (não só visual): desvio do centro do texto e do
ícone em relação ao centro do card = **0.0px** em todas as pills, no OK, nas
setas do D-pad, nas legendas dos rockers e nos ícones de streaming.

> Mesmo bug já tinha aparecido no badge de luzes do `room_tile`. Sempre que
> um conteúdo de button-card parecer "colado no topo", checar
> `grid-template-rows` no `#container` antes de mexer em padding/margem.

**Compactação (segunda passada)**: o usuário pediu textos centralizados e
menos vão. Ajustes:
- Pills: `grid-template-columns: 18px max-content` + `justify-content: center`
  — ícone e texto ficam **colados e centralizados** como um par, em vez de o
  texto esticar num `1fr`. Altura 46px → **40px**, raio 12px, fonte 12,5px.
- Legendas de seção: 24px → **16px** de altura, fonte 9,5px.
- D-pad: 208px → **176px**; setas 62px → 54px; OK 62px → **54px**.
- Rockers: caption 26px → 20px, metades 46px → **38px**.
- Streaming: círculos 46px → **42px**.
- `gap` entre linhas 10px → **8px**; entre seções do popup, **6px** com
  `#root > * { margin: 0 }`.

Resultado: o popup inteiro passou a caber na tela **sem rolagem**.

**Validação**: conferido no desktop (todas as seções, D-pad e streaming).
No iPhone o botão de abrir foi confirmado presente e clicável, mas o popup
não pôde ser inspecionado — a janela do app foi minimizada no meio do teste e
o navegador embutido para de renderizar nessa condição.

## Controle remoto: botão compacto dentro do card da TV

O card grande "Controle Remoto da TV" foi removido da Geral a pedido do
usuário. No lugar, um **ícone pequeno (`mdi:remote-tv`, 52px)** fundido no
próprio card da TV: `custom:stack-in-card` em `mode: horizontal` com
`grid-template-columns: 1fr 52px`, juntando o
`mushroom-media-player-card` (achatado, sem chrome próprio) e o botão.
Visualmente é uma janela só; o `tap_action` continua abrindo o mesmo popup
completo do Browser Mod. Validado no desktop e no iPhone (o botão continua
visível e clicável em 375px).

## Responsividade (iPhone / tablet / desktop)

O layout de painel em 3 colunas ficava ilegível no iPhone. Resolvido com
**media queries dentro do `card_mod`** (é CSS real, então `@media` funciona).

**Breakpoints — mudar aqui muda o comportamento em todas as páginas:**

| Faixa | Alvo | Comportamento |
|---|---|---|
| até **700px** | iPhone | 1 coluna; Cômodos em 2; relógio oculto; fontes menores |
| **701–1000px** | tablet retrato | 2 colunas; Cômodos em 3 |
| acima de **1000px** | tablet paisagem / desktop | layout completo (3 colunas na Geral, 5 na visão de Cômodos) |

Aplicado no `#root` dos `horizontal-stack` de cada página, no formato:

```css
#root { grid-template-columns: <desktop> !important; }
@media (max-width: 1000px) { #root { grid-template-columns: 1fr 1fr !important; } }
@media (max-width: 700px)  { #root { grid-template-columns: 1fr !important; } }
```

**Decisões de celular:**
- **Relógio oculto** abaixo de 700px (`#root > *:last-child { display: none }`)
  — o iOS já mostra a hora na barra de status, e o relógio de 40px empilhado
  desperdiçava altura.
- Saudação cai para 24px e a data para 12px.

**Gotcha descoberto aqui**: `grid-template-areas` + `grid-area` via
`nth-child` **não funciona** nos stacks do HA — os wrappers de card usam
`display: contents`, então o seletor não alcança o item real de grid e a
coluna colapsa para 0px (foi o que sumiu com a saudação na primeira
tentativa). Usar apenas `grid-template-columns` e ordem natural dos filhos.

## Refinamento: glass unificado no TEMA (não card a card)

O usuário apontou que o glass não estava totalmente aplicado. Duas causas
reais, ambas corrigidas:

1. **O tema ainda tinha o glass antigo** (mask-composite, `blur(50px)`,
   raio 30px), então todo card *sem* `card_mod` próprio — mushroom, bubble,
   mini-graph, gauges, `todo-list`, `weather-forecast` — ficava com estética
   diferente dos que eu havia estilizado à mão. Convivia**m** duas linguagens
   visuais na mesma tela.
2. **Meu `card_mod` com `background-color: !important` quebrou a inversão
   para branco** do `entity_card` quando ligado (CSS externo com `!important`
   vence estilo inline sem `!important`). Era por isso que o card aceso não
   ficava mais branco.

Solução: o glass passou a ser definido **uma vez no tema** (`card-mod-card`:
`blur(14px) saturate(130%)`, borda `rgba(255,255,255,0.08)`, raio 24px,
pseudo-elementos desligados) e o fundo via a variável
**`ha-card-background: rgba(0, 0, 0, 0.30)`** — variável, não `!important`,
justamente para que os `state:` dos button-cards possam sobrescrever
(laranja quando aceso, branco na inversão). Os `card_mod` redundantes dos
templates `entity_card`/`room_tile`/`panel_tile` foram removidos.

> Reforça o gotcha que já estava documentado: **nunca forçar `background`
> com `!important` em `ha-card` de forma genérica** — quebra todo estado
> colorido de button-card. Usar sempre a variável `ha-card-background`.

Outros ajustes desta rodada:
- **Fita LED** (Sala): era um `bubble-card` do tipo *slider* e renderizava com
  `ha-card` transparente (invisível). Trocada por `entity_card`, que já mostra
  o brilho em % e mantém a consistência. Os bubble-cards de *movimento*
  (`button_type: name`) funcionam normalmente e foram mantidos.
- **Grids compactos**: `grid-auto-rows: min-content` nos grids de dispositivo,
  senão o modo painel estica as linhas e espalha os cards.
- **PC**: card "Status" esticava na altura da coluna; altura fixa de 84px na
  linha de status/atalho.

## Padrão de painel aplicado em TODAS as páginas

Todas as 14 páginas usam agora o mesmo padrão visual da Geral:

- **`type: panel`** em todas — o HA em masonry limita a largura das colunas
  (~500px) e espremia/truncava tudo. Em `panel`, um card raiz
  (`vertical-stack`) ocupa 100% da tela.
- **Glass unificado** nos templates `entity_card`, `room_tile` e `panel_tile`:
  `rgba(0,0,0,0.30)` + `blur(14px) saturate(130%)` +
  `border: 1px solid rgba(255,255,255,0.08)` + `border-radius: 24px`.
- **Colunas via `card_mod` no `#root`** do `horizontal-stack`
  (`grid-template-columns`), já que `custom:layout-card` não está instalado.

Layout por tipo de página:
- **Cômodos** (11 páginas): `room_header` + 2 colunas — dispositivos à
  esquerda, sensores/gauges/gráficos à direita. Páginas magras (Copa,
  Cozinha, Circulação, Quarto) usam coluna única `minmax(340px, 620px) 1fr`,
  para o card não esticar na largura toda.
- **Luzes**: 2 colunas, grupos de cômodo divididos ao meio — as 16 luzes
  cabem na tela sem rolagem.
- **Cômodos** (visão geral): grid de 5 colunas, os 10 ambientes visíveis
  de uma vez.

**Detalhe que precisou de correção**: em `panel` o grid estica as linhas para
preencher a altura, espalhando os cards. Resolvido com `height: 78px` fixo no
`entity_card` e `grid-auto-rows: min-content` nos grids de dispositivo.

## ⚠️ Geral reconstruída do zero (substitui o grid 2×4 abaixo)

O usuário apontou que o resultado "não estava nem próximo da referência".
Diagnóstico: eu vinha **enxertando peças da referência sobre a estrutura
antiga** em vez de reconstruir a arquitetura dela. Os quatro gaps eram:
1. Tudo dentro do chrome do HA (sidebar + abas dominando a tela); a
   referência roda em **kiosk, tela cheia**
2. Cards pequenos de ícone+texto; a referência tem **widgets grandes e ricos
   em conteúdo** (clima ilustrado, capa de álbum, feed de câmera)
3. Fundo genérico em vez de **foto real da casa**
4. Proporção de coluna para navegador, não **paisagem densa de tablet**

Reconstrução aplicada:
- **`kiosk-mode`** instalado manualmente (`www/custom-cards/kiosk-mode.js`,
  v14.1.0) + `input_boolean.modo_painel` (em `configuration.yaml`). Bloco
  `kiosk_mode` na raiz do dashboard esconde header e sidebar quando o helper
  está ligado. O chip de tablet no header liga/desliga.
- **Header**: saudação grande ("Boa noite, André" + data por extenso) à
  esquerda, chips ao centro, relógio 40px à direita.
- **Corpo**: 3 colunas de widgets grandes, em paisagem —
  coluna 1 clima (`weather-forecast` com previsão) + luzes principais
  (`entity_card`); coluna 2 lista de cômodos + gauges do PC;
  coluna 3 mídia (com arte) + lista de compras real (`todo-list`).

**Limitação de conteúdo, dita com clareza**: sem câmeras, calendário,
HomePods/música e termostato, a referência perde boa parte do que a torna
visualmente rica. A arquitetura agora está certa, mas o painel fica mais
vazio que o original até esses dispositivos existirem.

**Correção estrutural decisiva**: a view precisou virar **`type: panel`**.
No modo masonry padrão o HA limita a largura das colunas (~500px), então o
`horizontal-stack` de 3 colunas espremia tudo e truncava todos os textos —
era isso que fazia o painel parecer "uma dashboard do HA" e não um painel de
tablet. Com `panel`, um único card raiz ocupa 100% da largura/altura.
Proporções das colunas e do header definidas por `card_mod` no `#root`
(`grid-template-columns`), já que `custom:layout-card` não está instalado.

**Validado visualmente**: header com saudação completa + chips + relógio;
coluna 1 clima com previsão de 4 dias + 4 luzes; coluna 2 lista de cômodos
com nomes completos e badges + gauges do PC; coluna 3 TV com controles +
Controle Remoto + lista de compras real.

## Corpo da Geral: grid 2×4 com swipe (arquitetura da referência) — SUBSTITUÍDO

Seguindo o plano de `config/instrucoes-dashboard-ios-tablet/`, a Geral agora
tem a arquitetura **header / corpo / footer** do painel original:

- **Header**: barra de chips (clima, presença, luzes, PC, atualizações)
- **Corpo**: `custom:swipe-card` com **2 páginas de grid 4 colunas × 2 linhas**
  - Página 1 (novo template `panel_tile` — ícone grande, nome, label):
    Clima, Relógio, **Lista de Compras**, TV Sala, PC, Luzes,
    PlayStation 5, Cômodos
  - Página 2: os 8 primeiros `room_tile` (mesmo template fiel ao `room_card`),
    com fonte reduzida para caber em 4 colunas
- **Footer**: painel da TV + botão do Controle Remoto

**Lista de Compras**: equivalente ao popup `#shopping` da referência —
`todo.lista_de_compras` (entidade real já existente), com contagem de itens
no tile e popup Browser Mod abrindo o `todo-list` nativo.

**Correção de qualidade encontrada no caminho**: a contagem de luzes acesas
estava incluindo as **luzes de fundo dos interruptores**
(`light.*_luz_de_fundo`), que são indicadores do botão, não iluminação de
ambiente — por isso o painel mostrava "3 acesas" com a casa toda apagada.
Criado `sensor.luzes_acesas_total` (em `template_sensors.yaml`) usando a
mesma curadoria de 16 entidades da página Luzes; o chip do header e o tile
de Luzes agora usam essa fonte única de verdade.

**Limpeza**: removida a entidade órfã `input_text.fundo_url` do
`core.entity_registry` (resíduo de uma tentativa antiga de fundo
personalizado; a definição já não existia). Feito com o container parado,
senão o HA sobrescreve a edição do registro ao salvar.

## Verificações do ambiente (para não implementar o inaplicável)

Confirmado via `hass.states` nesta data — **não existem**: `camera.*`,
`calendar.*`, `climate.*`, `input_select.*`, `input_boolean.*`.
Portanto ficam fora, até o André integrar o hardware/serviço correspondente:
cards de câmera (e `input_select.camera_selecter`, `input_text.popup_entity`),
calendário (`today-card` + `atomic-calendar-revive`), termostato,
troca dinâmica de slot via `input_select.column_ab1`, e `kiosk-mode`
(que precisa de `input_boolean.standby_kiosk_mode` e só faz sentido com o
iPad fixo em Guided Access).

**Ponto anotado do documento de instruções (seção 1)**: para o dashboard
geral da casa, o André no fim prefere uma **planta baixa (floorplan) com os
dispositivos plotados**, não grid por cômodo. O `floor3d-card` já está
instalado e a pendência do scan LiDAR do iPad continua aberta. Não foi
levantado agora para não bloquear a réplica fiel pedida.

## Pacote de pesquisa da referência (arquivado)

Copiado para `C:\HomeAssistant\referencias\`:
- `pesquisa-ios-dashboard.md` — pesquisa completa do painel original
  (post no Reddit de u/Pivotanian, links dos cards no Pastebin, dependências
  HACS, helpers necessários, mapa dos ~54 templates, descrição da arquitetura
  header/corpo-com-swipe/footer e do truque de notificação invisível)
- `templates-exemplo.yaml` — templates limpos e generalizados
  (`divider`, `camera_list`, `heading`, `subheading`, `gauge`, `kiosk_mode`)

**Ainda não aplicados desta pesquisa** (não aplicáveis ou sem hardware):
`kiosk-mode` (faz sentido só com tablet fixo em Guided Access),
`input_select` para troca dinâmica de cards no grid 2×4 com swipe,
cards de câmera/veículo/saúde/esportes/notícias, calendário
(`today-card` + `atomic-calendar-revive`), LLM Vision.

## `room_header` + `entity_card` aplicados em todas as páginas de cômodo

Templates replicados fielmente da referência e aplicados nas 11 páginas
(Sala de Estar, Cozinha, Copa, Lavanderia, Área Gourmet, Quarto,
Quarto do Luca, Banheiro, Circulação, Closet, PC):

- **`room_header`**: nome do cômodo, 30px bold, `var(--primary-text-color)`,
  `drop-shadow(rgba(0,0,0,0.5) 0.1rem 0.1rem 1.5px)`, card transparente 50px
- **`entity_card`**: grid `"btn n" "btn num"`, badge circular 38px
  (`border-radius: 50px`, ícone 25px), nome 14px/550 com `padding-top: 15px`,
  campo `num` mostrando brilho em % (ou On/Off para switches sem brightness),
  card `border-radius: 20px` + `rgba(0,0,0,0.3)` + `blur(10px)`.
  **Estado ligado inverte o card para branco com texto preto** (assinatura
  visual do modelo), com o badge assumindo a cor do dispositivo.

Isso substituiu o `device_tile` (tiles quadrados) e desfez o agrupamento em
painel único nas páginas de cômodo — na referência cada card é independente
com fundo próprio. Cards com slider (ventilador Mushroom, Fita LED Bubble)
e atalhos (PS5) foram preservados, pois o `entity_card` não tem slider.

## Página "Cômodos" (nova) — `room_card` da referência replicado

Grid 2 colunas com 10 tiles de cômodo, replicando o template `room_card` da
segunda referência com as medidas originais: card 140px de altura, padding
`15px 20px 20px 20px`, fundo `rgba(0,0,0,0.3)` + `backdrop-filter: blur(10px)`,
nome 22px bold no topo, badges na base. Badges (mesmas dimensões da referência):
luzes 42×25px (`#ff9800` quando >0), movimento 25×25px, temperatura 65×25px com
as mesmas faixas de cor (`<15` verde, `<=20` azul, `<=25` vermelho, `<=30`
`#a357d7`, `<=35` `#f7ce46`). Tap navega pra página do cômodo; tap no badge de
luzes faz toggle de todas as luzes do cômodo. Opacidade reduzida quando o
cômodo tem sensor de presença e não há movimento (igual à referência).

**Ajuste de contraste consciente**: a referência usa fundos `rgba(0,0,0,0.1)`
nos badges apagados porque o dashboard dela tem foto de fundo clara; sobre o
nosso fundo escuro isso fica invisível, então os estados apagados usam
`rgba(255,255,255,0.10)` (mesmo papel visual, contraste equivalente). Opacidade
sem presença: 0.75 em vez de 0.5, pelo mesmo motivo.

**Sensores de contagem** (`config/template_sensors.yaml`, incluído no
`configuration.yaml` via `template: !include`): 9 sensores `sensor.luzes_<comodo>`
que contam luzes acesas por cômodo. Criados porque a referência usa um sensor
de contagem (`var_sensor`) + `state:` arrays em vez de templates JS — e
templates JS que dependem de `states[...]` **não avaliam de forma confiável em
cards aninhados**. Esse é o caminho correto para badges em `custom_fields`.

**Gotchas confirmados (de novo) neste trabalho**:
- Aninhar cards em 2+ níveis (`custom_fields` dentro de `custom_fields`) quebra
  a renderização — manter no máximo 1 nível
- Coluna de ícone em grid `"i s"` colapsa pra 0px porque o ícone é
  `position: absolute`; corrigir sempre com `styles.img_cell: [{width, height}]`
  + `grid-template-columns` fixo

## Página "Luzes" (nova)

Lista plana de todas as luzes/switches de iluminação da casa, agrupadas por
cômodo (legenda pequena antes de cada grupo), inspirada no padrão
`lights_headers` da segunda referência. Novo template `light_row`
(ícone + nome + toggle redondo, mesma paleta laranja/transparente já
padronizada) dentro de um `custom:stack-in-card` único (painel com só
borda externa, seguindo o padrão já estabelecido). Cobre os 9 cômodos com
luz: Sala de Estar, Cozinha, Copa, Lavanderia, Área Gourmet, Quarto do Luca,
Banheiro, Circulação, Closet (16 luzes ao todo). Não criada: página
"Input Booleans" — usuário não tem nenhum helper `input_boolean` no sistema.

## Painel de controle da TV (Geral)

Adicionado painel na Geral pra controlar a TV (Samsung, integração `smartthings`,
`media_player.sala_de_estar_tv`) sem precisar entrar na Sala de Estar:
- `custom:mushroom-media-player-card`: liga/desliga, volume (toque no ícone de
  alto-falante pra expandir mute/-/+), play/pause. **Cuidado**: o valor certo
  pra `media_controls` é `pause` (não `play_pause` — esse quebra a lista
  silenciosamente, mushroom só aceita `on_off/previous/pause/next/stop/shuffle/repeat`)
- **Controle Remoto completo** (botão que abre popup via Browser Mod): instalada a integração nativa **Samsung Smart TV** (`samsungtv`, local, IP `192.168.31.250`) além do SmartThings já existente — criou `remote.tv_un65du8000gxzd` (`remote.send_command` com códigos de tecla reais: `KEY_HOME`, `KEY_RETURN`, `KEY_UP/DOWN/LEFT/RIGHT`, `KEY_ENTER`, `KEY_VOLUP/DOWN`, `KEY_MUTE`, `KEY_CHUP/DOWN`, `KEY_POWER`, `KEY_MENU`, `KEY_INFO`, `KEY_SOURCE`) e também `media_player.tv_un65du8000gxzd` (com suporte a `PLAY_MEDIA`, usado pra abrir apps de streaming). Pareamento exigiu autorizar o Home Assistant na própria TV (Configurações → Gerenciador de Dispositivos Externos).
  - **Layout do popup (v2, baseado no controle real Samsung/SmartThings)**: coluna estreita centralizada em vez de grid espalhado. **D-pad circular de verdade**: um `custom:stack-in-card` com `card_mod` (`border-radius: 50%`, `overflow: hidden`, 220×220px) contendo um `grid columns:3` de 9 botões (4 cantos transparentes — ficam recortados pelo círculo automaticamente — + cima/baixo/esquerda/direita/OK), todos com o mesmo fundo, criando a ilusão de um disco único. Ligar/Fonte e Voltar/Início como pills largas (2 colunas). Volume e Canal como "rockers" verticais (`stack-in-card` com 2 botões empilhados sem `gap`, dividido por uma borda fina). Streaming como fileira de círculos coloridos só com ícone (sem legenda — ícones de marca já são autoexplicativos, como no controle real).
  - **Regra de ouro pra popups do Browser Mod**: nunca aninhar `custom:button-card` dentro de `custom_fields` de outro `custom:button-card` aqui — sempre usar cards "flat" (irmãos dentro de `grid`/`stack-in-card`/`vertical-stack`), senão o `hass` não propaga (ver gotcha documentado acima)
  - **Streaming**: botões com cor de marca chamando `media_player.play_media` (`media_content_type: app`, `media_content_id: <tizen_app_id>`) — Netflix `11101200001`, YouTube `111299001912`, Prime Video `3201512006785` (ícone `mdi:video-box`, `mdi:amazon` não existe), Disney+ `3201901017640`, Globoplay `3201611015144`, Spotify `3201606009684`. **Nota**: IDs de app Tizen são valores conhecidos/documentados pela comunidade, mas podem variar por região/modelo — testar fisicamente e ajustar se algum abrir o app errado.
- Painel simplificado a pedido do usuário: removidos os sensores de canal/app
  (`sensor.sala_de_estar_tv_canal_de_tv`/`..._nome_do_canal_de_tv`) — hoje o
  painel da Geral mostra só o status básico (`mushroom-media-player-card`:
  ligado/desligado + volume) e o botão "Controle Remoto da TV"

## Widgets avançados adicionados (baseado na dashboard de referência)

- **stack-in-card** (HACS manual, baixado em `config/www/custom-cards/stack-in-card.js`): agrupa cards menores em um só painel com borda única. Aplicado na página PC (gauges + histórico + tempo ligado) e Sala de Estar (histórico de temp/umidade + gauges)
- **swipe-card** (HACS manual, `config/www/custom-cards/swipe-card.js`): card com múltiplas telas por arraste. Aplicado na Geral — arrasta o card de previsão do tempo pra revelar um relógio grande (`type: clock`)
- **Painel único na Geral**: o swipe-card (clima/relógio) e a lista de cômodos foram agrupados em um só `custom:stack-in-card`, com `card_mod` "achatando" (background/border/shadow/blur transparentes) cada card interno pra sobrar só a borda externa do stack-in-card — sem essa flattening, cada card interno mostraria sua própria borda "glass" do tema, duplicando as bordas

- **Gauges circulares** (`custom:modern-circular-gauge`, HACS): Sala de Estar (Temperatura/Umidade — sensor atualmente offline), PC (CPU escala 0-1, RAM 0-100%, Disco C: 0-100%), Quarto do Luca e Closet (energia kWh)
- **Now Playing** (template `now_playing` em `button_card_templates`): card rico pra TV da Sala de Estar (capa/arte + título + artista/app)
- **Chip de Atualizações**: ícone pequeno na barra de chips de status da Geral (ao lado de clima/presença/luzes/conectado) — verde com check quando não há pendências, vermelho com contador quando há `update.*` pendente; toque abre `/config/updates`
- **Bubble Card**: sensores de movimento (todas as páginas) viraram `custom:bubble-card` tipo `button`; Fita LED da Sala de Estar virou slider Bubble Card

## Credenciais/valores usados (não sensíveis, só referência técnica)

- Tuya Cloud (Sala de Estar): device_id `eb831a8f3dedb06ad1tric`, local_key `k@YC;#~bC0M/(#j=`, IP `192.168.31.168`, protocolo 3.4, DPs: 1=fan on/off, 4=velocidade, 5=luz (não documentado oficialmente), 11=modo relé, 13=luz de fundo do botão, 101=direção (valores reais `forward`/`reversal`, não `forward`/`reverse`)
- Tuya Cloud (Quarto, ainda offline): device_id `eb956546b52fa8a4ddyfom`, local_key `}q~E@N.V[EL3(HkB`

## Estruturação como projeto do Claude Code

O trabalho deixou de viver em sessões avulsas (workspace temporário, apagado
junto com a sessão) e passou a ser um projeto de verdade, com raiz em
`C:\HomeAssistant`. O que mudou:

- **`CLAUDE.md`** na raiz — instruções permanentes lidas em toda sessão nova:
  mapa das pastas, fluxo obrigatório de edição da dashboard, regras de design
  (referência iOS, reconstrução fiel, cores padronizadas) e as armadilhas já
  conhecidas (restart do container, patch do Glances, `content` do Browser Mod,
  `background !important` no tema, `min-content` em `button-card`).
- **`scripts/ha.py`** — utilitário que padroniza o ciclo backup → editar → salvar
  → restart. Como biblioteca expõe `load()`, `save(cfg, tag)` (que já faz o
  backup em `backups/`), `backup()` e `restart()`; como CLI tem `views`,
  `templates`, `get <caminho>`, `backup <tag>` e `restart`. Os scripts novos de
  alteração ficam curtos e sempre com backup.
- **`scripts/lovelace/`** — os scripts das alterações já aplicadas (`ajustes5`,
  `ajustes6`, `apply_pc_comodos`, `compactar`, `fix_popup`, `luzes`) foram
  resgatados do diretório temporário das sessões antigas, onde seriam perdidos.
  Servem de histórico executável e de modelo para os próximos.
- **`referencias/`** — passou a concentrar `reference_ios_dashboard.yaml` (antes
  solto na raiz), a pesquisa da dashboard iOS, os templates de exemplo e o
  `INSTRUCOES_DASHBOARD_HA.md`.
- **Git**: a pasta virou um repositório local (sem remote), com commit inicial
  de 208 arquivos. O `.gitignore` deixa de fora o banco, os logs, os caches, o
  HACS, a pasta `backups/` e tudo que carrega credencial — `secrets.yaml`, os
  tokens em `.storage/auth*`, `core.config_entries` (senhas/tokens das
  integrações) e `.storage/sonoff/` (api keys por dispositivo). O que importa
  está versionado: a dashboard, o tema, os registries de área/dispositivo/
  entidade, os custom_components instalados à mão e os scripts. A partir daqui,
  cada alteração na dashboard fecha com um commit — pontos de retorno melhores
  que os arquivos `.bak_*`.

## Deck de mídia na Geral

A coluna da direita da Geral tinha o card da TV solto (um `stack-in-card`
horizontal com o `mushroom-media-player-card` e o botão do controle remoto),
sem nenhuma relação visual com o resto da mídia da casa. Ele virou a primeira
linha de um **deck único de mídia** (`scripts/lovelace/deck_midia.py`):

```
stack-in-card (vertical)
├── legenda "MÍDIA"
├── [player da TV + botão do controle remoto]   ← o card que já existia
└── grid 2×2 de shortcut_tile
    ├── YouTube Music   ├── Apple Music
    └── TV              └── PS5
```

- Os tiles usam o template `shortcut_tile` (74px, ícone + nome) com o gradiente
  sobrescrito por card: vermelho `255,0,0` no YouTube Music, `250,36,60` no
  Apple Music.
- **TV e PS5 têm gradiente reativo**: forte quando o aparelho está ligado,
  quase transparente quando está `off`/`standby`/`unavailable` — mesma lógica
  de cor por estado usada no resto da dashboard.
- O tile da TV **reaproveita o `tap_action` do botão do controle remoto** (o
  popup do Browser Mod é copiado do card existente pelo próprio script, em vez
  de duplicado à mão). O do PS5 abre o `more-info` do `media_player.sala_de_estar_ps5`.
- O `stack-in-card` interno da TV recebeu o `card_mod` "nude" (sem fundo,
  borda ou blur próprios), para só o deck externo desenhar a borda.

**Limitação atual**: YouTube Music e Apple Music são, por enquanto, atalhos que
abrem o serviço no navegador — não há entidade `media_player` para eles. Isso
depende do Music Assistant (ver seção abaixo) estar autenticado.

## Music Assistant (em andamento)

Para tocar YouTube Music dentro do HA foi levantado um container separado,
`music-assistant` (`ghcr.io/music-assistant/server:latest`, portas 8095 e
8097, dados em `music-assistant/data`, fora do versionamento). Ele já sobe e
responde em http://localhost:8095.

O caminho foi escolhido depois de constatar duas limitações da casa: **não há
player de áudio compatível** (a TV Samsung de 2016 fala websocket, não aceita
áudio arbitrário; o PS5 também não) e **o container do HA roda em rede
`bridge`**, então descoberta por mDNS/SSDP não funciona — Chromecast, Sonos ou
DLNA teriam de ser adicionados por IP. Por isso o destino escolhido foi o
**Web Player** do Music Assistant, que toca no próprio navegador/tablet onde a
dashboard está aberta. O `ytube_music_player` do HACS foi descartado: ele
exige um Chromecast ou MPD como destino.

Falta, e depende do André:

1. ~~PO Token Generator~~ — **resolvido**. O container `bgutil-provider`
   (`brainicism/bgutil-ytdlp-pot-provider:1.2.1`, a versão que o Music
   Assistant suporta) está de pé. Ele e o `music-assistant` foram colocados na
   rede docker `ma-net`, então o endereço a informar no provider é
   `http://bgutil-provider:4416` — testado de dentro do container do MA,
   responde `{"version":"1.2.1"}`. O primeiro `docker pull` falhou com
   `input/output error` do Docker Desktop; repetir resolveu.
2. **Cookie de login do YouTube Music** — é a única forma de autenticação que o
   Google permite para apps de terceiros. O cookie é copiado do navegador
   (DevTools → Network → requisição `/browse` → cabeçalho `Cookie`) e colado na
   interface do Music Assistant. Conta Premium é obrigatória (a do André é) e o
   cookie expira de tempos em tempos — erro `401` significa refazer esse passo.
3. **Integração Music Assistant no HA** — o endereço correto é
   **`http://192.168.31.22:8095`** (o IP do PC na LAN).

   Isso não é detalhe: a integração do MA usa um fluxo de autorização em que o
   **navegador** também precisa abrir a mesma URL para fazer login e liberar o
   acesso. Os dois primeiros endereços testados falharam por isso:

   - `http://music-assistant:8095` (nome na rede `ma-net`) e
     `http://172.17.0.3:8095` (o IP de container que a descoberta automática
     do HA propõe) funcionam de dentro do HA, mas **o navegador do Windows não
     resolve nenhum dos dois** — a aba de autorização abre em página de erro.
   - O IP da LAN funciona dos dois lados (verificado: o container do HA
     responde 200 nele, e o navegador também).

   Portanto: recusar o card "Descoberto" e usar *Adicionar integração →
   Music Assistant → Configurar outra instância*, digitando o IP da LAN.

A rede `ma-net` continua útil para o outro lado da ligação: é por ela que o
**Music Assistant alcança o PO Token Generator** pelo nome
(`http://bgutil-provider:4416`), sem depender de IP.

⚠️ **Armadilha, igual à do Glances**: a ligação do `homeassistant` à rede
`ma-net` sobrevive a `docker restart`, mas **se perde se o container for
recriado do zero**. Nesse caso, reaplicar:

```bash
docker network connect ma-net homeassistant
```

⚠️ **Segunda armadilha**: o IP da LAN do PC (`192.168.31.22`) está gravado na
integração. Se o PC trocar de IP, a integração do Music Assistant cai — o
mesmo motivo pelo qual o IP fixo do PS5 já é uma pendência antiga.

Quando isso estiver de pé, os dois tiles do deck deixam de ser atalhos web e
passam a controlar os `media_player` reais.

## Music Assistant: integração de pé, e o que o `172.17.0.3` quebra

A integração **Music Assistant no HA está criada e sem erro**
(`http://192.168.31.22:8095`, entry `01M1T7P0A2MFQ9962GJQC3G20W`). Dois
obstáculos apareceram no caminho, os dois pela mesma causa — o Music Assistant
roda em container e anuncia o **próprio IP de container** em fluxos que
precisam ser abertos pelo **navegador**, que não alcança esse IP:

1. **Autorização da integração**: o login do MA redireciona para
   `http://homeassistant.local:8123/auth/external/callback?...`. Esse hostname
   não resolve no Windows, então o fluxo morria na última etapa mesmo com o
   login já feito. Solução: reabrir a mesma URL de callback trocando o host por
   `localhost:8123` — o `code` e o `state` continuam válidos e a integração se
   cria na hora.
2. **Login do Apple Music**: o diálogo mostra "Opens 172.17.0.3:8095" e a
   janela abre em página de erro. Solução: pegar a URL do link "Click here if
   the window did not open" (`/apple_music_auth/<id>/index.html`) e reabri-la em
   `localhost:8095`. A tela de sign-in da Apple carrega normalmente assim.

**Regra geral**: qualquer fluxo do MA que precise do navegador tem que ser
aberto por `localhost:8095` (ou pelo IP da LAN); o `172.17.0.3` só serve para
comunicação entre containers.

### Descoberta importante: o Web Player não vira entidade no HA

O "Web (Chrome on Windows)" que aparece no rodapé do Music Assistant é um
player **da sessão do navegador** — abrir a UI numa aba nova já mostra "Nenhum
reprodutor selecionado". Ele não é um player persistente e, portanto, **a
integração não cria nenhum `media_player` no HA** por causa dele. Hoje o HA tem
a integração do MA configurada e **zero entidades**.

Consequência para o deck: enquanto não houver um player persistente, os tiles
de YouTube Music e Apple Music não podem controlar reprodução pelo HA. As
saídas possíveis, em ordem de esforço:

1. Tiles que abrem a interface do Music Assistant (funciona hoje, som sai no
   navegador/tablet) — eventualmente com o painel do MA embutido no HA via
   HACS, para não sair da dashboard.
2. Um player persistente de software no PC (Snapcast/Squeezelite como cliente
   na LAN), que aí sim vira `media_player` no HA.
3. Hardware compatível (Chromecast, Sonos, AirPlay) — que também exigiria tirar
   os containers da rede `bridge` para a descoberta funcionar.

### Ainda pendente (depende de login do André)

- **YouTube Music**: formulário preenchido com o PO Token correto
  (`http://bgutil-provider:4416`); faltam usuário e o cookie de sessão.
  O provider está marcado como **BETA** e só aparece na lista com o filtro
  *Estágio → Beta* ligado; o Apple Music exige ligar também Alfa/Experimental.
- **Apple Music**: fluxo aberto até a tela "Sign in with Apple"; o login em si
  é do André.

## Apple Music conectado — e por que a "opção 2" não existe mais

**Apple Music está autenticado e funcionando** no Music Assistant
(`apple_music--Pb5MeLy5`, biblioteca sincronizando — 224 gêneros mapeados no
primeiro scan; o log mostra "Apple Music Rate Limiter" nas primeiras
tentativas, o que é normal e se resolve sozinho com o retry).

O que destravou o login foi descobrir a **causa raiz** dos endereços quebrados:
o Music Assistant tem, em *Configurações → Sistema → Servidor Web*, um campo
**`URL base`** que vinha em `auto` — e no "auto" ele anuncia o IP do próprio
container (`172.17.0.3`), que o navegador não alcança. Duas tentativas
falharam antes disso:

- com `URL base` em `auto`, o popup do Apple Music abria em `172.17.0.3:8095`
  e morria em página de erro;
- com `URL base` no IP da LAN (`http://192.168.31.22:8095`), a janela abria mas
  o login da Apple não completava — **o MusicKit da Apple exige contexto seguro**
  (HTTPS ou `localhost`), e um IP em HTTP não serve.

O valor que funciona é **`http://localhost:8095`**: o popup abre em contexto
seguro e o login conclui. A integração no HA não é afetada por isso, porque ela
guarda o endereço próprio (o IP da LAN) na config entry.

### A opção 2 (player de software no PC) não é mais possível

Ao montá-la, descobri que o **Music Assistant 2.10 não tem mais os provedores
Snapcast nem Squeezelite** — foram substituídos pelo **Sendspin**, o protocolo
nativo da Open Home Foundation. Os provedores de player disponíveis hoje são:
AirPlay, Chromecast, DLNA, Sendspin, Sync Group Player e Universal Player.

E o Sendspin **não tem cliente para desktop Windows** — os clientes suportados
são a própria interface web (efêmera), clientes móveis e hardware com ESPHome
(ESP32) ou Linux (Raspberry Pi).

Também verifiquei o resto da casa em busca de um destino de áudio:

- Varredura SSDP na LAN: **nenhum MediaRenderer DLNA respondeu**.
- A TV (`192.168.31.250`) está ligada e responde, mas com as portas típicas de
  DMR Samsung (7676, 9197, 52235) fechadas — só 8001 e 8080, que são a API de
  controle. Ou seja, **a TV não serve como player de áudio**.
- Com a integração do MA carregada e o Web Player ativo, o HA continua com
  **zero entidades** do Music Assistant, confirmando que o web player não é
  exposto como `media_player`.

Para ter um `media_player` de verdade no HA seria preciso hardware: um ESP32
com ESPHome falando Sendspin (o caminho barato e nativo do ecossistema), o
Raspberry Pi que já está previsto na migração, ou um Chromecast/alto-falante
compatível — este último exigindo também resolver a descoberta, já que os
containers estão em rede `bridge`.

### Deck de mídia ajustado

`scripts/lovelace/deck_midia_ma.py`: o tile do **Apple Music** passou a abrir a
interface do Music Assistant (`http://192.168.31.22:8095` — IP da LAN, para
funcionar também no iPad e no celular, ao contrário do `localhost`), que é onde
a música efetivamente toca. O tile do **YouTube Music** continua apontando para
o site até o provider ser autenticado.

## Music Assistant desfeito — tiles voltam aos apps nativos

Como não existe player de áudio na casa que vire `media_player` no HA (ver
seção anterior), o caminho do Music Assistant foi abandonado a pedido do André.
O que foi desfeito:

- **Tiles de música** (`scripts/lovelace/deck_midia_apps_nativos.py`): Apple
  Music e YouTube Music voltaram a apontar para `music.apple.com` e
  `music.youtube.com`. No iPhone/iPad esses links abrem direto os apps nativos
  instalados — que é o comportamento que o André quer.
- **Integração no HA**: removida (Configurações → Integrações → Music Assistant
  → Excluir). Ela já estava em erro de qualquer forma: ao acertar a `URL base`
  do MA para `http://localhost:8095` (necessário para o login da Apple), a
  integração passou a herdar esse endereço, e dentro do container do HA
  `localhost` é o próprio HA.
- **Containers**: `music-assistant` e `bgutil-provider` parados, com
  `--restart=no` para não subirem sozinhos no boot. O container do HA foi
  desconectado da rede `ma-net`.

**O que foi preservado**: os dados do Music Assistant continuam em
`music-assistant/data` (fora do versionamento), incluindo a conta local e o
**login do Apple Music já autenticado**. Se um dia entrar um player de verdade
na casa (ESP32 com ESPHome, Raspberry Pi ou um alto-falante compatível), basta
`docker start music-assistant bgutil-provider` e refazer a integração — sem
repetir os logins.

Para remover de vez, incluindo os dados:

```bash
docker rm -f music-assistant bgutil-provider
docker network rm ma-net
rm -rf C:/HomeAssistant/music-assistant
```

## Saúde: Apple Saúde → Atalhos do iPhone → webhook do HA

Caminho escolhido pelo André em vez da integração Garmin Connect (que exige a
senha da conta e tem 2FA problemático): o relógio já sincroniza com o Apple
Saúde, então os dados entram no HA por um webhook alimentado por um Atalho do
iPhone. Nada de login, nada de MFA.

### Lado do Home Assistant (pronto)

Um bloco novo no fim de `config/template_sensors.yaml` cria **seis sensores
disparados por webhook** (trigger-based template sensors). O `webhook_id` mora
em `config/secrets.yaml` (chave `webhook_saude`, fora do versionamento), e o
gatilho usa `local_only: false` porque o iPhone fora de casa chega pelo
Tailscale, cuja faixa 100.x não conta como rede local para o HA.

| Entidade | Campo no JSON | Unidade |
| --- | --- | --- |
| `sensor.saude_passos` | `passos` | passos |
| `sensor.saude_distancia` | `distancia` | km |
| `sensor.saude_calorias` | `calorias` | kcal |
| `sensor.saude_fc_de_repouso` | `fc_repouso` | bpm |
| `sensor.saude_sono` | `sono` | h |
| `sensor.saude_atualizado_em` | — | timestamp |

Cada sensor usa `default(states('sensor.<ele mesmo>'), true)`, então **um campo
ausente no POST preserva o último valor** em vez de zerar. Testado ponta a
ponta com um POST de exemplo: os seis sensores atualizaram (os valores atuais
— 1.234 passos, 0,98 km, 210 kcal, 58 bpm, 6,5 h — são desse teste e serão
sobrescritos no primeiro envio real).

### Lado do iPhone (falta o André montar)

O Atalho precisa ler o Apple Saúde e fazer um POST em
`http://192.168.31.22:8123/api/webhook/<webhook_saude>` (em casa) — o id sai de
`config/secrets.yaml`. Corpo:

```json
{"passos": 8432, "distancia": 6.1, "calorias": 540, "fc_repouso": 56, "sono": 7.2}
```

Ações, na ordem: *Obter amostras de saúde* (uma por métrica, período Hoje,
agregação Soma para passos/distância/calorias e Mais recente para FC de
repouso), depois *Obter conteúdo da URL* com método POST, `Content-Type:
application/json` e o JSON acima montado com as variáveis. Fecha com uma
**Automação Pessoal** de *Hora do dia*, repetindo algumas vezes ao dia, com
"Executar imediatamente" ligado.

### Deck de saúde na Geral

`scripts/lovelace/deck_saude.py` põe o bloco na **coluna da esquerda, abaixo do
clima**, replicando a arquitetura do `health_template` da referência (blocos
separados por `divider`, destaque em cima, métricas menores embaixo):

```
SAÚDE
6,5 h Sono          58 bpm Repouso
────────────────────────────────
[Passos]  [Distância]  [Calorias]
Atualizado há 1 minuto
```

A referência mostra score de sono, estágios (deep/rem/light) e FC min/média/máx
— nada disso vem do Apple Saúde por esse caminho, então o bloco de sono virou
horas dormidas e o de coração, a FC de repouso.

Medido depois de aplicar (percorrendo os shadow roots, como nas outras
passadas): card externo de 234px começando 8px abaixo do card de clima; label
22px, linha de destaques 56px, divider 4px, linha de tiles 80px e rodapé 20px,
com 8 a 12px de respiro entre os blocos. O rodapé usa `show_last_changed`, que
serve de alarme silencioso: se o Atalho parar de rodar, o "há X" cresce.

### Separador do deck de saúde: de barra a hairline

O `divider` padrão não caía bem entre a linha de destaque (sono/repouso) e os
tiles de atividade. Medido antes: **4px de caixa para 1px de traço**, linha
parando a 309px dos 341px do card e opacidade uniforme de 0.10 — lia como
barra, não como fio.

`scripts/lovelace/deck_saude_divider.py` troca esse bloco por um card de **1px
com gradiente que desvanece nas pontas** (`transparent → rgba(255,255,255,0.16)
entre 18% e 82% → transparent`), ocupando a largura inteira do conteúdo.

⚠️ **O gradiente precisa vir pelo `card_mod` com `!important`**. Na primeira
tentativa ele foi definido em `styles.card.background` do `button-card` e a
linha simplesmente não apareceu — medido, o elemento subia com
`background-image: none`, porque o fundo que o tema `apple_home` aplica no
`ha-card` ganha do estilo inline do button-card. Isso não contraria a regra de
nunca usar `background !important` genérico em `ha-card`: aqui é um `card_mod`
de um único card, não uma regra de tema.

Medido depois: `height: 1px`, largura 341px, gradiente aplicado. O template
`divider` global ficou intacto, porque é usado nas outras páginas já aprovadas.

## Cômodos da Geral unificados num card só

A coluna do meio era um `grid` de 2 colunas com **10 `room_mini` soltos**, cada
um com o próprio vidro e separados por gap de 10px. Virou **um único
`stack-in-card`** com cinco fileiras de dois cômodos, separadas pelo mesmo
hairline do deck de saúde (`scripts/lovelace/comodos_card_unico.py`):

```
┌──────────────────────────────┐
│ Sala de Estar   Cozinha      │
│ ──────────────────────────── │
│ Copa            Lavanderia   │
│ ──────────────────────────── │
│ Área Gourmet    Quarto Luca  │
│ ──────────────────────────── │
│ Banheiro        Circulação   │
│ ──────────────────────────── │
│ Closet          Quarto       │
└──────────────────────────────┘
```

Os `room_mini` recebem o `card_mod` "nude" (sem fundo, borda, sombra ou blur
próprios), então só a moldura externa desenha o vidro — mesma técnica usada nos
grids de `device_tile` das páginas de cômodo.

**Proporção**: o bloco antigo media 5×70px + 4 gaps de 10px = **390px**. Para
não crescer, o hairline aqui usa margem vertical de 4px (4+1+4 = 9px por
separador), fechando 350 + 36 + 12 de padding = **~398px** — 8px a mais que
antes. ⚠️ Esse número é **cálculo, não medição**: a extensão do navegador caiu
antes da conferência, então a passada de régua (percorrendo os shadow roots,
como nas outras vezes) ainda está pendente.

### `scripts/ui.py` (novo)

Como o hairline passou a ser usado em mais de um lugar, o estilo saiu do script
do deck de saúde e virou `scripts/ui.py`, com `hairline(margem_vertical,
margem_lateral)` e a constante `NUDE`. Os próximos scripts importam de lá, para
o fio não virar cópia divergente.

## Botão de luz do cômodo: padrão em vez de inversão

O botão de lâmpada dos cards de cômodo chamava `homeassistant.toggle` passando
a **lista** de luzes do cômodo. Esse serviço inverte **cada entidade
individualmente**: num cômodo com uma luz acesa e outra apagada, o toque
trocava as duas de lugar em vez de deixar o cômodo todo aceso ou todo apagado —
o resultado dependia do estado inicial de cada lâmpada.

Padrão novo, previsível (`scripts/lovelace/comodo_toggle_padrao.py`):

> **Se qualquer luz do cômodo estiver acesa, apaga todas. Se estiverem todas
> apagadas, acende todas.**

O serviço é escolhido por template JS dentro do próprio `tap_action`:

```js
[[[ const l = variables.var_lights || [];
    const algumaAcesa = l.some(e => states[e] && states[e].state === 'on');
    return algumaAcesa ? 'homeassistant.turn_off' : 'homeassistant.turn_on'; ]]]
```

Usa `homeassistant.turn_on/turn_off` e não `light.*` porque alguns cômodos
listam interruptores (`switch.*`) junto das luzes.

Aplicado nos dois templates que faziam isso — `room_mini` (Geral) e `room_tile`
(página Cômodos); foram as únicas duas ocorrências de `homeassistant.toggle` com
lista no storage. O `light_row` da página Luzes continua com toggle simples,
porque lá cada linha é uma entidade só.

📌 A documentação do button-card confirma que templates valem para
"everything field in `*_action`", então o `service` templatizado é suportado.
Ainda assim, o teste de clique de verdade não foi feito (era madrugada e
acenderia luzes da casa) — confirmar no primeiro uso.
