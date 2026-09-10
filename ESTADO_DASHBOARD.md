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
8. **Larissa no Home Assistant** — criar o usuário (`larissa`, senha definida pelo André; deixar *Apenas acesso local* e *Administrador* desligados), instalar o app do HA no iPhone dela e conceder localização **"Sempre"** com precisão exata. Só então o `device_tracker` dela existe e entra no card Buscar, vinculado à pessoa Larissa. A tela de criação chegou a ser aberta e preenchida com o nome, mas foi cancelada — **nada foi criado**, o HA segue com um único usuário.
9. **Acesso remoto para o iPhone da Larissa** — hoje o HA é alcançável de fora só pela tailnet do André. Sem resolver isso, o app dela reportaria posição apenas dentro de casa, que é o oposto do objetivo. Caminhos: instalar Tailscale no iPhone dela e convidá-la para a tailnet (mais simples, a estrutura já existe) ou expor o HA por Nabu Casa/domínio próprio com HTTPS.
10. **AirTags no FindMy** — a conta Apple e o servidor anisette já estão configurados; falta o arquivo de chaves de cada AirTag, que só pode ser extraído de um **Mac** logado na conta (`python3 -m findmy decrypt`, uma vez só). Adiado por falta de Mac.
11. **Atalho do Apple Saúde no iPhone** — os seis sensores de saúde e o deck da Geral estão prontos e testados por webhook, mas os valores atuais ainda são do POST de teste. Falta montar o Atalho que lê o Apple Saúde e faz o POST, com automação diária.

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

## Responsividade (iPhone / tablet / desktop) — ⚠️ invertido depois

> Os breakpoints continuam valendo, mas **a ordem das regras foi invertida**
> para mobile-first — ver "Layout quebrado no app do iPhone", no fim deste
> documento. O formato `max-width` descrito aqui é o antigo.


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

## Camada preta ao clicar nos cards de cômodo — ❌ diagnóstico errado

> **Esta seção está errada e a mudança foi revertida.** O ripple do Home
> Assistant é branco (`--md-ripple-pressed-color: #FFFFFF`, opacidade 0.12) e
> nunca escureceu nada. A causa real está na seção seguinte. Fica registrada
> como lembrete de não corrigir problema visual por hipótese.


Ao tocar num cômodo, os nomes e os estados ficavam pretos. A causa é o **ripple
padrão do Home Assistant** — uma camada escura desenhada por cima do card no
clique. Enquanto cada `room_mini` tinha o próprio vidro, ela quase não aparecia;
depois que os cards viraram "nude" dentro do card único, a camada passou a cair
direto sobre o texto.

`scripts/lovelace/sem_ripple_preto.py` desliga o ripple e o anel de foco, em
todas as gerações que o HA já usou (`mwc-ripple`, `ha-ripple`, `md-ripple`,
mais as variáveis `--*-ripple-*`). O CSS virou a constante `NO_RIPPLE` em
`scripts/ui.py` e entrou também dentro do `NUDE`, porque **todo card nude sofre
do mesmo problema**: sem vidro por baixo, a camada de clique aparece sobre o
texto.

⚠️ **Onde aplicar muda conforme o card**: o `card_mod` definido no card
sobrescreve o do template, não soma. Por isso os `room_mini` da Geral (que têm
`card_mod` próprio) receberam o `NUDE` atualizado, enquanto o `room_tile` da
página Cômodos (cujos cards não definem `card_mod`) recebeu o `NO_RIPPLE` no
próprio template.

As cores do texto não foram tocadas — seguem as do template: nome em branco,
estado em `rgba(255,255,255,0.5)`.

📌 Sem validação visual: a extensão do navegador continuava desconectada, então
a correção foi feita a partir da causa provável (ripple) sem inspecionar o
elemento na tela. Confirmar no primeiro toque.

## A causa real do texto preto: o bloco `state` do `room_mini`

Diagnosticado no navegador, com a luz da sala acesa (o Browser pane interno abre
o HA já autenticado; `javascript_tool` atravessa os shadow roots e lê o estilo
computado). O que apareceu:

```
div "Sala de Estar"  -> color: rgb(0,0,0)   inline: "... color: black ..."
ha-card              -> inline: "... background: white ..."
```

Não era ripple. O próprio template `room_mini` tinha um bloco `state` para
`sensor > 0` (alguma luz acesa) que pintava **o card de branco e o texto de
preto** — um efeito Apple Home legítimo enquanto cada card tinha vidro próprio:
o cômodo aceso ficava claro, com texto escuro por cima.

Depois que os cômodos viraram um card único com os internos "nude"
(`background: transparent !important`), o fundo branco passou a ser bloqueado
pelo `!important` e sobrava só o texto preto sobre fundo escuro. Por isso o
sintoma aparecia "ao clicar": o clique acende a luz.

`scripts/lovelace/comodo_texto_legivel.py` remove o bloco `state` inteiro. O
cômodo aceso continua sinalizado pelo ícone laranja da lâmpada e pelo texto
"N acesas", e as escritas voltam ao padrão (nome branco, estado em
`rgba(255,255,255,0.5)`). O mesmo script reverte o `NO_RIPPLE` da tentativa
anterior, que era mudança não pedida em cima de diagnóstico errado.

**Validado na tela**, com as duas luzes da sala acesas: nome em
`rgb(255,255,255)`, card com fundo transparente, tudo legível. O teste também
confirmou na prática o **botão de luz padronizado**: um toque acendeu as duas
luzes de uma vez e o toque seguinte apagou as duas — sem inverter estados. As
luzes foram devolvidas ao estado em que estavam.

## Deck "Buscar" na Geral

Card novo na coluna da esquerda, abaixo do de saúde
(`scripts/lovelace/deck_buscar.py`), com uma linha por aparelho:

```
BUSCAR
📱 iPhone de André    Rua Jorge de Lima · 20%
──────────────────────────────────────────
📱 iPad de André      Em casa · 65%
```

Cada linha mostra **onde o aparelho está e a bateria**, e o ícone muda de cor
conforme a presença — verde `#30D158` em casa, azul `#0A84FF` fora. O texto de
localização usa o estado do `device_tracker`: `home` vira "Em casa", e fora de
casa cai para o `sensor.*_geocoded_location` (o endereço que o próprio app do HA
publica), com "Fora de casa" como último recurso. Toque abre o `more-info`, que
traz o mapa. Separador: o mesmo `hairline` dos outros decks, via `scripts/ui.py`.

**Nada disso passa pela conta iCloud**: os dados vêm do app do Home Assistant já
instalado no iPhone e no iPad. Sem senha, sem 2FA, sem integração de terceiros —
e com atualização mais frequente que a do iCloud.

### AirTags e outros itens do app Buscar

Não entram por esse caminho, e vale registrar por quê:

- A **Apple não expõe API** para o Find My. A integração `icloud` do core (que
  continua existindo no HA 2026.9) lista iDevices da conta, mas **não enxerga
  AirTags** — é limitação conhecida e relatada na comunidade.
- As alternativas são integrações de terceiros que fazem login na conta Apple e
  falam com os servidores do Find My por engenharia reversa: **AirTagSync**
  (instalável por HACS, cria `device_tracker` nativos sem depender de celular ou
  nuvem de terceiros) e **FindMy Fleet** (cada item vira um `device_tracker`).
- Ambas exigem a senha do Apple ID e lidam com 2FA — passo que depende do André
  e que eu não executo.

Para os demais aparelhos da conta (Mac, Apple Watch, AirPods), a integração
`icloud` nativa daria conta, com a mesma ressalva de login e com histórico de
instabilidade por causa das mudanças de autenticação da Apple. Para iPhone e
iPad especificamente ela seria um retrocesso: o app do HA já entrega o mesmo com
mais precisão.

## AirTags e família: integração FindMy + servidor anisette

Pedido: localização dos AirTags e dos aparelhos do **grupo familiar** no painel.
Nada disso sai da integração `icloud` do core (que enxerga só iDevices da própria
conta e ignora AirTags), então o caminho é a integração comunitária
**`malmeloo/hass-FindMy`**, que fala com a rede Find My da Apple.

### O que já está montado

- **Servidor anisette** em container próprio: `dadoum/anisette-v3-server`, porta
  6969, dados em `anisette/data` (fora do versionamento). Ele baixou as
  bibliotecas da Apple, criou e provisionou a "máquina" no primeiro boot —
  testado de dentro do HA: `http://192.168.31.22:6969` responde 200 e devolve os
  cabeçalhos `X-Apple-I-MD`. Sem esse servidor a integração não autentica.
- **Integração FindMy** instalada pelo HACS (repositório personalizado
  `malmeloo/hass-FindMy`, tipo Integration) em `config/custom_components/findmy`,
  já carregada pelo HA.
- **Fluxo de configuração aberto** em *Apple Account Login*, com o campo
  *Remote Anisette URL* preenchido (`http://192.168.31.22:6969`). Faltam o
  e-mail e a senha do Apple ID, que são do André.

### ⚠️ Não é tempo real — e isso é de propósito

A integração busca posições **uma vez a cada 15 minutos**, por decisão do autor,
"para reduzir o risco de ser banido pela Apple". Dá para acelerar somando contas
Apple: 2 contas atualizam a cada 7,5 min, 3 contas a cada 5 min. Não existe modo
contínuo.

Para **pessoas** da família em tempo real de verdade, o caminho continua sendo o
**app do Home Assistant no celular de cada um**: atualização contínua, sem risco
de bloqueio e virando `person` no HA — é o que já acontece com o iPhone e o iPad
do André. A FindMy resolve o que o app não alcança: AirTags, e familiares que
compartilham localização mas não vão instalar o app.

### Descartado: AirTagSync

Exige um **Mac com SIP desabilitado**, FindMy.app aberto e acesso SSH para ler as
chaves da memória do app — inviável aqui, e o próprio projeto está marcado como
substituído pelo `presencesync-addon`.

### ⚠️ "Already in progress": dois fluxos de configuração ao mesmo tempo

Ao tentar fazer o login do Apple ID, o HA respondeu **"already in progress"**. A
causa: o fluxo de configuração do FindMy já estava aberto (a tela que eu havia
deixado preparada no navegador) e o Home Assistant **não permite dois fluxos do
mesmo domínio ao mesmo tempo** — a segunda tentativa é recusada com essa
mensagem, mesmo vindo de outro navegador.

Fluxos de configuração vivem em memória, então `docker restart homeassistant`
limpa todos os pendentes. Depois disso, **abrir uma tela só** e preencher nela.

Regra para as próximas vezes: quando eu deixar um formulário de integração
pronto para o André, ele precisa preencher **naquela mesma tela**; se preferir
outro navegador, o formulário que eu abri tem que ser fechado antes.

### Resultado: conta autenticada, mas AirTag e família esbarram no Mac

A conta Apple **autenticou** e aparece na integração como
`Account: an.diogo98@gmail.com`. No caminho, o 2FA por **SMS** falhou três vezes
com `UnhandledProtocolError: Error response for GSA request: 503` (erro do lado
da Apple, no `sms_2fa_submit`); o login passou por outra via.

Ao tentar adicionar um AirTag (*Adicionar dispositivo → FindMy Device →
Rolling-key tag (AirTag)*), a tela pede: **"Upload your device keys in .json or
.plist format"**. A integração **não lista os AirTags da conta** — cada tag entra
por um arquivo de chaves.

E essas chaves só saem de um **Mac**: ficam no keychain da conta, acessível
apenas em hardware Apple. O procedimento é `python3 -m findmy decrypt` num
macOS logado na conta, com o app Buscar enxergando o item — gera um JSON por
acessório. É **uma vez só** (dá para pedir um Mac emprestado por meia hora).
Existe pesquisa para entrar no "keychain circle" fora do macOS, mas não está
implementada.

**Localização de familiares pelo Find My** esbarra no mesmo muro, e pior: o
único método conhecido (**FollowMyFriends**) é um app de macOS 14+ que precisa
ficar **ligado 24 horas** lendo o banco do Buscar e publicando por MQTT.

Ou seja, para a casa do André — Windows, iPhone e iPad, sem Mac — nada disso é
viável hoje. O que sobra, e funciona melhor:

- **Pessoas**: o app do Home Assistant no celular de cada familiar. Tempo real
  de verdade, sem Mac, sem risco de bloqueio pela Apple, e cada um vira uma
  `person` que entra no card Buscar como o iPhone e o iPad já estão.
- **AirTags**: ficam pendentes até haver acesso a um Mac. A conta e o servidor
  anisette continuam configurados; quando os arquivos de chave existirem, é só
  subir cada um em *Adicionar dispositivo*.

## Layout quebrado no app do iPhone — mobile-first

Sintoma (print do André): a Geral abria no app do iPhone com **as três colunas
espremidas**, textos cortados ("Boa tard…", "P…", "Di.", "Yo…") e os nomes dos
cômodos sumidos — e **só se ajeitava ao atualizar a página**.

**Causa**: o layout responsivo era desktop-first. A regra base do `card_mod`
trazia as colunas do desktop e as media queries `max-width` iam reduzindo:

```css
#root { grid-template-columns: 1.05fr 1.35fr 1.2fr !important; }  /* base */
@media (max-width: 1000px) { #root { grid-template-columns: 1fr 1fr !important; } }
@media (max-width: 700px)  { #root { grid-template-columns: 1fr !important; } }
```

O `card_mod` é um **recurso do frontend**: enquanto ele não carrega, nada desse
CSS existe — e o `horizontal-stack` nativo renderiza suas colunas iguais. Ou
seja, o primeiro paint no celular usava o layout de desktop numa tela de 375px.
No refresh o recurso já está em cache, aplica a tempo, e a tela "conserta".

**Correção**: inverter para mobile-first, de modo que **o layout do celular não
dependa de CSS nenhum**:

- os stacks de coluna viraram `vertical-stack`, que empilha nativamente;
- as colunas só aparecem por `min-width` (701px → 2 colunas; 1001px → layout
  completo);
- no desktop, se o CSS atrasar, o pior caso é um instante de coluna única.

⚠️ **`minmax(0, 1fr)` não é detalhe**: na primeira tentativa, com
`grid-template-columns: 1fr`, o card de clima subiu com **422px numa viewport de
375** — seis cards transbordando. Todo item de grid tem `min-width: auto`, então
o `1fr` não encolhe abaixo da largura natural do conteúdo. A correção é
`minmax(0, 1fr)` em todas as faixas mais `#root > * { min-width: 0 }`.

Aplicado na Geral (`scripts/lovelace/geral_mobile_first.py` +
`geral_mobile_first_fix.py`) e, em lote, nas 12 páginas restantes
(`scripts/lovelace/paginas_mobile_first.py`, que lê os valores de cada faixa do
CSS existente e só reordena as regras — cada página mantém o layout que tinha).

**Medido depois, com régua no navegador**: 375px → 1 coluna, 768px → 2 colunas,
desktop → 3 colunas na Geral e 2 nas páginas de cômodo; **zero cards
transbordando** nas três faixas.

## P1 da auditoria: os cinco erros visíveis, corrigidos

Primeira leva de correções saída da auditoria (`AUDITORIA_VISUAL.md`), aplicada
por `scripts/lovelace/p1_erros_visiveis.py`:

1. **"NaN °C" na Sala de Estar** — o `mini-graph-card` imprimia a conta com o
   sensor de temperatura `unavailable`. Passou a viver dentro de um
   `conditional`: some enquanto não há dado e volta sozinho quando o sensor
   responder.
2. **"Indisponível" no Quarto** — mesmo tratamento para o
   `custom:mushroom-fan-card` do `fan.luz_ventilador`, que depende da pendência
   do LocalTuya. A página fica sem o card em vez de exibir um card avisando que
   não funciona.
3. **Lista de compras transbordando** — medido antes: o `span` do item com
   352px terminando em 1087px numa viewport de 1027. O `card_mod` do
   `todo-list` já usava a forma aninhada (dict), então as regras de quebra
   (`white-space: normal`, `overflow-wrap: anywhere`) entraram na chave `"."`,
   que alcança o shadow root do card, **sem perder** o estilo do campo
   "Adicionar item" que morava na outra chave.
4. **"Sensor de Luz TV" truncado** — passou a quebrar em duas linhas
   (`white-space: normal` + 12,5px) em vez de virar reticências.
5. **Dois cards fantasma removidos** — Banheiro e Closet tinham cards de
   movimento apontando para `binary_sensor.sensor_banheiro_movimento` e
   `..._closet_movimento`, que não existem no registro de entidades: nunca
   acenderiam.

Um sexto apareceu na verificação e foi corrigido junto
(`p1_passos_sem_unidade.py`): na faixa de ~1000px, "7.842 passos" era cortado no
deck de saúde. A unidade é redundante com o rótulo "Passos" do próprio tile,
então ficou só o número, formatado em pt-BR.

**Verificação final**, com o mesmo coletor da auditoria nas 13 páginas, em 375px
e 1027px: **zero transbordos, zero textos truncados, zero textos mortos**.

## P2 #6: os botões da página Luzes viraram alvos de 44px

A página Luzes tinha **18 botões circulares de 32×32px** — abaixo dos 44×44 de
WCAG 2.5.5 e do HIG, e é a tela que se usa com a mão ocupada.

A correção (`scripts/lovelace/p2_alvos_luzes.py`) **não mexe no desenho**: o
botão passou a medir 44×44 com `padding: 6px` e **`background-clip:
content-box`**, então o círculo pintado continua com os mesmos 32px e só a área
que responde ao toque cresceu. O ícone subiu de 15px para 17px, mantendo a
proporção. O `background-clip` foi replicado nas regras do bloco `state`, senão
o preenchimento laranja do estado aceso ignoraria o recorte.

⚠️ **O alvo maior empurrou a linha**: medido logo depois, a linha passou de 52
para **64px** e a página de 840 para 948px — o botão virou o elemento mais alto
e somava ao padding de 10px. Corrigido em `p2_altura_linha_luzes.py`, baixando
o padding vertical da linha para 4px: 44 + 4 + 4 = **52px**, a altura original.

**Medido no fim**: 18 alvos com 44×44, nenhum abaixo disso, linhas de 52px e
página de 840px — exatamente as medidas de antes da mudança, com o dobro de
área de toque.

Continuam pendentes os alvos pequenos da Geral (chips de 36×36 e botões de
42×42 e 32×32 do card de mídia) e o `button-card` de 22px da Sala de Estar —
itens #7 e #8 da auditoria.

## P2 #9 e #10: piso tipográfico de 11px

Levantamento com régua no navegador, antes: 7 textos abaixo de 11px na Geral e
3 a 6 em cada uma de Closet, PC e Quarto do Luca. O menor era **7,92px**.

Piso adotado: **11px**, com 12px nos chips do topo — que são o primeiro texto
que se lê na Geral. `scripts/lovelace/p2_tipografia.py`, 39 ajustes:

| Onde | Antes | Depois | Como |
|---|---|---|---|
| Chips do topo (Geral) | 10,8px | 12px | `--chip-font-size`, a variável do próprio Mushroom — mexer nela evita brigar com o CSS interno do componente |
| Rótulos de seção | 10px | 11px | `styles.name` do `button-card` |
| Rodapé do deck de saúde | 10,5px | 11,5px | idem |
| Legenda e min/max do `mini-graph-card` | 8,4 e 9,76px | 11px | `card_mod` mirando `.graph__legend__item span` e `.graph__labels span` |
| Unidade do `modern-circular-gauge` | 7,92px | 11px | `card_mod` com `modern-circular-gauge-state$`, porque o texto mora no shadow root do componente interno; o container subiu de 155 para 168px |

Junto veio um ganho que não era de tipografia: a legenda dos gráficos do PC
mostrava o **nome bruto da entidade** ("PC André Memory usage", "PC André C:\
disk usage"). As séries foram renomeadas para **"Memória"** e **"Disco C:"**.

**Medido depois**, nas páginas Geral, PC, Closet, Quarto do Luca, Sala de
Estar, Luzes, Cozinha e Banheiro: **nenhum texto abaixo de 11px**, e nenhum
transbordo ou truncamento novo — o aumento de corpo não estourou nenhum card.

## P3: a dívida acumulada da dashboard

Três dos quatro itens de dívida foram fechados. O storage saiu de **177.463
para 144.888 bytes — 18,4% menor**, sem uma única mudança visual.

### #11 Templates órfãos → arquivados

Sete dos quinze `button_card_templates` não eram usados por card nenhum
(confirmado procurando `"template": "<nome>"` e a forma em lista no storage
inteiro, inclusive dentro de outros templates). Em vez de apagar, foram para
`referencias/templates-arquivados.json`: `device_tile` e `room_tile` foram
desenhados com cuidado, e o `room_tile` é o único registro do que a página
Cômodos usava antes de ser removida. Para reativar, é colar de volta.

### #12 CSS repetido → quatro templates de estilo

Era o achado mais pesado: **47.524 bytes de `card_mod` em texto, dos quais
34.356 eram repetição literal** — 20,8% do arquivo. Os quatro blocos mais
copiados apareciam **só** em `custom:button-card`, que aceita herança por
template. Viraram:

| Template | Usos | O que faz |
|---|---|---|
| `sem_moldura` | 36 | sem borda, sombra ou blur, e sem arredondamento |
| `nu` | 28 | transparente e sem moldura nenhuma |
| `borda_fina` | 16 | sem sombra nem blur, com a borda de 1px do vidro |
| `sem_fundo` | 13 | transparente, mantendo o arredondamento herdado |

⚠️ **Regra que precisou ser respeitada**: um card só troca `card_mod` por
template se o template que ele já usa não definir `card_mod` próprio.
`shortcut_tile` e `room_header` definem — e no button-card o `card_mod` de um
template **sobrescreve** o do outro em vez de somar. Esses cards ficaram como
estavam.

### #13 Paleta → duas consolidações

`#ff9800` (laranja do Material) virou `#FF9F0A`, o laranja iOS do projeto; e
`#FF375F` virou `#FF453A` — o rosa-vermelho aparecia 12 vezes como topo das
escalas dos medidores, papel legítimo, mas era um vermelho diferente do que a
dashboard já usava. Cores de marca ficaram intactas.

### #14 Escala tipográfica → adiado de propósito

Depois do piso de 11px, a escala tem 13 tamanhos entre 11 e 40px. Consolidar os
pares vizinhos (11/11,5 · 13/13,5 · 14/15) mexeria em alinhamentos que já foram
medidos e aprovados, com ganho visual nulo. Fica registrado como opção, não
como pendência.

**Verificação**: 13 páginas medidas depois da refatoração — zero transbordos,
truncados, textos abaixo de 11px ou entidades mortas; contagem de cards
transparentes, com borda e com blur igual à de antes; e as capturas de Geral e
Luzes idênticas às anteriores.

📌 **Nota de método**: medir logo após a troca de página dá **falso positivo de
truncamento** — elementos ainda sem largura final aparecem como cortados. Com
1,1s apareciam "truncados" em sete páginas; com 2,5s, nenhum. Esperar ao menos
2s antes de medir.

## P2 #7 e #8: os alvos restantes — e o que não era problema

A auditoria contou 7 alvos abaixo de 44px na Geral e na Sala de Estar. Medindo
de novo com uma pergunta a mais — **esse alvo pequeno está dentro de uma área
clicável maior?** — três caíram:

| Alvo | Está dentro de |
|---|---|
| `mushroom-shape-icon` 36×36 (Geral) | `mushroom-state-item` 244×56 |
| `mushroom-shape-icon` 36×36 (Sala) | `mushroom-state-item` 241×56 |
| `button-card` 392×22 "Nada tocando" | bloco clicável de 464×70 |

Nesses o dedo acerta a linha inteira; o elemento pequeno é só o desenho. Teria
sido fácil "consertar" o que não estava quebrado.

Sobraram três alvos isolados de verdade, todos na Geral, corrigidos em
`p2_alvos_restantes.py` e `p2_botao_adicionar.py`:

- **power e volume do media player** (166×42 e 42×42): faltavam 2px. Resolvido
  pela variável `--control-height` do próprio Mushroom, que vale 42px por
  padrão.
- **botão "+" da lista de compras** (32×32): a primeira tentativa foi por
  `--mdc-icon-button-size`. ⚠️ Medido depois, **a variável estava aplicada no
  elemento e ele continuava 32×32** — o `ha-icon-button` desta versão embrulha
  um `ha-button` do Material Web, que ignora a variável antiga. Resolvido
  dimensionando o host e descendo pela cadeia `ha-input$ha-icon-button$` para
  esticar o botão interno junto.

Um `button 89×32` apareceu e sumiu entre duas medições: era o "Dispensar" do
aviso "O Home Assistant foi iniciado", que o próprio HA mostra depois de cada
restart. Não é da dashboard.

### Estado final da auditoria

13 páginas medidas em conjunto, todos os critérios zerados:

| Critério | Antes | Agora |
|---|---|---|
| Transbordos horizontais | 1 | **0** |
| Textos truncados | 4 | **0** |
| Textos abaixo de 11px | 20 | **0** |
| Entidades mortas na tela | 2 | **0** |
| Alvos de toque isolados < 44px | 21 | **0** |

Continuam abertos apenas o **#14** (escala tipográfica, adiado por custo/risco)
e o **P4** (densidade das páginas de cômodo), que é decisão de produto.

## P4: Cozinha e Copa viraram popup

As duas tinham **3 textos na tela inteira** — uma página para um único
interruptor, com a navegação custando mais que a ação. Agora abrem em popup a
partir do card da Geral, no mesmo padrão que o PC já usava. A dashboard foi de
**13 para 11 páginas** (`scripts/lovelace/p4_cozinha_copa_popup.py`).

O conteúdo do popup usa `tile` **nativo**, não o `entity_card`: aquele template
tem `custom_fields` com um button-card aninhado, e essa combinação não recebe
`hass` dentro do popup do Browser Mod — abre em branco. O vidro do diálogo foi
copiado do popup do PC, lido do próprio storage, para não divergir.

**Testado clicando de verdade**: os dois popups abrem com título e o tile da luz
funcionando. Vale registrar como se testa isso, porque duas tentativas falharam
antes:

- **evento sintético não serve**: `dispatchEvent` de pointerdown/click no card
  não dispara o `fire-dom-event` do button-card. Só clique real do navegador.
- **as coordenadas precisam ser convertidas**: o JavaScript enxerga o viewport
  da página (1027×687) e o clique do navegador usa o frame da captura
  (800×535). Sem multiplicar pela escala (0,779 aqui), o clique cai noutro card
  — na primeira tentativa abriu o more-info da TV.

⚠️ **Remover páginas mudou os índices das views.** A ordem agora é: 0 Geral,
1 Sala de Estar, 2 Lavanderia, 3 Área Gourmet, 4 Quarto, 5 Quarto do Luca,
6 Banheiro, 7 Circulação, 8 Closet, 9 PC, 10 Luzes. Scripts antigos em
`scripts/lovelace/` que usam `views[N]` fixo apontam para a página errada agora
— reler antes de reaproveitar.

⚠️ **Depois do P3, `template` pode ser lista.** O primeiro rodar deste script
não achou card nenhum, porque procurava `template == "room_mini"` e o valor
virou `["room_mini", "nu"]`. Testar pertinência, não igualdade.

**Verificação**: 11 páginas medidas — transbordo, truncados, textos abaixo de
11px e entidades mortas seguem em zero.

## dashboard-app entrou em produção como container próprio

`dashboard-app/` (repositório git separado, dentro desta pasta) é um painel
Next.js novo, escrito do zero, que fala com o HA pela REST API (`lib/ha.ts`,
token de longa duração em `.env.local`) em vez de editar o Lovelace. Ele tinha
sido desenhado para instalar como **Add-on do Home Assistant** (pasta
`ha-addon/`, `config.yaml` com `homeassistant_api: true` e `ingress: true`,
usando `SUPERVISOR_TOKEN`) — isso **não funciona aqui**: esta instalação é HA
**Container** (`docker run ghcr.io/home-assistant/home-assistant:stable`, só
`/config` montado), que não tem Supervisor. Sem Supervisor não há Add-on
Store, não há `/addons`, não existe `SUPERVISOR_TOKEN`. A pasta `ha-addon/`
só serviria se um dia a casa migrar para HAOS/Supervised num Raspberry Pi
(pendência já registrada no `CLAUDE.md` raiz).

O caminho que funciona nesta instalação:

1. **Container Docker separado**, na mesma máquina, ligado a uma rede dedicada
   (`docker network create casa-net` + `docker network connect casa-net
   homeassistant`) para os dois containers se resolverem por nome. A imagem é
   o `Dockerfile` da raiz de `dashboard-app/` (standalone build do Next.js).
   Sobe assim:
   ```bash
   docker build -t painel-casa:latest dashboard-app
   docker run -d --name painel-casa --network casa-net \
     -e HA_URL=http://homeassistant:8123 -e HA_TOKEN=<token> \
     -p 3001:3000 --restart unless-stopped painel-casa:latest
   ```
   `lib/ha.ts` já detecta a ausência de `SUPERVISOR_TOKEN` e cai no modo
   `HA_URL`/`HA_TOKEN` — nenhuma mudança de código foi necessária.
2. **Painel na sidebar sem Supervisor**: a integração `panel_iframe` (que
   seria o caminho óbvio) **foi removida do HA** — não existe mais no core a
   partir desta versão (2026.9); declará-la em `configuration.yaml` dá
   `Integration 'panel_iframe' not found` e a chave é ignorada. O substituto
   é registrar um **dashboard de storage novo** com uma view `panel: true` e
   um card `type: iframe`, feito por `scripts/lovelace/painel_casa_iframe.py`
   (segue o padrão do `ha.py`: grava em `config/.storage/lovelace_dashboards`
   + `config/.storage/lovelace.painel_casa`, com backup, e reinicia o
   container). A URL do card usa o **IP Tailscale** da máquina
   (`http://100.74.130.30:3001`), não `localhost` — quem abre o painel pelo
   celular fora da rede local está vendo o HA pelo Tailscale, e um iframe em
   `localhost` resolveria para o dispositivo do usuário, não para o PC.
3. Resultado: **"Painel Casa"** aparece como item próprio na sidebar (ícone
   `mdi:view-dashboard-variant`, ao lado de "Casa" e "Mapa"), path
   `/painel-casa/painel-casa`, sem tocar no Lovelace existente da dashboard
   "Casa".

**Pendências deste painel**: não reinicia junto com o Home Assistant por
docker-compose (foi criado com `docker run` direto — não há compose file
neste projeto); se a máquina reiniciar, o `--restart unless-stopped` cobre o
Docker Desktop subir de novo, mas vale confirmar depois de um reboot real.
Falta também expor isso em algum lugar do fluxo de backup do projeto (o
container e a rede `casa-net` não são recriados por nenhum script).

---

## Menu lateral no celular e tela cheia opcional (08/09/2026)

O `kiosk_mode` da dashboard "Casa" escondia cabeçalho e barra lateral de forma
**incondicional** em qualquer tela abaixo de 1400px:

```yaml
kiosk_mode:
  mobile_settings: {custom_width: 1400, hide_sidebar: true, hide_header: true}
```

Sem cabeçalho não há botão de menu, e sem botão de menu a barra lateral fica
inalcançável — no celular, as outras 10 páginas, o "Painel Casa", o "Mapa" e as
Configurações simplesmente deixavam de existir. Era o achado #1 do
`CRITIQUE_DESIGN.md`.

`scripts/lovelace/menu_lateral_mobile.py` mudou duas coisas:

1. **Os dois `true` viraram um template preso a `input_boolean.modo_quiosque`**
   (declarado em `configuration.yaml`). Desligado — o padrão — o painel é um app
   normal do HA em qualquer aparelho; ligado, vira tela cheia. O `custom_width:
   1400` foi mantido, porque é ele que classifica o tablet de parede.

   Usa a forma **JS** do template (`[[[ return is_state(...) ]]]`), não a Jinja:
   Jinja devolveria a string `"False"`, que é verdadeira em JavaScript. As duas
   formas estão implementadas em `www/custom-cards/kiosk-mode.js`, que expõe
   `is_state` no escopo do template JS.

2. **Um chip `mdi:menu` na Geral.** Necessário porque a Geral é `subview: true`,
   e numa subview o HA desenha uma seta de voltar no lugar do botão de menu —
   devolver o cabeçalho, sozinho, não devolveria a barra lateral justamente na
   página inicial. O chip dispara `hass-toggle-menu` via `browser_mod`
   (`fire-dom-event` + `service: javascript`), o mesmo padrão que os popups da
   dashboard já usam. **Segurar** o chip alterna o modo quiosque.

Escapes embutidos no kiosk-mode, independentes disto: `?disable_km` na URL
desliga tudo, `?disable_km&cache` grava a escolha só naquele aparelho,
`?kiosk&cache` faz o contrário e `?clear_km_cache` limpa.

⚠️ **Não verificado visualmente**: o navegador integrado não conseguiu abrir
`localhost:8123` nesta sessão. A configuração foi conferida no storage gravado e
`input_boolean.modo_quiosque` responde `off` na API, mas o comportamento do chip
e do cabeçalho no celular ainda precisa de confirmação em tela real.

### Ajuste: celular volta a abrir em tela cheia (08/09/2026)

Pedido: em dispositivo móvel, tela cheia. A armadilha estava em como o
kiosk-mode implementa `hide_sidebar` — lendo o bundle, ele faz **duas** coisas:

```js
this.styleManager.addStyle(We.SIDEBAR, ...)                 // some com a barra
main.host.addEventListener('hass-toggle-menu', blockEventHandler, true)
```

O segundo é um bloqueio em fase de captura do `hass-toggle-menu` — justamente o
evento que o chip de menu dispara. **`hide_sidebar: true` engole o chip**; as
duas coisas não convivem.

E `hide_sidebar` não paga nada em troca: numa tela estreita a barra lateral já é
gaveta modal, fechada por padrão, ocupando zero pixel. Quem ocupa espaço é o
cabeçalho. Logo, `scripts/lovelace/tela_cheia_mobile.py` deixou o celular com
`hide_header: true` e `hide_sidebar: false` — tela cheia de verdade, chip vivo.

Telas acima de 1400px seguem governadas por `input_boolean.modo_quiosque`.

### Mesma tela cheia estendida ao Painel Casa (08/09/2026)

O `kiosk_mode` acima só existia em `lovelace.minha_casa`. O "Painel Casa"
(dashboard novo, iframe do `dashboard-app`, ver seção anterior) tinha só a
view `panel: true` + card iframe — nada de `kiosk_mode` — então abri-lo pela
sidebar mostrava cabeçalho e barra lateral do HA por cima do iframe, sem a
tela cheia que a dashboard "Casa" já tinha. `scripts/lovelace/
painel_casa_tela_cheia.py` copiou o bloco `kiosk_mode` inteiro (mobile
sempre `hide_header: true` / `hide_sidebar: false`; telas largas presas ao
mesmo `input_boolean.modo_quiosque`) de `lovelace.minha_casa` para
`lovelace.painel_casa`, ponto a ponto — os dois dashboards agora se
comportam de forma idêntica nesse aspecto.

Como o cabeçalho some no celular também nas páginas de cômodo, o template
`room_header` ganhou um `hold_action`: segurar o título de qualquer cômodo abre
a barra lateral direto. Uma edição no template, vale para as 10 páginas — e o
chevron que já existia continua levando à Geral.

⚠️ Ainda **não verificado em tela**: o navegador integrado segue sem conseguir
abrir `localhost:8123` nesta sessão.

### A barra lateral sumindo no desktop (09/09/2026)

Sintoma relatado: no desktop da dashboard "Casa" a barra lateral não aparecia.

**Não era bug.** `input_boolean.modo_quiosque` estava ligado — o histórico da
entidade mostra três trocas em cinco segundos às 02:19 de 09/09, a assinatura do
gesto de segurar sendo testado. Com ele ligado, o template escondia cabeçalho e
barra lateral em telas acima de 1400px, exatamente como configurado. Descartadas
as outras causas: `hiddenPanels` vazio e ordem normal em `frontend.user_data`.

O erro estava na configuração. O pedido original foi *tela cheia no celular*;
esconder a barra também no desktop foi decisão minha, e cobra caro por dois
motivos:

1. **Mata o toque do chip de menu.** Com `hide_sidebar` ligado, o kiosk-mode
   registra um bloqueio em fase de captura do `hass-toggle-menu` — o evento que
   o chip dispara. Sobrevivia só o gesto de segurar, que chama
   `input_boolean.toggle` (um serviço, e por isso escapa do bloqueio). Um botão
   com dois gestos e apenas um funcionando.
2. **No desktop a barra lateral é a navegação inteira.** Diferente do celular,
   onde é gaveta modal de custo zero, no desktop ela é o único caminho para os
   outros painéis.

`scripts/lovelace/barra_lateral_desktop.py` deixou `hide_sidebar: false` também
no desktop. Tela cheia continua existindo — é o `hide_header`, que é quem ocupa
espaço de fato, preso ao interruptor no desktop e sempre ligado no celular. A
barra volta **mesmo com o interruptor ligado**, sem mexer no quiosque do tablet.

⚠️ O `painel_casa` herdou o mesmo `kiosk_mode` no commit `b097bd0` e tem o
problema **pior**: é uma view `panel: true` com um único card de iframe, sem
chip nenhum. Ligado o interruptor, no desktop aquela página fica sem cabeçalho,
sem barra lateral e sem controle próprio — só `?disable_km` na URL sai de lá.
Correção pendente de decisão.

### Volta à visualização nativa do Home Assistant (09/09/2026)

Decisão do André: as duas dashboards voltam ao cabeçalho e à barra lateral que
o Home Assistant desenha por padrão, em qualquer largura de tela. O que fazer
com quiosque/tela cheia fica para depois.

`scripts/lovelace/voltar_visualizacao_nativa.py` removeu, num único restart:

| Onde | O quê |
| --- | --- |
| `lovelace.minha_casa` | bloco `kiosk_mode` |
| `lovelace.painel_casa` | bloco `kiosk_mode` (herdado em `b097bd0`) |
| Geral | chip `mdi:menu` (5 → 4 chips) |
| template `room_header` | `hold_action` — valia para as 10 páginas |

O chip e o `hold_action` saíram junto porque **só existiam para compensar o que
o quiosque escondia**: com o cabeçalho nativo de volta, o botão de menu do
próprio HA cumpre esse papel nas duas.

`input_boolean.modo_quiosque` saiu do `configuration.yaml` pelo mesmo motivo —
alimentava exclusivamente aqueles templates e, sem eles, seria um interruptor
morto na interface. Confirmado depois do restart: a entidade responde 404 e o
boot não registrou nenhum erro de configuração.

Nada disso se perdeu: `menu_lateral_mobile.py`, `tela_cheia_mobile.py` e
`barra_lateral_desktop.py` continuam em `scripts/lovelace/` e servem de base
quando a decisão vier. Os backups de cada etapa estão em `backups/`.

### Auditoria de localização dos dispositivos + troca Cozinha/Lavanderia (09/09/2026)

**A troca.** O aparelho `cozinha_copa_varanda` é um interruptor de 3 teclas. O
cadastro era coerente consigo mesmo e errado com a casa: as teclas 1 e 3 estão
invertidas na parede. Por isso a correção teve de ser feita **nos dois lados** —
mexer só num deles apenas mudaria a inconsistência de lugar:

| | antes | depois |
| --- | --- | --- |
| `…switch_1` | "Lavanderia" / área Lavanderia | **"Cozinha" / área Cozinha** |
| `…switch_2` | "Copa" / área Copa | inalterado |
| `…switch_3` | "Cozinha" / área Cozinha | **"Lavanderia" / área Lavanderia** |
| lovelace | Cozinha→switch_3, Lavanderia→switch_1 | **Cozinha→switch_1, Lavanderia→switch_3** |

Feito por `scripts/lovelace/corrige_cozinha_lavanderia.py`. ⚠️ O script **para o
container** antes de tocar em `core.entity_registry` e sobe depois — o Home
Assistant reescreve esse arquivo no shutdown, então editar com ele no ar perde a
alteração. Não usar `restart` para mexer no registro.

**O resto da auditoria**, levantado cruzando `core.area_registry`,
`core.device_registry` e `core.entity_registry`:

- `light.luzes_externas_switch_1` chama-se **"Circulação"** mas está na área
  **Área Gourmet** (e é usada no `var_lights` da Área Gourmet). Ou o nome está
  errado, ou a área — pendente de confirmação.
- **Cinco entidades sem área nenhuma**: `fan.ventilador_sala` e `light.luz_sala`
  (justamente o par separado da Sala, via LocalTuya) e os três
  `switch.smart_socket_with_usb_type_c_3_*`.
- `light.led_escritorio_sonoff_…` está no **Closet** — plausível, já que a
  página "PC" mora ali, mas vale confirmar.
- `fan.luz_ventilador_2` é a entidade **da nuvem Tuya** para o mesmo aparelho da
  Sala que o LocalTuya já expõe separado. Duplicata redundante.
- Nomes de área inconsistentes: "Sala de estar" (e minúsculo), "Area Gourmet"
  (sem acento), e o id da Circulação é `corredor`.

**Como a Sala foi separada** (modelo a replicar no Quarto): o mesmo aparelho
físico `eb831a8f3dedb06ad1tric` é exposto duas vezes — a nuvem Tuya dá só
`fan.luz_ventilador_2` (sem luz), e o **LocalTuya** o abre em dois:
`light.luz_sala` no DP 5 e `fan.ventilador_sala` no DP 1, com direção no DP 101.

---

# HANDOFF — dispositivos e pendências (09/09/2026)

Consolidação feita a pedido do André, para retomar de um ponto limpo.
**Supersede a lista de "Pendências" antiga**, que tinha itens já resolvidos.
Escopo: **apenas o projeto original** (instalação do HA + dashboard "Casa").
O `dashboard-app` fica fora desta sessão por decisão dele.

## Retrato de agora (medido, não lembrado)

248 entidades, 37 indisponíveis. **Nenhuma luz, tomada ou ventilador entre as
indisponíveis** — a casa está inteira de pé.

**22 integrações**: `tuya` e `localtuya` (iluminação/ventiladores), `sonoff`,
`smartthings`, `samsungtv`, `ps5`, `glances` (PC), `browser_mod`, `findmy`,
`hacs`, `mobile_app` ×2 (iPhone e iPad do André), `switch_as_x` ×11,
`shopping_list`, `met` (clima), `go2rtc`, `ping`, `wake_on_lan`, `sun`,
`radio_browser`, `google_translate`, `backup`, `analytics`.

**Domínios que ainda não existem**: `climate.*` e `calendar.*` — zero entidades.

## Como os dispositivos foram implementados

| Caminho | O que entrou por ele |
| --- | --- |
| **Tuya (nuvem)** | interruptores de parede, `light.painel`, os dois "Luz/ventilador" |
| **LocalTuya** | **só a Sala**: abre o aparelho `eb831a8f3dedb06ad1tric` em dois — `light.luz_sala` (DP 5) e `fan.ventilador_sala` (DP 1, direção no DP 101). É a "separação" que o Quarto ainda não tem. |
| **switch_as_x** (11×) | converte `switch` em `light` para os pontos que são lâmpadas — é o que dá o par `circulacao_*` / `entrada_*` |
| **Sonoff** | `light.led_escritorio_sonoff_…` |
| **SmartThings / SamsungTV / PS5** | TV da sala e console |
| **Glances** | métricas do PC ⚠️ patch de timeout se perde a cada recriação do container |
| **mobile_app** | `device_tracker` do iPhone e do iPad do André |
| **Webhook + template** | os 6 sensores de saúde (Apple Saúde) |

## Pendências, na ordem em que destravam

**1. Separar luz e ventilador do Quarto.** O `fan.luz_ventilador`
(`eb956546b52fa8a4ddyfom`, mesmo modelo da Sala) **voltou a funcionar**. Falta
replicar o LocalTuya: `light` no DP 5 e `fan` no DP 1 com direção no DP 101,
protocolo 3.4. 🔒 **Bloqueado**: o formulário exige `local_key` e IP do
aparelho, e a lista de descoberta vem vazia — o HA roda em Docker *bridge* e não
recebe o broadcast UDP do LocalTuya. Caminho: LocalTuya → Configurar →
*Reconfigure Cloud API account*; com a nuvem respondendo, a lista aparece **com
o `local_key` já preenchido**. Depois disso eu ligo na página do Quarto e
conserto o card da Geral.

**2. Card "Quarto" da Geral está quebrado.** `var_lights: []` e
`var_sensor: null` — ao toque dispara `turn_on` com lista vazia, não faz nada e
não avisa, com o mesmo peso visual dos 9 que funcionam. Sai junto com o item 1.

**3. Confirmar `light.luzes_externas_switch_1`** — chama-se "Circulação" mas
está na área **Área Gourmet**, e é a Área Gourmet que a usa. Ou o nome está
errado, ou a área. Só o André sabe qual.

**4. Cinco entidades sem área**: `fan.ventilador_sala` e `light.luz_sala` (o par
da Sala) e os três `switch.smart_socket_with_usb_type_c_3_*`.

**5. Três *helpers* órfãos**, registrados e `unavailable` por não terem mais
configuração por trás: `input_boolean.modo_quiosque` (resíduo da volta ao
nativo, meu), `input_boolean.modo_painel` e `input_number.fundo_escurecimento`.
Mais duas cenas mortas: `scene.banheiro_em_uso` e `scene.banheiro_vazio`.

**6. `fan.luz_ventilador_2`** — entidade de nuvem do mesmo aparelho da Sala que
o LocalTuya já expõe separado. Duplicata; some quando o item 1 definir o padrão.

**7. Larissa no HA** — usuário não criado (o sistema segue com **1 pessoa**).
Depende de **acesso remoto** para fora da tailnet, senão o `device_tracker` dela
só reporta dentro de casa. Caminhos: Tailscale no iPhone dela, ou Nabu Casa.

**8. Atalho do Apple Saúde** — os 6 sensores e o deck estão prontos e testados
por webhook, mas os valores são do POST de teste. Falta o Atalho no iPhone com
automação diária.

**9. AirTags no FindMy** — conta Apple e servidor anisette de pé; falta o
arquivo de chaves, que só sai de um **Mac** (`python3 -m findmy decrypt`).

**10. Termostato e calendário** — sem `climate.*` nem `calendar.*` no sistema.
O termostato existe mas está offline; o calendário precisa ser integrado.

**11. IP fixo do PS5** — `media_player.sala_de_estar_ps5` está `unavailable`.

**12. Alexa Media Player** — login trava na verificação da Amazon. Pausado.

**13. Migração para dispositivo dedicado** (Raspberry Pi / mini PC) — resolveria
o HA cair quando o PC dorme.

**14. Foto de fundo real** e **scan 3D** (LiDAR do iPad, `floor3d-card` já
instalado) — ambos esperando material do André.

## Item 1 resolvido — luz e ventilador do Quarto separados (09/09/2026)

O aparelho do Quarto agora está no LocalTuya espelhando exatamente a Sala:

| | Sala | Quarto |
| --- | --- | --- |
| device | `eb831a8f3dedb06ad1tric` @ 192.168.31.168 | `eb956546b52fa8a4ddyfom` @ **192.168.31.206** |
| luz | DP 5 → `light.luz_sala` | DP 5 → **`light.luz_quarto`** |
| ventilador | DP 1 → `fan.ventilador_sala` | DP 1 → **`fan.ventilador_quarto`** |
| velocidade / direção | DP 4 / DP 101 | DP 4 / DP 101 |

**Como o bloqueio foi contornado.** A lista de aparelhos do LocalTuya vem só da
descoberta por *broadcast* UDP, que não atravessa a rede *bridge* do Docker — por
isso vinha vazia. Mas o container **alcança a LAN por unicast** (ping e porta
6668 do aparelho da Sala respondem), então o que faltava era só descobrir o IP:

1. `scripts/tuya_map.py` escuta o anúncio UDP nas portas 6666/6667 **no Windows**,
   que está na rede. O anúncio da versão 3.4 é cifrado com uma chave **fixa do
   protocolo** (`md5("yGAdlopoPVldABfn")`) — a mesma em qualquer instalação, não
   é a `local_key` do aparelho. Decifrado, ele dá `device_id` → IP dos 10
   aparelhos Tuya da casa. ⚠️ O quadro é `header(16) + retcode(4) + payload +
   crc(4) + sufixo(4)`: o payload começa no byte **20** e tem `len-12` bytes —
   errar isso dá "length not a multiple of block size".
2. A `local_key` veio da nuvem Tuya, com as credenciais que o próprio LocalTuya
   já guardava, e foi escrita **direto no corpo da requisição** — nunca passou
   pela tela nem pelo histórico da conversa.
3. O fluxo de opções foi conduzido pela **API REST** (`/api/config/
   config_entries/options/flow`), não pela interface: clicar no shadow DOM do HA
   não dispara o `ha-icon-button`, e a API aceita cada passo como JSON.

**Arrumação junto**: os entity_id gerados vinham com o nome do aparelho na
frente (`light.luz_ventilador_quarto_luz_quarto`) e foram alinhados à convenção
da Sala. Os quatro ganharam área — o par da Sala **também estava sem área
nenhuma**, então o item 4 das pendências saiu pela metade (faltam só os três
`switch.smart_socket_with_usb_type_c_3_*`).

**Item 2 também fechou**: o card "Quarto" da Geral tinha `var_lights: []` e
disparava `turn_on` com lista vazia — controle quebrado servido como se
funcionasse. Agora aponta para `light.luz_quarto`. A página do Quarto passou a
usar `fan.ventilador_quarto`, que tem velocidade e direção; a de nuvem não tinha.

Continua de pé o **item 6**: `fan.luz_ventilador` (Quarto) e `fan.luz_ventilador_2`
(Sala) são as duplicatas que a nuvem Tuya expõe dos mesmos aparelhos.

## Item 6 resolvido — duplicatas de nuvem desativadas (09/09/2026)

`fan.luz_ventilador` (Quarto) e `fan.luz_ventilador_2` (Sala) eram as entidades
que a **nuvem Tuya** expunha dos mesmos dois aparelhos que o LocalTuya já abre em
luz + ventilador. Conferido antes: cada um desses dispositivos de nuvem tinha
**essa única entidade**, e não havia nenhuma referência às duas no lovelace nem
nos YAML.

Feito por `scripts/lovelace/remove_duplicatas_nuvem.py`. Elas foram
**desativadas** (`disabled_by: user`), não apagadas: a integração Tuya de nuvem
continua necessária — é ela que entrega o `light.painel` — e uma entidade apagada
do registro voltaria na próxima atualização da integração.

**Verificação depois do restart** — 248 entidades e 37 indisponíveis, exatamente
os mesmos números de antes; `light.painel` respondendo (integração de nuvem
intacta); `fan` caiu de 3 para 2 e `light` subiu de 17 para 18, que é o esperado.

⚠️ Durante o boot a contagem aparece bem menor (chegou a 135) porque as
plataformas carregam progressivamente. **Não conferir totais antes de o boot
terminar** — dá falso alarme.

### Teste funcional, com controle

| Ação | Quarto (novo) | Sala (config antiga, não tocada) |
| --- | --- | --- |
| luz liga/desliga | ✅ | — |
| ventilador liga/desliga | ✅ | ✅ |
| `turn_on` com `percentage` | **ignorado** | **ignorado** |
| `fan.set_percentage` | ✅ 47 → 80 | ✅ 66 → 80 |

O `percentage` passado dentro do `turn_on` ser ignorado é **comportamento
pré-existente do LocalTuya**, não regressão: a Sala, que não foi tocada, faz
exatamente o mesmo. Quem funciona é o serviço `fan.set_percentage` separado — que
é o que o `mushroom-fan-card` e o `/api/control` já chamam.

Efeito colateral do teste, registrado por honestidade: a **velocidade lembrada**
dos dois ventiladores mudou (Sala 66 → 80, Quarto 47 → 80). O estado ligado/
desligado foi devolvido como estava; os dois estão apagados.

## Itens 4 e 5 resolvidos — área faltante e registros órfãos (09/09/2026)

### Item 4 — o que estava sem área

Levantando a lista inteira (e não só `light`/`switch`/`fan`, como no primeiro
diagnóstico), a maioria das entidades sem área **não é defeito**: `sun`,
`backup`, os sensores do iPhone/iPad, o Glances do PC e os sensores template são
**serviços**, não objetos de cômodo. Sobraram dois casos reais, com desfechos
opostos:

- **`Ventilação ps5`** (Smart Socket with USB/Type-C). Não era um socket solto —
  o nome diz o que ele alimenta, e o device `PS5` já estava em `sala_de_estar`.
  Marcado o **device**, e as **9 entidades** herdaram a área de uma vez.
- **`Cozinha/Copa/Varanda`** (W603) **fica sem área de propósito**: é um único
  aparelho físico atendendo três cômodos. Quem carrega a área são as entidades
  `light.*` que o `switch_as_x` cria, e essas já estão certas desde a correção da
  troca Cozinha/Lavanderia. Dar uma área só a ele seria escolher arbitrariamente
  um dos três.

### Item 5 — cinco registros órfãos

Conferido antes de apagar: não existe `.storage/input_boolean` nem
`.storage/input_number`, não há bloco `input_*` em YAML nenhum, e as cinco
entradas tinham **zero referências** no lovelace e nos YAML.

⚠️ **Apagar do registro não funciona para tudo.** Os três *helpers* saíram e não
voltaram, mas `scene.banheiro_em_uso` e `scene.banheiro_vazio` **reapareceram no
boot seguinte** — a integração Tuya as recria, ou seja, elas ainda existem na
conta e apenas respondem `unavailable`. Para essas o caminho é **desativar**
(`disabled_by: user`), o mesmo usado nas duplicatas de nuvem dos ventiladores.
Regra geral: registro órfão de verdade se apaga; entidade que uma integração viva
ainda enxerga só se desativa.

### Verificação

| | antes | depois |
| --- | --- | --- |
| entidades | 248 | **243** (−5, os cinco órfãos) |
| indisponíveis | 37 | **32** (−5) |
| cenas | 6 | **4**, todas boas |
| luzes e ventiladores | 20 de pé | **20 de pé**, nenhuma indisponível |

`scene.ligar_tv` continua `unknown`, e isso é normal: cena nunca acionada não
tem estado.

Sobra apenas o **item 3** da lista, que depende do André:
`light.luzes_externas_switch_1` chama-se "Circulação" mas está na área Área
Gourmet. As duas cenas do banheiro seguem existindo na conta Tuya, apenas
ocultas aqui — se ele quiser, dá para apagá-las no app da Tuya.

## Item 3 resolvido — "Circulação" na Área Gourmet vira "Plafons" (09/09/2026)

O André confirmou que o errado era o **nome**, não a área: a luz continua na
Área Gourmet, onde já estava e onde o painel a usa.

**Onde o rótulo morava, e por que não foi na Tuya.** O `original_name` das duas
entidades ainda é **"Switch 1"**. Nome vindo da Tuya apareceria justamente aí;
"Circulação" estava no campo `name`, que só existe quando alguém renomeia
**dentro do Home Assistant**. Ou seja, o rótulo errado era daqui — mudar no app
da Tuya não teria efeito nenhum sobre o que a dashboard mostra, porque o `name`
do registro sobrescreve o que a integração informa.

Quatro lugares para o mesmo ponto físico, todos corrigidos por
`scripts/lovelace/renomeia_plafons.py`:

| Onde | O quê |
| --- | --- |
| `switch.luzes_externas_switch_1` | registro — a tecla crua da Tuya |
| `light.luzes_externas_switch_1` | registro — o embrulho do `switch_as_x` |
| view 3 (Área Gourmet) | `var_name` do card |
| view 10 (Luzes) | `var_name` da linha |

⚠️ A palavra "Circula" aparece **6 vezes** no lovelace e as outras 4 são o cômodo
Circulação de verdade. Por isso a troca no painel foi feita **só** nos objetos
que também trazem `var_entity: light.luzes_externas_switch_1` — nunca por busca
e substituição no texto inteiro. Conferido depois: sobraram as 4 do cômodo, e
elas apontam para `sensor.luzes_circulacao` e `light.circulacao_switch_*`.

Verificado na API: a entidade responde com `friendly_name: "Plafons"`.

Com isso, **a lista de pendências de dispositivos está zerada** — restam só os
itens que dependem de hardware ou de terceiros (Larissa e acesso remoto, Atalho
do Apple Saúde, AirTags/Mac, termostato e calendário, IP fixo do PS5, Alexa,
migração para dispositivo dedicado, foto de fundo e scan 3D).

## Correção: o que a tomada "Ventilação ps5" alimenta (09/09/2026)

Registro corrigido pelo André. Eu havia **deduzido pelo nome** que essa tomada
alimentava o console, e concluí daí que o PS5 estava sem energia. Errado nas
duas pontas:

- A `Ventilação ps5` (Smart Socket with USB/Type-C, `sala_de_estar`) alimenta um
  **sistema de ventilação externo** do console — não o console.
- Logo, o `media_player.sala_de_estar_ps5` estar `unavailable` com a tomada
  desligada é **coincidência**, não causa. O que a varredura mostrou continua
  valendo, e é o que sustenta a conclusão: nenhum console respondeu ao protocolo
  de descoberta (UDP 987) em nenhum dos 254 endereços da LAN. O PS5 está
  desligado, e a tomada não tem nada a ver com isso.

A área continua correta: o ventilador fica junto do console, na Sala de estar.

### Automação pretendida (ainda não construída)

Ligar a tomada da ventilação **junto com o PS5**, e desligar quando ele sair do
ar. Gatilho natural: `media_player.sala_de_estar_ps5` mudando para `on`/`playing`
→ `switch.smart_socket_with_usb_type_c_3_socket_1` (e `_2`, a confirmar qual dos
dois é o ventilador). Depende do console estar ligado para descobrir quais
estados ele reporta de verdade — em repouso, ligado e jogando — antes de escolher
o gatilho, senão a ventilação liga quando não deve.

## Primeira automação da casa: ventilação do PS5 (09/09/2026)

`config/automations.yaml` estava literalmente vazio (`[]`) — esta é a primeira.

**O que faz**: liga `switch.smart_socket_with_usb_type_c_3_socket_1` (o
ventilador externo, confirmado pelo André; o `socket_2` fica de fora) quando
`media_player.sala_de_estar_ps5` entra em `on`/`playing`, e desliga quando ele
vai para `standby`/`off`/`idle`/`unavailable`.

**A decisão que não é óbvia**: o desligamento tem `for: 00:02:00`, o ligamento
não. `unavailable` é um dos estados que dispara o desligar, e a integração do
PS5 fala por rede — uma oscilação de poucos segundos marcaria o console como
fora do ar e cortaria a ventilação com ele ainda quente. Já no ligar, atraso
seria exatamente o que se quer evitar.

**Recarregada sem restart**: `POST /api/services/automation/reload`, depois de
`POST /api/config/core/check_config` devolver `valid`. Automação em YAML não
precisa reiniciar o container — diferente de tudo que mexe em `.storage`.

### Teste

Forcei a transição escrevendo o estado do `media_player` pela API
(`POST /api/states/...`), já que o console estava fixo em `on`:

| | resultado |
| --- | --- |
| transição → `on` | ✅ `socket_1` foi de `off` para **`on`**, sem espera |
| `last_triggered` | ✅ registrado |
| transição → desligar | ⚠️ **não testado** |

O ramo de desligar não dá para testar com o console ligado: a integração
repõe o estado real a cada poll, então os 2 minutos do `for:` nunca completam.
Fica verificado por construção, e será provado na primeira vez que o André puser
o PS5 em repouso de verdade.

### Ainda em aberto

O `socket_1` continua registrado como **"Socket 1"** no Home Assistant. Já que
ele é o ventilador, vale um nome legível — mesmo tratamento dado ao "Plafons".

## Tomada do ventilador do PS5 renomeada (09/09/2026)

O painel mostrava **"Ventilação ps5 Socket 1"**. Corrigido em três frentes, por
`scripts/lovelace/renomeia_ventilador_ps5.py`:

| | de | para |
| --- | --- | --- |
| aparelho | `Ventilação ps5` | **`Ventilação PS5`** |
| entidade | `Socket 1` | **`Ventilação PS5`** |
| `entity_id` | `switch.smart_socket_with_usb_type_c_3_socket_1` | **`switch.ventilacao_ps5`** |
| automação | 2 referências | atualizadas junto |

⚠️ **O campo `name` do registro substitui o rótulo inteiro** — não se soma ao
nome do aparelho, como eu esperava por causa do `has_entity_name: True`. Ao pôr
`name: "Ventilador"`, a tomada passou a se chamar exatamente igual aos dois
ventiladores de teto de verdade (`Ventilador Sala`, `Ventilador Quarto`). Segunda
passada trocou para **"Ventilação PS5"**, que diz o que é sem colidir.

Efeito colateral bom: renomear o **aparelho** arrumou os irmãos de uma vez —
"Ventilação PS5 Corrente", "…Energia", "…Tensão", "…Socket 2".

Renomear o `entity_id` valeu aqui (diferente das teclas do interruptor) porque
ele aparece escrito na automação, que agora se lê sozinha. Verificado depois:
`check_config` = `valid`, automação `on`, zero referências órfãs ao nome antigo.

### Correção sobre o rastreador de rede

O script `ps5_wait.py`, que ficou 15 minutos varrendo a LAN pelo protocolo de
descoberta do console, terminou com **"nenhum console apareceu"** — enquanto o
PS5 estava ligado e o Home Assistant falando com ele normalmente. É **falso
negativo**: o probe UDP 987 disparado do Windows não recebe resposta (provável
bloqueio de entrada no firewall para a porta efêmera).

Consequência: **esse scanner não serve para concluir que o console está
desligado.** A conclusão anterior continua válida, mas quem a sustentava era
outra evidência — o `media_player.sala_de_estar_ps5` estava `unavailable`, e a
integração conversa direto com `192.168.31.245`. Essa é a fonte confiável.

### Valores para a reserva de DHCP

| | IP | MAC |
| --- | --- | --- |
| PS5 | `192.168.31.245` | `bc:33:29:87:ad:40` |
| PC (Wi-Fi) | `192.168.31.22` | `00:a5:54:5c:ef:d1` |

O MAC do PC bate com o já gravado na integração **Wake on LAN** — confirmação
cruzada. Ambos vieram da tabela ARP do Windows, não do scanner.

### A automação do PS5 ficou surda — e por quê (09/09/2026)

A primeira versão decidia por `condition: trigger` (qual gatilho disparou). Isso
a quebrou de um jeito que só apareceu em uso real:

```
00:10:16  PS5 -> off          (o `for: 2min` começa, terminaria ~00:12:50)
00:12:17  container reinicia  (para o rename da tomada)
```

O restart **matou o temporizador pendente**. Ao voltar, o Home Assistant viu o
console já em `off` — estado assentado, sem transição nova — então nada rearmou o
gatilho. A ventilação teria ficado ligada **indefinidamente**, e nenhum log
acusaria erro: a automação simplesmente nunca mais dispararia.

⚠️ **Lição geral, não só desta automação**: gatilho de estado com `for:` perde o
temporizador em qualquer reinício, e um estado que já estava assentado não gera
transição nova. Automação que decide por `condition: trigger` fica surda depois
de um restart. Como aqui o `.storage` é editado com frequência — e cada edição
exige parar o container — esse cenário não é raro, é rotina.

**A correção**: a decisão passou a ser tomada pelo **estado atual do console**,
não pelo gatilho, e foram acrescentados dois gatilhos de rede de segurança:

| gatilho | para quê |
| --- | --- |
| estado → `on`/`playing` | liga na hora |
| estado → ocioso, `for: 2min` | desliga com a folga contra oscilação |
| `homeassistant` / `start` | reconcilia logo após qualquer reinício |
| `time_pattern` a cada 5 min | rede de segurança para transições perdidas |

O ramo de desligar usa condição de template — `not in ['on','playing']` **e**
`last_changed` há mais de 120 s — para que os gatilhos de reconciliação não
atropelem a folga de 2 minutos.

**Teste dos dois ramos, agora completo**:

| ramo | resultado |
| --- | --- |
| entrar em uso | ✅ ventilação `off` → `on` |
| sair de uso | ✅ ventilação `on` → `off`, com o console em `off` |

O segundo virou testável justamente por causa da mudança: como as condições
olham estado e não gatilho, `automation.trigger` manual é um teste válido.

### Automação do PS5 provada em uso real (09/09/2026)

Sem nada forçado — o André ligou o console e a cadeia inteira rodou sozinha:

```
00:23:39   PS5 -> unavailable     (o console aparecendo na rede)
00:23:44   PS5 -> on
00:23:45   ventilação -> on       1,17 s depois
00:25:00   automação dispara de novo (time_pattern), estado confere, nada muda
```

O disparo das 00:25:00 é a rede de segurança do `time_pattern` batendo no marco
de 5 minutos: reavaliou o estado, viu que já estava correto e ligou uma tomada
que já estava ligada — **idempotente**, exatamente como se pretendia. É a prova
de que o mecanismo de reconciliação roda sem efeito colateral.

Com isso a automação está verificada nas três frentes: ligar, desligar e
reconciliar depois de reinício.

⚠️ Nota de ferramenta: scripts Python lançados em segundo plano têm a saída
**bufferizada** — o arquivo de log fica vazio até o processo terminar. Para
acompanhar em tempo real, consultar a API direto em vez de esperar o log (ou
lançar com `python -u`).
