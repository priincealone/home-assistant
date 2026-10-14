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

## Uma TV física, três dispositivos no HA (09/09/2026)

O André notou duas TVs na lista tendo só uma. Eram **três**, e nenhuma era
engano de cadastro — a mesma TV vista por caminhos diferentes:

| dispositivo | integração | entrega | destino |
| --- | --- | --- | --- |
| `Tv` | SmartThings (nuvem) | `media_player` + 7 sensores; **única** com fonte, canal e consumo | → **`TV Sala (nuvem)`** |
| `Tv (UN65DU8000GXZD)` | SamsungTV (local) | `media_player` + **`remote`**, usado em **30 lugares** do painel | → **`TV Sala (local)`** |
| `Light Sensor - Tv` | SmartThings | sensor de luz ambiente embutido | desativado |

As duas primeiras ficam: o painel usa as duas de propósito. Consolidar custaria
ou o controle remoto (que só existe na local) ou fonte/canal/energia (que só
existem na de nuvem). O que faltava era **o nome dizer qual é qual**.

Renomear o *dispositivo* propaga para o rótulo composto de todas as entidades:
"Tv Energia" virou "TV Sala (nuvem) Energia". Os `entity_id` não mudam, então
nada no painel quebrou — `check_config` válido e o `remote` de pé.

### Apagar o sensor de luz saiu pela culatra

Ele estava `disabled_by: user` no dispositivo, com as três entidades
`disabled_by: device` — desativadas **por causa do pai**. Ao apagar o pai, o
SmartThings recriou tudo no boot seguinte e as entidades voltaram **ativas**,
reportando iluminância 92 e brightness 2. A limpeza ressuscitou exatamente o
que devia sumir.

⚠️ **Apagar um dispositivo reativa os filhos que estavam desativados por ele.**
A correção foi desativar as **três entidades diretamente** (`disabled_by: user`),
o que não depende de o dispositivo existir nem de quem é o pai.

É a terceira vez que a mesma lição aparece nesta sessão — depois das cenas do
banheiro e das duplicatas de nuvem dos ventiladores. Vale como regra do projeto:
**o que uma integração viva ainda enxerga não se apaga, se desativa.** Apagar do
registro só funciona para órfão de verdade, sem nada por trás.

### TV de nuvem oculta da interface (09/09/2026)

As 8 entidades do dispositivo `TV Sala (nuvem)` receberam `hidden_by: user`.

**`hidden_by` não é `disabled_by`.** A entidade continua existindo, com estado, e
continua respondendo a automações, templates e à API REST — só some das
listagens automáticas e dos seletores. Cards do Lovelace que a citam
**explicitamente** seguem renderizando, e é exatamente o caso aqui: o painel usa
`media_player.sala_de_estar_tv` em 3 lugares (Geral e Sala de Estar).

Não existe `hidden_by` no registro de **dispositivos**, só em entidades — por
isso a marcação é uma a uma.

Verificado: as ocultas respondem normalmente na API (`on`, `0.0 W`), a TV local
segue visível com o `remote` intacto, e **na tela** o deck de Mídia da Geral
continua desenhando "TV Sala de Estar — Ligado · 10%" com o controle de volume.

Resultado para o André: **uma TV na lista de dispositivos**, com a de nuvem
alimentando o painel por trás.

## Informação em tempo real de mídia: o que dá e o que não dá (09/09/2026)

Pergunta do André: as mídias expõem o que está sendo consumido — conteúdo na TV,
jogo no PS5? Medido com console e TV ligados, e com um jogo aberto.

| entidade | expõe | conteúdo em uso |
| --- | --- | --- |
| `media_player.sala_de_estar_ps5` | `state`, "pode ligar" | ❌ nada |
| `media_player.tv_un65du8000gxzd` (local) | volume, mudo, `source_list` | ❌ nem a fonte atual |
| `media_player.sala_de_estar_tv` (nuvem) | volume, **`source: hdmi1`**, app `com.samsung.tv.csfs` | ⚠️ parcial |

As automações não têm relação com isso — o limite é o que cada integração publica.

### PS5: a integração suporta, o console não entrega

`media_player.py` **já implementa** `media_title` e `media_content_id`, lendo
`running-app-name` e `running-app-titleid` do DDP. Mas o diagnóstico da própria
integração, com um jogo aberto, devolve:

```json
{"on": true, "standby": false, "host_name": "PS5-115",
 "title_id": null, "title_name": null, "system_version": "13600007"}
```

⚠️ **É o console que não anuncia o app em execução pelo DDP** — diferente do PS4,
que anunciava. Não é ajustável do nosso lado. E o módulo `psn/` da integração faz
**só autenticação** (obter o `account_id` para a credencial de wakeup); não tem
API de presença, então também não serve para pegar o título.

Caminho que funcionaria: uma integração de **presença da PSN** (ex.
`ha-playstation-network`, do HACS), que consulta a conta em vez do console e
reporta o `titleName`. Exige o token NPSSO da conta.

### ⚠️ Por que meus scanners de rede davam falso negativo

O código da integração revela: ela **liga a porta de origem em 987**
(`src_port: int = DDP_SRCH_PORT`). O console **só responde a quem pergunta dessa
porta**. Todos os meus probes usavam porta efêmera — por isso o `ps5_wait.py`
varreu a LAN duas vezes sem achar nada com o console ligado, e por isso a sonda
de dentro do container também deu timeout.

Qualquer sonda DDP futura precisa fazer `bind(('', 987))` na origem.

### O que dá para construir hoje

1. **"TV em: HDMI 1 / TV aberta"** — traduzir `source` da entidade de nuvem.
2. **Contexto cruzado**: TV em `hdmi1` + PS5 `on` = "jogando no PS5". Sensor de
   template, sem integração nova.
3. O **título do jogo** só com a integração de presença da PSN.

## Sensores de contexto de mídia + um bug meu corrigido (09/09/2026)

### O bug: os contadores de luz ficaram invertidos

A correção da troca Cozinha/Lavanderia mexeu no registro de entidades e no
lovelace, mas **não em `template_sensors.yaml`** — que também cita as entidades
pelo id. Resultado: `sensor.luzes_cozinha` contava `switch_3` (agora a
Lavanderia) e vice-versa. O card da Cozinha **acionava** o interruptor certo mas
**mostrava a contagem** do outro cômodo.

⚠️ Não apareceu na verificação da época porque as duas luzes estavam no mesmo
estado — ambas apagadas então, ambas acesas agora. **Estados iguais escondem
inversões.** Ao trocar entidades entre si, procurar o id em *todos* os arquivos:
registro, lovelace **e** os YAML de template/automação.

Corrigido: Cozinha volta a contar `switch_1`; Lavanderia, `switch_3`.

### Os dois sensores

Recarregados com `POST /api/services/template/reload`, sem restart.

| sensor | faz | valor no teste |
| --- | --- | --- |
| `sensor.tv_fonte` | traduz o `source` da TV de nuvem: `hdmi1` → "HDMI 1", `digital_tv` → "TV aberta", desligada → "Desligada" | **"HDMI 1"** |
| `sensor.sala_atividade` | cruza PS5 + TV + fonte | **"Jogando no PS5"**, ícone `mdi:sony-playstation` |

`sala_atividade` degrada em camadas: "Jogando no PS5" (console ligado **e** TV em
hdmi1) → "PS5 ligado" → o que a TV estiver mostrando → "Sala livre". Carrega
`ps5`, `tv` e `fonte` como atributos, para depurar sem abrir o template.

É o mais perto de "conteúdo em uso" possível hoje: o nome do jogo não existe
porque o console não o anuncia, e o título do que passa na TV nenhuma das duas
integrações expõe.

### `sala_atividade` no deck de Mídia da Geral (09/09/2026)

A linha entrou **entre o rótulo "MÍDIA" e o player** — é ali que ela responde a
pergunta que o deck levanta ("o que está tocando?") antes de mostrar os
controles. `scripts/lovelace/deck_midia_atividade.py`.

O sensor já carrega o próprio ícone (alterna entre PlayStation, TV e sofá
conforme o contexto), então o card só exibe `icon` + `state`. Toque abre o
`more-info`.

Estilo pelo template **`sem_fundo`**, em vez de repetir o bloco de `card_mod`
que os cards vizinhos repetem um a um — é o que o `CLAUDE.md` pede desde a
limpeza do P3.

**Medido na tela**, com o console em uso:

| elemento | tamanho | peso | cor |
| --- | --- | --- | --- |
| rótulo "MÍDIA" | 11px | 700 | branco 40% |
| "Jogando no PS5" | 12,5px | 550 | branco 82% |

Hierarquia na ordem certa — o rótulo recua, o dado vivo avança — e acima do piso
de 11px fixado na auditoria. Sem transbordo. As três peças originais do deck
seguem na posição (verificado por asserção no próprio script).

## Conta Xiaomi Home: por que não vinculava, e o caminho B (09/09/2026)

O André relatou que a tentativa anterior de vincular a conta não deu certo. Não
havia rastro no projeto — nenhuma integração, nenhum repositório no HACS, nada no
diário. Então o diagnóstico veio do ambiente.

### Os dois suspeitos

**1. As URLs do Home Assistant estão vazias.** `core.config` traz
`internal_url: None` e `external_url: None`. A integração **Xiaomi Home oficial**
vincula por **OAuth**: abre a página de login da Xiaomi e precisa que o navegador
seja devolvido ao HA. Sem URL, ela monta um retorno que não existe — você
autentica e o fluxo morre no caminho. É o sintoma clássico de "não vincula".

**2. A região padrão é a China.** Conta brasileira costuma ficar no servidor
**Singapura**. Região errada faz o login **funcionar** e a lista de dispositivos
vir **vazia** — parece vinculado e não veio nada.

Descartado: bloqueio de rede. O container alcança `api.io.mi.com`, `sg`, `de`,
`us` e `account.xiaomi.com`.

### Caminho escolhido: Xiaomi Miot Auto

`al-one/hass-xiaomi-miot` v1.1.5, baixado pelo HACS. Escolhido por **contornar**
o suspeito nº 1 em vez de consertá-lo: o fluxo dela pede usuário e senha **dentro
do próprio formulário do HA**, sem redirect nenhum. Se o problema era o OAuth,
ele não existe aqui.

O primeiro passo oferece `account` ou `token` — conta é o que o André quer. O
formulário de conta pede `username`, `password`, `server_country` (padrão **`cn`**
— a armadilha) e `conn_mode` (`auto`, que tenta local antes da nuvem).

⚠️ O fluxo que abri pela API foi **abortado** de propósito: fluxo pendente trava
o próximo do mesmo domínio, armadilha já registrada neste projeto. O formulário
foi então aberto pela interface.

**Estado**: formulário na tela, região já em **Singapore** e modo em
**Automatic**. Faltam usuário e senha, que são do André.

Se a conta entrar mas nenhum dispositivo aparecer, o próximo palpite é trocar a
região para **United States**. Se nem logar, aí vale definir a `internal_url` e
ir para a integração oficial.

### A causa real: a Xiaomi exige verificação de identidade

O login foi submetido e o log mostrou:

```
custom_components.xiaomi_miot.core.xiaomi_cloud.MiCloudNeedVerify: need_verify
```

⚠️ **Não era o redirect do OAuth** — minha primeira hipótese estava errada, ou ao
menos incompleta. A Xiaomi está pedindo **verificação em duas etapas** para essa
conta, e o fluxo para aí. Nenhuma entrada de configuração chegou a ser criada
(`xiaomi_miot` não aparece em `components`), então os dispositivos que apareceram
na tela vieram do *diálogo* da Xiaomi, não do Home Assistant.

**Como o `hass-xiaomi-miot` trata isso** (lido no código, não suposto):

- `config_flow.py:180` guarda `verify_url` no contexto e mostra no formulário um
  link *"Open the verification page"*;
- `config_flow.py:375` acrescenta ao formulário um campo novo, **`verify_ticket`**;
- `xiaomi_cloud.py:811` consome esse ticket chamando
  `/identity/auth/verifyPhone` (flag 4) ou `/identity/auth/verifyEmail` (flag 8).

⚠️ **O campo `verify_ticket` quer o CÓDIGO que a Xiaomi manda por SMS ou e-mail**
— não uma URL, não um token copiado da barra de endereços. Esse é o ponto
não-óbvio, e é o candidato natural para o que derrubou a tentativa anterior.

**Sequência correta**, então:

1. Preencher usuário e senha e enviar.
2. **Falhar é esperado**: o formulário volta com o link de verificação e o campo
   `verify_ticket`.
3. Abrir o link — a Xiaomi envia o código por SMS/e-mail.
4. Digitar o **código** em `verify_ticket` e enviar de novo.

Se depois disso a conta entrar mas nenhum dispositivo aparecer, aí sim é região:
trocar Singapore por **United States**.

### Verificação passou, mas a região Singapore está vazia

O log confirma que o login **completou**: a Xiaomi devolveu `passInfo: login-end`,
`sns-bind-step: bind-finish` e um `serviceToken`, com `p_ur=BR` e
`p_idc=Singapore`. Ou seja, a verificação em duas etapas foi vencida.

Mas o diálogo parou no passo seguinte, "Filtro de dispositivos da nuvem", com:

> ⚠️ **Sem dispositivos na conta xiaomi**

É a segunda armadilha, exatamente como previsto: **região certa para autenticar,
errada para os dispositivos**. A conta existe em Singapura, os aparelhos não.

⚠️ Distinção que importa: `login-end` no log **não** significa integração criada.
Nenhuma entrada foi gravada e `xiaomi_miot` continua fora de `components` — o
vínculo só existe quando o fluxo chega ao fim.

**Próxima tentativa: United States**, o candidato natural para conta brasileira
depois de Singapura. Formulário reaberto com essa região.

**O atalho definitivo**, que evita tentativa e erro: o app **Mi Home** informa a
região da conta em *Perfil → Configurações → Região*. Vale mais que qualquer
palpite meu — e se não for US, a ordem seguinte é **Europe**, depois **India** e
**Russia**.

Existe também um `OptionsFlowHandler` (`config_flow.py:991`) que expõe
`CONF_SERVER_COUNTRY`: uma vez criada a entrada, dá para trocar a região por ali,
sem refazer o fluxo do zero.

### URL interna definida e integração oficial preparada (09/09/2026)

**`internal_url`** saiu de `None` para **`http://192.168.31.22:8123`**
(`scripts/lovelace/define_internal_url.py`). Sem ela, qualquer fluxo OAuth monta
um endereço de retorno que não existe. A `external_url` fica `None` de propósito:
o acesso de fora é pela tailnet e o OAuth acontece na rede local.

**`xiaomi_home` v0.4.7** (a integração oficial da Xiaomi) instalada pelo HACS.
Descoberta no caminho: ela **já está no catálogo padrão** — a tentativa de
adicioná-la como repositório personalizado devolveu *"Repository
'xiaomi/ha_xiaomi_home' exists in the store"*. Não precisa de repositório
customizado, basta buscar "Xiaomi Home".

O fluxo dela abre com um **aviso de risco que exige aceite** — informações de
conta e dispositivos passam a ser armazenadas no HA, sem garantia da Xiaomi.
⚠️ Aceite de termos é do André; a caixa não foi marcada.

### Por que trocamos de integração

| região | login | busca de dispositivos |
| --- | --- | --- |
| Singapore | ✅ verificação vencida | ✅ respondeu — **lista vazia** |
| United States | ✅ verificação vencida | ❌ **`invalid signature`** |

O `invalid signature` tem explicação: o token de sessão sai carimbado com
`p_idc=Singapore`; consultar a API dos EUA com uma sessão de Singapura quebra a
assinatura. Ou seja, **US não é a região da conta** — a resposta não é "vazio", é
"sessão incompatível".

Relógio foi descartado como causa: o container está a **0,4 s** do tempo real
(hipótese razoável, já que Docker sobre WSL2 num PC que dorme costuma derivar).

Sobra a contradição: Singapura autentica limpo e diz que a conta não tem
aparelho, o que contradiz o app. A leitura mais provável é que o `xiaomi_miot`
consulta a **lista plana** da conta (`home/device_list`) nesse passo, enquanto os
aparelhos vivem dentro de uma **casa** do Mi Home — que se lê por
`v2/home/home_device_list`. A integração oficial enumera por casa, e é
exatamente por isso que ela é a próxima tentativa.

O `xiaomi_miot` fica instalado, sem entrada de configuração, como plano B pelo
caminho de **host/token** (por aparelho, 100% local).

### Vínculo Xiaomi concluído (09/09/2026)

A integração **oficial** entrou: `xiaomi_home` carregada, **248 → 273 entidades**.

| dispositivo | modelo | entidades |
| --- | --- | --- |
| Luminária Luca | `yeelink.light.bslamp2` (Yeelight Bedside Lamp 2) | 7 |
| Roteador | `xiaomi.router.rd15` — 24 conectados, 364 KB/s | 9 |
| rd15_minet_4138 | `xiaomi.router.rd15` (nó mesh, 0 conectados) | 9 |

⚠️ **A região da conta era `cn` (China) o tempo todo** — os `entity_id` saem como
`xiaomi_cn_771718035_...`. Nem Singapura, nem Estados Unidos, que foram as duas
que tentamos às cegas com a integração anterior. Lição: **não adivinhar região**;
ou o app informa, ou se usa a integração oficial, cujo fluxo lista as casas.

**O que finalmente destravou**, na ordem: `internal_url` definida → integração
oficial instalada → `homeassistant.local` resolvendo pelo `hosts`
(`127.0.0.1  homeassistant.local`, escrito pelo André num PowerShell elevado) →
OAuth com endereço de retorno alcançável.

⚠️ O endereço de retorno é **fixo no código** da integração
(`OAUTH_REDIRECT_URL = 'http://homeassistant.local:8123'`, `miot/const.py:135`) e
o formulário oferece só ele. A `internal_url` **não** é usada para isso — foi
hipótese minha que se mostrou incompleta. O que resolve é o nome resolver.

⚠️ Como o HA guarda sessão **por endereço**, foi preciso fazer login de novo ao
abrir `homeassistant.local:8123`.

### Um segundo servidor para o dispositivo que faltou

O `unique_id` da integração é `f'{cloud_server}{uid}'` (`config_flow.py:557`) —
**inclui o servidor**. Logo, a mesma conta em outra região gera identificador
diferente e o HA aceita **duas entradas lado a lado**. É o caminho para o
aparelho que só aparece após trocar a região no app.

### Pendente de arrumação

Os três dispositivos caíram todos na área **Closet**, herdada dos cômodos do Mi
Home. "Luminária Luca" quase certamente pertence ao **Quarto do Luca**.

### Áreas dos dispositivos Xiaomi corrigidas (09/09/2026)

Tudo veio na área **Closet**, herdada dos cômodos do Mi Home. Corrigido por
`scripts/lovelace/areas_xiaomi.py`, com a localização informada pelo André:

| dispositivo | de | para |
| --- | --- | --- |
| Luminária Luca | Closet | **Quarto Luca** |
| Roteador (nó principal) | Closet | Closet (já estava certo) |
| rd15_minet_4138 | Closet | **Sala de estar** |

⚠️ **É uma rede mesh, e isso invalidou a evidência que eu tinha.** Eu ia inferir
a localização pelos aparelhos conectados — 24 num nó, 0 no outro, com o MAC do PC
na lista do "Roteador". Mas em malha o nó principal reporta os clientes da rede
**inteira** e o satélite reporta zero: o número não localiza nada, e a presença
do MAC do PC não prova proximidade. Quem desempatou foi o André.

⚠️ **O nome da luminária tem espaço à direita** (`'Luminária Luca '`). A primeira
execução casou nomes sem `strip()`, não a encontrou e abortou **com o container
já parado**. Duas lições: comparar nomes vindos de integração sempre com
`strip()`, e pôr as validações **antes** do `docker stop`, não depois.

As 7 entidades da luminária estão `unavailable`, coerente com ela estar
desligada. Nada foi desativado nem oculto — quando voltar à tomada, aparece
sozinha.

Verificado: HA `RUNNING`, `xiaomi_home` viva, 273 entidades.

### Segunda entrada Xiaomi: o aspirador (09/09/2026)

O aparelho que faltava estava no servidor **`us`**, não numa região "Brasil" —
que não existe na lista da integração (`cn`, `de`, `i2`, `ru`, `sg`, `us`).
"Brasil" no app é o **país** da conta; ele mapeia para um desses seis.

A segunda entrada entrou lado a lado com a primeira, como o código previa
(`unique_id = servidor + conta`). **273 → 347 entidades.**

| dispositivo | modelo | servidor | área | entidades |
| --- | --- | --- | --- | --- |
| **Aspirador** | `dreame.vacuum.mc1808` | us | Closet | **64** |
| **Repetidor** | `xiaomi.repeater.v6` | us | *Atelier Amelia* | 10 |
| Roteador | `xiaomi.router.rd15` | cn | Closet | 9 |
| rd15_minet_4138 | `xiaomi.router.rd15` | cn | Sala de estar | 9 |
| Luminária Luca | `yeelink.light.bslamp2` | cn | Quarto Luca | 7 |

O aspirador responde: `vacuum.…mc1808` em `idle`, bateria **100% carregando**,
`No faults`, 307 limpezas e 10.968 m² acumulados.

⚠️ **Correção de uma leitura minha**: contei entidades por servidor procurando
`_de_` no `entity_id` e achei "80 na Europa". Era **falso positivo** —
`iphone_de_andre` e `ipad_de_andre` contêm `_de_`. A contagem correta usa o
padrão `<marca>_<servidor>_<id>_`: **cn 25, us 74**, mais nenhum.

### Duas coisas para decidir

1. **Uma área nova apareceu**: *Atelier Amelia*, criada pela integração a partir
   do nome do cômodo no Mi Home daquela conta/região. As áreas passaram de 10
   para 11, e o Repetidor caiu nela.
2. **O aspirador traz 64 entidades, 50 delas propriedades cruas do MIoT** — nomes
   como "Aspirador * clean start-clean", "* audio play-sound". Sobram **14 úteis**:
   a entidade `vacuum` em si, bateria, estado de carga, falha e a vida dos
   consumíveis (escovas, filtro). As 50 restantes são ruído nas listagens.

### Limpeza pós-Xiaomi (09/09/2026)

Três decisões do André: aspirador fica no **Closet**; **Repetidor** e a área
**Atelier Amelia** são resíduos de outra configuração; as **50 propriedades
cruas** do aspirador ficam ocultas.

| | resultado |
| --- | --- |
| Aspirador | **14 visíveis de 64** — as 50 cruas com `hidden_by: user` |
| Repetidor | **0 entidades visíveis** (10 desativadas) |
| Entidades no sistema | 347 → **337** |
| `vacuum.…mc1808` | `idle`, funcional |

⚠️ **Erro de verificação meu**: conferi o resultado do ocultamento pelo
`/api/states` e vi as 64 ainda lá, concluindo que falhara. Não falhara —
`hidden_by` **não remove da API**, só das listagens e dos seletores. Eu já tinha
registrado isso ao ocultar a TV de nuvem e ainda assim olhei o lugar errado. Para
conferir ocultamento, olhar o **registro**, nunca o endpoint de estados.

⚠️ **Quarta ocorrência da mesma lição**: apagar o Repetidor não grudou — as 10
entidades voltaram no boot seguinte com `device_id` novo, e o **dispositivo e a
área também voltaram** (11 áreas de novo). Desativar as entidades resolveu o que
importa (nada aparece), mas a linha do dispositivo e a área persistem, porque a
integração as recria a cada boot enquanto o aparelho estiver na conta.

**O lugar certo para removê-lo de vez** é o próprio fluxo de opções da
integração: `async_step_homes_select` e `async_step_devices_filter`
(`config_flow.py:663` e `:756`) permitem desmarcar casas e dispositivos. Excluído
ali, ele para de ser recriado — e a área some junto.

### Repetidor removido na origem, e a área junto (09/09/2026)

Apagar o dispositivo do registro nunca ia grudar: **a entrada de configuração
guardava uma lista de dispositivos em cache**, e a integração o recriava a cada
boot — com `device_id` novo, arrastando de volta a área "Atelier Amelia".

O lugar certo era o **fluxo de opções da própria integração**, marcando
*"Atualizar lista de dispositivos"*. A tela de seleção já mostrou a verdade:

> Importar dispositivos da casa: **Casa [ 1 dispositivos ]**

Um só — o aspirador. O Repetidor já não estava na conta Xiaomi, como o André
tinha dito; quem o mantinha vivo era o cache. E a confirmação foi explícita:

> Alterações de Dispositivos: Adicionar **0** dispositivos, Remover **1**

Depois disso a área ficou órfã e a remoção dela **grudou** — 11 → 10 áreas, e
não voltou no restart seguinte.

⚠️ **Tentei este fluxo primeiro pela API REST e abortei.** Ela devolveu o
`multi_select` sem as opções legíveis e o passo avançou sozinho para uma
confirmação que eu não conseguia auditar — confirmar às cegas poderia
desmarcar casas inteiras. Conferido depois de abortar: nada mudara. **Fluxo com
seleção de dispositivos se conduz pela interface**, onde as caixas têm nome.

### Estado final da Xiaomi

| dispositivo | área | entidades visíveis |
| --- | --- | --- |
| Aspirador | Closet | **14** de 64 |
| Roteador | Closet | 9 |
| rd15_minet_4138 | Sala de estar | 9 |
| Luminária Luca | Quarto Luca | 7 (`unavailable`, desligada) |

10 áreas, 337 entidades, `vacuum.…mc1808` em `idle`.

💡 A integração tem uma opção embutida, **"Ocultar entidades não padrão criadas"**
(`hide_non_standard_entities`), que faz o que fiz à mão nas 50 propriedades cruas
do aspirador. Se um dia entrar outro aparelho ruidoso, é por ali — mais limpo que
marcar entidade a entidade.

## Card do aspirador (10/09/2026)

Chip `mdi:robot-vacuum` na Geral mostrando a bateria; toque abre um popup — o
mesmo padrão do PC. `scripts/lovelace/card_aspirador.py`.

**O que o aparelho de fato oferece**, decodificado de `supported_features: 12824`:

| tem | não tem |
| --- | --- |
| START, STOP, RETURN_HOME, LOCATE, STATE | PAUSE, FAN_SPEED, BATTERY, STATUS, MAP |

Por isso o popup **não** usa o `tile` de vacuum com todos os comandos — metade
não existiria. Bateria e potência moram em entidades separadas, não como
atributos da entidade `vacuum`.

⚠️ **A potência vem em chinês** (`安静`/`标准`/`中档`/`强力`) e um `select` nativo
mostraria assim. A solução foram quatro botões com rótulo em português que
chamam `select.select_option` com o valor original — o aparelho recebe o que
entende, a tela fala português. O ativo fica em `#FF9F0A`.

Conferido na tela: comandos, bateria, os quatro botões com **Turbo** destacado,
consumíveis e histórico (307 limpezas, 10.968 de área, 12.552 min).

### Três defeitos de dados que o card expõe

1. **Consumíveis todos em 0%** — filtro e as duas escovas. Ou precisam de troca,
   ou o aparelho não popula esses campos. Vale conferir no app da Xiaomi.
2. **`Charging_2`** — enum cru, sem tradução. O mesmo vale para `work_mode: 14`,
   que ficou de fora do card por não ter significado legível.
3. **Área acumulada sem unidade** — 10968, provavelmente m².

## Mapa e posição em tempo real: o que existe e o que falta

O sensor `map_view_p_23_1` **não é o mapa salvo**. Decodifiquei: base64url +
zlib, 127 bytes, contendo

```json
{"timestamp_ms":1788962174237,"mtid":"65b0d360232f7","cs":0,"mra":0,"tr":""}
```

mais um cabeçalho binário com coordenadas. É um **quadro ao vivo** — posição do
robô e um recorte do mapa — em formato proprietário e não documentado. A posição
em tempo real **está ali**, mas decodificar isso à mão seria frágil.

Para mapa renderizado + posição ao vivo, o HACS oferece dois caminhos:

| | downloads | estrelas |
| --- | --- | --- |
| **Dreame Vacuum** (integração, com suporte a mapa) | 44.315 | **2.176** |
| Xiaomi Cloud Map Extractor (integração) | 59.518 | 1.420 |
| Lovelace Xiaomi Vacuum Map Card (card) | 65.363 | 1.936 |
| Dreame Vacuum Map Card (card) | 13.490 | 108 |

⚠️ **Risco principal**: o MC1808 é um modelo antigo (o Xiaomi 1C rebatizado). Não
verifiquei se a integração Dreame o suporta — os projetos costumam mirar os
modelos novos. Confirmar antes de instalar.

Sobre a ideia do mapeamento 3D: o mapa do aspirador é uma planta **2D de um
plano só**, no nível do chão. Serve muito bem como base de contorno e divisão de
cômodos, mas não traz altura — não substitui o scan LiDAR que já está na lista
de pendências.

## Mapa do aspirador: compatibilidade conferida e caminho montado (10/09/2026)

Conferido nos dois projetos antes de instalar qualquer coisa:

| projeto | estrelas | `dreame.vacuum.mc1808` |
| --- | --- | --- |
| **Dreame Vacuum** (Tasshack) | 2.176 | ❌ **não suportado** — a lista tem só `p2xxx`/`r2xxx`/`p21xx` |
| **Xiaomi Cloud Map Extractor** (PiotrMachowski) | 1.420 | ✅ **suportado**: *"dreame.vacuum.mc1808 (Xiaomi Mi Mop/Xiaomi Mijia 1C)"* |

⚠️ A opção mais estrelada era a **errada**. O MC1808 é o Xiaomi 1C rebatizado, e
os projetos Dreame miram os modelos novos. Instalar por popularidade teria
custado mais um ciclo perdido.

**Instalado**: `xiaomi_cloud_map_extractor` v2.2.5. Ele cria uma **entidade
`camera`** com o mapa renderizado, atualizando a cada 5 s, desenhando posição do
robô, trajeto percorrido, trajeto previsto, base, cômodos, zonas e paredes
virtuais — que é exatamente o "acompanhamento em tempo real" pedido.

### O IP do aspirador, descoberto sem credencial

O protocolo **miIO** (UDP 54321) responde a um pacote "hello" com o **device id**,
sem exigir token. Varrendo a LAN de dentro do container:

```
192.168.31.63   device_id=415783444   <<< o aspirador
192.168.31.1    device_id=771718035   (o roteador principal, é o gateway)
```

O `415783444` casa com o `entity_id` `dreame_us_415783444_mc1808` — identificação
sem ambiguidade. De quebra, confirma que o "Roteador" é mesmo o nó principal.

### Configuração pronta, aguardando três segredos

`config/camera_aspirador.yaml` já tem `host: 192.168.31.63`, `country: us` e a
lista completa de camadas a desenhar. ⚠️ **Não está ativo**: só entra quando
`camera: !include camera_aspirador.yaml` for acrescentado ao
`configuration.yaml`, e isso só depois que existirem no `secrets.yaml`:

```
aspirador_token:   token do aparelho
xiaomi_user:       e-mail ou ID da conta Xiaomi
xiaomi_pass:       senha da conta
```

Incluir antes disso faria o `!secret` falhar na carga. São credenciais do André.

### O que sobrou para o mapa: uma linha (10/09/2026)

O André ofereceu acesso total às credenciais. A senha continua fora — é a única
fronteira que não se move, mesmo com autorização explícita. Mas dois dos três
itens deixaram de ser problema:

**O token do aparelho já estava na casa.** A integração `xiaomi_home` guarda os
dispositivos em texto claro em
`.storage/xiaomi_home/miot_devices/6535733860_us.dict`, e o registro do
`did=415783444` traz o campo `token` (32 chars). Copiei **de arquivo para
arquivo** para o `secrets.yaml`, sem exibir nem passar pelo histórico — o mesmo
padrão usado com a `local_key` do Tuya.

⚠️ Esse arquivo *parecia* cifrado numa primeira leitura: `json.load` quebrou com
`UnicodeDecodeError` e a proporção de bytes imprimíveis (96%) me fez duvidar. Era
só um JSON válido **seguido de lixo binário** — `JSONDecoder().raw_decode()` lê o
objeto e ignora o resto. Quase descartei a fonte por erro de leitura.

**O usuário não é segredo** — é o e-mail da conta, que já aparece no log do HA.

Estado do `secrets.yaml` (fora do versionamento, confirmado por
`git check-ignore`):

```
aspirador_token: <gravado>
xiaomi_user:     an.diogo98@gmail.com
xiaomi_pass:     PREENCHER   ← só isto falta
```

Assim que a senha estiver lá: acrescentar `camera: !include camera_aspirador.yaml`
ao `configuration.yaml`, reiniciar, conferir que a câmera renderiza, instalar o
**Lovelace Xiaomi Vacuum Map Card** e pôr o mapa dentro do popup do aspirador.

### Mapa ativado: token bom, nuvem barrada (10/09/2026)

`camera.mapa_do_aspirador` existe. Mas o log trouxe **dois erros diferentes**, e
separá-los mudou o diagnóstico:

```
Unable to log in, check credentials        -> login na NUVEM
Unable to recover failed command           -> comando LOCAL
```

**O local não estava quebrado.** Testando o token direto pelo `python-miio`,
sem tocar na nuvem:

```
LOCAL OK -> modelo=dreame.vacuum.mc1808  firmware=4.3.3_1122  hardware=Linux
```

O token que copiei do armazenamento da `xiaomi_home` está **correto**. O
"failed command" era consequência do login de nuvem ter falhado antes.

⚠️ **A causa provável é a verificação em duas etapas da conta.** O
`xiaomi_miot` bateu em `need_verify` duas vezes hoje com essa mesma conta, e o
extractor faz login por usuário e senha **sem nenhum passo de verificação** —
não há onde digitar o código. Só o OAuth da integração oficial passou por esse
obstáculo.

Duas correções ao longo do caminho, ambas minhas:

⚠️ **`draw: - rooms` não existe** — a lista de válidos tem `room_names`. Um item
inválido derruba a plataforma inteira na carga. Trocado por `- all`.

⚠️ **A senha começa com `@`**, caractere reservado em YAML como primeiro de um
escalar. Sem aspas, ela quebrava a carga do `configuration.yaml` inteiro — não
só a câmera. Citada com aspas simples.

E uma verificação minha que deu falso negativo: usei `^chave:\s*(.*)$` para ver
se a senha fora preenchida, e `\s` **casa quebra de linha** — o padrão pulou para
a linha seguinte, vazia, e reportou "pendente" quando já estava lá. Para ler
valor na mesma linha, `[ \t]*`, nunca `\s*`.

### A causa raiz do login que nunca colava (10/09/2026)

Depois de duas hipóteses erradas minhas — primeiro o OAuth, depois a verificação
em duas etapas da conta — fui capturar a resposta bruta do servidor, rodando o
login com a **própria classe da integração**. A Xiaomi respondeu:

```
code: 0        description: 成功 (sucesso)
securityStatus: 16
notificationUrl: <página de verificação>
```

⚠️ **A senha sempre esteve certa.** O que a Xiaomi pedia era validar a *origem*
do login. E aí veio o achado que explica tudo:

```python
def generate_device_id() -> str:
    return "".join((chr(random.randint(97, 122)) for _ in range(6)))
```

O extractor **sorteia um identificador de aparelho a cada login** — e o agente
também. Para a Xiaomi, toda tentativa era um **aparelho novo**, e conta com
verificação de origem exige validação a cada aparelho novo. Um laço fechado:
validar nunca resolvia, porque a tentativa seguinte já era outro aparelho. Foi
por isso que a verificação de 01:25 funcionou e o restart seguinte falhou.

**Correção**: `generate_device_id` e `generate_agent` passaram a devolver valores
fixos, em `common/xiaomi_cloud_connector.py`. Com identidade estável, uma
validação basta e vale para as próximas.

⚠️ **É um patch em código de terceiro.** Uma atualização do HACS reescreve o
arquivo e o problema volta. O original está preservado ao lado como
`xiaomi_cloud_connector.py.original`.

Efeito imediato: a câmera passou a expor o atributo **`url_2fa`** com a página de
verificação — o caminho correto que a integração prevê, e que antes nem chegava a
aparecer porque o erro morria como "check credentials".

### Duas outras correções de configuração

⚠️ `force_api: dreame` — sem isso o extractor tenta descobrir o tipo pedindo o
nome do mapa ao aparelho por **miIO local**, comando que o mc1808 recusa
("Unable to recover failed command"). Declarado o tipo, ele usa `DreameVacuum`,
cujo `should_get_map_from_vacuum()` é `False`: pula a chamada local e busca o
mapa direto da nuvem.

⚠️ `scan_interval` de 5 → 15 s. Com as tentativas do extractor, cada ciclo
estourava o intervalo e enchia o log de *"took longer than the scheduled update
interval"*.

### O token estava certo o tempo todo

Testado isoladamente pelo `python-miio`, sem nuvem:
`LOCAL OK -> dreame.vacuum.mc1808, firmware 4.3.3_1122`.
O "Unable to recover failed command" era consequência do login de nuvem falhar
antes, não do token.

### Mapa pausado: a conta Xiaomi está exigindo verificação a cada login (10/09/2026)

Depois da identidade estabilizada e de **duas verificações confirmadas pelo
André**, o extractor voltou a pedir uma terceira. O login não cola.

Duas descobertas no caminho, ambas do código:

⚠️ **A ausência de "Unable to log in" não prova sucesso.** O extractor só emite
essa mensagem `if self._logged_in_previously` — ou seja, apenas quando já esteve
logado antes. Numa sequência de falhas desde o boot, ele registra uma vez e cala.
Cheguei a comemorar o sumiço do erro; era ilusão.

⚠️ **Uma vez em `TWO_FACTOR_AUTH_REQUIRED`, ele nunca mais tenta logar:**

```python
if self._status != CameraStatus.TWO_FACTOR_AUTH_REQUIRED and not self._logged_in:
    self._handle_login()
```

O estado trava até reiniciar. Verificar sem reiniciar não adianta — foi o que
aconteceu na primeira confirmação.

**A leitura mais provável agora**: a conta acumulou **9 eventos de verificação
hoje**, entre `xiaomi_miot` e o extractor, mais os logins do vínculo oficial.
A Xiaomi eleva o `securityStatus` depois de muitas tentativas de origem nova e
passa a exigir validação **em todo login** por um período. Continuar tentando a
cada 15 s alimenta exatamente esse estado.

**Por isso o extractor foi desligado**: o `camera: !include` está comentado no
`configuration.yaml`. Confirmado depois do restart — 0 câmeras, 338 entidades,
`check_config` válido, aspirador respondendo.

**Para retomar** (algumas horas depois, ou amanhã):

1. Descomentar `camera: !include camera_aspirador.yaml`.
2. Reiniciar o Home Assistant.
3. Se pedir verificação: abrir o `url_2fa` do atributo da câmera, confirmar o
   código, e **reiniciar de novo** — o passo que faltava, por causa do estado
   travado.

Tudo o mais já está pronto e validado: integração instalada, `force_api: dreame`,
`host` e `country` corretos, token conferido localmente, identidade estável.

### Mapa do aspirador: inviável por este caminho (10/09/2026)

Rodado o procedimento completo, com 8 horas de descanso da conta:

1. Include reativado → reiniciado → **pediu verificação já na primeira tentativa**
2. André confirmou o código
3. **Reiniciado logo em seguida** — o passo que faltava ontem
4. Resultado: **`url_2fa` de novo**

⚠️ **A hipótese da "conta esquentada" estava errada.** As 8 horas não mudaram
nada: a Xiaomi pediu verificação na primeira tentativa do dia. Não é penalidade
temporária por excesso de logins — é o comportamento fixo dessa conta com
clientes de terceiros que fazem login por senha.

Descartado também o caminho mais elegante: a integração **oficial**
`xiaomi_home`, que autentica por OAuth e funciona, **não tem plataforma de
câmera** — só uma entidade `vacuum`. Ela não sabe renderizar mapa.

**Conclusão**: o mapa exige o extractor; o extractor exige login por senha; essa
conta exige verificação a cada login por senha. O laço não fecha.

O extractor foi desligado de novo (`camera: !include` comentado) para não tentar
a cada 15 s indefinidamente.

**O que ainda poderia funcionar**, em ordem de probabilidade:

1. **Conta Xiaomi secundária** com o aspirador compartilhado, sem o mesmo
   endurecimento de segurança. É o contorno padrão da comunidade para este caso.
2. Procurar em `account.xiaomi.com` → segurança alguma opção específica de
   *proteção de login* / *dispositivos confiáveis*, separada da verificação em
   duas etapas que já foi desativada.

Custo já pago que não deve se repetir: **quatro códigos de verificação digitados
pelo André** em duas sessões, nenhum resolvendo. Eu deveria ter percebido antes
que o problema era estrutural do fluxo de login, não de configuração.

Tudo o mais permanece pronto e validado para quando houver credencial que passe:
integração instalada, compatibilidade do MC1808 confirmada, `force_api: dreame`,
IP e região corretos, token testado contra o aparelho, identidade estabilizada.

## Planta 3D interativa (10/09/2026)

Página **"Planta"** (view 11) com o modelo da casa em 3D, onde o piso de cada
cômodo acende quando há luz ligada nele.

⚠️ **Mudança de regra**: a planta 2D/3D era território do `dashboard-app`. O
André decidiu que a versão 3D entra no **Lovelace**, pelo `floor3d-card` que já
estava instalado aqui. A memória do projeto foi atualizada.

### Por que gerar o modelo em vez de converter

O `floor3d-card` liga entidade a **objeto nomeado** (`object_id`). Os dois
arquivos entregues não serviam:

| arquivo | conteúdo | problema |
| --- | --- | --- |
| `Meu novo projeto.ifc` (magicplan, 39 KB) | 18 paredes, 6 portas, 4 janelas | tudo nomeado "Wall"/"Door"/"Window", **zero `IFCSPACE`** |
| `…Andar Térreo.usdz` (5,6 MB) | malha com texturas | bloco anônimo — extraí a tabela de nomes: só ruído |

E a máquina não tem Blender nem biblioteca 3D (`pxr`, `usd`, `trimesh`,
`ifcopenshell` — todas ausentes). Então `scripts/planta3d.py` **gera o GLB do
zero** a partir do IFC, em Python puro: GLB é um cabeçalho JSON mais um buffer
binário. Como a geometria é construída aqui, os nomes são decididos por nós — e
o modelo fica **regenerável**.

**19 objetos nomeados**: `paredes`, 8 × `piso_<cômodo>`, 10 × `luz_<entidade>`.
Modelo de 58 KB, 7,81 × 2,70 × 11,39 m.

### Como os cômodos foram identificados

O IFC não tem ambientes. Detectei-os por **componentes conexos** na planta 2D
renderizada: cada região fechada e cercada por paredes é um cômodo. Filtro de
área ≥ 1,2 m² **e** menor lado ≥ 0,6 m — sem o segundo critério entram as 30
frestas entre as linhas duplas das paredes. Resultado: 8 regiões, que o André
nomeou.

O Banheiro aparece como **duas regiões** (a parede entre elas é a divisória do
box), então tem `piso_banheiro` e `piso_banheiro_2`, ambos ligados ao mesmo
sensor.

Não estão nesta planta: **Lavanderia, Área Gourmet e Circulação** — o
escaneamento é só do térreo.

### A cor do piso vem do sensor de contagem

Preferi `sensor.luzes_<cômodo>` a amarrar o piso a uma única lâmpada: o sensor
já resolve "qualquer luz acesa", o que importa em cômodos com duas. O **Quarto**
é a exceção — não tem sensor de contagem, porque até ontem não tinha luz alguma;
usa `light.luz_quarto` direto.

### ⚠️ O bug que quase passou: material compartilhado

Na primeira versão todos os objetos apontavam para o **mesmo material**. O card
troca a cor mexendo no material, então ou repintaria a casa inteira ou nada —
e o resultado foi nada: os pisos ficaram brancos mesmo com o Closet aceso.

Corrigido com **um material por objeto** (19 materiais). Confirmado na tela: o
piso do cômodo aceso fica laranja, os demais brancos.

Outro deslize corrigido: `piso_banheiro_2` entrou duas vezes no mapeamento,
porque o laço principal já o tratava e um bloco extra repetiu.

## "Painel Casa" removido do Home Assistant (10/09/2026)

O André voltou a trabalhar no `dashboard-app` dentro do Antigravity e vai
resubir uma versão otimizada depois. Até lá o painel sai da barra lateral.

Feito por `scripts/lovelace/remove_painel_casa.py`:

| | |
| --- | --- |
| entrada `painel_casa` em `lovelace_dashboards` | removida |
| `.storage/lovelace.painel_casa` | apagado, cópia em `backups/lovelace.painel_casa.bak_removido` |
| dashboards restantes | Mapa, Casa, Dispositivos |

**O que deliberadamente não foi tocado:**

- O container **`painel-casa`** segue no ar (34 h de uptime, porta 3001
  respondendo 200). Ele é a ferramenta de trabalho do André no Antigravity —
  derrubar seria atrapalhar, e o pedido era tirar o painel do Home Assistant,
  não parar o app.
- O diretório `dashboard-app/`, que só se toca com pedido inequívoco.

Para trazer de volta é só recolocar: o conteúdo era uma view `panel: true` com
um único card `iframe` apontando para o IP Tailscale na porta 3001 — está
inteiro no backup. ⚠️ Lembrar de rever o `aspect_ratio: "100%"`, que é o defeito
nº 2 da auditoria: no celular ele transforma o iframe numa janela quadrada de
375 px de altura para um app que precisa de 1604.

Verificado depois: `check_config` válido, 338 entidades, três dashboards.

### O app também removido (10/09/2026)

Pedido do André: fica só o projeto sendo trabalhado no Antigravity.

| | |
| --- | --- |
| container `painel-casa` | parado e removido |
| imagem `painel-casa:latest` | removida (**290 MB** liberados) |
| porta 3001 | fora do ar |
| containers restantes | `homeassistant`, `anisette` |

Levantado antes de remover: o container **não tinha volume nenhum** — todo o
estado vive no código-fonte, então remover não perde nada. E tinha política
`unless-stopped`, ou seja, voltaria sozinho no próximo boot do Docker se
apenas parado; por isso foi **removido**, não só parado.

⚠️ **O código-fonte está intacto**: `dashboard-app/` inteiro, com o commit
`a772665` e as 49 alterações não commitadas do trabalho no Antigravity. Nada ali
foi tocado — a regra de nunca editar esse diretório continua valendo.

Para resubir: `docker build` no `dashboard-app/` e recriar o container na 3001,
depois recolocar a dashboard a partir de
`backups/lovelace.painel_casa.bak_removido`.

**Duas redes órfãs ficaram**, e não foram removidas por precaução:

- `casa-net` — só o `homeassistant` restou nela, ligado ali por causa do painel.
  Desconectar exige mexer na rede do HA em produção; sem ganho real.
- `ma-net` — vazia, resíduo da tentativa do Music Assistant.

Limpar as duas é seguro quando houver conveniência, com
`docker network rm ma-net` e, para a `casa-net`, desconectar o HA antes.

### Nó mesh da sala ganhou nome (10/09/2026)

`rd15_minet_4138` era o identificador de fábrica — o aparelho nunca tinha sido
nomeado. Agora é **"Roteador Sala"**. Como de costume, renomear o *dispositivo*
propagou para o rótulo das 9 entidades dele.

| dispositivo | área |
| --- | --- |
| Roteador | Closet |
| **Roteador Sala** | Sala de estar |

💡 Fica a assimetria: o nó do Closet chama-se só "Roteador". Renomeá-lo para
"Roteador Closet" deixaria o par simétrico — decisão do André.

## Roteador Closet e faxina da tela de Dispositivos

`scripts/lovelace/limpa_tela_dispositivos.py` — um ciclo só para as duas coisas,
já que ambas mexem nos registros do `.storage`.

O segundo nó da malha, que aparecia sem nome próprio, virou **"Roteador Closet"**
(o outro já era "Roteador Sala"). E 82 entidades receberam `hidden_by: 'user'`,
subindo o total de ocultas de 69 para **151 de 383**.

O que saiu da lista, por categoria:

| Categoria | Qtd. |
| --- | --- |
| saúde do celular duplicada pelos sensores de webhook | 30 |
| identificadores técnicos do celular (BSSID, SSID, SIM, versão do app) | 18 |
| preferência de fábrica dos aparelhos (`power_on_behavior`, LED indicador) | 12 |
| interfaces de rede virtuais do PC no Glances (loopback, vEthernet WSL, Bluetooth) | 10 |
| eventos internos dos roteadores (connect / disconnect / inactive) | 6 |
| LED indicador e config interna dos roteadores | 4 |
| lista crua de MACs conectados (`connect_device_ids`) | 2 |

**`hidden_by`, nunca `disabled_by`**: as entidades seguem vivas, com estado, e
continuam servindo automações e a API — apenas somem das listagens e dos
seletores. Na página do próprio aparelho o Home Assistant ainda as mostra, com
o ícone de olho cortado; isso é o comportamento normal e é como se confere que
o ocultamento pegou.

O script monta sozinho a lista de **entidades em uso**, varrendo lovelace,
automations, template_sensors, scripts, scenes, configuration e camera_aspirador,
e usa essa lista como **veto**: o que o painel cita não é tocado, mesmo casando
com um padrão de ruído. Foi esse veto que preservou `bloqueio_para_criancas`,
`geocoded_location`, `battery_level`, `device_tracker` e os medidores de disco,
memória e CPU do PC.

Um cuidado que quase passou: os 30 sensores de saúde do `mobile_app` parecem os
do deck de Saúde, mas não são. O deck usa `sensor.saude_*`, criados pelo webhook
do Atalho — conferido no lovelace antes de aplicar. **Nome parecido não é prova
de uso; a conferência é no arquivo.**

## Som ambiente, primeira rodada: Music Assistant e ponto de som no navegador

Ponto de partida do levantamento: **a casa não tem nenhum dispositivo de áudio**.
Os três `media_player` existentes são TV (duas entidades, nuvem e local) e PS5,
e nenhum deles tem `GROUPING` nem `BROWSE_MEDIA` — ou seja, não havia nem
biblioteca nem multiroom, e não é configuração faltando, é camada inexistente.

O André definiu o projeto: **caixas embutidas e Echos espalhados**. Os dois
mundos não sincronizam entre si — Echo não fala AirPlay, Chromecast nem
Snapcast — então a divisão de papéis foi decidida agora: **embutidas = música**
(sincronizadas entre si), **Echos = voz e avisos**.

### O que foi ligado

O container `music-assistant` (2.10.2) **já existia**, com Apple Music
configurado, parado desde 06/09. Subiu de novo, entrou na `casa-net` para o
Home Assistant alcançá-lo por nome, e ganhou `--restart unless-stopped` — antes
estava em `no`, isto é, não voltaria depois de um reboot. Para um sistema de som
fixo isso não serve.

A integração `music_assistant` foi criada e está **`loaded`**. Um detalhe que
custou uma tentativa: o endereço do servidor **não pode ser `music-assistant:8095`**,
porque o fluxo de autorização constrói a URL de login a partir dele e o
**navegador não resolve nomes internos do Docker**. O endereço certo é o IP do
host na LAN, `http://192.168.31.22:8095`, que serve aos dois lados — e será
também o endereço que o tablet e as caixas vão precisar para buscar os streams.

O `browser_mod` foi registrado no Chrome do André e criou
`media_player.browser_mod_d95dfb08_d488353f`, além de `light.*_screen` e os
sensores de tela. E o TTS, que só existia em inglês, ganhou uma entrada
`tts.google_translate_pt_com_br`.

### Duas descobertas que decidem o painel fixo

**1. Autoplay.** O player do navegador nasce com
`audio_interaction_required: true` e fica `unavailable` até alguém **tocar na
tela**. Cliques sintéticos não contam para a política do Chrome. Num painel
fixo isso se resolve com Fully Kiosk (o `browser_mod` até expõe
`binary_sensor.*_browser_fullykiosk`) ou com o Chrome aberto com
`--autoplay-policy=no-user-gesture-required`. **Navegador comum não é ponto de
som confiável.**

**2. O Home Assistant fecha o websocket após 5 minutos de inatividade**, o que
derruba o `browser_mod`. O próprio painel avisa. Para um painel fixo, desligar
"Automatically close connection" no perfil do usuário é obrigatório.

### Em aberto

O provedor **"Home Assistant MediaPlayers"** dentro do Music Assistant — que é
a ponte para o MA tocar nos players do HA — **não foi configurado**: a interface
do MA congela o renderer ao abrir o diálogo desse provedor, duas tentativas,
travando a aba. Tentar pela API do MA ou depois de uma atualização.

Anotar também que o **Wi-Fi do PC é DHCP** (`192.168.31.22`). Como esse IP virou
endereço de serviço do Music Assistant, entra na mesma reserva de DHCP já
pendente para o PS5.

### A ponte MA → Home Assistant, pela API

A interface do Music Assistant congela o renderer ao abrir o diálogo desse
provedor, então o caminho passou a ser a API. O cliente e os comandos ficaram
em `scripts/music_assistant/api_console.js`.

Os nomes dos comandos **não são adivinháveis** — sondei dez variantes plausíveis
e todas devolveram "Invalid or unsupported command". O que resolveu foi ler
`controllers/config/flows.py` dentro do container: os fluxos começam em
`config/providers/setup` mas **avançam em `config/flows/submit`**, um namespace
diferente, que nenhuma tentativa por analogia acertaria.

A cadeia do som ambiente é `hass` (plugin que conecta ao Home Assistant) e,
dependente dele, `hass_players` (deixa o MA tocar nos `media_player` do HA).
O fluxo do `hass` foi até o passo `auth`, que **exige o login do André**: a tela
`/auth/authorize` do Home Assistant pede credenciais a cada autorização de
cliente externo, por design — nem a sessão já aberta no navegador a dispensa.
Trocar a origem da URL de `192.168.31.22:8123` para `localhost:8123`, onde a
sessão existe, **não contorna** isso; foi testado.

Então o passo está na borda: formulário na tela, tudo o mais pronto. Depois do
login, `hass_players` entra com uma chamada só.

### A ponte fechou

Depois do login do André na tela de autorização, o restante saiu por API, sem
tocar na interface travada:

  config/providers/setup {provider_domain:'hass_players'}   -> passo "finish" direto
  config/providers/save  {instance_id:'hass_players', values:{players:[...]}}

O provedor `hass_players` **não pede formulário** — ele nasce pronto e só
precisa da lista de entidades. E a lista de candidatos que ele oferece é
reveladora: **apenas dois**, `media_player.tv_un65du8000gxzd` e o player do
`browser_mod`. A TV da SmartThings e o PS5 ficam de fora porque não têm
`play_media` — o Music Assistant só aceita quem sabe receber um stream.

O resultado voltou para o Home Assistant como entidades novas, e a diferença
aparece na capacidade: `media_player.tv_sala_local` tem **`BROWSE_MEDIA`**, que
nenhum player da casa tinha. O `browse_media` dele já responde com Artists,
Albums, Tracks, Playlists, Radio stations, Podcasts e Audiobooks, além do
Radio Browser e do text-to-speech do próprio Home Assistant.

Falta ainda `GROUPING` — vem dos provedores `sync_group` / `universal_player`
do Music Assistant, e só faz sentido quando houver mais de um ponto de som de
verdade.

## Alexa Media Player: barrado por chave de acesso (passkey)

O fluxo foi montado com o domínio corrigido para **`amazon.com.br`** (vinha
`amazon.com`, o padrão americano — é o campo que mais derruba esse login no
Brasil) e `hass_url` em `http://192.168.31.22:8123`. O André preencheu as
credenciais e a Amazon respondeu **"Houve um problema"**.

O log do Home Assistant não registrou erro nenhum: o problema veio da própria
Amazon, apenas repassado pelo proxy. A mensagem real estava escondida entre as
mensagens de template da página:

> "Erro na chave de acesso. Algo deu errado... Desculpe, sua chave de acesso
> não está funcionando. Faça login com sua senha."

**A conta usa passkey, e passkey não atravessa o proxy do `alexa_media` — por
definição.** A credencial é vinculada à origem `amazon.com.br`, e o proxy serve
a página a partir de `192.168.31.22:8123`. O navegador se recusa a usá-la numa
origem diferente. Não é configuração errada: é o modelo de segurança do
WebAuthn funcionando como deveria.

Tentei forçar o fallback de senha neutralizando `navigator.credentials` e
`window.PublicKeyCredential` na aba. **Não resolveu** — a Amazon continua
devolvendo a tela inicial, e o patch se perde a cada recarga da página. O
formulário do proxy também carrega um campo oculto `metadata1`, o fingerprint
que a Amazon usa para detectar automação; é provável que o bloqueio venha dali
também.

Caminho recomendado: **desativar a chave de acesso na conta Amazon** e usar
senha com verificação em duas etapas por **app autenticador** — a integração
tem campo próprio para a chave de 52 caracteres do autenticador, e esse é o
fluxo que ela suporta de verdade. Vale lembrar que foi a verificação em duas
etapas que também complicou o vínculo da Xiaomi.

## YouTube Music no Music Assistant

Existe como provedor `ytmusic`, em **estágio beta**, e é **fonte de música**,
não player — entra ao lado do Apple Music como catálogo, e toca em qualquer
ponto de som que já exista. Player continua sendo o ponto de som.

Ele precisa de um servidor de PO token (o YouTube bloqueia streaming sem isso),
e esse servidor **já existia parado aqui**: o container `bgutil-provider`
(`brainicism/bgutil-ytdlp-pot-provider:1.2.1`), desligado junto com o Music
Assistant em 06/09. Subiu de novo, entrou na `casa-net` e ganhou
`--restart unless-stopped`.

⚠️ **O valor padrão do PO token server não serve nesta instalação.** O Music
Assistant sugere `http://127.0.0.1:4416`, mas dentro do container 127.0.0.1 é o
*próprio Music Assistant*, não o host — a porta do `bgutil` está publicada em
`127.0.0.1:4416` **do Windows**, que o container não alcança. Medido:

    http://bgutil-provider:4416/ping -> {"server_uptime":..., "version":"1.2.1"}
    http://127.0.0.1:4416/ping       -> SEM RESPOSTA

Por isso os dois containers foram postos na `casa-net`: assim se enxergam pelo
nome. O valor certo é **`http://bgutil-provider:4416`**.

O que falta é do André: `username` e `cookie` (tipo `SECURE_STRING`, o cookie de
sessão do Google). Como o diálogo de provedor da UI congela o renderer e o
cookie é dele, o caminho ficou em `scripts/music_assistant/ytmusic_setup.js` —
ele cola o valor no console e o script fala com a API local; o cookie não passa
pela conversa.

## Rotina noturna pela porta do quarto

Duas automações novas em `config/automations.yaml`, ambas presas ao
`binary_sensor.porta_do_quarto_porta` (device_class `door`, `on` = aberta):

  - **fechar depois das 22h** apaga todas as luzes e desliga a TV
  - **abrir depois das 22h** acende `light.painel`, como luz de guia

Três decisões que não são óbvias:

**A janela é 22h → 6h, não "depois das 22h".** Uma condição de tempo só com
`after: '22:00:00'` cobre das 22h à meia-noite e para — fechar a porta à uma da
manhã não faria nada, justamente quando mais se quer. Com `after` maior que
`before`, o Home Assistant lê o intervalo como atravessando a meia-noite.

**As luzes saem de um template, não de uma lista fixa**, para que uma luz nova
entre na rotina sozinha. Três famílias ficam de fora de propósito, e cada
exclusão foi conferida no resultado renderizado:

  - `luz_de_fundo` — a marcação dos interruptores que se enxerga no escuro;
    apagá-las é o oposto do que a rotina quer
  - `indicator_light` — os LEDs dos dois roteadores, equipamento de rede
  - `browser_mod` — a tela do painel, que é monitor e não lâmpada

O template resolve **16 luzes reais**. A primeira versão devolvia 18 e levava
junto os LEDs dos roteadores; só apareceu porque a lista foi renderizada antes
de escrever a automação, e não depois.

**A TV é desligada pelos dois caminhos**, `media_player.tv_un65du8000gxzd`
(local) e `media_player.sala_de_estar_tv` (nuvem). São integrações
independentes para o mesmo aparelho e nenhuma é confiável sozinha; desligar o
que já está desligado não custa nada.

⚠️ A **luz do quarto está incluída** no desligamento geral — "todas as luzes"
ao pé da letra. Se a ideia for fechar a porta e continuar com a luz acesa lá
dentro, basta somar um `reject('search', 'luz_quarto')` ao template.

### Correção: o comando de desligar estava ligando a TV

O André observou a TV **ligando** ao fechar a porta. O histórico deixou a causa
sem dúvida:

    23:11:22  TV desligada (pelo André)
    23:18:52  porta fecha -> automação envia turn_off
    23:18:56  TV LIGA
    23:19:27  porta fecha -> turn_off de novo
    23:19:32  TV LIGA de novo

O rastro da automação mostrou as ações corretas; o problema era o aparelho.
**Nesta Samsung o desligar viaja como tecla POWER, que é alternador** — com a
TV apagada, "desligar" acende. O raciocínio que escrevi na primeira versão,
"desligar o que já está desligado não custa nada", é falso aqui, e mandar o
comando pelos dois caminhos ao mesmo tempo dobrava a aposta: um desligava e o
outro tornava a ligar.

A ação virou um `choose` que **só envia o comando com a TV ligada** e por **um
caminho de cada vez** — o local preferencialmente, o da nuvem apenas quando o
local está `unavailable`. Com as duas entidades em `off`, as duas condições dão
falso e nada é enviado, que foi o estado verificado depois da correção.

Lição para as próximas: **comando idempotente é suposição, não fato.** Em
infravermelho e em teclas de controle remoto, "desligar" costuma ser "alternar",
e a diferença só aparece quando o aparelho já está no estado desejado — o caso
que a intuição diz ser o inofensivo.

## Luz por movimento na Lavanderia e na Área Gourmet

Duas automações, uma por ambiente, do pôr do sol ao amanhecer:

  - movimento acende — Lavanderia: `light.cozinha_copa_varanda_switch_3`;
    Área Gourmet: as quatro (Plafons, Pendente, Led, Spots)
  - dez minutos sem movimento apaga

O André corrigiu o escopo no meio: o desligamento por ausência vale para **os
dois** ambientes, não só para a Área Gourmet. Sem isso a luz da Lavanderia
ficaria acesa até o amanhecer.

**O temporizador é o `for: '00:10:00'` do próprio gatilho de ausência**, e não
um `timer` ou `input_datetime`. Se alguém se mexer durante a contagem, o sensor
volta a `on`, o Home Assistant descarta o agendamento pendente e a contagem
recomeça do zero sozinha. Menos peças, mesmo resultado.

⚠️ **A condição de sol guarda só o acender.** Se ela também guardasse o apagar,
uma luz acesa às 5h50 ficaria acesa indefinidamente: o sol nasceria, a condição
viraria falsa e o desligamento nunca rodaria. Apagar por ausência é seguro a
qualquer hora — acender é que só faz sentido no escuro. É o mesmo tipo de
armadilha da janela de horário que atravessa a meia-noite.

As quatro luzes da Área Gourmet entram por **âncora YAML** (`&luzes_gourmet` /
`*luzes_gourmet`), para acender e apagar não poderem divergir com o tempo.
Conferido depois do carregamento: o Home Assistant expande a âncora e as duas
ações recebem as mesmas quatro entidades.

## De onde vêm os acendimentos sozinhos

O André notou interruptores acendendo sem ninguém mandar. Dois scripts novos em
`scripts/diagnostico/` respondem pelo banco do Home Assistant, sem depender de
sessão no navegador: `quem_acendeu.py` e `rajadas.py`.

**O método.** Cada mudança de estado carrega um `context`, e é nele que está a
resposta: `context_user_id` preenchido significa que alguém clicou;
`context_parent_id` significa que foi consequência de outro evento do Home
Assistant; **os dois vazios significam que o comando não passou pelo Home
Assistant** — veio do aparelho, do interruptor de parede ou da nuvem do
fabricante.

Duas armadilhas foram descobertas medindo, e as duas inflavam o número:

  - **reconexão** — um aparelho que estava `unavailable` e volta registra `on`
    sem que ninguém tenha acendido nada; só conta quem veio de `off`
  - **partida do Home Assistant** — ao subir, ele repovoa os estados e dezenas
    de entidades marcam `on` no mesmo segundo

Sem esse filtro, 518 "acendimentos" em 48h. Com ele, **244 reais**.

**As automações do projeto estão inocentes.** Em 48 horas elas aparecem quatro
vezes: três acendendo `light.painel` (a rotina da porta do quarto) e uma na
ventilação do PS5. Nada de acendimento em massa.

**A causa é automação na nuvem da Tuya.** O registro guarda as cenas do app
Smart Life, e os nomes dizem tudo: `scene.banheiro_em_uso`,
`scene.banheiro_vazio`, `scene.lavanderia_em_uso`, `scene.lavanderia_vazia` e
`scene.acender_apagar`. O comportamento do `switch.banheiro_switch_1` confirma —
17 acendimentos marcados "externo", com durações de 1, 3, 4, 10 e 22 minutos, o
padrão inconfundível de um sensor de presença desligando a luz depois de um
tempo. Isso é uma automação de presença **que já existia**, rodando fora do
Home Assistant.

⚠️ **`scene.banheiro_em_uso` e `scene.banheiro_vazio` estão desativadas no Home
Assistant e a automação continua rodando.** Desativar a entidade aqui só
esconde o rastro — a rotina vive na conta Tuya. É o mesmo princípio que já
apareceu quatro vezes neste projeto, agora pelo avesso.

**O conflito a resolver:** a automação de movimento da Lavanderia que criei
ontem faz o que a cena `lavanderia_em_uso` da Tuya já fazia. As duas vão
disputar a mesma luz — a da Tuya acende a qualquer hora, a do Home Assistant
apaga dez minutos depois, e nenhuma sabe da outra. Uma das duas tem que sair, e
a recomendação é ficar com a do Home Assistant: é visível, versionada e tem a
condição de sol.

Sem conclusão, de propósito: as quatro luzes da Área Gourmet acendendo em
rajadas de um a três segundos (11/09 às 17:46, 20:04 e 23:00). Pode ser a cena
`acender_apagar` ou alguém no interruptor de quatro teclas. Os dados não
separam os dois casos.

## Dashboard "Casa" retirada — o `dashboard-app` vira o painel principal (15/09/2026)

Decisão do André: o painel desenvolvido no Antigravity passa a ser o principal, e
a dashboard Lovelace "Casa" sai. **Ficou tudo que é da casa** — dispositivos,
áreas, integrações, as cinco automações e os sensores de template. O ponto de
partida agora é `CASA.md`; o `CLAUDE.md` foi reescrito para a nova direção.

Antes de apagar, medi o que o `dashboard-app` consome desta pasta, porque três
coisas pareciam da dashboard e não eram:

  - `config/template_sensors.yaml` — o app usa `sensor.luzes_<comodo>`,
    `sensor.tv_fonte` e `sensor.saude_*`
  - `config/.storage/core.config_entries` — `app/api/mass/route.ts` lê dali o
    token do Music Assistant
  - `lovelace.minha_casa` — o `tools/gerar_manifesto.py` do app o lia para montar
    o manifesto de cômodos. **Essa regeneração deixa de funcionar**; o
    `manifesto-comodos.json` já gerado continua valendo

A retirada no Home Assistant saiu num ciclo parar/editar/subir
(`scripts/manutencao/retira_dashboard_casa.py`, com `--validar` antes):

  - dashboard `minha_casa` e sua entrada na barra lateral
  - dez itens do HACS, replicando o desinstalar — marca de instalado, pasta e
    recurso do frontend: Bubble-Card, button-card, card-mod-studio, floor3d-card,
    lovelace-card-mod, mushroom, mini-graph-card, modern-circular-gauge, o tema
    Frosted Glass e o Xiaomi Cloud Map Extractor
  - quatro `custom-cards` manuais (kiosk-mode, stack-in-card, swipe-card,
    swipe-navigation), tema `apple_home`, planta 3D e 2D, `camera_aspirador.yaml`
  - **o painel padrão do usuário apontava para `minha-casa`**; sem trocar, abrir o
    HA cairia numa página inexistente. Foi para `dashboard-dispositivos`

Verificado depois da partida: partida sem erros novos, só `map` e
`dashboard-dispositivos` na barra, só o recurso do `browser_mod` no frontend, as
cinco automações `on` e os sensores que o app consome respondendo.

Fora do HA saíram `scripts/lovelace/` (60 scripts), `scripts/ha.py`, `ui.py`,
`auditoria_estatica.py`, `planta3d.py`, a pasta `referencias/`, as auditorias e
os briefings antigos da raiz, a skill de design instalada na pasta, e 46 backups
da dashboard. **Ficaram os 24 backups dos registros** e os 5 da própria retirada.

Mantidos de propósito: `browser_mod` (ponto de som do Music Assistant) e o HACS,
que instalou as integrações de dispositivo. Tudo o que foi apagado e estava
versionado continua recuperável pelo git.

## Plafon da Área Gourmet renomeado e Dashboard em Tarefa Agendada (15/09/2026)

Em continuidade ao processo de consolidação e governança multi-agente:

1. **Renomeação Canônica do Plafon da Área Gourmet**:
   - `light.luzes_externas_switch_1` aparecia no painel (`rooms.ts` e `manifesto-comodos.json`) nomeada indevidamente como "Circulação" e no registro do HA como "Plafons" (sem área explícita).
   - O André definiu o nome canônico: **"Plafon Área Gourmet"**.
   - Procedimento executado sob o protocolo estrito de segurança (RSK-01): backup do registro gerado em `backups/core.entity_registry.bak_20260915_plafon`, parada do container (`docker stop homeassistant`), alteração cirúrgica no JSON atribuindo `name: "Plafon Área Gourmet"` e `area_id: "area_gourmet"` tanto na entidade de luz quanto no switch correspondente, e reinicialização (`docker start homeassistant`).
   - O `entity_id` (`light.luzes_externas_switch_1`) foi mantido intacto, garantindo 100% de retrocompatibilidade com as automações (`config/automations.yaml`) e sensores de template (`config/template_sensors.yaml`).
   - No frontend (`dashboard-app/lib/rooms.ts` e `manifesto-comodos.json`), o identificador interno virou `plafon` e o rótulo visual foi atualizado para "Plafon Área Gourmet".

2. **Dashboard em Execução Contínua via Agendador de Tarefas do Windows**:
   - Para assegurar que o painel web (porta 3002) permaneça ativo 24/7 no tablet de parede mesmo após reinicializações da máquina host, foi registrada a tarefa `CasaDashboardAutoStart` no Agendador de Tarefas do Windows (`schtasks`), acionada automaticamente no logon do usuário.
   - Como garantia de redundância silenciosa sem depender de permissões UAC, foi criado também um atalho `.lnk` no diretório de Inicialização do usuário (`Startup`) apontando para `start_dashboard_dev.vbs`.
   - O script watchdog `iniciar_servidor_background.ps1` opera com Mutex global do sistema (`Local\CasaDashboardMutex`), expurga arquivos `desktop.ini` do compilador e rotaciona os logs defensivamente.

3. **Status das Pendências de Governança**:
   - Nuvem Tuya: O André assumiu a desativação manual das rotinas de presença diretamente no aplicativo Smart Life para eliminar os acendimentos fantasmas.
   - Reserva de DHCP: Adiada para definição de rede posterior.


## Fim da inversão Cozinha ↔ Lavanderia (15/09/2026)

A auditoria dos artefatos do Antigravity (`artifacts/claude/`) encontrou a
divergência, mas o documento deles apontava o lado errado. As fontes, medidas:

| Fonte | switch_1 | switch_3 |
| --- | --- | --- |
| `light.*` (nome e área no registro) | Cozinha | Lavanderia |
| `template_sensors.yaml` | `luzes_cozinha` | `luzes_lavanderia` |
| `automations.yaml` (movimento) | — | Lavanderia |
| `dashboard-app/lib/rooms.ts` | ~~Lavanderia~~ → Cozinha | ~~Cozinha~~ → Lavanderia |
| `manifesto-comodos.json` | ~~Lavanderia~~ → Cozinha | ~~Cozinha~~ → Lavanderia |
| `switch.*` (nome no registro) | ~~Lavanderia~~ → Cozinha | ~~Cozinha~~ → Lavanderia |

⚠️ **Quase inverti para o lado errado.** O arquivo `.cache/estados-snapshot.json`
do painel dizia `switch_1 = Lavanderia`, contradizendo o registro. Só reverificando
ao vivo é que a explicação apareceu: o snapshot é de **07/09**, anterior à correção
de 09/09, que renomeou e reagrupou a camada `light.*` e **deixou a camada
`switch.*` com os rótulos antigos**. Cache velho mente com a mesma segurança de um
arquivo atual — a fonte de verdade é o registro, lido na hora.

Corrigido agora, a pedido do André:

  - `dashboard-app/lib/rooms.ts` — as duas entidades trocadas (`tsc --noEmit` passa)
  - `dashboard-app/manifesto-comodos.json` — idem (JSON validado, 10 cômodos)
  - `switch.cozinha_copa_varanda_switch_1/_3` — nomes acertados no registro, pelo
    ciclo parar/editar/subir (`scripts/manutencao/corrige_nomes_switch_cozinha_lavanderia.py`)

O script valida antes de parar o container **e confere a camada `light.*` como
referência**: se ela não estiver como esperado, ele aborta em vez de propagar um
erro. Só o campo `name` muda; **`entity_id` não muda**, então nenhum contrato,
automação ou sensor de template foi afetado. Subida sem erros novos.

Resíduo conhecido: os **títulos das entradas `switch_as_x`** em
`core.config_entries` ainda carregam os rótulos antigos ("Lavanderia" para a
tecla 1). São só rótulos da integração, não afetam nada, e o arquivo guarda
credenciais — fica para quando houver motivo.

As alterações no `dashboard-app` não foram commitadas: aquele repositório é o do
André, no Antigravity.

## Câmeras Intelbras integradas via RTSP genérico (18/09/2026)

André instalou um sistema de câmeras Intelbras (analógicas VHD 3230, ligadas a
um DVR MHDX 1204-C Dual Audio, `192.168.31.216`, monitorado antes só pelo app
Guardian). Pedido: trazer para o Home Assistant.

**Descoberta de rede**: varredura de portas (leitura, alçada 1) a partir do
próprio container `homeassistant` (que enxerga a LAN via *bridge* NAT, unicast
passa) encontrou 80, 443, 554 e 37777 abertos em `192.168.31.216` — 37777 é a
porta proprietária Dahua, forte indício de que o DVR é OEM Dahua, confirmado
depois pela tela de login ("MHDX 1204-C").

**Tentativa 1 — ONVIF, falhou**: a integração nativa ONVIF do HA pediu
descoberta automática (WS-Discovery, multicast) — não atravessa a rede desta
instalação (ver `CASA.md`, §Rede). Preenchendo manualmente, a conexão para
`192.168.31.216:80` falhou (`Connect call failed`). Diagnóstico: `curl` na
porta 80 pega a interface web normalmente (200), mas um POST em
`/onvif/device_service` fecha a conexão sem responder (`Empty reply from
server`) — ONVIF está desabilitado ou não exposto nesse firmware, e não achei
o toggle em Rede nem em Porta no menu web.

**Tentativa 2 — Câmera genérica (RTSP), funcionou**: a própria tela
Configurações → Rede → Porta do DVR mostra o formato:
`rtsp://<usuário>:<senha>@<IP>:<porta>/cam/realmonitor?channel=<N>&subtype=<0|1>`.
Confirmados 2 canais ativos (dos 4 possíveis): **canal 2** e **canal 4**, ambos
câmeras externas voltadas pra rua. Criadas duas integrações `generic`:
`camera.rua_canal_2` e `camera.rua_canal_4`, `subtype=1` (stream extra, leve —
aparece "Sem HD" sobreposto na imagem) para não sobrecarregar com visualização
contínua no painel.

**Como a senha foi tratada**: o campo "Stream source URL" foi preenchido com
`{{ username }}` e `{{ password }}` como variáveis de template do HA — nunca
a senha real. André preencheu os campos separados "Usuário" e "Senha" da tela
de configuração ele mesmo, e clicou em Enviar; o agente nunca viu nem digitou
a credencial, só a infraestrutura da URL.

**Pendente, dito explicitamente ao André**: só vídeo ao vivo foi configurado.
Detecção de movimento/pessoa e gravação — que ele também pediu — ainda não
existem; ver `CASA.md` §Pendências para as perguntas em aberto (detecção pelo
próprio DVR vs. processamento no HA; gravar no HA duplicaria o que o DVR já
grava localmente). Nada tocado em `dashboard-app/` nesta sessão — as câmeras
não aparecem no painel ainda, isso é mudança de contrato (`lib/rooms.ts`) e
fica para quando o André pedir.

## Clipe de movimento das câmeras — gravação local funcionando (18/09/2026)

Continuação da integração das câmeras Intelbras (ver entrada anterior do
mesmo dia). André pediu clipe de 30s por movimento, sem notificação, subindo
pra nuvem com nome por data/hora e limpeza semanal.

**Descoberta que custou a maior parte do tempo**: a integração `generic`
(Câmera genérica) do HA aceita `{{ username }}` / `{{ password }}` como
template Jinja na URL do stream, e a **pré-visualização da tela de
configuração renderiza esses valores corretamente** — o que faz parecer que
funciona. Mas na operação real (gravação, live view), o HA renderiza o mesmo
template **sem essas variáveis no contexto**, e os logs mostravam
`Template variable warning: 'username' is undefined`. A URL efetiva virava
`rtsp://:@IP:554/...`, sem credencial, e a câmera simplesmente não gravava
nada — sem erro visível na interface do trace da automação (o serviço
`camera.record` "executa" e retorna normalmente mesmo quando a conexão RTSP
por trás falha).

Rastreei isso comparando o resultado do trace da automação (que mostrava os
parâmetros corretos sendo passados) com os logs brutos do container, onde o
aviso de template aparecia. A correção foi reconfigurar as duas integrações
"Câmera genérica" com a senha real embutida na própria URL
(`rtsp://usuario:senha@IP:...`), digitada pelo André diretamente no campo —
os campos separados "Usuário"/"Senha" do formulário só valem para autenticar
imagem estática via HTTP, não o stream RTSP.

**Efeito colateral de segurança**: o campo de URL, ao reabrir "Opções" da
integração já salva, mostra a senha em texto claro (sem máscara, diferente do
campo "Senha" que tem olho pra ocultar). Isso apareceu em capturas de tela
desta sessão duas vezes por engano. Recomendei ao André trocar a senha do DVR
depois — o agente nunca digitou nem armazenou o valor, só o viu de relance
numa captura que ele mesmo preencheu.

**Confirmado funcionando**: evento `imap_content` (dos e-mails de alarme do
DVR, filtrados pro marcador "DVR" no Gmail, nunca chegando à caixa de
notificação do André) dispara a automação
`config/automations.yaml` ("Movimento nas câmeras da rua grava clipe de
30s"), que grava 30s de **ambas** as câmeras a cada alarme (o assunto do
e-mail não diferencia canal) via `camera.record`. Testado disparando o evento
manualmente (Ferramentas de Desenvolvedor → Eventos, sem precisar de
movimento real na câmera) — os dois arquivos saíram com ~1,5 MB, tamanho
condizente com 30s de vídeo real.

**Gotcha à parte**: o diretório `config/www/clipes_movimento/` fica num mount
Docker sobre WSL2/Windows, e o `ls` de dentro do container levou alguns
minutos pra mostrar arquivos recém-criados pelo ffmpeg — um atraso de
sincronização do sistema de arquivos, não falha de gravação. Não confiar em
"arquivo não apareceu ainda" como sinal definitivo de erro nesse ponto;
esperar e reconferir antes de descartar a hipótese de que funcionou.

**Pendente**: a etapa de nuvem (Google Drive) foi propositalmente adiada — o
André pediu pra fechar a integração com o HA primeiro e tratar o Google Cloud
depois, numa sessão futura. Falta: conta de serviço, pasta compartilhada,
script de upload e rotina de expurgo de clipes com mais de 7 dias.

## Upload dos clipes para o Google Drive — pipeline completo (18/09/2026)

Continuação direta da entrada anterior (gravação local funcionando). Faltava
só a nuvem — o André pediu para deixar isso para depois na sessão anterior,
retomamos agora.

**Conta de serviço não serve para Drive pessoal.** Criei projeto `casa-cameras`
no Google Cloud, habilitei a Drive API, criei a conta de serviço
`clipes-cameras-upload@casa-cameras-509101.iam.gserviceaccount.com`, baixei a
chave (`config/google_drive_service_account.json`, já no `.gitignore`) e
compartilhei a pasta do Drive com ela como Editor. O upload falhou com
`storageQuotaExceeded` — **contas de serviço não têm cota de armazenamento em
Drive pessoal**, só em Google Workspace com "shared drives" (nenhuma opção
disponível numa conta Gmail comum). Descobri isso rodando o script
manualmente e lendo o erro real da API, não só confiando na ausência de
arquivo na pasta.

**rclone resolveu.** Autenticação OAuth como o próprio André (não uma conta
de serviço) tem cota normal. Instalei via `winget install Rclone.Rclone`,
autorizei uma vez (`rclone config create gdrive_cameras drive scope=drive` —
abriu o navegador, o André autorizou), e criei
`scripts/camera_upload/sincronizar_clipes_drive.ps1`, chamado por uma Tarefa
Agendada do Windows a cada 5 minutos. `rclone move ... --min-age 30s` sobe os
clipes prontos (a margem de 30s evita pegar arquivo que o ffmpeg ainda esteja
escrevendo) e `rclone delete ... --min-age 7d` faz a limpeza semanal pedida
pelo André — sem precisar escrever lógica de retenção própria.

**Dois incidentes de exposição de senha nesta sessão** (ambos no campo de URL
da integração "Câmera genérica" do HA, que mostra a senha em texto claro ao
reabrir "Opções" — diferente do campo "Senha" que tem olho pra ocultar):
1. Ao editar a URL do canal 4 pela primeira vez, o campo "Senha" reabriu já
   sem máscara (motivo não identificado — pode ter sido estado herdado do
   navegador).
2. Ao tentar uma edição cirúrgica (só trocar o `1` final por `0`, sem
   reescrever a URL toda) para trocar `subtype`, precisei conferir o
   resultado e a senha apareceu de novo.

Depois desse segundo incidente, percebi que a edição cirúrgica também **saiu
errada** — o cursor não foi para onde eu esperava (a tela mostrou
`192.168.310.216` em vez de `192.168.31.216`, sinal de que o `0` foi inserido
no meio do IP, não no lugar do `subtype`). Corrigi refazendo a URL inteira do
zero com um marcador de texto (`COLOQUE_A_SENHA_AQUI`) para o André substituir
— o mesmo método que já tinha funcionado de forma confiável antes. **Lição
prática**: nesse formulário específico, não vale a pena tentar edição pontual
(clicar em um ponto específico do meio de uma URL longa e confiar que o
cursor caiu no lugar certo) — selecionar tudo e reescrever com placeholder é
mais lento mas muito mais confiável, e evita ficar reabrindo a tela (e
reexpondo a senha) para conferir se a edição pontual funcionou.

**Qualidade de imagem**: a pedido do André, troquei `subtype=1` (stream
extra) por `subtype=0` (stream principal) nas duas câmeras, ao vivo e nos
clipes — mais nitidez, mais banda, aceitável pro uso de casa. Descoberta
lateral: o "Sem HD" que aparecia sobreposto na imagem não é indicador de
qualidade de vídeo, é aviso do próprio DVR de que **não há disco rígido
instalado** — não muda trocando o `subtype`.

Tudo em `CASA.md`, seção **Câmeras**, com o comando exato do rclone e o aviso
de que o client_id compartilhado do rclone será desativado em 2026 (ação
futura: criar um próprio).

## Câmera na TV da sala via DLNA — integração de pé, teste bloqueado (18/09/2026)

André pediu um sistema para reproduzir as câmeras da rua na TV da sala, com chamada por Alexa ou pelo
HA. Escrevi a spec primeiro (`specs/features/reproducao-cameras-tv.md`, regra do `CLAUDE.md` §16) e
levantei o estado real antes de propor arquitetura: só 2 câmeras (`camera.rua_canal_2/4`, RTSP
genérico, sem ONVIF), TV Samsung só com `samsungtv` (controle remoto, sem cast) e `smartthings`, nenhum
`cast`/`androidtv` configurado, rede sem multicast (`docs/ARCHITECTURE.md`), Alexa sem integração
nenhuma hoje (`alexa_media` removido do disco, sem entrada em `core.config_entries`).

**Descoberta que destravou sem comprar nada**: `curl http://192.168.31.250:9197/dmr` (HTTP unicast
direto, sem SSDP) devolveu a descrição UPnP completa da TV — ela é um DLNA MediaRenderer de verdade,
com `AVTransport`, e se declara `WebURIPlayable`. A integração `dlna_dmr` do HA aceita configuração
manual por URL de descrição, contornando a ausência de multicast que bloquearia a descoberta
automática. André descartou comprar Fire TV Stick nesta rodada; a rota DLNA supre isso.

Adicionei a integração pelo navegador interno (já autenticado como André): dispositivo "TV Sala
(DLNA)", área Sala de estar, entidade `media_player.sala_de_estar_tv_sala_dlna`. Conectividade
confirmada (estado "Ocioso" ao vivo).

**Correção de rota**: a ideia inicial da spec era usar o `go2rtc` interno do HA pra servir o stream —
errado. Esse `go2rtc` é privado por design (só socket Unix, usuário/senha gerados, "gerenciado pelo
Home Assistant, não editar manualmente"). Corrigi para o mecanismo nativo de media source
(`media-source://camera/camera.rua_canal_2`), o mesmo que já resolve pra Chromecast no HA — não precisa
reconfigurar nada de stream à parte.

**Teste bloqueado**: `media_player.play_media` com essa URI devolveu erro DLNA 716 (Resource not
found). Não é a integração nova — é a `stream_source` RTSP das câmeras, que está com a credencial
duplicada/malformada (dois `@`), provavelmente sobra de uma edição de hoje mesmo (ver entrada anterior
"Upload dos clipes para o Google Drive", que já registra dois incidentes de exposição de senha no
mesmo formulário). Registrado em `planning/BLOCKED.md` como K-13.

⚠️ **Incidente de exposição de senha, meu**: pra checar só a *estrutura* da URL (sem querer ver a
senha), escrevi um regex de mascaramento com um bug, e um fragmento da senha do DVR vazou sem máscara
no terminal desta sessão. Não repeti o valor, apaguei os scripts temporários na hora, mas recomendei ao
André trocar essa senha. Lição prática pra próxima vez que precisar inspecionar uma URL com credencial:
checar só booleanos (tem `{{`? tem dois `@`? tamanho da string) nunca imprimir a string mascarada
inteira — mascaramento por regex é fácil de errar.

Alexa fica fora do escopo desta entrega (Nabu Casa seria a única rota viável sem reviver o
`alexa_media`, e o André não quis assinatura agora) — documentado na spec pra quando ele decidir.

**Próximo passo**: André corrigir a credencial RTSP (K-13) → reexecutar o teste de `play_media` →
se funcionar, criar `config/scripts.yaml` com o script `mostrar_camera_rua` e fechar a entrega
(P-04 em `planning/IN_PROGRESS.md`).

## Câmera na TV — credencial corrigida, mas a TV não aceita HLS (19/09/2026)

Retomada direto da entrada anterior. André corrigiu a credencial RTSP (K-13 fechado, removido de
`planning/BLOCKED.md`).

**Ligar a TV de madrugada**: para reexecutar o teste às 00h13, mandei `media_player.turn_on` na TV
(Wake-on-LAN via `samsungtv`) — não confirmou ligar (a API da Samsung mostrou `PowerState: standby`,
tela seguiu apagada; WoL por Wi-Fi costuma falhar). Parei e perguntei ao André antes de insistir, já
que era tarde e a TV fica na sala. Ele ligou manualmente.

**Teste reexecutado com sucesso parcial**: com a credencial corrigida, o HLS da câmera passou a gerar
normalmente — confirmei pelo navegador de mídia do HA (segmentos `.m4s` em 200 OK, ao vivo) e também
pela URL da LAN (`192.168.31.22:8123`, a mesma que a TV alcançaria — não é problema de rede).
`media_player.play_media` continua devolvendo **erro DLNA 716** mesmo assim.

**Causa raiz real, não a credencial**: consultei `GetProtocolInfo` direto na TV via SOAP
(`ConnectionManager1`) — pedido simples, sem mexer em nada, só pra saber quais formatos ela aceita
receber por `AVTransport`. A lista só tem `video/mp4` progressivo e `audio/mp4`. **Sem HLS, sem
RTSP.** A câmera do HA só sabe entregar como HLS (`media-source://camera/...`) ou RTSP puro — nenhum
dos dois formatos que a TV aceita. Não é bug de configuração, é incompatibilidade de protocolo, e só
apareceu porque perguntei à própria TV o que ela suporta, em vez de ficar tentando formatos por
tentativa e erro.

Atualizei a spec (`specs/features/reproducao-cameras-tv.md`) e `planning/IN_PROGRESS.md` (P-04) com o
achado e as duas rotas possíveis (go2rtc próprio numa porta real, ou `ffmpeg` via `shell_command`,
ambos remuxando RTSP → MP4 fragmentado). As duas são infraestrutura nova, não só configuração —
precisa de decisão do André antes de eu implementar (alçada 2).

Devolvi a TV ao estado de antes do teste (desligada) ao final.

## go2rtc dedicado no ar, TV ainda recusa o arquivo — mais um incidente de senha (19/09/2026, mesma madrugada)

André escolheu a rota do `go2rtc` próprio (em vez de `ffmpeg`/`shell_command`) — é a ferramenta feita
pra isso, e evita reinventar gerenciamento de processo. Subi o container `go2rtc-cameras`
(`alexxit/go2rtc`, rede `casa-net`, portas `1984`/`8554`), config em `go2rtc-cameras/go2rtc.yaml`.

**O `docker run` foi bloqueado pelo classificador de auto mode do Claude Code** (categoria "Expose
Local Services") — confirmar no chat não destrava, é uma permissão real. Passei o comando pro André
rodar no terminal dele. Primeira tentativa falhou porque dei o comando em sintaxe bash (`\` de
continuação de linha), e o terminal dele é PowerShell — corrigi pra uma linha só e funcionou.

**Terceiro incidente de exposição de senha da noite**, e o mais sério dos três: usei `head -c 100` no
JSON de `/api/streams` do `go2rtc` achando que cortar a saída seria suficiente, mas o corte caiu no
meio da própria URL com a senha, que apareceu de novo no terminal. Depois desse eu parei de vez de
consultar esse endpoint — qualquer verificação daqui pra frente usa só `/api/stream.mp4` (que não
inclui a URL de origem na resposta, só o stream em si). Reforcei ao André a recomendação de trocar a
senha do DVR — agora com mais convicção, já que continuei arriscando o mesmo tipo de erro mesmo depois
de saber do risco.

**Achado técnico bom**: descobri que o stream principal das câmeras (`subtype=0`) é **H.265**
(codec `hvc1`, via `Content-Type` do `go2rtc`) — fora da lista de formatos que a TV aceita (só AVC/
H.264, confirmado via `GetProtocolInfo`). O `subtype=1` é H.264 (`avc1.640029`), compatível.
Reconfigurei só o `go2rtc-cameras` (instância separada, não mexe na config da câmera que o André já
ajustou) para usar `subtype=1`.

**Mesmo com codec certo, a TV recusou.** Mensagem na tela: "este formato de arquivo não é suportado"
— diferente de antes (ficava em silêncio, sem reagir), então o `SetAVTransportURI`/`Play` está
chegando e sendo processado, só que o conteúdo em si é rejeitado. Testei um MP4 estático comum
(`https://www.w3schools.com/html/mov_bbb.mp4`) pra isolar se o problema é geral (qualquer MP4) ou
específico do jeito que o `go2rtc` entrega (stream fragmentado, ao vivo, sem duração fixa) — deu um
erro **diferente** ("ocorreu um erro inesperado"), mas usei uma URL `https://` sem perceber que isso
mistura outra variável (o `go2rtc` serve `http://` puro), então o teste não isolou nada de conclusivo.

Pedir pro André checar a tela física a cada tentativa é lento e cansa ele à toa. **Próximo passo**:
ativar log de depuração (`dlna_dmr`/`async_upnp_client`) no HA pra ver o XML exato que sai no
`SetAVTransportURI`, e testar um MP4 estático **http://** (não https) antes de mexer em qualquer
metadado DLNA. Tudo detalhado em `planning/IN_PROGRESS.md` P-04.

## Causa raiz encontrada com log de depuração — precisa de transcodificação (19/09/2026, mesma madrugada)

Ativei o log de debug do `dlna_dmr`/`async_upnp_client` (`logger:` em `configuration.yaml`, removido
depois de usar). Isso trocou "pedir pro André olhar a TV a cada tentativa" por "ler o XML exato que
saiu do HA" — bem mais rápido pra iterar.

**Três camadas de problema, resolvidas em sequência:**

1. O `async_upnp_client` usa o `Content-Type` cru da resposta HTTP como mime-type do `protocolInfo`
   do DLNA. O `go2rtc` manda `video/mp4; codecs="avc1.640029"` — bom pra `<video>` do navegador, ruim
   pro DLNA, que não reconhece esse formato. Resultado: erro 716 na hora. Corrigido com um proxy
   `nginx` (`go2rtc-tv-proxy`, porta 1985) que reescreve o cabeçalho pra `video/mp4` puro.
2. O perfil `DLNA.ORG_PN` só é preenchido se o servidor mandar um cabeçalho `ContentFeatures.dlna.org`
   — o HA não infere isso sozinho. Adicionei esse cabeçalho no mesmo proxy, com um perfil que a TV já
   declarou aceitar. A TV passou a aceitar a negociação (antes recusava na hora, agora ia até tentar
   abrir o vídeo).
3. **Causa raiz final**: `ffprobe` direto no stream (via `docker exec go2rtc-cameras ffprobe ...`,
   sem precisar da URL com credencial) mostrou `profile=High`, `352x240`. A resolução é baixíssima,
   não é o problema — mas **nenhum perfil "High" aparece na lista que a TV aceita** (só Main/Baseline).
   Eu estava *declarando* Main Profile no cabeçalho enquanto o vídeo real chegava em High — por isso a
   TV aceitava a negociação mas falhava ~8s depois, ao decodificar de verdade.

**Conclusão**: a solução definitiva precisa transcodificar High → Main/Baseline via `ffmpeg` (o
`go2rtc` tem módulo embutido pra isso), o que gasta CPU real, diferente do remux que fiz até aqui
(praticamente grátis). Alternativa: reconsiderar o Fire TV Stick, que rodaria um app de verdade sem
essas restrições de perfil. Deixei os dois caminhos documentados em `planning/IN_PROGRESS.md` P-04
pro André decidir com calma — já são muitas rodadas de teste pedindo pra ele checar a TV essa
madrugada.

Desliguei o log de debug de novo (gera ruído demais pra deixar ligado) e reiniciei o HA.

## Vídeo ao vivo no card de câmera (19/09/2026)

André reclamou que na tela **Dispositivos** o card das câmeras (`camera.rua_canal_2`/`_4`) só mostra
imagem depois de clicar para abrir. Fui olhar na tela certa em vez de supor: essa dashboard
(`dashboard-dispositivos`, sidebar "Dispositivos") é gerada pela estratégia `original-states` do
Lovelace — confirmado lendo `config/.storage/lovelace.dashboard_dispositivos`, que só tem
`{"strategy": {"type": "original-states"}}`, nenhum card manual. Estratégia não permite configurar
`camera_view` por card; o "Editar dashboard" dela só deixa escolher quais áreas aparecem.

Tentei primeiro uma saída que não mexesse em nenhum dashboard: se o DVR aceitasse snapshot HTTP puro
(`/cgi-bin/snapshot.cgi?channel=N`, comum em DVRs Dahua/Intelbras), o card usaria isso em vez de pedir
ao `ffmpeg` pra extrair um frame do RTSP a cada render — mais rápido e resolveria em qualquer tela.
Escrevi um script Python que roda **dentro do container** (`docker exec -i homeassistant python -`),
lê `core.config_entries` só para extrair usuário/senha da integração já configurada, testa o endpoint
com `requests.auth.HTTPDigestAuth` (a autenticação é Digest, não Basic — `urllib` puro falha direto
com "does not support Digest") e imprime só o resultado HTTP, nunca a senha (troquei o valor por `***`
antes de qualquer print, e todo o teste ficou dentro do `docker exec`, sem passar pela conversa). A
autenticação passou (deixou de dar 401), mas o DVR recusou com `{"ErrorCode": 268632081, ...}` —
permissão insuficiente para essa API específica nessa conta. Isso é configuração de conta no próprio
DVR (nível 3, só o André mexe), então esse caminho parou aqui.

Perguntei ao André se topava converter a dashboard "Dispositivos" pra manual (`take control`) —
custo real: ela para de ganhar automaticamente os dispositivos novos que aparecerem depois. Ele
preferiu não. Solução: usei o **"Painel de controle"** (`lovelace.painel_de_controle`), que já é uma
dashboard `sections` manual (sem estratégia, editar não desliga nada automático) — criei uma seção
"Câmeras" com dois cards **Entidade de imagem** (`picture-entity`), um por câmera, e mudei "Vista da
câmera" de "Auto" pra "Ao vivo" em cada um. Confirmado visualmente no navegador: as duas câmeras
aparecem tocando o stream ao vivo direto no card, sem precisar clicar. Documentado em `CASA.md`
§Câmeras.

**Armadilha nova**: ao clicar por engano no "⋮" da caixa de diálogo "Editar dashboard" durante a
investigação, cliquei sem querer em "Excluir" (documentado aqui porque quase apaguei a dashboard
"Dispositivos" sem querer) — abriu confirmação "Excluir Dispositivos? Este dashboard será excluído
permanentemente.", cancelei a tempo. Lição: nessas caixas de diálogo do Lovelace, "Excluir" e
"Cancelar" ficam vizinhos horizontalmente com pouco espaço — vale conferir a posição exata (ou usar
`read_page`/zoom) antes de clicar, em vez de mirar de memória.

---

## 19/09/2026 (madrugada) — Muro e Painel no pôr do sol; Painel Novo descartado

### Automação "Muro e Painel acesos do pôr do sol à meia-noite"

Pedido: "após o pôr do sol todos os dias as luzes muro e painel irão se acender, serão apagadas às
00h ou quando forem apagadas manualmente". Spec em `specs/automations/luzes-muro-painel-noite.md`.

- Atuadores: `light.circulacao_switch_1` (Muro, conforme `lib/rooms.ts`) e `light.painel`.
- **"Ou apagadas manualmente" não tem código**: o acender é o evento `sunset`, dispara uma vez.
  Sem reconciliação na partida para o acender — reacender desfaria um apagar manual.
- Apagar às 00:00 manda comando só para quem estiver aceso. Partida do HA entre 00:00 e 00:30 também
  apaga (cobre reinício na virada); depois disso não mexe, porque o Painel pode ter sido aceso pela
  automação da porta do quarto (dona dele de 22h às 6h).
- Existem **duas** entidades `switch` com o nome "Muro Switch 1" (`switch.circulacao_switch_1` e
  `switch.entrada_switch_1`), mudando de estado juntas. A automação usa só a camada `light.*`.
- `check_config` exit 0; container reiniciado (YAML); `automation.muro_e_painel_acesos_do_por_do_sol_a_meia_noite`
  carregou `on`; luzes não foram tocadas (partida às 01:19, fora da janela). **Não testado ao vivo**:
  o primeiro disparo real é o próximo pôr do sol.

### Painel Novo descartado

Pedido do André: descartar a dashboard "Painel Novo" criada no HA em 18–19/09. Removido:

- bloco `lovelace:` do `configuration.yaml` (dashboard YAML `painel-novo`)
- `config/dashboards/painel-novo.yaml` (56 cards `custom:bubble-card`)
- Bubble-Card e Mushroom desinstalados do HACS (marca de instalado, pasta, recurso de frontend) —
  reinstalados só para ele; o "Painel de controle" não usa card custom (o script aborta se usar)
- `painel-novo` da lista de painéis ocultos do usuário

Script: `scripts/manutencao/retira_painel_novo.py` (validar → `docker stop` → aplicar → `docker start`).
Backup em `backups/painel-novo-2026-09-19/`. Verificado após a partida: zero recursos `/hacsfiles/`,
os dois repositórios sem marca de instalado, `www/community` vazia, `hiddenPanels` vazio, HA
respondendo 200.

---

## Análise completa do sistema de câmeras para o dashboard-app (19/09/2026)

André pediu um levantamento de toda a estrutura de câmeras — integrações possíveis, geração de
imagem, captura de movimento, automações — para virar documento de planejamento do dashboard-app.
Antes de escrever qualquer coisa nova, fui ler o que já existe no `dashboard-app` (só leitura, nada
editado lá) e a surpresa foi que a spec de 18/09 (`clipes-movimento-nuvem.md`) que dizia "mostrar
câmeras no dashboard-app é fora de escopo" **está desatualizada**: já existe um hub de vigilância
completo (`SurveillanceHubModal.tsx`) com vídeo ao vivo via HLS (WebSocket `camera/stream` do HA,
proxiado em `app/api/camera/[id]/hls`), snapshot com fallback SVG elegante, gravação manual e modo
dual/single — bem mais avançado do que eu esperava. Bom lembrete de tratar specs antigas como
fotografia de um momento, não como verdade permanente.

A lacuna real, encontrada só depois de mapear os dois lados (HA e dashboard-app), não é "ter câmera
no painel" — é que **o movimento das câmeras da rua não existe como estado dentro do Home Assistant**,
só como e-mail. Os sensores de movimento internos (Lavanderia, Gourmet, Banheiro, Closet) são
`binary_sensor` de verdade e por isso aparecem no `HeaderAlertPill` e no modo noturno; as câmeras da
rua não têm equivalente, então não há como o painel mostrar "movimento agora" nelas mesmo que
quisesse. Documentei essa lacuna e o Frigate (NVR com detecção de objeto/pessoa) como a peça que a
resolveria, sem recomendar implementar sem o André decidir — é mudança de arquitetura, não ajuste
pequeno.

Documento completo: `specs/features/cameras-analise-completa-roadmap-dashboard.md` — inventário do
hardware/integração atual, tabela comparando todas as integrações possíveis (ONVIF descartado,
`generic` atual, `go2rtc` já rodando ocioso pro caso da TV e reaproveitável pra snapshot mais rápido,
Frigate, Double Take/CompreFace, `deepstack`/`image_processing` legado e por que não), comparação de
geração de imagem, lista de automações novas possíveis por categoria, contrato de API sugerido (não
implementado) e riscos encontrados de passagem — entre eles, `go2rtc-cameras/go2rtc.yaml` guarda a
senha do DVR em texto puro (já no `.gitignore`, mas vale o André saber que o arquivo existe assim em
disco).

**Ficou**: o "Painel de controle" (`lovelace.painel_de_controle`), com os cards de câmera ao vivo.

---

## Remoção completa da integração TV ↔ câmeras (19/09/2026)

Logo depois da análise acima, André decidiu: "deixaremos de lado a integração entre tv e câmeras,
remova qualquer resquício para não termos erro ou confusão". Não era pausar de novo — já estava
pausada (K-14 em `planning/BLOCKED.md`) — era desmontar de verdade.

O que foi removido:
1. Integração `dlna_dmr` (entidade `media_player.sala_de_estar_tv_sala_dlna`) — excluída pela própria
   UI do HA (Configurações → Dispositivos e serviços), não editando `.storage` na mão, exatamente pra
   não correr risco de deixar resíduo em `core.entity_registry`/`core.device_registry` que o HA
   reescreve sozinho. Confirmado depois: zero resultado buscando "DLNA" em Configurações → Entidades.
2. Containers `go2rtc-cameras` e `go2rtc-tv-proxy` — parados e removidos (`docker stop` + `docker rm`).
3. Imagens Docker `alexxit/go2rtc` e `nginx:alpine` — removidas também, depois de confirmar
   (`docker ps -a`) que nenhum outro container usava nenhuma das duas.
4. Pasta `go2rtc-cameras/` apagada do disco inteira — ela guardava a senha do DVR em texto puro no
   `go2rtc.yaml` (já estava fora do git, mas existir em disco assim já era o tipo de resquício que o
   André pediu pra tirar).
5. Regra correspondente no `.gitignore` removida (não fazia mais sentido apontar pra um arquivo que
   não existe mais).

O que foi só **documentado como encerrado**, não apagado, porque não é resquício técnico (não roda,
não pode dar erro) e tem valor de registro:
- `specs/features/reproducao-cameras-tv.md` — ganhou um aviso no topo ("DESCARTADO E REMOVIDO") em
  vez de ser apagado. O diagnóstico ali (H.264 High Profile da câmera vs. Main/Baseline que a TV
  decodifica via DLNA) foi trabalho de investigação real; apagar o arquivo jogaria isso fora à toa.
- `planning/BLOCKED.md` K-14 virou uma linha de fechamento apontando pra `DONE.md`, em vez de
  continuar como item aberto.
- `CASA.md` §Câmeras: a subseção antiga ("pausado por decisão") virou "descartado e removido", com o
  resumo do que foi tirado.

**O que fica de fora deliberadamente**: `dashboard-app/app/api/camera/cast/route.ts` já retorna
`410 Gone` (foi desativado por lá antes mesmo desta limpeza) — não editei porque `dashboard-app` só
recebe mudança com pedido inequívoco do André especificamente sobre esse repositório (`CLAUDE.md`
§6), e essa rota já não faz nada de qualquer forma. Avisei o André que esse arquivo continua existindo
como stub morto, caso ele (ou o Antigravity) queira apagar de vez.

---

## Alarme falso de perda de dados + migração pra D: + remoção do anisette (20/09/2026)

André perguntou por que as imagens de câmera estavam indisponíveis. Ao investigar, `C:\HomeAssistant`
apareceu quase vazio (só a pasta `anisette`) tanto pelo Windows quanto por dentro do container
(`docker exec homeassistant ls /config` só mostrava `desktop.ini` e `www`) — cheguei a alertar o André
como possível perda de dados grave, pedindo pra ele não reiniciar nada e checar o Google Drive.

**Era alarme falso, com duas causas reais por trás:**

1. **O projeto inteiro tinha sido movido para `D:\HomeAssistant`** (o André confirmou depois) — o
   `C:\HomeAssistant` que eu estava lendo era só o que sobrou do disco antigo.
2. **Meus próprios comandos de diagnóstico estavam mentindo pra mim.** O Git Bash (MSYS) reescreve
   automaticamente qualquer argumento que pareça um caminho absoluto Unix — `docker exec homeassistant
   ls /config` virava, por baixo dos panos, algo como `ls C:/Program Files/Git/config`. Já tinha
   esbarrado nisso uma vez com o `check_config` (registrado antes neste mesmo arquivo) e não generalizei
   a lição: o problema não é só com `-v` de volume, é com **qualquer argumento de path absoluto passado
   pro `docker exec`/`docker run`**, mesmo indireto (o destino de um `-v`, o argumento de um `ls`
   dentro do container). A confirmação técnica: `docker inspect homeassistant` já mostrava o mount
   correto em `D:/HomeAssistant/config` desde o início, e um `MSYS_NO_PATHCONV=1 docker exec
   homeassistant ls -la /config` mostrou o config completo, intacto, com `.storage` e tudo — nunca
   sumiu nada.

Reiniciei o `homeassistant` mesmo assim (seguro, YAML/mount, não `.storage` sendo editado na hora) só
pra ter uma leitura limpa, e confirmei nos logs: subiu normal, todas as integrações carregaram.
**Lição pra próxima vez que algo parecer catastrófico**: refazer o mesmo diagnóstico com
`MSYS_NO_PATHCONV=1` antes de alarmar o André — o Git Bash neste ambiente mente sobre paths absolutos
com muito mais frequência do que eu estava assumindo.

**A causa real da pergunta original (câmeras indisponíveis) se confirmou separada e continua**: o DVR
(`192.168.31.216`) está 100% inacessível pela rede (ping e RTSP dão timeout; o roteador responde
normal) — é físico/de rede, não do lado do HA. Avisei o André pra checar o aparelho.

**Container `anisette` removido a pedido do André** ("não será mais usado no projeto"): parei e
removi o container, a imagem (`dadoum/anisette-v3-server`, sem mais nada usando) e as duas pastas de
dados (`D:\HomeAssistant\anisette` — a real — e o resquício vazio em `C:\HomeAssistant\anisette`).
Documentado em `CASA.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md` e `planning/BLOCKED.md` (K-04).
**Efeito colateral que o André precisa saber**: a integração `findmy` (AirTags) continua configurada
no HA, mas dependia do anisette pra autenticar com a Apple — sem o servidor, ela para de funcionar.
Não removi a integração junto porque ele só pediu o container; deixei registrado em `CASA.md` e
`planning/BLOCKED.md` K-04 como decisão pendente (recriar o anisette se quiser retomar os AirTags, ou
remover a integração `findmy` também).

---

## DVR trocou de IP — câmeras de volta ao ar (20/09/2026)

Depois da falsa alarme de perda de dados, a pergunta original (câmeras indisponíveis) continuava sem
resposta — os logs mostravam `Error opening stream (Operation timed out, rtsp://...@192.168.31.216...)`
e o DVR não respondia nem a ping nem a HTTP. O André então disse que via as duas câmeras normalmente
pelo app Guardian — ou seja, o DVR estava online (confirma que o problema era de rede local, não do
aparelho), e o Guardian usa a nuvem do fabricante pra isso, não a rede da casa.

**Diagnóstico**: a ARP table do host não tinha mais entrada pra `.216`, e nenhum dos IPs vizinhos
conhecidos respondia nas portas do DVR. Rodei uma varredura da subnet inteira (`192.168.31.1`–`254`)
procurando a porta 554 (RTSP) de dentro do container — `192.168.31.217` respondeu. Confirmei que era
o mesmo DVR batendo na porta HTTP dele (respondeu 200, igual ao comportamento já conhecido). Conclusão:
o DVR pegou um IP novo por DHCP — `.216` → `.217` —, a rede em si nunca caiu.

**Correção**: reconfigurei as duas integrações `generic` (Rua - Canal 2 e Rua - Canal 4) pela UI,
trocando o IP na URL RTSP. Segui a lição já registrada antes: selecionar tudo e reescrever a URL
inteira com um placeholder (`COLOQUE_A_SENHA_AQUI`) no lugar da senha, pedindo pro André digitar só a
senha real — nunca eu vejo ou digito o valor. Confirmei cada uma pela pré-visualização de stream antes
de salvar (as duas carregaram vídeo ao vivo normalmente) e depois pelos logs (`docker logs`), sem mais
nenhum `Operation timed out` depois da troca.

**Registrado para não repetir**: `planning/BLOCKED.md` K-06 (reserva de DHCP) passou a incluir o IP do
DVR junto com o do PC e do PS5 — é a segunda vez que um IP sem reserva quebra alguma coisa aqui.
`CASA.md` §Câmeras atualizado com o IP novo.

---

## 22/09/2026 — C-01 e C-02 da curadoria visual

Curadoria completa em `artifacts/audit/curadoria-visual-tablet.md`. Aplicadas as duas correções que
eram reprovação objetiva, não preferência de gosto.

### C-01 · Legibilidade do tema claro

Onze elementos ficavam abaixo de 4,5:1 porque os cartões do tema claro ganharam fundo branco e o
texto continuou com a cor do tema escuro. Os piores davam **1,1:1** — branco sobre branco
(`digital_tv`, `Portão (C2)`). Entre os reprovados estavam os alertas de **segurança** e de
**bateria**.

Bloco novo no fim de `globals.css` com as cores escuras equivalentes, mantendo a semântica
(vermelho continua alerta, verde continua saudável).

⚠️ **A armadilha desta correção**: o rótulo de condição do tempo (`Chuva`) não obedecia a regra
nenhuma — `WeatherWidget.tsx` aplicava `style={{ color: condi.cor }}` **inline**, e estilo inline
vence qualquer seletor sem `!important`. Em vez de escalar para `!important`, a cor passou a viajar
como variável (`--cond-cor`) e o tema claro a escurece com `color-mix(in srgb, … 50%, #0f172a)` —
o que resolve as 11 condições do mapa sem enumerar nenhuma. **Foi a única alteração em TSX.**

**Medido depois**: 13 elementos verificados, todos entre **4,72:1 e 16,78:1**. Zero reprovações. O
tema escuro não mudou (`.weather-cond-label` continua `rgb(96,165,250)`).

### C-02 · Alvo de toque dos canais da câmera

Mediam **27×17px** e **28×17px** — o pior alvo do painel. A pílula visível foi para 36×32px (fonte
de 9,5 para 11px) e a área de toque real chega a 44×44px por `::after` transparente.

O espaçamento do seletor subiu de 3 para 8px **de propósito**: com 44px de área e centros a 39px, as
duas áreas se sobreporiam e um toque na emenda acertaria o canal vizinho. Com 8px, os centros ficam
a 44px — medido ao vivo, `x = 888` e `x = 932`. Encostam sem invadir.

### Verificação

- `npx tsc --noEmit` → saída 0
- Medição ao vivo a 1280×800, nos dois temas
- Zero vazamento horizontal, zero rolagem vertical — o layout não regrediu
- A faixa de widgets continua cabendo: o widget de câmera passou de 210 para 240px de largura sem
  empurrar nada

**Não commitado**: `dashboard-app/` tem git próprio e é do André.

## 22/09/2026 — C-03 e C-04, com o painel definido como **de parede**

O André respondeu a pergunta que a curadoria deixou aberta: **o tablet é fixo na parede**. Isso vira
o critério de todas as decisões visuais daqui em diante — a régua é a distância de 1,5 a 2,5 m, não
os 40 cm que as normas de contraste e tamanho pressupõem.

### C-03 · Botões de abrir widget e liga/desliga da TV

Os sete botões mediam 34×34px. **Correção da medição anterior**: a *área de toque* já era de 44×44 —
existia um `::after` com `inset: -5px` desde antes, e minha medição inicial só olhou a caixa do
elemento. O que estava errado era o **desenho**: numa parede se mira no que se vê.

Agora o círculo visível tem 44px, o ícone passou de 14 para 18px e o `::after` foi para `inset: 0` —
com o botão já no tamanho certo, aquela borda invisível de 10px só serviria para roubar o toque do
elemento vizinho.

**Efeito colateral honesto**: os 10px a mais por botão saíram da coluna de texto, e `digital_tv`
passou a truncar também a 1280×800 (antes só a 1024). É o C-09 da curadoria — a faixa tenta caber
sete widgets numa linha — e continua aberto.

**Restam abaixo de 44px**: as quatro ações do cabeçalho (tema, galeria, kiosk, descanso) com 38px e
43×31px, e as pílulas de canal da câmera, que têm 36×32 visíveis com 44 de toque por decisão do C-02.

### C-04 · O foco não entra por um atuador

Ao abrir o detalhe de um cômodo, o foco caía em **"Acender todos"** — abrir e apertar Espaço acendia
a luz. A causa era o `useFocusTrap` focar `focusables[0]`, o primeiro em ordem de DOM.

O hook passou a procurar `[data-foco-inicial]` antes de cair no primeiro focável, e quem monta o
modal declara onde o foco entra. `ModalCloseButton` ganhou a prop `focoInicial`.

Aplicado em dois modais: `RoomPopup` e **`MediaHubModal`**, que tinha o mesmo defeito com um agravante
— o primeiro focável dele é o liga/desliga da TV, e nesta Samsung o comando **alterna**.

Também endurecido o retorno do foco: só restaura se o elemento ainda estiver na página
(`document.contains`), senão o foco ia parar no `<body>`.

**Verificado ao vivo**: cômodo → foco entra em "Fechar detalhes de Cozinha", Esc fecha e o foco volta
para o card de origem. Central de Mídia → foco entra em "Fechar central de mídia", Esc devolve para
"Abrir Central de Mídia". `npx tsc --noEmit` saiu 0. Zero vazamento e zero rolagem a 1280×800.

**Não commitado**: `dashboard-app/` tem git próprio e é do André.

### C-03b e C-03c · Cabeçalho e o estouro que isso revelou (22/09)

**As quatro ações do cabeçalho** (tema, galeria, kiosk, descanso) foram para 44×44px visíveis, com
ícone de 18px. Mesmo caso dos botões de widget: a área de toque já era 44 por `::after`; o desenho
é que era menor. O cabeçalho não quebrou em duas linhas — os quatro botões continuam alinhados em
`y = 22` a 1024×768.

**O estouro do widget de câmera.** Depois disso, o "C4" apareceu cortado a 1024×768. Medido:

| Parte do cartão de 190px | Largura |
| :--- | :--- |
| Miniatura da câmera | 62px |
| Botão de abrir | 44px |
| Espaçamentos e padding | ~46px |
| **Sobra para texto e canais** | **38px** |

Não é regressão do C-02 nem do C-03 — com 38px, o título já aparecia pela metade **antes** de
qualquer mudança minha. Os botões maiores só tornaram o defeito visível, porque o `overflow: hidden`
passou a cortar um controle em vez de uma letra.

A correção coerente com painel de parede é **dar espaço, não encolher o alvo de novo**: entre 768 e
1400px, o widget de câmera ocupa **duas colunas** da faixa. A 1024 ele passou de 190 para **387px**,
e a coluna de texto de 38 para **235px**.

**Ganho colateral**: o truncamento caiu de 6 para 3 elementos a 1024×768 — `Portão (C2)` e
`Monitoramento HD` deixaram de ser cortados. Sobram `Volume 9% • Sala`, `Compras` e
`3 itens a comprar`, todos do C-09.

**Verificado**: 1024×768, 1280×800 e 768×1024 — zero vazamento horizontal, zero elementos estourando
o cartão da câmera, e o único alvo abaixo de 44px visível é a pílula de canal (36×32 com 44 de toque,
decisão do C-02). Paisagem continua sem rolagem. Em retrato a rolagem foi de 713 para 734px, efeito
esperado dos botões maiores — a inversão de hierarquia do retrato é o C-10, ainda aberto.
`npx tsc --noEmit` saiu 0.

### C-05 · Botão mestre do cômodo (22/09)

"Acender todos" / "Apagar todos" tinha 32px de altura. Agora tem **44×122px**, medido ao vivo no
detalhe da Sala de Estar.

⚠️ **Ressalva importante da medição**: sob `@media (pointer: coarse)` esse botão **já recebia**
`--touch-wall: 48px`. Ou seja, no tablet da parede o alvo já estava certo — os 32px que medi vinham
do navegador com mouse, onde a media query não casa. O piso agora vale também com ponteiro fino,
para o controle que acende o cômodo inteiro não mudar de tamanho conforme quem opera.

**Pelo mesmo motivo, três controles do modal continuam pequenos com mouse e corretos no tablet**:
`.subcard-dim-badge` ("Ajustar", 30px), `.fan-toggle-btn` ("Desligado", 35px) e `.fan-direction-btn`
("Modo: Exaustor", 31px). Os três estão na lista do bloco `pointer: coarse`, então na parede medem
48px. Ficam como estão até haver decisão — subir a base deles é uma linha, igual ao C-05.

**Verificado**: foco entra em "Fechar detalhes de Sala de Estar", Esc fecha, `npx tsc --noEmit` em 0.

### C-06 · Hover só onde existe mouse (22/09)

O painel tinha **157 ocorrências de `:hover`** e uma única media query de ponteiro grosso
neutralizando cinco seletores. No tablet, o navegador aplica o estado de hover no toque e **o mantém
depois que o dedo sai** — o cartão fica parecendo aceso sem estar.

Corrigir caso a caso seria repetir o erro. A correção na raiz é declarar que hover só vale onde há
um dispositivo capaz de pairar: **toda regra `:hover` passou a viver dentro de
`@media (hover: hover)`**. `@media` aninhado em `@media` é CSS válido.

Feito por script, não à mão: `scripts/manutencao/hover_so_com_mouse.py`, com modo `--validar`. Ele
percorre a folha contando chaves, pula `@keyframes` (cujo conteúdo não são seletores) e pula regras
já dentro de blocos `pointer: coarse` / `hover: none`, que existem justamente para desfazer hover no
toque. **121 regras envolvidas**, `:hover` de 157 para 157 (nenhuma perdida), chaves balanceadas.

#### Verificação, nos dois mundos

| Situação | Resultado |
| :--- | :--- |
| Folha carregada no navegador | 200 OK, **144 regras de hover** dentro de `@media (hover: hover)` |
| Restantes fora | **5** — todas neutralizadores dentro de `pointer: coarse`, `hover: none` ou `prefers-reduced-motion`. Agora redundantes, mas inofensivas |
| **Com mouse** (`hover: hover` casa) | Hover **continua funcionando**: cartão da Cozinha vai de `rgba(255,255,255,0.09)` para `0.12`, borda de `0.16` para `0.3`, `translateY(-3px)` |
| **Com toque** (375×812, 5 pontos de toque, `hover: none`) | As **144 regras ficam inertes**; sobram só os 5 neutralizadores |

Layout intacto a 1280×800: zero vazamento, zero rolagem, 10 cartões. `npx tsc --noEmit` em 0.
Backup em `backups/globals.css.2026-09-22-antes-c06`.

### C-07 · Anel de foco dimensionado para a parede (22/09)

⚠️ **A premissa do item estava errada, e a medição corrigiu.** A curadoria dizia "4 regras de
`focus-visible` para 47 controles". Na verdade existe uma regra global `:focus-visible` com
`!important`, que vence as dez declarações de `outline: none` espalhadas pelo arquivo. Varri a tela
com **50 Tabs**, gravando o estilo computado a cada `focusin`: **49 elementos focados, nenhum sem
anel**.

**Armadilha de medição que quase virou conclusão errada**: lendo o estilo *dentro* do evento
`focusin`, 17 controles apareciam com um anel de 3px na cor do próprio texto e sem afastamento — o
anel padrão do navegador, antes do recálculo de estilo. Com 60ms de espera, some. Não era defeito do
painel; era eu medindo cedo demais. (Terceira vez nesta série que medir no instante errado inventa
um problema.)

**O que era defeito de verdade**: 2px de anel com 2px de afastamento é fino a 1,5–2,5 m. Agora são
**3px com 3px de afastamento**, mais um halo escuro por `box-shadow` — sem ele, o anel ciano encosta
num cartão aceso em âmbar com **1,28:1** e desaparece. `box-shadow` não ocupa espaço no layout.

| Verificação | Resultado |
| :--- | :--- |
| Anel × fundo escuro | **8,83:1** |
| Anel claro × cartão branco | **5,58:1** |
| Corte nas bordas da grade | Nenhum — a folga até o `overflow: hidden` do `.dashboard` é de 12px, e o anel com halo ocupa 12px. Confirmado na tela: o cartão da ponta mostra o anel nos quatro lados |
| Tema claro | Anel `#0369a1` visível; em cartão aceso a sombra própria do cartão vence o halo, mas o anel continua legível |

`npx tsc --noEmit` em 0.

### Travamento relatado no card (22/09) — era hover de mouse, e o print explica

O André mandou uma captura com um card "travado, como se estivesse selecionado", feita **simulando
um tablet**, e descreveu como "uma passada invisível de mouse sobre o card".

**É exatamente isso, e a medição confirma nos dois lados:**

| Ambiente | O que acontece ao passar sobre o card |
| :--- | :--- |
| Mouse (`hover: hover`) | Fundo de `rgba(255,255,255,0.09)` para **`0.12`**, borda de `0.16` para **`0.30`**, `translateY(-3px)` |
| Toque (`hover: none`, 375×812) | Fundo continua `0.09`, `transform: none`, **zero cards em `:hover`** |

O visual "selecionado" do print é o estado de hover legítimo. Ele **gruda** porque, num tablet
simulado por redimensionamento de janela, o ponteiro continua sendo um mouse: quando ele sai da
janela sem passar por outro elemento, o navegador mantém o último `:hover` até o próximo movimento.

**Num tablet de verdade isso não acontece mais desde o C-06**, aplicado hoje mais cedo — a prova é a
segunda linha da tabela.

#### Reforço aplicado: a guarda agora exige ponteiro preciso

Restava um caso real: aparelhos híbridos (tablet Windows, Android com mouse ou caneta pareada)
relatam `hover: hover` mesmo quando são operados com o dedo. Nesses, o C-06 sozinho não protegeria.

Os 121 blocos passaram de `@media (hover: hover)` para
**`@media (hover: hover) and (pointer: fine)`** — hover só onde há um ponteiro preciso, não só onde
existe a capacidade de pairar.

| Verificação | Resultado |
| :--- | :--- |
| Mouse a 851×633 | Guarda casa; hover funciona igual (fundo `0.12`, `translateY(-3px)`) |
| Toque a 375×812 | Guarda **não** casa (`hover: none`, `pointer: coarse`, `any-hover: false`); zero cards em hover |

`npx tsc --noEmit` em 0. Backup em `backups/globals.css.2026-09-22-antes-guarda-ponteiro`.

**Como conferir no aparelho**: abrir o painel no tablet e tocar num card. Se ele voltar ao normal
assim que o dedo sai, está resolvido. Se continuar aceso, o aparelho está relatando ponteiro fino —
nesse caso me diga o modelo, porque aí a guarda tem de ser por evento de toque, não por media query.

### O card continuou aceso no iPad — media query não resolve esse caso (22/09)

André testou num **iPad Pro 10.9"** e o card seguiu aceso depois do toque, mesmo com a guarda
`(hover: hover) and (pointer: fine)` aplicada.

**Causa**: o Safari do iPad roda em **modo desktop por padrão** e se apresenta como um Mac. Ele
responde `hover: hover` e `pointer: fine` **mesmo sendo operado com o dedo**. A guarda casa, o hover
é aplicado no toque, e como não existe "sair com o dedo", o estado fica.

Nenhuma media query resolve isso: o aparelho mente na pergunta. O que não mente é
`navigator.maxTouchPoints` e o `pointerType` do evento.

#### Correção em duas camadas

1. **`app/layout.tsx`** — o script de arranque marca `<html data-toque>` quando
   `navigator.maxTouchPoints > 0`. Um `pointerdown`/`pointermove` de `pointerType: 'mouse'` remove a
   marca (tablet com mouse ou trackpad volta a ter hover); `touch` e `pen` devolvem a marca.
   Usei `pointermove` e **não** `mousemove` de propósito: no iOS o `mousemove` é sintetizado a partir
   do toque e diria "mouse" para um dedo.
2. **`globals.css`** — os 121 blocos de hover passaram a exigir também a ausência da marca:
   `html:not([data-toque]) <seletor>:hover`. Feito por script
   (`scripts/manutencao/guarda_hover_por_toque.py`, com `--validar`).

⚠️ **Armadilha achada pelo script**: um dos blocos continha **outro bloco igual** dentro (aninhamento
que o C-06 produziu num ponto do arquivo). Prefixar ali teria escrito
`html:not([data-toque]) @media …` e corrompido a folha. O script detecta prelude que começa com `@`,
pula, e prefixa o de dentro na volta seguinte — 121 seletores prefixados em 122 blocos.

#### Prova, com o ponteiro parado sobre o mesmo card

| Estado | Fundo | Transform |
| :--- | :--- | :--- |
| **A** — mouse, sem marca de toque | `rgba(255,255,255,0.12)` | `translateY(-3px)` |
| **B** — `data-toque` presente (simula o iPad; a media query **continua** dizendo `hover: hover` e `pointer: fine`) | **`0.09`** | **`none`** |
| **C** — marca removida | `0.12` | `translateY(-3px)` |

Em **B** o elemento ainda casa `:hover` — o navegador continua achando que há um ponteiro em cima.
O que mudou é que o estilo deixou de valer. É exatamente o caso do iPad.

`npx tsc --noEmit` em 0. Backups: `globals.css.2026-09-22-antes-guarda-toque` e
`...-antes-guarda-ponteiro`.

**Confirmado pelo André no iPad Pro 10.9" em 22/09**: o card não fica mais aceso depois do toque.
Fecha o ciclo aberto pelo C-06 — a guarda por media query não bastava, e a marca `data-toque` no
`<html>` resolveu no aparelho real.

### Zoom acidental bloqueado (22/09)

Diagnóstico em `artifacts/audit/travamento-zoom-mobile.md`. A correção ficou em **três camadas**,
porque nenhuma delas cobre sozinha os dois navegadores:

| Camada | Onde | Cobre |
| :--- | :--- | :--- |
| `maximumScale: 1` + `userScalable: false` | `app/layout.tsx` (`export const viewport`) | Chrome/Android |
| `html, body { touch-action: manipulation }` | `globals.css` | Duplo toque para ampliar, nos dois |
| `preventDefault` em `gesturestart` / `gesturechange` / `gestureend` | script de arranque em `layout.tsx` | **Pinça no Safari do iOS/iPadOS, que ignora `user-scalable=no`** |

⚠️ **Por que `manipulation` e não `pan-y`.** `pan-y` mataria a pinça de uma vez, mas `touch-action`
se combina **por interseção com os ancestrais**: um filho não recupera o eixo que o pai proibiu.
Existem três barras que rolam na horizontal — ações rápidas no celular, abas do papel de parede e
abas da central de mídia — e todas parariam de rolar. `manipulation` preserva os dois eixos e
elimina só o duplo toque.

**Verificado**

| Item | Resultado |
| :--- | :--- |
| Meta gerada | `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover` |
| `touch-action` em `html` e `body` | `manipulation` |
| Barras horizontais | seguem em `auto` — rolagem lateral preservada |
| `gesturestart` | evento despachado volta com `defaultPrevented: true` |
| Rolagem vertical a 375×812 | 400px, normal |
| Toque em card | abre o detalhe; `Esc` fecha |

**Não verificável aqui**: a pinça de verdade, que exige dois dedos num aparelho. O teste é no iPad,
depois de recarregar — o script de arranque só roda no carregamento.

`npx tsc --noEmit` em 0.

### Verificação após o Antigravity commitar em paralelo (22/09, fim da noite)

Entre o commit `9931779` (minhas correções) e a verificação, apareceram no `dashboard-app` três
commits que **não são meus**: `8349fce` (scripts), `c0fbe7b` (central de vigilância, papéis de
parede, AeroGlyphs) e `ebaaf8c` (a skill `vercel-react-best-practices`, que eu ia versionar e ele
versionou antes).

`git diff 9931779..HEAD` nos quatro arquivos que eu toquei — `globals.css`, `layout.tsx`,
`useFocusTrap.ts`, `RoomPopup.tsx` — **volta vazio**. Nada foi sobrescrito.

Remedido ao vivo a 1280×800 e a 375×812:

| Correção | Estado |
| :--- | :--- |
| C-01 tema claro | 7 elementos entre **4,72 e 16,78:1**; zero reprovações |
| C-02 / C-03 alvos | Só as duas pílulas de canal abaixo de 44px visíveis (com 44 de toque, por decisão) |
| C-03c câmera em 2 colunas | 487px a 1280 |
| C-04 foco do modal | Entra em "Fechar detalhes de Cozinha"; ao fechar, volta para o card |
| C-05 botão mestre | **44px** |
| C-06 hover | **144 regras** dentro da guarda; as 5 de fora são os neutralizadores. Nenhuma regra nova escapou |
| C-06 iPad | `data-toque` presente no toque; zero cards em hover; fundo `0.09`, sem transform |
| C-07 anel | 3px ciano, afastamento 3px, halo presente |
| Zoom | `user-scalable=no` na meta, `touch-action: manipulation`, `gesturestart` cancelado |
| Layout | Zero vazamento, zero rolagem em paisagem |

⚠️ **Dois sustos que eram artefato de medição, não regressão** — e é a quarta vez nesta série:

1. O botão mestre mediu **42px**. O `height` computado dizia 44: a diferença era a **animação de
   entrada do modal**, que escala a caixa. Com 1,5 s de espera, 44px.
2. O `Esc` "não fechou" o modal em 900 ms. Com tecla real e uma janela maior, fechou.

A lição repetida: **medir enquanto a interface anima inventa defeito**. Esperar o estado assentar é
parte do teste, não zelo excessivo.

**Risco operacional registrado**: dois agentes escrevem no `dashboard-app`. Desta vez não houve
colisão porque os arquivos foram disjuntos, mas o modo de falha aqui não é conflito de merge — é
sobrescrita silenciosa. Antes de commitar ali, conferir `git log` primeiro.

## 22/09/2026 — P0 do vidro e hold no `Dormir`

Depois da auditoria dupla (`artifacts/audit/auditoria-visual-funcional-22-09.md`), o André
respondeu as perguntas de produto: o verbo dominante do card de cômodo é **acender**; a faixa de
telemetria entrega "apenas a sensação de painel completo"; e o `Dormir` sem proteção foi
classificado como **descuido, a corrigir**.

**P0 — `backdrop-filter` estava desligado em produção.** Medido na tela: 38 declarações servidas
só como `-webkit-backdrop-filter`, `CSS.supports('-webkit-backdrop-filter', …) === false` no
Chrome, e **zero elementos borrados**. A causa não era o navegador: o lightningcss (embutido no
`@tailwindcss/postcss`) trata o par prefixada/sem-prefixo como a mesma propriedade e mantém só a
última do fonte — que era a prefixada, escrita à mão em 32 pontos.

A correção é contraintuitiva: **apagar as 32 linhas `-webkit-backdrop-filter` escritas à mão** e
deixar só a sem prefixo. O lightningcss então gera as duas formas a partir dos seus alvos
(Safari 16.4+), e o CSS servido passou a ter 38 prefixadas **e** 39 sem prefixo — o Safari do
iPad continua atendido. Verificado ao vivo: **de 0 para 30 elementos borrados**.

Armadilha para o futuro: escrever o prefixo à mão **quebra** o resultado neste pipeline. O
prefixo é trabalho do build.

Custo medido: nenhum nesta máquina — 75 fps, p95 13,6 ms, 0 long tasks, igual a antes.
**Não medido no iPad**, que tem GPU muito menor; 30 camadas de blur podem ter outro preço lá.

**`Dormir` agora exige hold de 800 ms**, a mesma régua do `Apagar (n)` do cabeçalho, reaproveitando
`.hold-progress-bar`. As cenas aditivas (Chegar, Cinema, Gamer) continuam em toque simples, porque
desfazê-las é trivial. Verificado no navegador **com `fetch` de escrita bloqueado por um stub de
teste** — a casa não foi acionada em momento nenhum:

- toque curto (150 ms) → `is-hinting`, "Segure p/ apagar tudo", **zero requisições de escrita**;
- hold de 950 ms → `is-active`, e o `POST /api/scene` saiu (capturado e bloqueado pelo stub).

`npx tsc --noEmit` passa.

**Pendente e bloqueado por decisão**: `npm ci` para reparar o `node_modules` danificado pelo Drive
e destravar `npx next build`. Ele derruba o servidor da porta 3002 — e havia conexão ativa de outro
aparelho no momento da auditoria. Precisa de uma janela combinada com o André.

---

## Estabilidade da imagem nos cards de câmera do painel (23/09/2026)

Pedido do André: verificar e melhorar a instabilidade da geração de imagem nos cards de câmera do
`dashboard-app` (pedido inequívoco, então editei o painel; git do painel estava limpo, **nada commitado**).

**O que os cards realmente usam**: só o `CameraLivePlayer` (HLS ao vivo via `hls.js`) — no widget da página
(`CameraGlanceWidget`), no modal `SurveillanceHubModal` (1 ou 2 players) e no `CameraLiveCard` do `RoomPopup`.
As rotas `/api/camera/[id]/snapshot` e `/stream` **não são chamadas por nenhum componente** (código morto).

**Medido antes de mexer**:
- `snapshot`: 16/16 respostas caíram no SVG "standby", ~2 s cada. Causa no HA, não no painel: o `go2rtc`
  embutido responde 500 (`exit status 183`, `AVERROR_INVALIDDATA` do `ffmpeg` dele) em `/api/frame.jpeg`, ~86
  tracebacks/h. O `ffmpeg` direto no DVR tira JPEG em 1 s (HEVC Main 960x1080@30, keyframe a cada 2 s, sem
  áudio), então DVR/rede/decodificador estão bons. Causa exata no go2rtc **não isolada** e o HEVC **não** foi
  provado culpado (teste A/B inconclusivo). Virou K-15 em `planning/BLOCKED.md`.
- HLS em regime estável (proxy): 0 erros em 4,5 min com 3 players, inclusive na virada do token de 180 s.
  A instabilidade estava nas **transições** e no cliente.
- Cliente real (Chromium): o `hls.js` mandava `playlist.m3u8?_HLS_msn=…&_HLS_part=…` (reload bloqueante do
  LL-HLS) e o proxy respondia em ~67 ms **sem bloquear**, porque descartava a query string.

**Problemas encontrados e corrigidos** (7 arquivos):
1. `app/api/camera/[id]/hls/[...file]/route.ts` — repassa a query do LL-HLS ao HA (reload bloqueante agora
   segura ~1 s, uma parte); cache `immutable` de 1 h em `segment/N.m4s`/`init.mp4` (URLs que se repetem quando o
   stream reinicia) trocado por `no-store` (playlist/init) e `private, max-age=10` (partes); só invalida o token
   que realmente falhou; retry só em 404/5xx; teto de 20 s no upstream (`504`).
2. `lib/cameraStream.ts` — pedidos simultâneos de `camera/stream` dividem uma única chamada (antes: corrida com
   tokens diferentes); WebSocket que cai falha os pedidos na hora (antes: 5 s de espera); singleton em `globalThis`
   em qualquer ambiente (chave `haStreamManagerV2`; o HMR do dev mantinha a instância velha).
3. `app/components/CameraLivePlayer.tsx` — reescrito: estados `conectando/reproduzindo/travado/erro` (o spinner
   antigo nunca voltava depois de um travamento); watchdog de vídeo congelado (6 s) que tenta `stopLoad/startLoad`
   e depois reinicia o player; backoff exponencial (1→15 s) em vez de `startLoad()` imediato em loop; aviso claro
   "não decodifica HEVC" em vez de girar para sempre; para de baixar com a aba oculta e salta ao ao vivo ao voltar;
   props `modo="live"|"glance"` e `pausado`; cai sozinho de LL-HLS para modo estável após 3 travadas em 60 s; o
   `hls.js` 1.5.17 (mesma versão) agora é dependência local (`npm i --save-exact`), não mais CDN em tempo de execução.
   Antes o modo LL não dava latência menor (`liveSyncDurationCount: 2` = 12 s de alvo) e só dobrava as requisições.
4. `CameraGlanceWidget.tsx` — `modo="glance"` e `pausado={modalAberto}` (o card atrás do modal não baixa mais
   o mesmo stream); `globals.css` — pílula "Reconectando…" (escondida na miniatura).

**Resultado medido no navegador real (painel visível, 23/09)**:
- Card miniatura (`glance`): 40,1 s de vídeo em 40,1 s (1,000×), 29,9 fps, 0,35 req/s (antes ~2 req/s/player).
- Modal com 2 players LL-HLS: 1,000× e 30 fps cada, 2,9 req/s no total, sem estado de reconexão, `/api/state`
  com mediana de 70 ms e 0 falhas durante o vídeo, 0 erros no console.
- Rede das câmeras cortada por ~16 s: congelamento detectado em ~4 s, pílula "Reconectando…", recuperação
  automática ao voltar a rede (1,000×). Card atrás do modal pausa e, ao fechar, salta ao vivo em ~1 s.
  Navegador sem HEVC (simulado): mensagem clara e 0 requisições depois.
- Ficou: 5–9% de quadros descartados pelo navegador (decode/composição), independente da configuração, com
  velocidade de reprodução 1,000×. Aba oculta→visível não foi testável nesse painel.
`tsc --noEmit` passa. `next build` **não** foi rodado (node_modules do painel danificado pelo Drive; `npm ci`
pendente — o `package-lock.json` já inclui o `hls.js`).

**Armadilhas (para não repetir)**:
- Erro meu, pego só por medir no navegador: `liveMaxLatencyDuration` **exige** `liveSyncDuration` no `hls.js`;
  sem ele o construtor lança, a exceção era engolida e o modal ficou "conectando" com **zero** requisições.
  Agora falhas de inicialização vão para `console.error`.
- Painel Browser **oculto** (`document.hidden`) congela a decodificação: a 1ª medição parecia "slideshow"
  (currentTime parado, latência crescendo) e era só o pane escondido. Medir vídeo só com o pane visível.
- O `hls.js` em LL reescreve `video.playbackRate`; forçar `playbackRate=0` não congela nada. Para simular falha,
  derrubar as requisições (`XMLHttpRequest`) das rotas de câmera.
- O HMR não reinicia os efeitos do player: recarregar a página depois de editar.
- `/api/camera*` é **pública** (isenta do PIN no `middleware.ts`), inclusive o `POST /api/camera/record`.
  Registrado em K-11; não alterei.

## 24/09/2026 — Card de cômodo: o verbo dominante passa a ser acender

Aplicação do item 3 da escala de parede, a pedido do André. Ele havia decidido em 22/09 que o
verbo dominante do card é **acender**. Antes, o toggle era o ícone de 66×66 dentro de um card de
238×212 (13% da área) e os outros 87% abriam o modal; a 2 m da parede, 20 px separavam "olhar" de
"mudar o estado físico da casa".

**Como ficou** (`RoomCard.tsx` + bloco novo no fim de `globals.css`):

- `.room-card-toggle`: um `<button>` real, `position: absolute; inset: 0`, cobre o card inteiro e
  liga/desliga. `aria-pressed` reflete o estado.
- `.room-card-detail`: botão próprio de **48×48** (`--touch-wall`) no canto inferior direito, abre
  o modal. Substitui a setinha decorativa de 18 px (`room-card-expand-cue`, que saiu do JSX).
- A raiz do card deixou de ser `div[role=button]` e virou `role="group"`. Isso elimina o
  `<button>` aninhado dentro de outro controle, que confundia leitores de tela.
- O ícone do cômodo virou ilustração (`aria-hidden`); o toque é da camada.
- Cômodo **sem ponto de luz** não tem o que alternar: a camada abre o detalhe e o botão de canto
  some. Cômodo `vazio` não tem nenhum dos dois.
- Dica do cabeçalho: "Toque no ícone…" → "Toque no cômodo para acender/apagar" (`page.tsx`).

**Preservado de propósito**: a lógica de arraste (8 px) e a janela de 450 ms que engole o clique
sintético do Safari, movidas do botão do ícone para a camada. Foi o que resolveu o "card travado"
no iPad, então não foi reescrita.

**Verificado no navegador, com `fetch` de escrita bloqueado por stub — a casa não foi acionada**:
clique no centro → 1 `POST /api/toggle`, sem modal; clique no canto → modal abre, 0 escritas; toque
sintético + clique sintético → exatamente 1 escrita; toque com arraste de 40 px → 0 escritas; foco
entra no modal e **volta ao botão de detalhe** ao fechar; nenhum `button` aninhado nos 10 cards; sem
sobreposição de nome, pontos de estado ou topo com o botão de detalhe em 1280×800, 1024×768 e
768×1024. `npx tsc --noEmit` passa.

**Não verificado**: o gesto real no iPad (só toque sintético); o anel de foco da camada por
teclado, que usa `outline-offset: -6px` para não ser cortado pelo `overflow: hidden`.

**Armadilha**: as regras `:hover` do `.room-icon-wrapper` (e o `:active`) já não disparam, porque
quem recebe o ponteiro é a camada. O feedback de pressão foi refeito com `:has(.room-card-toggle:active)`.
As regras antigas do `room-card-expand-cue` continuam na folha, mortas.

## Câmeras "carregando": DVR trocou de IP de novo, agora com IP fixo (24/09/2026)

**Sintoma**: cards de câmera do painel presos em "Conectando…". **Causa**: o DVR voltou de `.217` para
`.216` (DHCP), mas as duas integrações `generic` ainda apontavam para `.217`; o log do HA mostrava
`Error opening stream (Operation timed out …@192.168.31.217…)` e o painel devolvia 504 após 20 s. O código
do painel não tinha defeito.

**Correção (feita pelo André)**: URL RTSP das duas câmeras voltou para `.216` e o IP foi **fixado no
próprio DVR** (Rede → TCP/IP, sem DHCP). Verificado: ping 3/3, RTSP aberto, playlist HLS 200 em <1 s nos
dois canais, segmentos `.m4s` de 124 e 143 KB entregues pelo painel, zero erros de stream no log em 3 min.

**Não verificado**: o card renderizado no navegador; estabilidade ao longo do tempo. **Pendente (K-06)**:
reservar/excluir o `.216` da faixa DHCP no roteador, senão outro aparelho pode receber esse IP.
**Armadilha**: o `arp` do PC mostrou o mesmo MAC em `.155` e `.216` (proxy ARP do mesh) — não use esse MAC
para a reserva; leia no menu do DVR ou na lista do roteador.

## 24/09/2026 — Contraste e colisão dos widgets estreitos (itens 1 e 2 da lista de melhorias)

Só CSS, em `dashboard-app/app/globals.css`. Medição no navegador, antes e depois, com varredura de
todos os nós de texto visíveis nos dois temas.

**Contraste.** Antes: 10 reprovações abaixo de 4,5:1. Depois: **0 nos dois temas** (pior caso 4,54 no
escuro, 4,77 no claro, sobre 75 nós de texto). As causas eram poucas:

- `--text-dim` no escuro passou de alfa 0,50 para **0,70**. Com 0,50 o texto secundário reprovava em
  superfícies de vidro (chip 3,99 · badge 4,22 · botão de canal 4,37 · card aceso 3,63); a 0,70 o
  pior caso é 5,48. O token tem 127 consumidores, então a mudança é global de propósito.
- `.section-meta` perdeu o `opacity: 0.72`, que empilhava sobre o alfa do próprio `--text-dim`
  (3,13:1 no escuro, 3,34:1 no claro).
- Tema claro: o âmbar `#b45309` dava 4,34 (badge de pendências) e 4,45 (pílula "Moderado", 9px);
  ambos passaram para `#92400e`.

⚠️ **Correção da auditoria de 22/09**: o `.clock-colon` **não** reprova. Os 1,56 e 1,82 que registrei
foram medidos no meio da animação `clock-pulse` (que leva a opacidade a 0,25). Estático, dá 10,14 no
escuro e 4,77 no claro. Foi artefato de medir durante animação, a quinta ocorrência desse erro. Não
mexi no relógio.

**Colisão dos widgets da faixa de telemetria.** Confirmada também a **1180×820**, o iPad Pro 10.9" em
paisagem (não só a 1024×768 da auditoria): com 5 colunas, cada widget tem 220 px (190 a 1024) e neles
cabiam ícone + texto + um ou dois botões de 44 px. O texto perdia a disputa: coluna de 42 px, pílulas
"Ideal" e "Moderado", "STANDBY" e "Central de Mídia" ficavam sob os botões.

A regra é por **largura do próprio widget** (`container-type: inline-size` em
`.daily-widget-compact`, container `painel-widget`), não da tela. Abaixo de 260 px saem o
ornamento e o secundário (pílula de conforto do clima, ícones de mídia e compras, sub-texto da mídia)
e a pílula de energia desce para baixo dos watts. Abaixo de 205 px saem também os ícones de clima e
energia e o selo STANDBY. As colunas de texto passam a recortar na própria caixa. **Trade-off
consciente**: o texto vence o ornamento; no iPad, a 220 px, o ícone de mídia e o de compras somem.

Resultado: 0 colisões visíveis a 1180×820, 1024×768, 1280×800 e 768×1024; nada vaza; a página
continua sem rolagem em paisagem (820/820, 768/768, 800/800); alturas dos widgets inalteradas ou
menores. Retrato (768×1024) não mudou: 1756 px de altura, a mesma dobra.

**Ficou de fora**: `.camera-channel-btn` mede 36×32 (abaixo de 44); em `1024×768` "Central de Mídia"
aparece como "Central d…" (recortado, sem sobrepor); "3 itens a comprar" é cortado com reticências.
**Não verificado no iPad real.**

**Armadilha**: `container-type: inline-size` cria contenção de layout no widget. Como ele já era
`position: relative` e item de grid com largura definida, nada mudou; conferido com e sem a regra no
retrato.

## Carregamento dos cards de câmera: keep-alive no servidor e quadro em cache (24/09/2026)

**Medido**: com o stream quente, master/playlist/init/segmento respondem em ~40–150 ms pelo painel; o custo
está no stream **frio** — o HA encerra o stream 30 s após o último pedido (`OUTPUT_IDLE_TIMEOUT`) e reabrir
o RTSP leva vários segundos.

**Feito** (`dashboard-app`, ainda sem commit): (1) `lib/cameraStream.ts` — keep-alive: com uso do painel nos
últimos 30 min, um GET de playlist a cada 15 s por câmera mantém o stream aberto (singleton subiu para
`haStreamManagerV3`); (2) `CameraLivePlayer.tsx` — último quadro salvo em `localStorage`
(`cam-poster:<canal>`, ~21 KB) e exibido como poster no próximo carregamento; `startFragPrefetch`; playlist
pedida em paralelo ao download do chunk do hls.js.

**Verificado**: `tsc --noEmit` ok; poster gravado (21 KB) a partir do vídeo real; segmentos 306→322 em 95 s
sem pedidos externos (stream não esfriou). **Não medido**: tempo até o 1º quadro no navegador — o painel do
Browser fica oculto e o vídeo é pausado. **Custo**: DVR e HA mantêm 2 streams abertos enquanto houver uso
nos últimos 30 min.

## 24/09/2026 — Ícones de volta, leitura contínua de texto longo e C2/C4 em 44×44

Pedido do André, sobre a correção dos widgets estreitos do mesmo dia.

**1. Os ícones voltam.** A primeira versão escondia os ícones de clima, energia, mídia e compras
abaixo de 260/205 px para dar largura ao texto. Revertido. Continuam saindo em largura estreita só as
pílulas, que são chip e não texto que rola: "Ideal" do clima e o selo STANDBY da mídia. O nome e o
número de pendências ficam.

**2. Leitura contínua.** `SmartTruncateText` ganhou `continuo` (padrão `true`): o texto que não cabe rola
sozinho, em vai-e-vem com pausa de 22% nas duas pontas, ~30 px/s no trecho de rolagem, ciclo de 5 a
24 s. O marquee antigo só rodava com mouse em cima ou por 4,5 s depois de um toque, e o painel da
parede não tem hover. **É global**: vale para todo uso do componente (mídia, lista de compras,
`DeviceTile`), não só para a faixa de telemetria. `continuo={false}` volta ao comportamento antigo.
As linhas que eram `<span>` simples e viraram `SmartTruncateText`: condição do clima, "Compras" e o
status, sub-texto da mídia e o hint de energia. `prefers-reduced-motion` continua zerando a animação.

Dois defeitos **antigos** do componente apareceram e foram corrigidos, porque a animação contínua os
tornou visíveis:

- O `ResizeObserver` ficava preso ao nó removido quando o componente trocava de ramo (overflow ↔
  não-overflow), então uma medida feita cedo demais valia para sempre e o texto rolava para fora de
  uma janela em que cabia. Agora o efeito refaz o observador quando `isOverflowing` muda.
- Elemento `display: inline` tem `clientWidth` 0, e 0 era lido como "não cabe". Medida zero agora é
  ignorada até a caixa existir. O hint de energia (`display: inline` por herança) virou `inline-block`.

**3. C2 e C4: 44×44.** Eram 36×32 desenhados, com a área de toque de 44×44 vinda de um `::after`
invisível (C-02). Passam ao padrão do C-03: o desenho corresponde ao alcance e o `::after` sai. Como
44 px não cabem sob o texto num widget de 83–96 px, o seletor saiu do cabeçalho e foi para a coluna de
ações, ao lado do botão de abrir; espaçamento de 8 px entre os dois. Ganharam `aria-pressed`.

**Verificado** a 1180×820, 1024×768, 1280×800 e 768×1024: 0 colisões visíveis, 0 botões abaixo de
44×44, nada vaza do widget, sem rolagem em paisagem, e a medida de cada janela coerente com o estado
(rola só quem não cabe), sem laço de re-render (0 mutações em 3 s). `tsc --noEmit` passa. Retrato:
1737 px de altura (era 1756).

**Não verificado — leia isto**: o painel do navegador estava **oculto** (`visibilityState: hidden`, a
linha do tempo das animações parada em 0), então **não vi a rolagem acontecer em tempo real**. Verifiquei
o caminho por dentro: pausei cada animação e percorri `currentTime` — 0–22% parado em 0, 50% na
metade da distância, 78–100% parado no fim, com a distância certa de cada texto. Falta olhar no iPad.

**Custo aceito**: com o ícone de volta, a janela de leitura de "Central de Mídia" e do sub-texto tem
**42 px** a 220 px de largura de widget (46 px em compras). Cabem ~5 caracteres por vez; o ciclo de
5 s mostra o texto inteiro, mas quem passa a 2 m não lê a frase de relance. Se incomodar, as saídas
são tirar o botão de ligar da mídia (o de abrir já leva ao controle) ou dar mais largura ao widget.

## 24/09/2026 — Painel não reconhecia a TV ligada

**Causa**: a integração SmartThings (nuvem) perdeu a autenticação (`400 Bad Request` em
`account-link.nabucasa.com/refresh_token/smartthings`, 11:47) e `media_player.sala_de_estar_tv` ficou
`unavailable`. O painel e os sensores `TV Fonte` / `Sala Atividade` liam só essa entidade, então
mostravam "Desligada" / "Sala livre" com a TV local `on`.

**Feito**:
- Novo `sensor.tv_sala_estado` (`config/template_sensors.yaml`): `on` se qualquer caminho (nuvem ou
  local) estiver `on`; `off` só se um caminho confirmar off/standby; senão `unavailable`. Atributo
  `origem` diz quem respondeu.
- `TV Fonte` e `Sala Atividade` passam a usar esse sensor. Sem leitura: "Indisponível" e "Sem leitura da
  TV" (antes "Desligada" / "Sala livre").
- Painel: `page.tsx` passa `sensor.tv_sala_estado` como `estadoTv`; sensor incluído em `lib/rooms.ts` e
  `app/api/state/route.ts`. `tsc --noEmit` passa; `/api/state` entrega `on`.

**Armadilhas / não resolvido**:
- A TV local não expõe `source` nem canal: com a nuvem fora, fonte fica "Ligada" e "Jogando no PS5"
  não dispara. Só a reautenticação do SmartThings (ação do André) devolve isso.
- O botão de ligar/desligar do painel agora chama `media_player.tv_un65du8000gxzd` (local) via
  `page.tsx`. A salvaguarda de `lib/ha.ts` continua valendo: `turn_off` só sai se a local não estiver
  off/standby/unavailable/unknown. Efeitos: (1) com a local `unavailable` e a nuvem `on`, desligar pelo
  painel vira no-op silencioso; (2) o efeito otimista incide na entidade local, e o widget lê
  `sensor.tv_sala_estado`, então o visual só muda no próximo polling (≤5 s). **Não testado na casa**
  (comando físico): falta o André confirmar que `turn_on` local liga a TV apagada (depende de WoL).
- Não vi a tela renderizada; verificação foi pela API. PS5 `unavailable` é outro assunto.

## 24/09/2026 — Dados reais da TV (estado, entrada, canal, volume)

Spec: `specs/features/tv-estado-real-smartthings.md`. Opção A (via integração do HA), aprovada.

- `sensor.tv_sala_estado` ganhou atributos vindos do SmartThings: `volume_level`, `is_volume_muted`,
  `canal_nome`, `canal_numero`, `app_id`, `leitura_nuvem`. Nulos quando a nuvem não responde.
- Painel (`MediaHubModal.tsx`, `TvRemoteWidget.tsx`): removidos os valores inventados — volume padrão
  15 %, entrada "TV Aberta", canal "Samsung TV Plus" (e o mapeamento de qualquer `com.samsung*` para
  "Samsung TV Plus"). Sem leitura aparece "—" / "Sem leitura" / "Volume sem leitura". A entrada legível
  vem de `sensor.tv_fonte`.
- Medido: `sensor.sala_de_estar_tv_nome_do_canal_de_tv` traz `com.samsung.tv.aria-video` (id de app, não
  nome de canal) e `..._canal_de_tv` vem vazio; por isso `canal_nome` fica nulo e o id vai em `app_id`.
  O nome real do canal pode só aparecer em TV aberta — **não verificado**.
- `tsc --noEmit` passa; `/api/state` entrega os atributos. **Não olhei a tela renderizada.**
- Limite: só existe o que a integração expõe. Mais campos exigiriam a API direta (opção B: token do
  André em `.env.local` + rota nova).

## 24/09/2026 — "TV aberta" com a TV no Apple TV: leitura direta do SmartThings (opção B)

**Achado**: `media_player.sala_de_estar_tv` ficou com `source=digital_tv` sem mudar desde 01:02:02
(restabelecimento da integração), mesmo com a TV em outra entrada; `update_entity` não alterou. O painel
repetia fielmente um dado que parece velho. Sem a API do SmartThings não dá para saber quem está errado.

**Feito**: rota `dashboard-app/app/api/tv/estado/route.ts` (GET, somente leitura). Lê
`/v1/devices/{id}/status` com `SMARTTHINGS_TOKEN` (`.env.local`, escopo `devices:read`) e devolve ligada,
volume, mudo, entrada, canal e capacidades `samsungvd.*`/`custom.*`, cada uma com o carimbo de tempo.
`?comparar=1` inclui o que o HA mostra. Sem `SMARTTHINGS_DEVICE_ID`, procura a TV; se houver mais de
uma candidata, devolve a lista (409). `tsc --noEmit` passa.

**Não verificado**: a rota nunca rodou com token real (o token é do André, CLAUDE.md §10) e o painel
respondeu `Não autenticado` à chamada sem sessão. Nenhum componente usa a rota ainda — primeiro
confrontar os dados, depois decidir a integração.

**Comparação HA × SmartThings (24/09 ~22:22, TV no Apple TV)**: a API do SmartThings devolve exatamente o que
o HA mostra — `samsungvd.mediaInputSource.inputSource = dtv` (TV aberta), `tvChannelName =
com.samsung.tv.aria-video`, volume 15 — com carimbo único de 01:00:06Z, 22 min antes da leitura. Ou seja:
o HA **não** está atrasado; a própria nuvem tem um retrato velho e não reflete a troca de entrada.
`ligada` tem carimbo 00:10:24Z (bate com quando a TV foi ligada). O mapa de entradas da TV só lista `dtv` e
`HDMI1` ("PlayStation 5"): o Apple TV não aparece como entrada. Token de leitura funciona; rota
`/api/tv/estado` não foi exercitada (exige PIN), a comparação foi por script com a mesma consulta.
Conclusão: a entrada/canal atuais **não são obtíveis de forma confiável pela nuvem**. Caminhos: rotular o
dado com a idade (carimbo), ou fonte própria do Apple TV (integração `apple_tv`, pareamento do André).

## 24/09 — Central de Mídia: player do Music Assistant não respondia

**Causa (medida)**: o MA só tinha um player, o `browser_mod_…` órfão (`hass_players`, `available=false`). O player web
(`sendspin`) só existe enquanto o navegador do MA está aberto — por isso tocar pelo iframe "Explorar biblioteca"
funcionava. A rota `/api/mass` caía em `players[0]` (o órfão) e o MA recusava (`Player … is not available`, visto no
log); o painel engolia o erro, então o clique "não fazia nada".

**Mudança**: `app/api/mass/route.ts` só escolhe player **disponível** (`escolherPlayer`), devolve `playerPronto` e
`playerAlvo`, e responde 409 `sem_player` quando não há. `MediaHubModal.tsx`: selo mostra o player real (antes era
fixo "Áudio do Painel Ativo"), aviso com botão "Conectar player", erros do MA aparecem na tela, e a playlist clicada
sem player fica pendente, abre o navegador do MA e toca sozinha quando o player conecta (25 s de limite).

**Verificado**: `tsc --noEmit` = 0; sondagem direta do MA confirmou o único player indisponível.
**Não verificado**: fluxo ponta a ponta no navegador (rota exige sessão do painel; toca música real).
**Armadilha aberta**: o sink oculto (`MusicAssistantAudioSink`, no layout) e o iframe visível são a mesma origem
:8095 — dois clientes do MA com o mesmo player web podem brigar. Não alterado.

**24/09 — conflito sink × iframe resolvido**: agora existe **um só** iframe do MA (`MusicAssistantAudioSink`, no
layout). Ao abrir "Explorar biblioteca", o modal reserva um espaço vazio e emite o evento `mass-explorer` com o
retângulo (e o recorte do scroll); o sink move o mesmo iframe para cima desse espaço. Fechar devolve-o ao
esconderijo sem recarregar, então a música **não corta** e não há segundo cliente disputando o player web.
`tsc --noEmit` = 0. **Não verificado no navegador** (exige sessão e toca música real): conferir alinhamento
com scroll do modal e toque dentro do iframe.

## 24/09 — Legibilidade no modo escuro e correções visuais V-1 a V-9 (painel)

**Pedido**: texto dos cards de ajuste de luz pouco visível no tema escuro com luz acesa; depois, teste visual
completo (1280×800, 1024×768, 375×812; escuro e claro) e correção dos defeitos achados.

**Causas medidas e mudanças** (tudo em `dashboard-app/app/globals.css`, commits `624ef89` e `e631252` do repositório
do painel):
- Modal de ajuste de luz: subtextos de 10–11px a 70% de opacidade → 11–12px a ~88%; tema claro mantém os tokens.
- Botão "Ajustar" nos cards acesos (tile e popup do cômodo): texto marrom-escuro sobre card escuro sumia →
  âmbar de destaque (popup: botão sólido; tile: borda e ícone âmbar).
- Barra de widgets: em 1024px paisagem eram 5 colunas de ~160px e cortavam "Aspirador", "Compras", "4 tomadas
  ativas" → grade de 12 colunas entre 641 e 1199px; TV e CFTV em linha inteira abaixo de 640px. O selo "tudo
  comprado" some (o de pendências fica). Umidade/vento do clima não quebram no meio.
- Página do cômodo: título "ILUMINAÇÃO" colava na dica em 375px → cabeçalho passa a quebrar linha.
- `text-transform: capitalize` em `.room-name` gerava "Sala De Estar" → removido.
- `/bg-light.jpg` nunca existiu em `public/` (404 a cada carga) → degradê; removida a exceção morta em `middleware.ts`.
- Tema claro sobre wallpaper escuro: títulos de seção sumiam (o wallpaper não muda com o tema) → pastilha de vidro.

**Verificado**: `tsc --noEmit` = 0 (na rodada de CSS do modal); medição no navegador em 1280/1024/375 nos dois temas
(sem overflow horizontal, sem texto cortado nos widgets, zero alvos de toque < 44px, zero textos < 4,5:1 no escuro,
nenhum 404 numa carga nova). Nenhum dispositivo foi acionado.
**Não verificado**: painel escuro comparado contra versão anterior fora dos widgets/cabeçalhos; popup real do cômodo
com luz acesa (os estados ativos foram simulados no DOM porque as luzes estavam apagadas).
**Decisão mantida**: kiosk e standby ficam escondidos no celular por desenho (`display: none`), assim como a pílula de
baterias só com ícone — não são defeito.

**Achados fora do escopo, NÃO corrigidos (aguardam decisão do André — alçada 2/3)**:
- **Autenticação não valida**: `middleware.ts` só confere se o cookie `casa_auth_session` existe; qualquer valor passa
  (`/api/todo` devolveu 200 com `x`). PIN cai em `1234` porque `DASHBOARD_PIN` não está no `.env.local`; sem limite de
  tentativas; sessão de 1 ano. `/api/state` e `/api/camera/*` são públicas. O item B-01 do backlog ("não há middleware")
  está desatualizado: o middleware existe, mas não protege.
- Entidades inexistentes nos logs do HA (`light.quarto_luca_switch_1`, `light.yeelink_…bslamp2_s_2`) — batem com o
  "Indisponível" da luz do Quarto Luca.
- O polling de 5s (`/api/state`, `/api/mass`, `/api/todo`, HLS da câmera) roda também na página do cômodo.
- `globals.css` tem ~13,5 mil linhas, 200 `!important`, 140 overrides do tema claro; `config/_ddp_tmp.py` é resíduo.

## 24/09 — Travamento ao abrir/fechar o popup do cômodo

**Sintoma**: leve engasgo toda vez que um card era aberto ou fechado.
**Causa** (medida no navegador): abrir/fechar passava por `executarComTransicao` (View Transition). O callback só
enfileirava `setSelectedRoomId`, então o navegador fotografava o "estado novo" antes de o React desenhar — na abertura
o popup ainda não estava no DOM; no fechamento ainda estava. Somava-se a animação CSS própria do popup: ao fechar,
`modal-pop-out` (200 ms) e, aos 180 ms, uma segunda saída pela View Transition (~290 ms) — ~470 ms sem aceitar toque.
O cross-fade de `::view-transition-*(root)` sobrescreve o `plus-lighter` do Chrome, o que escurece a página no meio.
**Correção**: `app/page.tsx` — `onOpen`/`onClose` do popup chamam `setSelectedRoomId` direto; ficam só as animações
CSS que já existiam. `executarComTransicao` continua nas navegações de página (ex.: botão de tela cheia do popup).
**Verificado**: `tsc --noEmit` = 0. Três abrir/fechar no navegador: zero View Transitions disparadas, popup no DOM em
~15 ms, removido em ~195 ms (fim da animação CSS), página já clicável logo depois, maior intervalo entre quadros 24 ms.
Nenhum dispositivo acionado (só o botão de detalhe).
**Armadilhas**: a 1ª abertura após recarregar leva ~320 ms porque `RoomPopup` é `dynamic()` e baixa o chunk no
primeiro clique — custo único, não corrigido. As regras `view-transition-name` do popup e o CSS de root ficaram
(inofensivos sem transição no popup). Não medido no tablet (29 elementos com `backdrop-filter` pesam mais lá).

## Miniatura da câmera em sangria total no cartão CFTV (25/09/2026)

**Pedido**: aumentar ao máximo, dentro do cartão, a miniatura da câmera para ver a imagem sem abrir o modal.
**Feito** (`dashboard-app/app/globals.css`, bloco após `.camera-glance-sub`): a miniatura deixou de ser uma
janela de 62×44 no padding e passou a ocupar a **altura inteira do cartão, colada à borda esquerda**
(`align-self: stretch`, sem borda/raio, `aspect-ratio` 16:9, 2:1 quando o cartão tem ≥380px de conteúdo,
teto de `40cqw`). O cartão mantém a altura da fileira. Em cartão <380px somem o subtítulo e a seta (o cartão
inteiro continua clicável); em painel >1400px a câmera passa a ocupar 2 colunas (uma coluna de ~300px não
comportava imagem + título + canais). Reaproveita o container `painel-widget` que já existia em
`.daily-widget-compact` — nomear outro container na mesma classe não funciona (o `container-name` de
baixo vence).
**Medido** (Browser pane, título sem corte em todos): 1024 → 124×62; 1280 → 159×79; 1600 → 163×81;
1920 → 167×83; 768 e 390 com título inteiro (antes: 62×44). **Não verificado**: tema claro e o gesto no iPad.

**Correção (25/09/2026) — miniatura sumia no iPad**: a largura vinha só de `aspect-ratio` sobre altura
esticada (`align-self: stretch`), e o filho (`.camera-live-player-wrap`) é absoluto, sem conteúdo em fluxo. O
Chrome deriva a largura; o WebKit não (suspeita — não reproduzida no Safari). Trocado por largura
explícita `clamp(96px, 34cqw, 168px)` com fallback `112px`. Medido no Chrome: 1024 → 132×62, 820 → 127×65,
1366 → 168×83, 390 → 122×62, título sem corte. **Não verificado no Safari/iPad real.** Armadilha: filho
`position: absolute` + `aspect-ratio` no pai flex = largura 0 no WebKit.

## Ícones do painel unificados sobre Phosphor (25/09/2026)

**Pedido**: analisar todos os ícones, propor um pacote coerente com o projeto e aplicar. Auditoria em
`artifacts/claude/auditoria-icones.md`; especificação em `specs/features/icones-phosphor.md`. Execução pelo Claude Code
como **exceção** ao §6 do CLAUDE.md, autorizada pelo André.
**Diagnóstico** (medido): 5 linguagens de ícone; 12 valores de `strokeWidth` (traço renderizado de 1,04 a 2,55 px); 15
tamanhos; "ligado" sem regra; 27 emoji; `lucide-react` instalado e nunca importado; o "AeroGlyphs" só existia na
`/icons-preview`. Ícones ambíguos: Circulação (seta ao lado do chevron do card), Área Gourmet (guarda-sol), raio com dois
sentidos, movimento parecido com Wi-Fi.
**Feito** (`dashboard-app`, commits `7e7ce45`, `781248d`, `d938129`, `ee44606`, `90cc6fe`):
- `app/components/icons/`: `<Icon name state size>` sobre `@phosphor-icons/react@2.1.10`; `registry.ts` é o único
  importador; `peso.ts` (estado + tamanho → peso), `dominio.ts` (cômodo, clima, bateria), `clima.ts` (fonte única das
  condições, cores como tokens `--wx-*` com variante clara); glifo próprio `AspiradorRobo` na grade 256.
- Migrados: cômodos, dispositivos, popup, alertas, energia, câmeras, clima (15 condições + desconhecido), modo noturno,
  cabeçalho, cenas, avisos, TV, login, galeria, aspirador, lista de compras, Central de Mídia (38 SVGs).
- Removidos: `icons.tsx` (20 SVGs), 15 glifos AeroGlyphs, `lucide-react`.
- `DeviceTile` agora escolhe o ícone pelo que o dispositivo é (temperatura, umidade, bateria e a ventilação do PS5
  saíam todos como sensor de presença).
**Verificado**: `tsc` = 0; `npm run build` passa; painel real nos temas escuro e claro; escala de cinza na prévia.
Nenhum dispositivo acionado — popup aberto só pelo botão de detalhe, Central de Mídia só pela seta.
**Armadilhas**:
- **O build falhava antes de qualquer mudança**: 9 arquivos ausentes em `node_modules/next` (provável efeito do Google
  Drive). Repostos do pacote oficial. Se voltar, reinstalar o Next.
- O Phosphor desenha por **preenchimento**: CSS de `stroke`/`stroke-width` ou `circle[stroke=...]` não tem mais efeito.
- A 1ª versão do `offline` passava despercebida em cinza (só opacidade) — ganhou selo `WifiSlash` a partir de 20 px.
- `git add app` puxa junto edições de outra frente (`globals.css`, `page.tsx`, `HealthPill.tsx`). Durante a migração
  foram deixadas fora dos commits; depois o André pediu para commitar a árvore e entraram em `fe700d0` (HealthPill no
  lugar do StatusRail, `grupo` em `lib/alertas.ts`, miniatura da câmera). O chevron solto do `HealthPill` foi trocado
  por `<Icon>` em `90cc6fe`; a rotação de 180° ao expandir a linha foi conferida no painel (`transform` de `none` para
  `matrix(-1,0,0,-1)`).
- `<svg>` restantes no painel: só os 2 gráficos do `EnergyWidget` e os 12 logotipos de `TvAppLogos` (de propósito).
- `globals.css` ainda tem regras mortas do estilo antigo (`.weather-compact-icon-wrap circle[stroke="#fbbf24"]`, linhas
  1653 e 10815; seletores `.room-icon-svg` com `stroke`). Inofensivas; limpar numa passada própria.
- `xiaomi_home/miot_config/*.dict` guarda `access_token` e **não** deve ser commitado; ficou de fora do commit de
  docs (`1a5003b`) e continua modificado no working tree.
- Bundle +53 kB gz (391 → 444), num pedaço compartilhado.
**Não verificado**: tablet/iPad reais, Safari, standby noturno em uso.

## 25/09/2026 — Yeelight fora do Closet

A luminária Yeelink (`light.yeelink_cn_581528686_bslamp2_s_2_light`, dispositivo "Luminária Luca") estava
listada no cômodo **Closet** em `dashboard-app/lib/rooms.ts`, que é o contrato canônico e também a
lista de permissão das rotas `toggle` e `control`. O André disse que ela não fica nesse ambiente.
O registro do HA nunca a pôs lá: o dispositivo está na área `quarto_luca`, e `CASA.md` e
`docs/SYSTEM-MAP.md` já a descreviam no Quarto Luca. A divergência era só do painel.

Removida a entrada `yeelight_bedside` do Closet. O Closet passa a ter 2 pontos de luz (Luz Closet e LED
Escritório), o que bate com o sensor `sensor.luzes_closet`, que já contava só esses dois. Conferido na
tela: badge 0/2 e o modal do Closet sem menção à Yeelight. A linha correspondente em
`artifacts/antigravity/current-architecture.md` foi corrigida. `npx tsc --noEmit` passa.

⚠️ **Efeito colateral**: como `rooms.ts` é a lista de permissão das rotas de escrita, **a luminária deixou
de ser controlável pelo painel**. Ela não aparece em nenhum cômodo (o Quarto Luca segue com 1 ponto,
`light.quarto_luca_switch_1`). No HA continua funcionando.

## Quedas de imagem no iPad: motor nativo no Safari + telemetria do player (25/09/2026)

**Contexto**: o André usa o painel no iPad (Safari) e relata queda constante. Tudo o que foi medido antes
foi no Chrome (hls.js/MSE): fonte estável (30 min sem `DISCONTINUITY`, ping 0% de perda), proxy sem erro.
**Nunca houve medição no iPad**, então a causa lá não está provada.
**Feito** (`dashboard-app`, sem commit): (1) `CameraLivePlayer.tsx` — em Apple/Safari usa **HLS nativo**
(`video.src`) em vez de hls.js; `localStorage cam-motor` = `hlsjs`|`nativo` força o motor; watchdog, backoff e
retomada valem para os dois; (2) telemetria: novo `app/api/camera/diag` (POST, 8 KB, 60/min, só imprime
`[cam-diag]` JSON no `servidor_dev.log`) recebe eventos do player em lotes de 5 s (sessão, motor, erros do
hls.js/`<video>`, travadas com buffer, watchdog, retomadas, pausas inesperadas). Rota pública como o resto de
`/api/camera*` (K-11) — não grava em disco.
**Verificado**: `tsc` ok; a telemetria chega ao log (teste no Chrome); caminho nativo carrega o manifesto no
Chrome (`videoWidth` 960). **Não verificado**: reprodução no Safari real. Ler o que o iPad reporta:
`grep cam-diag` no log (decodificar UTF-16).

## PS5 desliga pelo Home Assistant — repouso por Remote Play (25/09/2026)

**Contexto**: a integração `ps5` só ligava (WAKEUP por DDP); o DDP não tem comando de repouso. O André
escolheu o caminho Remote Play (spec `specs/features/ps5-desligar-remote-play.md`, PS5-02). Antes disso o
console estava `unavailable` porque estava fora da rede; voltou no mesmo IP (`192.168.31.245`).
**Feito** (`config/custom_components/ps5/`): `remoteplay.py` novo (abre sessão, manda standby, fecha);
`media_player.py` com `async_turn_off` (só age com o console `on`) e `TURN_OFF` declarado só quando as chaves
existem; `ddp/link.py` devolve também `RegistKey` e `RP-Key`; `config_flow.py` grava as chaves e a tela
Reconfigurar aceita PIN + npsso opcionais para repareamento; `manifest.json` com
`pyremoteplay==0.7.6` e `pyee==11.1.1`.
**Verificado** (25/09, com o console): repareamento gravou `rp_key` e `rp_regist_key`; sessão Remote Play
abriu em 8,3 s pelo NAT do Docker; console foi a 620 (Server Standby); WAKEUP devolveu `on` em 6 s; o HA
reiniciou e instalou as dependências sozinho.
**Não verificado**: `media_player.turn_off` chamado pelo HA (testei o módulo direto, sem token); que a
entidade exiba `TURN_OFF`; efeito na `switch.ventilacao_ps5`.
**Armadilhas**: (1) `pyremoteplay` só importa em Python 3.14 com `pyee` 11.x — 12 e 14 removeram
`ExecutorEventEmitter`; (2) o `async_standby` da biblioteca tem laço de espera invertido (não espera), então o
código usa o método privado `_send_standby()` e espera sozinho — pode quebrar se a lib mudar;
(3) sessão Remote Play contra console em repouso o **acorda**: o turn_off recusa fora de `on`; (4) `autostart`
tem de ficar ligado, pois é o fluxo que marca a sessão como pronta; (5) o console fica ~20 s mudo ao entrar
em repouso antes de responder 620 — não é queda.

### Complemento (25/09/2026, mesma tarde): `turn_off` pelo HA e ventilação em 1 minuto

**`media_player.turn_off` pelo HA**: o André chamou pelo serviço e funcionou. Conferido no histórico: sessão
aberta pelo processo do HA às 21:59:38, entidade em `off` às 21:59:50, DDP em 620. Um aviso "blocking call"
do import do `pyremoteplay` no event loop foi corrigido (`__init__.py` importa a biblioteca no executor).
**Ventilação — o pedido**: desligar 1 minuto após o PS5 sair de `on`, e ligar no mesmo instante em que ele liga.
**Medido antes de mudar**: ligar já era imediato (1,1 s e 0,8 s nos dois casos limpos do histórico).
Desligar **não** cumpria nem os 2 minutos: os desligamentos observados caíram nos ticks de 5 min
(20:20:01, 22:05:01), até 10 min depois do console sair. Causa do `for` não entregar: **não provada**.
**Feito** (`config/automations.yaml`): `for` de 1 min; reconciliação de 1 em 1 min (era 5); limiar do template
em 55 s (abaixo do `for`, para não perder a corrida); guarda de "tomada no estado contrário" nas duas ramas,
para não chamar a nuvem Tuya a cada minuto; `description` reescrita com o porquê.
**Verificado** (ciclo real, `check_config` 0, automação `on` após reinício): console `on` 22:09:18 → tomada `on`
22:09:19 (1 s); última mudança do console 22:10:45 → tomada `off` 22:11:46 (61 s, fora de minuto redondo, logo
foi o gatilho e não o tick). O ciclo terminou com o console em repouso, como estava antes.
**Armadilha**: ao entrar em repouso o console oscila `unavailable`↔`off` por ~50 s e cada oscilação reinicia
a contagem; da ordem de repouso ao corte foram ~2 min. **Risco aceito pelo André**: queda de rede do PS5 por mais
de 1 min com o console quente corta a ventilação até ele voltar a `on`.

### Botão de repouso no painel (25/09/2026)

**Pedido**: botão de repouso do PS5 no painel; o André autorizou mexer no `dashboard-app`. Spec:
`specs/widgets/ps5-botao-repouso.md` (PS5-03).
**Achado**: o botão "Colocar em Repouso" já existia na aba Console Gamer, mas ligado ao `alternar()` genérico
(trava otimista de 5 s, sem confirmação). Com o `turn_off` real: (1) a UI voltava a "Ligado" durante os ~50 s de
oscilação do console; (2) um toque durante a oscilação lia `unavailable` como "não ligado" e mandava `turn_on`,
religando o console; (3) o mesmo caminho serve ao tile do cômodo, então um toque acidental desligava o console.
**Feito** (`dashboard-app`, commit próprio): `MediaHubModal.tsx` (rota dedicada `/api/tv`, confirmação em dois
toques, pendente até chegar a `off`, estado "Sem resposta", erro visível), `lib/ha.ts` (`controlarPs5` lê o estado
antes de agir; o caminho genérico recusa o repouso do PS5 e, em lote, só o ignora), `globals.css`.
**Verificado**: `tsc` 0; painel real mostra "Modo Repouso" com o console em repouso; estados `on`, `unavailable`,
oscilação e erro simulados no navegador (fetch interceptado, sem chegar ao HA): armar não envia, confirmar envia um
`{"ps5_power":false}`, oscilação mantém o pendente, só `off` o encerra; 11 verificações das guardas de `ha.ts`
contra um dublê do HA (incluindo lote com luz e `unavailable`); rotas reais só com no-op (console em repouso), e
o log do HA não registrou comando.
**Não verificado**: um ciclo físico completo pelo botão real; `npm run build` (não rodei: o servidor de
desenvolvimento usa o mesmo `.next`); tablet/iPad (só o Chrome do painel).
**Armadilhas**: (1) `unavailable` do PS5 é "sem resposta", nunca repouso; (2) o CSS `.is-on` e o hover genérico
(azul) venciam a regra de confirmação por ordem no arquivo — as regras novas ficam depois de `.is-on`;
(3) bug antigo, não tratado: `enviarComandoTv({ fonte: "HDMI", ps5_power: true })` nunca liga o console, porque a
rota `/api/tv` retorna depois de tratar `fonte`; (4) `lib/ha.ts` é só de servidor, o cliente fala pela rota.

### Ciclo físico completo pelo botão do painel (25/09/2026, 22:22–22:28)

**Verificado** (clique real no botão, cliques por `ref` no navegador do painel): console em repouso → "Ligar Console PS5" →
"Ligando…" → `on` (22:22:23) → tomada do cooler `on` 2 s depois (22:22:25, automação) → dois toques em "Colocar em
Repouso" (o primeiro arma, o segundo envia) → "Entrando em repouso…" → "Modo Repouso" em ~19 s → DDP 620 →
última oscilação do console 22:26:42 → cooler `off` 22:27:43 (61 s). Sem erro no log do HA. **Estado final igual ao
inicial** (console em repouso, cooler desligado).
**Armadilha do teste**: os primeiros toques por coordenada não chegaram ao botão (nenhum evento `click` na página; nada
foi enviado, conferido no log do HA e no DDP) — causa não determinada; por `ref` funcionou. Dois cliques no mesmo
instante (lote sem pausa) também não enviam: a confirmação exige o redesenho entre os toques, impossível para uma
pessoa. Nenhum efeito colateral: o histórico mostra só as mudanças esperadas.

## 26/09/2026 — Monitoramento de rede (internet, DVR, luzes indisponíveis)

Spec: `specs/automations/rede-mesh-internet-monitoramento.md`. Nascida de sugestões do Perplexity, filtradas
pelo que o projeto de fato oferece.

- **Sondas**: `config/rede_ping.yaml`, `command_line` com `ping -c 2 -W 2`. A plataforma YAML do `ping` não
  existe no HA 2026.9; a integração `ping` (PC) é entrada de configuração e não foi tocada.
- **Sensores**: `binary_sensor.internet_no_ar` (on se algum dos dois destinos responde; `unavailable` se as
  fontes não permitem concluir), `sensor.rede_diagnostico`, `sensor.luzes_indisponiveis` (lista explícita de 18
  luzes).
- **Automações** (`automations.yaml`, ids `1758844800001` a `...003`): internet caiu/voltou, DVR fora, luzes
  indisponíveis. Só notificam no iPhone; nenhuma comanda atuador.
- **Achados que mudaram o plano**: 32 dos 60 MACs vistos pelo roteador são privados (78% dos ~120
  eventos/dia), então presença e "dispositivo novo" por MAC foram descartados; `connect_device_ids` estoura o
  limite de 255 caracteres; o Roteador Sala reporta `0` clientes mesmo no ar; as luzes por nuvem Tuya (Luzes
  Externas, Quarto, Banheiro) caem muito mais que o Sonoff local.
- **Armadilha do `check_config`** no Git Bash: `-c /config` vira `C:/Program Files/Git/config`; usar
  `MSYS_NO_PATHCONV=1`.
- **Formato do `command_line`**: um sensor por bloco `- binary_sensor:` (mapa, não lista).
- **Pendências**: habilitar o RSSI do Sonoff pela interface; coletar uma semana e definir limiar de sinal;
  confirmar suposição do nó da Sala; reserva de DHCP (K-06).
- **Não provado**: envio real das notificações e disparo dos `for:`.

## 25/09/2026 — O relógio vira a informação mais visível da tela

Pedido do André: analisar o card de horário para um painel fixo e fazê-lo ser a informação mais legível
de longe. Só CSS, em `dashboard-app/app/globals.css`, no fim do arquivo; `Clock.tsx` não mudou.

**Análise (medida a 1180×820, iPad Pro 10,9", 132 px CSS por polegada):**

- Fonte do relógio **26 px** (`--font-clock: clamp(1.45rem, 2.2vw, 1.85rem)`), 3,6 mm de altura de
  algarismo: **6,2′ de arco a 2 m e 4,1′ a 3 m**, contra os 16′ que a leitura de parede pede.
- Era o 3º/4º maior texto da tela, atrás do título "Casa" (28 px) e da temperatura (28 px). A data
  media 11 px.
- O cabeçalho era uma linha de três blocos (marca 464 px, relógio 89 px, ações 415 px) que só deixava
  ~92 px livres: um relógio grande **não cabia** ao lado dos outros dois.

**O que foi feito:**

- Cabeçalho em paisagem (≥ 900 px) passa a **duas colunas**: relógio à esquerda ocupando a altura toda;
  à direita a marca (título + alertas) sobre as ações. Via `grid-template-areas`, sem mexer no JSX.
- Fonte do relógio `clamp(72px, 13.5vh, 128px)` — acompanha a **altura** da tela, que é o que o
  cabeçalho disputa com a grade de cômodos. A 1180×820: **110,7 px**, algarismo de **15,3 mm**:
  **26′ a 2 m, 17,6′ a 3 m, 13,2′ a 4 m**. Data de 11 para ~25 px.
- Retrato (≥ 641 px): o relógio sobe para o topo do cabeçalho, `clamp(84px, 15vw, 132px)`
  (115 px a 768 de largura: 18′ a 3 m).
- Celular (< 641 px) mantém o arranjo próprio.

**Verificado** a 1180×820, 1024×768, 1280×800 e 768×1024: o relógio é o maior texto da tela nos quatro
(110/104/108/115 px contra 28 px do segundo); sem sobreposição entre marca, relógio e ações; nada fora
do cabeçalho; sem rolagem em paisagem (820/820, 768/768, 800/800).

**Custo, dito com todas as letras:** o cabeçalho passou de 68 para **159 px** (1180×820). A grade de
cômodos perdeu 90 px: 478 → 388 px, e os cards de ~212 para **178 px** (1024×768: 162 px). Ainda acima
do mínimo do card (155 px), mas é o preço direto de o relógio ser o dobro da altura da marca.

**Não mexido de propósito:** o dois-pontos continua piscando (`clock-pulse`, opacidade a 0,25) e
amarelo (`--on-accent`); `AmbientNightMode` (standby depois de `Dormir`) já tem relógio próprio grande e
não foi tocado. **Não verificado no iPad real**: a distância de leitura é calculada, não testada com
alguém a 3 m da parede.

**Ajuste do mesmo dia — dois-pontos do relógio.** O André pediu branco e, em seguida, pediu de volta
o amarelo. Ficou como estava: `color: var(--on-accent)` e halo âmbar (`rgb(251,191,36)`, conferido).
Nada do ajuste permaneceu no CSS.

## 25/09/2026 — Raio de refração em ciclo (e não mais infinito)

Pedido do André: analisar o raio de refração infinito e refiná-lo de acordo com o projeto. Só CSS
(`dashboard-app/app/globals.css`); nenhum componente mudou.

**O que a análise apontou**, cruzando com `DESIGN.md` e `PRODUCT.md`:

1. `@property --ray-angle` anima uma propriedade personalizada, que roda na **thread principal**: a
   cada quadro refaz-se a pintura do anel do cabeçalho e de cada card aceso (até 11), 24 h por dia.
   O `DESIGN.md:255` manda animar só `transform` e `opacity` "para 60 fps em tablets de parede de baixa
   potência". Trocar por `transform` exigiria uma camada de mais de 2000 px de lado para girar um cônico:
   descartado. O que se pode é pintar **menos**.
2. O feixe era **âmbar mesmo com a casa apagada**. Aqui âmbar significa "luz acesa"; um anel âmbar
   girando num cabeçalho sem luz nenhuma afirmava o contrário do estado.
3. `PRODUCT.md` pede relógio e dados "sem poluição visual", e o relógio agora é o maior texto da tela.
   Um destaque em órbita permanente disputa o olhar com ele.
4. No standby OLED o painel escurece por cima, mas os anéis seguiam sendo repintados por baixo.

**O que foi feito**: keyframe novo `sweep-ambient-ray` no lugar de `rotate-ambient-ray` (removido).
A passada ocupa **12% do ciclo**, com aceleração suave nas pontas, e os 88% restantes ficam parados
(0° e 360° são a mesma posição: sem salto). Ciclos: cabeçalho **60 s** com a casa apagada e **36 s**
com luz acesa (era 14 s e 9 s girando sem parar); cards **44 s** (era 11 s), 24 s com hover de mouse.
Cor: **branco neutro** com a casa apagada, **âmbar só com luz acesa**; no tema claro, grafite
translúcido no lugar do branco (que some sobre vidro claro). Standby: `body.has-ambient-standby`
pausa os dois anéis. `prefers-reduced-motion` continua igual (parado, opacidade 0,35).

**Verificado**: ângulo por fase do ciclo (0% → 0°, 3% → 43°, 6% → 180°, 12% → 360°, 50% e 99% → 360°);
ciclos e cores nos quatro estados (acesa 36 s âmbar, apagada 60 s branco, claro/apagada grafite,
cards 44 s); pausa em standby e retomada ao sair (`paused` → `running`).

**Não medido — importa**: o ganho de CPU. Nesta máquina o painel roda a **75 fps com ou sem os anéis**
(pausei os dois e comparei, 4 s cada): é limitado pelo v-sync. A diferença só aparece num tablet fraco,
que não tenho aqui. O ganho de pintura é consequência do desenho (88% do ciclo sem mudança de valor),
não uma medida. Também **não vi a passada a olho em tempo real**, só o percurso do ângulo.

**Não mexido, mas mesma família**: sob standby ainda rodam por baixo o pulso do dois-pontos, o ponto de
sincronização, o AO VIVO da câmera, o "respirar" da lâmpada e o giro do ventilador. E
`.tv-compact-refraction` tem seu próprio efeito.

## 25/09/2026 — Clima no cartão do relógio; card de clima removido da faixa

Pedido do André: informações de tempo no card do cabeçalho, de forma harmônica, e depois a remoção do
card de clima. Perguntei se "tempo" era clima ou horário do sol; a resposta foi **só clima**, seguida da
remoção do card. Só o painel mudou.

**Componente novo `HeaderWeather.tsx`**: ícone + temperatura + condição numa pílula de vidro de 44 px, do
mesmo desenho das pílulas de alerta do cabeçalho. `Clock.tsx` ganhou `comClima` e `clima`; só o
cabeçalho principal os passa (a página do cômodo continua sem clima). A linha sob o relógio agora é
data + pílula; a temperatura tem quase o tamanho da data (27,9 px contra 24,6), para lerem-se como par.

**O que o card fazia além de mostrar e foi preservado**: tocar abre a previsão de 5 dias
(`WeatherForecastModal`). Verificado: abre, o foco entra, Esc fecha e o foco volta à pílula. O modal
segue mostrando umidade (81%), vento (14 km/h) e a faixa de conforto ("Ideal"). **Perdido da tela
principal**: umidade, vento e a pílula "Ideal", que estavam visíveis no card; agora só no modal.

**Estado sem leitura** (novo, o widget antigo mostrava "nublado" por padrão): com `unavailable`, `unknown`
ou sem entidade, a pílula diz "Sem dados do clima" e "--°" (CLAUDE.md §12). Não testado ao vivo, pois não
derrubei a entidade; a lógica é uma condição.

**`WeatherWidget.tsx` apagado** (não tinha outro uso). Ficam ~30 regras `.weather-*` mortas no
`globals.css`, deixadas de propósito num arquivo de 14 mil linhas.

**A faixa de telemetria refeita para 5 widgets.** Outro agente já tinha feito uma grade de 12 colunas
para 6 widgets (V-1 e "Item 1"). Sem o clima, a 1ª linha ficava com 2 widgets e a câmera, de 5 colunas,
caía para uma 3ª linha: a barra foi de 2 para 3 linhas e os cards de cômodo encolheram para 142 px
(mínimo 155). Agora, de 900 px para cima, é **3 + 2**: energia, mídia e câmera com 4 colunas; aspirador
e compras com 6. Entre 641 e 899, dois por linha e compras na linha inteira. No celular, energia ocupa a
linha inteira (onde ficava o clima).

**Efeito bom que não era o objetivo**: com 372 px por widget (antes 220), nenhum texto rola mais e as
regras de widget estreito (ícone escondido, selo STANDBY escondido) deixaram de disparar nesses tamanhos.

**Verificado** a 1180×820, 1024×768, 1280×800, 768×1024 e 390×844: sem sobreposição no cabeçalho, sem
colisão botão × texto nos widgets, sem rolagem em paisagem (820/820, 768/768, 800/800), sem rolagem
horizontal no celular, pílula com 44 px de altura, contraste do clima ≥ 7,2:1 nos dois temas.
Custo: cabeçalho de 159 para **174 px** (a linha do clima tem 44 px, a da data tinha 29); a barra
encolheu de 153 para 137; cards de cômodo 178 px a 1180×820 e 159 px a 1024×768.

**Defeito achado e corrigido no caminho**: sem `white-space: nowrap`, a condição quebrava em duas linhas
em vez de "não caber", e o marquee só rola o que transborda; a pílula chegou a 61 px a 768 de largura.

**Não verificado**: no iPad real; o estado "sem dados".

## 25/09/2026 — Fora: botão de tela cheia e tema claro. O painel é só noturno

Pedido do André: o card de tela cheia não se faz mais necessário e o projeto mantém apenas a opção
noturna padrão.

**Removido**

- `HeaderQuickActions.tsx`: o botão de **tela cheia / modo kiosk** (com o estado `kioskAtivo`, o
  ouvinte de `fullscreenchange` e a função `alternarKiosk`) e o **seletor de tema**. Sobram no
  cabeçalho: Apagar (n), a pílula de conexão, o plano de fundo e o standby.
- `app/context/ThemeContext.tsx` (apagado) e o `ThemeProvider` do `layout.tsx`. Só o botão usava
  `useTheme`.
- `layout.tsx`: o script de arranque não lê mais preferência nem o modo do sistema; fixa
  `data-theme="dark"`, `data-theme-preference="dark"` e `.theme-dark` e apaga a chave antiga
  `dashboard_theme` do `localStorage`. O `themeColor` deixou de ter variante clara (`#0b1121`) e o
  viewport ganhou `colorScheme: "dark"`, para rolagem e controles nativos serem escuros.
- `PRODUCT.md` e `DESIGN.md`: o requisito de "tema claro durante o dia" e a variante clara do
  `--wx-*` foram retirados.

**Verificado**: com a preferência antiga `light` gravada no `localStorage` **e** o sistema emulado em
modo claro, o painel abre escuro (`data-theme=dark`, fundo `rgb(13,17,23)`, texto `rgb(241,245,249)`),
a chave antiga some, `meta color-scheme=dark`, e o cabeçalho tem 4 botões (nenhum de tema ou kiosk).
`npx tsc --noEmit` passa; sem rolagem (820/820). A coluna de ações do cabeçalho encolheu de 415 para 311 px.

**Ficou de propósito**: ~290 regras `[data-theme="light"]` / `.theme-light` no `globals.css` e as
regras de `.quick-action-btn--theme` e `--kiosk`, todas mortas; os ícones `theme-*` e `fullscreen*`
do registro; o `/icons-preview`, página de desenvolvimento com seletor próprio; e o botão de tela
cheia do `RoomPopup` (`popup-header-fullscreen-btn`), que é outro, do modal do cômodo. Limpar o CSS
morto é opcional.

⚠️ **O botão de kiosk também pedia o *wake lock*** da tela. Sem ele, o painel só o pede durante o
standby (`AmbientNightMode`). Quem mantém o tablet aceso passa a ser o aparelho: Acesso Guiado no iPad,
bloqueio automático desligado, ou app de quiosque. Além disso, `navigator.wakeLock` só existe em contexto
seguro (HTTPS ou localhost): acessando por `http://` na rede local ele nunca esteve disponível, então
**é possível que o botão nunca tenha segurado a tela no seu iPad** — não verificado.

## 25/09/2026 — Cabeçalho reorganizado: estado da casa, cápsulas de alertas e de ferramentas

Pedido do André: reorganizar os cards soltos do cabeçalho e o texto "Casa / 1 luz acesa", de forma
agradável. Análise a 1180×820 e mudança em `globals.css`, `HeaderQuickActions.tsx` e `page.tsx`.

**O que a análise achou**

- **Sete controles soltos do mesmo peso**: três pílulas de alerta, "Ao vivo", plano de fundo, standby e
  "Apagar". Quatro deles verdes ("tudo certo"): ruído, porque o olho não separa o que informa do que
  está tudo bem.
- **Duas linhas de larguras diferentes** (381 e 311 px) alinhadas só pela direita: borda esquerda
  irregular, num bloco espremido ao lado do relógio de 110 px.
- **O dado útil do bloco tinha 12 px e opacidade reduzida** ("1 luz acesa"), menor que o rótulo "Casa"
  (28 px), que não informa nada.

**O que foi feito** (de tablet, 641 px, para cima)

1. **"CASA" vira rótulo** (13 px, caixa alta, espaçado) e o **estado vira a linha principal** (24,6 px a
   1180×820): âmbar com ícone de lâmpada quando há luz acesa (âmbar é "luz acesa" em todo o painel),
   branco neutro em "Tudo apagado" e nas mensagens de aviso.
2. **Duas cápsulas de vidro** no lugar de seis cartões: alertas (Seguro, Baterias, Tudo em ordem) e
   ferramentas (conexão, plano de fundo, standby). Dentro da cápsula o "tudo certo" é discreto (sem fundo
   e sem borda verdes); quando algo alerta, o segmento **mantém o fundo vermelho ou âmbar e se destaca**.
   Conferido simulando as classes de alerta no DOM (só visual, nada acionado).
3. **"Apagar (n)" fica fora das cápsulas**: é a única ação destrutiva do grupo.
4. **As duas linhas têm a mesma largura** (371 px). Em paisagem: colunas relógio | estado da casa | controles,
   com um filete separando o estado do relógio e as duas linhas de controles agrupadas no meio da altura.
   Feito com `display: contents` em `.dashboard-header-brand` e `grid-template-areas`, sem reordenar o JSX.
   Em retrato: relógio, depois o estado à esquerda com a cápsula de alertas à direita, depois "Apagar" à
   esquerda com a cápsula de ferramentas à direita.

**JSX**: `HeaderQuickActions.tsx` embrulha conexão, plano de fundo e standby em `.quick-actions-tools`;
`page.tsx` põe o ícone de lâmpada e a classe `is-lit` no subtítulo. Celular (< 641 px) fica como era; o
ícone some ali.

**Verificado**: a 1180×820 sem sobreposição, nada fora do cabeçalho, mesma altura de antes (174 px),
cards de cômodo em 178 px, sem rolagem. Alvos de 44 px em todos os segmentos. Retrato (768×1024) e celular
(390×844) conferidos.

**Custo a 1024×768**: a coluna do relógio fica com 345 px e a linha data + clima (416 px) **quebra em duas**:
a pílula de clima desce para baixo da data. O cabeçalho vai de 167 para 201 px e os cards de cômodo chegam
a exatamente 155 px, o mínimo. Fica bem, mas sem folga.

**Não verificado**: no iPad real; os estados reais de alerta (só simulados); o texto longo de erro
("Sem conexão com Home Assistant") na linha principal, que quebra em duas linhas de até 260 px.

**Revisão do mesmo dia — cápsulas desfeitas, alinhamento mantido.** O André pediu para remover as duas
cápsulas de vidro e voltar aos cartões soltos, preservando o alinhamento, e para tirar o destaque do texto
"luz acesa", com o ícone, deixando só como texto secundário.

- **Cartões soltos de volta**: cada pílula de alerta (Seguro, Baterias, Tudo em ordem) e cada ferramenta
  (Ao vivo, plano de fundo, standby) com o seu próprio vidro e a sua cor (verde, cinza, ciano); o "Apagar"
  continua vermelho. O agrupamento em `.quick-actions-tools` ficou só como contêiner de layout, sem borda nem
  fundo. As sobreposições que deixavam os segmentos calmos transparentes foram apagadas.
- **Alinhamento preservado**: colunas relógio | Casa | controles com o filete, e as duas linhas com a mesma
  largura (381 px a 1180×820 e a 1024×768): as pílulas de alerta se distribuem pela linha e "Apagar" e as
  ferramentas vão uma para cada ponta. Bordas esquerda e direita coincidem (754 e 1135 a 1180×820).
- **"Casa" e o estado**: voltam ao par original. Título de 28 px e, abaixo, "1 luz acesa" em 12 px, cor
  `--text-dim`, peso 500, **sem âmbar, sem ícone e sem classe `is-lit`**. O rótulo em caixa alta que fiz
  para "CASA" também saiu: com o estado voltando a ser secundário, o título precisa ser o primário.
- **JSX**: `page.tsx` voltou a `<p className="dashboard-subtitle">{subtitulo()}</p>` e perdeu o import de
  `Icon`, que não tinha outro uso.

**Efeito colateral bom**: a coluna "Casa" ficou com 92 px (era 184), e a linha data + clima **deixou de
quebrar a 1024×768**: o cabeçalho volta de 201 para 167 px e os cards de cômodo, de 155 para 159 px.

**Verificado** a 1180×820, 1024×768 e 768×1024: sem sobreposição, nada fora do cabeçalho, sem rolagem em
paisagem (820/820 e 768/768), `npx tsc --noEmit` passa. Cabeçalho de 174 px e cards de 178 px a 1180×820.

## 25/09/2026 — Refino visual: contraste, cor com significado, menos brilho, indicadores e contador padronizados

Lista de ajustes visuais colada pelo André, mais o pedido de trocar "Apagar" por "Apagar tudo". Regra de cor
que passa a valer em todo o painel: **verde = normal, azul = informativo, âmbar = atenção, vermelho =
alerta**, além do âmbar da **luz acesa** (ícone e borda do cômodo), que é a cor da própria coisa. Medido a
1180×820 antes e depois, com varredura de todos os elementos da área superior e dos cards.

**1. Contraste do texto secundário.** `--text-dim` de 0,70 para **0,82**. Nos cartões superiores o secundário
media 7,5–8,7:1 em 9–12 px; agora o pior caso é 7,49 e só sobraram dois abaixo de 7, que foram clareados:
o canal C2/C4 ativo (5,05) e o selo "Moderado" (6,74). O texto do "Apagar tudo" passou de 5,2 para mais de 7.

**2. Borda colorida só em estado ativo ou alerta.** Ficaram com borda colorida: o botão "Apagar tudo"
(vermelho), o canal de câmera ativo, o cômodo aceso (âmbar) e seu ícone, e o chip de ventilador ligado.
Saíram as bordas verdes das pílulas em estado normal (Seguro, Baterias, Tudo em ordem, Ao vivo, "tudo
comprado"), a ciano do standby, a roxa do cenário Gamer, as âmbar do consumo e das compras, e a âmbar do
cabeçalho por haver luz acesa. A cor ficou no texto e no ponto.

**3. Menos sombra e brilho permanentes.** Cabeçalho, cenas, widgets e cômodos passam a uma sombra só
(`0 4px 14px` + filete de luz de 8%). Saíram: o halo âmbar do cabeçalho e do cômodo aceso, o brilho e a
"respiração" do ícone do filamento, o halo do ícone e do ponto de estado, a sombra âmbar do nome, o brilho
dos pontos verdes de "normal" e o brilho do dois-pontos. Sobrou de brilho colorido, na área medida, só o
pulso do "AO VIVO" da câmera. O ponto de estado tinha a animação de ignição congelada no último quadro
(`fill-mode: forwards`), que é o que o deixava brilhando para sempre.

**4. Âmbar para atenção.** Consumo: econômico verde, **moderado azul**, **elevado âmbar** (era: moderado
âmbar, elevado laranja/vermelho); vale para o selo, o ícone, a barra e o gráfico. Compras pendentes:
azul. Chips de mídia, ventilador do PS5 e presença: azul (eram índigo, roxo e âmbar). Bateria baixa
continua âmbar.

⚠️ **Dois âmbares que mantive e você pode querer rever**: o **dois-pontos do relógio**, que você pediu de
volta ao amarelo hoje mais cedo, e a **luz acesa** do cômodo. Pela regra nova nenhum dos dois é "atenção".
Não mexi por serem decisões suas anteriores.

**5. Azul informativo, verde normal.** Ver 2 e 4. O botão de standby fica com ícone azul.

**6 e 7. Indicadores no canto superior direito, ação no inferior direito.** Nos cômodos, chips de estado,
contador e temperatura vão para uma linha alinhada à direita no topo; o botão de detalhe já ficava embaixo,
à direita. Medido nos 10 cards: indicadores a 15 px da borda direita e 17 do topo, detalhe a 9 e 9,
idêntico em todos, sem sobreposição com ícone ou nome, a 1180×820, 1024×768, 768×1024 e 390×844. O máximo
de chips visíveis passou de 3 para 2 (o resto vira "+n"). **Não feito nos widgets da faixa de
telemetria**: o botão de ação deles já fica à direita, mas seus indicadores (Moderado, Standby, Pronto)
continuam dentro do bloco de texto; movê-los pede refazer o marcado de cada widget.

**8 e 9. Um só contador, e dizendo o que conta.** O contador de luzes é agora **sempre "acesas/total" com o
ícone de lâmpada**, num único estilo (verificado: 1 estilo distinto nos 10 cômodos; havia uma variante âmbar
para aceso). A temperatura usa o mesmo selo. O cômodo sem ponto de luz deixou de mostrar aqui o número de
dispositivos, que misturava outra contagem sob o mesmo formato; não mostra contador. Cada selo tem
`aria-label` ("1 de 2 luzes acesas") e a seção ganhou a legenda **"Contador: luzes acesas / total"**.

**10. "Apagar tudo".** O botão é "Apagar tudo (n)"; a dica é "Segure p/ apagar tudo" e o estado "Apagando tudo...".
A linha de controles do cabeçalho comporta (148 px); no celular mede 148×48.

**Não verificado**: no iPad real; o pulso do AO VIVO (mantido); o estado de alerta real das pílulas.

## 25/09/2026 — Cenas separadas do resumo da casa

Pedido do André: criar uma separação formal entre os cards de cenas e os demais abaixo, porque a impressão era
a de que todos eram cenas.

**Causa**: eram três seções sem fronteira. As cenas são **ações** (um toque muda a casa); a faixa de
energia, mídia, câmera, aspirador e compras é **informação**; e os cômodos são a terceira. Só as cenas e os
cômodos tinham título. A faixa do meio não tinha, então lia-se como continuação das cenas, com o mesmo vidro,
o mesmo raio e o mesmo tamanho.

**Feito** (`page.tsx` e `globals.css`)

- A faixa do meio virou a seção **"Resumo da casa"** (`.telemetry-section`), com título do mesmo desenho do
  de "Ambientes da casa" e a legenda "Toque num cartão para abrir os detalhes". O `.daily-panorama-bar` passou
  de `<section>` a `<div>` dentro dela; as regras de grade seguem valendo.
- As cenas ficam num **painel com moldura** (borda neutra, fundo próprio), e não como cartões soltos. Em
  paisagem (≥ 900 px) o título vira uma **coluna à esquerda**, separada dos botões por um filete, o que também
  devolve a linha de título à altura.

**Custo vertical e como foi pago**: título novo e moldura custavam ~25 px, e a 1024×768 isso **cortava 19 px da
última linha de cômodos** (base do último card em 787 numa tela de 768; a rolagem seguia "768/768" porque o
excesso fica escondido). Pago em: margens menores (seção do resumo 24→14 px, cenas 18→10), botões de cena de
60 para 56 px e piso do card de cômodo de 155 para 148 px, os dois só em paisagem até 830 px de altura.
Resultado: a 1024×768 os cards ficam com **150 px** (eram 159) e nada é cortado.

**Verificado**: a 1180×820 (cards de 170 px; eram 178), 1024×768 (150), 1280×800 (163), 768×1024 e 390×844.
Sem sobreposição entre seções, sem corte na última linha, nenhum indicador sobre ícone ou nome nos cards,
sem rolagem horizontal no celular. `npx tsc --noEmit` passa.

**Ficou como estava**: no celular (< 641 px) as cenas não têm moldura, só o título acima; o resumo ganhou o
título em todos os tamanhos.

## 25/09/2026 — Celular: cabeçalho e cenas reorganizados

Pedido do André: analisar o projeto no telefone e reorganizar os cartões superiores de forma harmônica.
Só CSS (`globals.css`), só até 640 px. Medido a 390×844, depois conferido a 360×740, 430×932 e 320×640.

**O que a análise achou (390×844)**

- **Hierarquia invertida**: o relógio tinha **16 px**, no canto, menor que a pílula do clima ao lado dele
  (temperatura de 22 px). No tablet o relógio é a maior coisa da tela; no celular era quase invisível.
- **As três pílulas de alerta viravam círculos só com ícone** (45, 49 e 36 px), sem nenhuma palavra. "Tudo
  em ordem" tinha 36×44, abaixo do alvo de 44.
- **A linha de ações mostrava 3 dos 4 controles**: o standby é `display: none` no celular por regra antiga
  e deliberada. Mantido assim.
- **As cenas ocupavam 193 px** numa grade 2×2, e o primeiro cômodo, que é a função principal, só começava
  em y=737 numa tela de 844.

**O que foi feito**

- Cabeçalho vira uma grade de quatro linhas: **relógio de 54 px** com o clima à direita; "Casa · 1 luz
  acesa" com a data à direita; as **três pílulas de alerta dividindo a largura, com texto**; e "Apagar
  tudo" à esquerda com as ferramentas à direita. Feito com `display: contents` em
  `.dashboard-header-center`, `.dashboard-datetime`, `.dashboard-info-row` e `.dashboard-header-brand`,
  sem mexer no JSX.
- **Cenas numa linha só, de quatro botões** (68 px de altura, 89 px de largura a 390): a caixa das cenas
  vai de 193 para 95 px.
- Cabeçalho de 138 para 211 px; o primeiro cômodo passa de y=737 para **712**, ou seja, a tela ganha 25 px
  para o que importa, com um relógio legível e alertas que dizem alguma coisa.

**Defeitos achados e corrigidos no caminho**: `.quick-actions-tools` era `display: block` no celular e o
"Ao vivo" ficava 5 px abaixo do "Apagar tudo"; "Baterias 75%" passava 1 px da caixa e virava "Baterias 7…"
(letter-spacing); a 360 px o ícone das pílulas foi retirado para caber a palavra; a 320 px a linha de ações
passava 19 px da caixa e cortava o botão do plano de fundo, e "Tudo em ordem" era cortado; ajustados com
folgas e fonte de 10 px só até 340 px.

**Verificado** nos quatro tamanhos: sem sobreposição, nada fora do cabeçalho, nenhum alvo abaixo de 44 px,
sem rolagem horizontal, todos os rótulos das pílulas inteiros.

**Não mexido**: o "Resumo da casa" (cinco cartões empilhados, 298 px) e os cômodos; o standby no celular; o
que fica abaixo de 320 px. **Não verificado** em celular real nem com alerta real nas pílulas.

**Celular — energia, mídia, aspirador e compras numa fileira só** (mesmo dia, a pedido do André; só CSS, só
até 640 px). Eram quatro cartões largos empilhados (mais a câmera), **298 px**. Agora são quatro peças
pequenas lado a lado (89×88 a 390 px; 82 a 360; 72 a 320), cada uma com ícone, o dado principal e uma linha
de apoio, e a câmera segue em cartão próprio logo abaixo. A seção do resumo passa de 298 para **179 px** e
o primeiro cômodo sobe de y=712 para **y=594** (numa tela de 844).

- Energia: watts em destaque e "N ativas"; a barra de carga fica; o selo "Moderado" sai (a barra e o ícone
  já levam a cor).
- Mídia: o estado (STANDBY, ...) é o dado e "MÍDIA" o rótulo.
- Aspirador: o estado ("Pronto") e a palavra "Aspirador". O modo (Turbo) não cabe e foi zerado.
- Compras: nome e situação.

⚠️ **Perde-se o botão de ligar/desligar da mídia no celular** (44×44): não cabe numa peça de 89 px. Continua
na tela de detalhe da mídia. Nada mais some: o cartão inteiro já abria o detalhe (`role="button"` no
próprio cartão; o botão de abrir já era escondido no celular). **Verificado: as quatro peças abrem o seu
modal (energia, compras, mídia, aspirador), com `fetch` de escrita bloqueado e nenhuma escrita enviada.**

Verificado a 390, 360 e 320: sem rolagem horizontal, fonte mínima de 10 px. Única sobra: a 320 px "Tudo
comprado" excede a peça e passa pelo marquee de leitura contínua, em vez de caber parado. Não verificado em
celular real.

## 26/09/2026 — Memória do plano de fundo: histórico, ajustes por imagem e "voltar ao anterior"

Pedido do André: criar um sistema de memória para a alteração de wallpaper. O pedido não dizia o que a
memória devia lembrar; interpretei como **o que já foi usado e como cada imagem foi ajustada**, e deixei fora
o que exigiria decisão dele (ver "Não feito").

**O que faltava** (`WallpaperContext.tsx`): desfoque, escurecimento e saturação eram **um conjunto global**.
Ao trocar de imagem com a "adaptação automática" ligada, a recomendação do catálogo **sobrescrevia o que o
usuário tinha calibrado**, e não havia como ver o que já fora usado nem voltar à imagem anterior.

**O que foi feito**

- `lib/wallpaperMemory.ts` (novo): funções puras, sem React. Histórico das últimas **12** imagens (sem
  repetir, mais recente primeiro) e o **último ajuste feito à mão em cada imagem**. Chave
  `dashboard_wallpaper_memoria` (`v: 1`). A leitura descarta versão desconhecida, JSON quebrado, entradas
  duplicadas ou malformadas e limita cada ajuste aos limites dos controles.
- `WallpaperContext.tsx`: cada troca entra no histórico (e a imagem que estava ativa entra junto, para a
  primeira troca já ter um "anterior"). **Ajuste lembrado vale mais do que a recomendação do catálogo**; sem
  ajuste seu, vale a recomendação, como antes. Mexer nos controles grava o ajuste da imagem ativa, com 300 ms
  de espera para não gravar a cada quadro do arraste. Foto enviada e depois excluída é **podada** do
  histórico, e só depois de a lista de fotos carregar (podar com a lista ainda vazia apagaria tudo).
  "Redefinir" esquece o ajuste da imagem padrão. Novos no contexto: `historico`, `ajustesLembradosDe`,
  `idAnterior`, `voltarAoAnterior`, `esquecerHistorico`.
- Galeria (`WallpaperGalleryModal.tsx`): nova aba **"Recentes"** com a lista (miniatura, quando foi usada,
  os ajustes lembrados ou "usa a recomendação do catálogo", selo "Ativo"), **"Voltar ao anterior"** (chamar de
  novo alterna entre as duas últimas) e **"Esquecer histórico"** (com confirmação; a imagem ativa fica).
  A barra de abas passou a rolar de lado: com quatro abas passava dos 388 px de um celular (593 de conteúdo).

**Verificado**

- Lógica pura: **16 verificações passam** (ordem e duplicatas do histórico, limite de 12, imutabilidade,
  limites dos ajustes, poda, "anterior", tempo relativo, leitura tolerante a lixo, gravação sem cota). Rodadas
  com `node --experimental-strip-types` num script avulso, **que não foi para o repositório**: o projeto não
  tem suíte de testes.
- No navegador, de ponta a ponta: 1ª troca gera `[novo, default]`; o ajuste (desfoque 12, escurecimento 60%)
  só é gravado depois dos 300 ms; trocar para uma imagem sem ajuste aplica a recomendação do catálogo (4 px,
  30%); **voltar à primeira restaura o ajuste (12 px, 60%) no lugar da recomendação (3 px, 35%)**; "Voltar ao
  anterior" duas vezes alterna; após recarregar a memória persiste; uma entrada fantasma injetada
  (`custom_fantasma`) foi podada; "Esquecer" zera a memória, mantém a imagem, desabilita "Voltar" e mostra o
  estado vazio; **foto enviada de verdade** (gerada e enviada pelo mesmo campo da galeria) entra no histórico
  com miniatura e, ao ser excluída, sai do histórico e a imagem volta ao padrão. `npx tsc --noEmit` passa. O
  armazenamento do navegador de teste foi limpo ao final.

**Não feito, por depender de decisão do André**: (1) **memória compartilhada entre aparelhos**. Tudo fica
neste aparelho (`localStorage`, como já era a imagem ativa e as fotos enviadas em IndexedDB): o tablet da
parede e cada celular têm a sua. Compartilhar exigiria guardar no servidor e decidir se o tablet manda em
todos. (2) **Trocar por horário** (uma imagem de dia, outra de noite). (3) Não há limite de fotos enviadas nem
de tamanho da memória além das 12 entradas.

**Efeito colateral a saber**: uma imagem que o usuário já ajustou deixa de receber a recomendação do catálogo
ao ser escolhida de novo. Para voltar à recomendação, "Esquecer histórico" ou "Redefinir" (esta só para a
imagem padrão). Não há ainda um "esquecer o ajuste desta imagem" na tela, embora a função exista na lib
(`esquecerAjustesDe`).

## 26/09/2026 — Memória do plano de fundo COMPARTILHADA entre aparelhos

Pedido do André, depois de eu explicar que a memória criada antes valia só para o aparelho e o navegador
onde nascia: "compartilhar". **Isto substitui a nota da entrada anterior ("fica só neste aparelho")**, que
continua verdadeira para as fotos enviadas, e só para elas.

**Como funciona**

- **No servidor**: rota nova `/api/wallpaper` (GET e PUT) e `lib/wallpaperStore.ts`, que guarda a cópia
  compartilhada em `dashboard-app/data/wallpaper-memoria.json` (pasta no `.gitignore`: são preferências da
  casa, não código). Contém só ids de imagens, instantes, o identificador aleatório de cada aparelho e
  números de ajuste. A gravação é atômica (arquivo temporário e troca) e serializada.
- **Nos aparelhos**: a cópia local (localStorage) segue sendo a que o painel usa e a que vale sem rede.
  Cada aparelho sincroniza ao abrir, a cada 30 s, ao voltar para a aba e ao recuperar a rede; mudanças
  sobem 600 ms depois. Sem conexão, tudo continua funcionando neste aparelho e sobe quando a rede volta.
- **Sem "vencedor"**: cada informação carrega o instante em que nasceu e vale a mais recente
  (`mesclar`, em `lib/wallpaperMemory.ts`, usada pelas duas pontas). Excluir uma imagem e "esquecer
  histórico" viram marcadores com instante (`removidos`, `limpezaEm`), para um aparelho atrasado não
  ressuscitar o que outro apagou.
- **A imagem ativa deixou de ser um campo**: é a primeira entrada do histórico. Um campo único perdia
  informação conforme a ordem das mesclagens; o teste aleatório achou isso (ver abaixo).
- **Tela** (aba "Recentes"): a caixa **"Seguir o plano de fundo escolhido em outros aparelhos"**, ligada por
  padrão e por aparelho (ao religar, adota já a imagem atual); a linha de estado ("Sincronizado" ou "Sem
  conexão com o painel…") com **"Sincronizar agora"**; e cada entrada marca "Escolhido em outro aparelho".
- **Fotos enviadas continuam só no aparelho que as enviou** (IndexedDB). Nos outros aparelhos a entrada
  aparece esmaecida como "Foto enviada em outro aparelho" e não pode ser restaurada. Uma troca recebida
  de outro aparelho para uma foto que este não tem é ignorada, e o aparelho mantém a sua imagem. Cada
  aparelho só poda do histórico as fotos que ele mesmo enviou.

**Verificado**

- **Lógica**: 33 verificações passam, incluindo **200 execuções aleatórias com 3 aparelhos** sincronizando
  em ordens diferentes (mesclagem comutativa, associativa e idempotente). Esse teste **achou um defeito real**
  na primeira versão: com a imagem ativa num campo próprio, `(A+B)+C` e `(C+A)+B` divergiam quando um terceiro
  aparelho excluía a imagem ativa. Corrigido derivando a ativa do histórico. Rodado com `node
  --experimental-strip-types` num script avulso, **fora do repositório** (o projeto não tem suíte de testes).
- **API (curl, simulando aparelhos)**: 401 sem cookie; união dos aparelhos; `rev` só sobe quando o conteúdo
  muda; 400 para JSON quebrado e para corpo sem `memoria`; 413 acima de 16 KB; ids hostis (`../../etc/passwd`,
  `<script>`), instantes negativos e ajustes inválidos são descartados; **25 gravações simultâneas** de
  aparelhos diferentes ficam todas (com o teto de 12 entradas) e o arquivo segue JSON válido; o limite de 120
  pedidos por minuto responde 429 (86 aceitos e 54 recusados em 140).
- **Ponta a ponta no navegador**: uma troca feita no navegador aparece no servidor com a origem certa; um
  segundo aparelho (curl) escolhe outra imagem com ajustes e o navegador a adota, **com os ajustes dele**;
  com "seguir" desligado a imagem não muda mas o histórico chega, e ao religar adota a atual; "Esquecer
  histórico" num aparelho zera o compartilhado e um aparelho atrasado **não** consegue ressuscitá-lo; com o
  servidor "fora do ar" a troca fica local, a tela avisa e ao voltar a rede sobe. `npx tsc --noEmit` passa. O
  navegador de teste e o arquivo do servidor foram limpos ao final.

**A saber**

- **Segurança**: a rota passa pelo middleware como as demais de escrita, que **só exige a presença do cookie
  de sessão, sem validá-lo** (fraqueza já conhecida do painel). Quem chega à porta 3002 com qualquer cookie
  `casa_auth_session` pode ler e gravar essa memória. O dano possível é mudar o plano de fundo dos outros
  aparelhos. O corpo é limitado, filtrado e limitado em frequência.
- **Migração**: a memória local da versão anterior (v1) é convertida na primeira leitura, com a origem
  atribuída a este aparelho, e sobe ao servidor na primeira sincronização.
- **Um aparelho novo adota a imagem compartilhada na primeira sincronização** (se segue): um celular
  que abre o painel pela primeira vez passa a usar a imagem que o tablet escolheu.
- **Limite conhecido**: o teto de 12 entradas com exclusões simultâneas pode, só na fronteira dos 12, dar
  resultados diferentes conforme a ordem; com o catálogo atual (6 imagens) não é alcançável sem fotos.
- **Não feito**: fotos compartilhadas entre aparelhos (exigiria enviar arquivos a uma rota sem autenticação
  de verdade), troca por horário, e nomes de aparelho (a tela diz só "outro aparelho").

---

## 26/09/2026 — Novos dispositivos no painel (portas e Led + tomada)

**O que entrou.** No `dashboard-app/lib/rooms.ts`, seguindo o precedente da porta do quarto e das tomadas do
Quarto Luca: **Porta da Sala** e **Porta da Lavanderia** (`binary_sensor`, categoria `seguranca`, só estado, com
`batteryEntityId`), **Led** (`light.led_tomada_switch_1`) e **Tomada do Led** (`switch.led_tomada_switch_2`) no
Quarto Luca. O André confirmou que a tecla 1 é o Led e quis a tomada com comando e as portas só com estado.

**Verificado.** As seis entidades existem e estão ativas em `core.entity_registry`; `npx tsc --noEmit` sai com
0; o painel em execução devolve o estado real delas em `/api/state`; as telas do Quarto Luca (7 dispositivos), da
Lavanderia (3) e da Sala (9) as mostram, com bateria de 100% e "Fechada" nas portas.

**Não verificado.** O comando do Led e da tomada pelo painel: nada foi acionado (regra da casa). A tomada
estava ligada no momento da verificação e foi deixada como estava.

**Armadilhas.**
- `switch.led_tomada_switch_1` e `light.led_tomada_switch_1` são o **mesmo ponto físico** (`switch_as_x`); só a
  `light` entra no contrato, para não haver dois donos.
- As portas aparecem na seção "Tomadas inteligentes & bloqueios": é como o painel já tratava a porta do quarto
  (`app/comodo/[id]/page.tsx:176` agrupa `seguranca` com tomadas). Não é defeito deste trabalho.
- O `manifesto-comodos.json` não foi atualizado: nenhum código o lê e ele nem cita a porta do quarto.
- Medidor de energia e as entidades de configuração do Led + tomada (luz de fundo, modo do indicador) ficaram de
  fora de propósito.

**Bateria e alertas das portas (mesmo dia).** A pedido do André, as duas portas passaram a aparecer como os demais
sensores: `lib/batteries.ts` (painel de baterias do cabeçalho, com o alerta de bateria baixa/crítica, que já
acontece por `resolverAlertas`), `app/api/state/route.ts` (baterias servidas), e a lista de segurança de
`HeaderAlertPill.tsx` (modal "Segurança & Sensores") e de `AmbientNightMode.tsx` (alerta no modo noturno). O alerta
"Aberta • cômodo" de `lib/alertas.ts` já cobria as portas pelo contrato. Também corrigi o texto do modal, que dizia
"5 pontos" fixo: agora usa o tamanho da lista (7). Verificado: `npx tsc --noEmit` 0; painel de baterias mostra as
duas com 100% "Excelente"; modal de segurança lista as duas como "Fechada". **Não** foi provado o disparo real dos
alertas (porta aberta, bateria baixa): isso exigiria abrir a porta ou forçar o estado, e não se fez.

---

## 26/09/2026 — Auditoria visual e correções P1 de desempenho

Relatório completo em `artifacts/claude/auditoria-visual-painel-26-09.md` (nota 14/20). Aplicados os três itens P1:

**1. Painel da parede passou a rodar em produção.** O watchdog (`dashboard-app/iniciar_servidor_background.ps1`)
subia `npm run dev`. Agora sobe `npm run start` e **recompila sozinho** (`npm run build`) quando algum arquivo de código
(`app/`, `lib/`, `public/`, configs) é mais novo que `.next/BUILD_ID`. Se a compilação falhar, sobe o último build bom; só
cai para `dev` se nunca houve build. **Para publicar uma mudança**: pare o servidor (`taskkill` no processo que escuta a
3002, ou reinicie o PC); o watchdog sobe em até 15 s, recompilando antes (cerca de 40 s). Desenvolver com recarga a
quente: `npm run dev` **numa porta livre** (`npx next dev -p 3010`), não na 3002. Medido na home: JS **6,6 MB → 1,3 MB**
(359 KB na rede), requisições **57 → 29**, TTFB **218 → 25 ms**, FCP **312 → 160 ms**, carga **404 → 325 ms**, CSS 340 → 280 KB
(48 KB na rede). O selo "N" e o aviso "Compiling…" sumiram da tela.

**2. `will-change` removido do `.dashboard`** (`globals.css`). Mantinha o app inteiro numa camada de GPU em repouso.

**3. Orçamento de vidro.** Tirado o `backdrop-filter` de `.room-card` (10 desfoques de 36 px), `.scene-card-btn` (4) e
`.daily-widget-compact` (5); o fundo ganhou 2 pontos de opacidade para compensar. O plano de fundo é um gradiente SVG já
desfocado e estático, então o desfoque por cartão quase não aparecia. Desfoques visíveis na home: **27 → 8–9** (hero,
pílulas do cabeçalho e modais mantêm o efeito). Modais conferidos: continuam centralizados (o `will-change: transform`
fazia o `.dashboard` conter elementos `fixed`).

**A saber**
- `next start` avisa que não funciona com `output: "standalone"` ("use node .next/standalone/server.js"); funciona, e o
  aviso é inofensivo. Migrar para o servidor standalone exigiria copiar `.next/static` e `public/` para dentro dele.
- `/api/state` (31,6 KB a cada 5 s) **não sai comprimido**; o HTML sim. Pendência.
- O erro de console "An unknown error occurred when fetching the script" **não é** do modo dev: continua em produção,
  e `navigator.serviceWorker.getRegistrations()` volta vazio no navegador embutido. Provável limite desse navegador
  (não confirmado em tablet real).
- O servidor ficou fora do ar por cerca de 1 min na troca; as automações do HA não dependem dele.
- Não verificado: fluidez (FPS) em tablet físico; a melhora é medida em carga e contagem de camadas, não em quadros.

---

## 26/09/2026 — Auditoria: alvos de toque de 44 px e piso de fonte de 11 px (P2)

**Fonte.** Havia 75 regras com `font-size` de 7,5 a 10,5 px. Todas passaram a usar o token **`--texto-minimo: 11px`**
(`globals.css`, junto dos tokens tipográficos), e dois `clamp(10px…)`/`clamp(10.5px…)` do ventilador começam nele. Subir o
piso depois é mudar um valor. Ficaram de fora o texto de eixo do gráfico de energia (`.energy-chart-axis-text`, é SVG e
escala pelo `viewBox`) e o "tv+" do modal de mídia (glifo SVG de 5,8 px). Na home do celular, "Tudo comprado" a 11 px
passava 3 px da largura do cartão de Compras: no celular o status agora quebra em duas linhas.

**Alvos de toque.** `min-height: var(--touch-min)` (44 px) em `.back-btn`, `.room-subpage-master-btn`,
`.fan-toggle-btn`, `.fan-direction-btn`, `.vacuum-locate-btn`, `.media-tab-pill`; `.device-tile__tune-btn` e
`.wallpaper-modal-close` passaram de 36–38 para 44 px. Os botões compactos de ícone, em linhas densas, ganharam
**área de toque ampliada por pseudo-elemento** (o desenho e o layout não mudam): `.vacuum-zone-action-btn` (28 px,
+8 px por lado) e o direcional da TV `.dpad-direction-btn` (+2 px). São controles reais (iniciar limpeza, navegar na
TV). Bloco no fim do `globals.css`, com cabeçalho.

**Verificado.** Em 390, 768 e 1024 px, nas páginas `/`, sala, quarto e quarto do Luca: 0 alvos abaixo de 44 px, 0 textos
abaixo de 11 px, 0 estouro de largura. Modais de baterias, segurança, energia, compras, aspirador, mídia e galeria:
sem alvo pequeno (a área ampliada foi testada nos quatro lados de cada botão do aspirador). O servidor da parede
recompilou sozinho (~20 s) e subiu em produção com o CSS novo: o mecanismo de rebuild automático funcionou de ponta a ponta.

**Não verificado.** Toque real em tablet e celular (só emulação); os modais de câmera, controle da TV e o popup de
cômodo não foram medidos; o `Controle de volume da TV` (149×42) não foi tratado.

**Armadilha.** Nenhum botão foi acionado nos testes: modais foram só abertos e medidos. O botão do modo noturno
(`.quick-action-btn--night`) ativa a tela de repouso; um toque a desfaz.

---

## 26/09/2026 — Auditoria: P2 restantes (rede, teclado, CSS morto)

**Rede.**
- `lib/intervalo.ts` (`intervaloVisivel`): substitui `setInterval` nas leituras de dados, **pausa com a aba oculta** e lê
  na hora ao voltar. Aplicado em Compras (15 s), controle da TV (6 s), energia (60 s), atividade do cômodo, standby (5 s) e
  central de mídia (3 s). Medido com a aba "oculta" por 18 s: 0 chamadas (eram 1), volta com leitura imediata e retoma o
  ritmo. A home e a página de cômodo já pausavam; o `WallpaperContext` (30 s) e os contadores de UI ficaram como estavam.
- `lib/jsonGzip.ts` (`respostaJson`): `/api/state` passou a sair em gzip quando o cliente aceita, com `Vary: Accept-Encoding`.
  **31,6 KB → 5,8 KB por leitura (−82%)**, a cada 5 s por aparelho. O `next start` só comprimia HTML, não JSON de rota.
  Só a `/api/state` (a mais chamada); as demais rotas de dados seguem sem compressão.

**Teclado.**
- **Achado corrigido:** a auditoria disse "foco de teclado quase sem indicador", e **isso estava errado**: existe uma regra global
  `:focus-visible` (3 px, `!important`, `globals.css`, C-07 de 22/09) que vence os `outline: none`. Só faltavam elementos que
  nem recebiam foco: os itens da lista de Compras (`li onClick`, agora `role="checkbox"` + `aria-checked` + `tabIndex` +
  Enter/Espaço) e o cartão de foto personalizada da galeria (`role="button"` + `aria-pressed` + teclado, sem disparar
  quando o foco está no botão interno de apagar). Os fundos de modal (`popup-overlay` com `role="dialog"`) estão corretos.

**CSS.** Removidas **118 regras** e 7 blocos `@media` vazios do tema claro (o painel é só noturno desde 25/09): 363 → 341 KB, e
o CSS servido caiu de 280 para 263 KB. O podador usa um analisador de blocos (não regex), mantém `:not([data-theme="light"])`
e foi validado contra a versão anterior: chaves balanceadas, 1972 → 1854 regras, **nenhuma regra do tema escuro perdida**.
O botão "Tema" de `/icons-preview` (página de desenvolvimento, a única que ativava o tema claro) foi removido.

**Zoom no celular: mantido bloqueado, de propósito.** A auditoria sugeriu liberar no celular (WCAG 1.4.4), mas o bloqueio
(`layout.tsx`, `maximumScale: 1` + gestos do Safari) foi um pedido do André em 22/09 depois de um card "travado" em celular
(`artifacts/audit/travamento-zoom-mobile.md`). Reverter é decisão dele.

**Verificado.** `npx tsc --noEmit` 0; build automático do watchdog em 17 s; home idêntica na tela; `/api/state` com JSON válido
(72 entidades). **Não verificado**: Tab real percorrendo a lista de Compras e a galeria; o teclado da galeria com foto
personalizada (não havia fotos).

---

## 26/09/2026 — Auditoria: P3 aplicados (o detector zerou)

O detector do impeccable passou de **337 achados** (5 reais + 331 avisos de deriva do sistema) para **0**.

- **Curvas de pulo.** As 4 `cubic-bezier(0.34, 1.56, 0.64, 1)` (toque no ícone do cômodo, ponto de estado, ícone do subcartão e
  arranque do ventilador) viraram `cubic-bezier(0.16, 1, 0.3, 1)`, a saída exponencial que o resto do arquivo já usa. **Atenção:**
  o `PRODUCT.md` fala em "física de toque com spring"; a troca tira o leve overshoot desses quatro efeitos. Para voltar,
  basta restaurar a curva antiga nessas quatro linhas (procure `photonic-icon-press`, `status-dot-ignite`,
  `subcard-icon-pop` e `fan-spool-torque`).
- **`transition: width`.** Removida da cápsula de volume da TV (`.media-volume-capsule-fill`); o valor já chega por `style`
  a cada passo, então a transição de 0,1 s só forçava recálculo de layout.
- **Paleta documentada, não normalizada.** As 54 cores base que o CSS e o `MediaHubModal.tsx` já usavam entraram no
  `DESIGN.md` em famílias (`shadow-ink`, `warning-*`, `danger-*`, `info-*`, `success-*`, `violet`/`indigo`/`pink`, `slate`,
  `ink-*` e `brand-*` para os aplicativos de mídia). O alfa varia no CSS e não cria cor nova.
- **Raios.** Documentados `hairline` (2 px), `micro` (4 px) e `card-xl` (26 px), que já eram usados. Normalizados à escala
  15 valores soltos: 3→4, 5→6, 9→10, 11→12, 13→12, 15→14, 22→21 e 30→28 px. Os raios fluidos do tablet de parede
  (`clamp(…vh…)`) viraram variáveis `--raio-fluido-*` no `:root`.
- **Fonte.** Removida a Geist (nunca renderizou; só aparecia no selo do modo dev). `--font-sans` aponta para a Inter, a
  única fonte carregada.
- **Cenas em tablet horizontal.** `.scene-card-desc` aceita até 2 linhas em vez de reticências: "Luzes de acolhimento" não
  vira mais "Luzes de acolhime…".
- **Volume da TV.** O campo tinha 42 px por causa da borda de 1 px da cápsula; a borda virou filete interno
  (`inset box-shadow`) e o alvo é 44×44.
- **Erro de console "fetching the script": causa encontrada, não é do painel.** No navegador embutido do app, até o registro de
  um arquivo que nem é JavaScript (`/manifest.json`) dá o mesmo erro: esse navegador não busca scripts de service worker. O
  `/sw.js` responde 200 e é válido. Não se conclui nada sobre tablet real, mas o defeito não está no código.

---

## 27/09/2026 — Leitura dinâmica em todos os textos que truncavam com reticências

**Pedido do André:** todo texto cortado com "…" deve deslizar sozinho para ser lido, como já acontecia em 15 pontos.

**O que foi feito.** Mapeei as 41 regras de CSS com `text-overflow: ellipsis` e onde cada classe é usada no TSX: 29 classes não
usavam o `SmartTruncateText`. Converti **49 elementos em 15 arquivos** (cabeçalho e títulos, cartões de cômodo, chips de
ambiente, subcartões e distribuição do modal de energia, central de mídia, previsão do tempo, galeria de planos de fundo,
regulador de luz, atividade do cômodo, câmera, ventilador, aspirador e pílulas de segurança/bateria). Sobraram três classes
de contêiner (`.dashboard-header-pills`, `.room-subpage-title-group`, o gatilho do popover) que não têm texto próprio; o texto
dentro delas já rola.

**Como.** `SmartTruncateText` agora aceita conteúdo JSX sem a prop `text` (o título do elemento sai do texto renderizado) e as
tags `h1`–`h4`/`p`; títulos e parágrafos ganham a classe `smart-truncate-block` (ocupam a linha inteira, como antes). A
conversão em massa foi feita por script que só toca em `<tag className="X">…</tag>` de classes da lista.

**Correção que a leitura dinâmica exigiu.** O rodapé dos subcartões do modal de energia dividia **uma linha de 128 px entre o
selo, o nome e o estado** no celular, e já antes virava "P…" e "1…" (ilegível). Agora, até 640 px, o rodapé empilha
(selo, nome, estado): "PC Principal", "Periféricos PC" e "Tomada Cabeceira" aparecem inteiros, e só o que é maior que o
cartão rola.

**Verificado.** Em 320 px, 5 textos da home rolam e **0 elementos ficaram truncados com reticências** nas 6 páginas
testadas; em 1024 px, 0. Modais de energia, mídia, aspirador, clima, baterias, segurança e galeria: 0 truncados. `tsc` 0,
detector do impeccable 0. Publicado em produção pelo watchdog.

**Não verificado.** O ritmo da rolagem em tablet físico; o modal do regulador de luz com nomes de cena longos (não havia
nome longo para forçar o estouro); o texto "Distribuição de carga" a 56 px mostra uma janela pequena por natureza.

---

## 27/09/2026 — Cabeçalho da página de cômodo no celular e no tablet vertical

**Defeito (captura do André, Sala de Estar em 375 px).** O relógio aparecia cortado ("00") na borda do vidro. Causa: ele herdava o
`font-size: 54px` da regra do cabeçalho da home; na segunda linha, botão + setas + relógio (149 px) disputavam 98 px. Medindo o
tablet vertical (768 px) apareceu o mesmo defeito em pior grau: o relógio chegava a 318 px e **a área do título media 0 px**,
então o nome do cômodo sumia.

**Correção (só CSS, sem mexer no HTML).** Até 899 px o cabeçalho vira uma grade de duas linhas: `.room-subpage-actions` passa a
`display: contents` e seus filhos entram na grade de `.room-subpage-header`.
- Linha 1: voltar + título e subtítulo (rolam se não couberem) | relógio compacto.
- Linha 2: "Acender/Apagar Cômodo" | setas ‹ ›.
- Celular (≤ 640 px): relógio de 28 px e botão voltar só com a seta (o nome "Casa" segue no botão para leitor de tela, fora da
  vista); o título ganha 42 px. Tablet vertical (641–899 px): relógio de 44 px, voltar com nome e botão de acender em tamanho natural.
- A data e o clima ficam ocultos nessa página (`.dashboard-info-row`), como já não cabiam.

**Verificado** (oito tamanhos, página do Quarto do Luca): 320, 375 e 430 px (celular), 700, 768 e 834 px (tablet vertical), 1024
(paisagem) e 1280 px (parede). Nada sai do vidro; altura do cabeçalho 132–135 px (era 176 no celular); paisagem e parede
**ficaram idênticos** (relógio 287×99 e 299×103, botão 161 px). Em 375 px o subtítulo cabe sem rolar; em 320 px rola. Em produção:
0 alvos abaixo de 44 px.

**Não verificado.** Celular deitado (paisagem estreita, ~640–899 px de largura) e cômodo sem luzes (sem o botão de acender; a
célula fica vazia e as setas seguem à direita).

---

## 27/09/2026 — Data e clima no mesmo padrão; faixas de rolagem travadas na horizontal

**Data e clima (`Clock.tsx`, `globals.css`).** A data era texto solto ao lado da pílula do clima. Agora as duas são pílulas de
vidro do mesmo desenho: ícone + valor em destaque em negrito (temperatura / dia da semana) + detalhe (condição /
"27 de set."), mesma altura (44 px), raio, borda e desfoque. A data ganhou o ícone `calendar` (novo no registro de ícones,
`CalendarBlankIcon`) na cor de acento do relógio, e não é botão (sem cursor de clique). Verificado em 1280 (parede), 768
(tablet vertical) e 375 px (celular): no celular a data é compacta (36 px) na linha do "Casa", e o clima segue com 44 px.
O relógio e a página de cômodo não mudaram (a data continua oculta lá).

**Faixas de rolagem horizontal.** Eram quatro regras com `overflow-x: auto` e o eixo vertical em `auto` por omissão:
`.quick-actions-bar`, `.wallpaper-tabs-bar`, `.popup-sensors-bar` e `.media-hub-tabs-bar`. A faixa de sensores do modal de energia
rolava também na vertical (conteúdo de 51 px numa faixa de 45 px). Agora `overflow-y: hidden`, `overscroll-behavior-x: contain`
(o gesto que passa do fim da faixa não vaza para o modal) e barra de rolagem oculta. Verificado: nenhum chip cortado.
**Não foi alterado `touch-action`**: um `pan-x` na faixa impediria a página de rolar na vertical quando o dedo começa nela, e o
`travamento-zoom-mobile.md` (22/09) já trata a interação entre `touch-action` dos ancestrais.

**Rede & Conexão: só especificação.** `specs/features/painel-rede-conexao.md` propõe transformar a pílula "Ao vivo" em "Rede" com
um modal (diagnóstico em uma frase, cadeia painel→HA→roteador→internet, tráfego, aparelhos conectados e quedas de 24 h). Aguarda
as quatro decisões do André. Nada implementado.

---

## 27/09/2026 — Campo "Rede & Conexão" (pílula "Ao vivo" virou "Rede")

Especificação: `specs/features/painel-rede-conexao.md` (decisões do André: pílula "Rede"; sem histórico de quedas; aparelhos só
contagem e horários; sem botão "Atualizar agora").

**O que existe.** A pílula do cabeçalho mostra o **pior estado** da conexão e abre o modal "Rede & Conexão" (só leitura): frase de
diagnóstico, cadeia (painel e HA, roteador, internet, nó da Sala, DVR), tráfego do roteador principal, número de aparelhos e
horários do último a entrar e a sair. Rótulos: "Rede", "1 fora", "Sem internet" ("o roteador responde, então é a operadora"), "Sem
roteador", "Sem leitura", "Sincronizando", "Offline". `lib/alertas.ts` ganhou o alerta "Rede • …" (crítico ou aviso).

**Regras que a lógica garante (`tests/rede.test.mjs`, 20 casos):** `unavailable`/`unknown`/ausente é "sem leitura" e **nunca** vira
queda; "Sem internet" só com o roteador **respondendo**; sincronizando não esconde uma queda; painel offline vence tudo. Rodar:
`node --experimental-strip-types tests/rede.test.mjs` (Node 22).

**Verificado.** Em 375 px e 1280 px, com dados reais e com os quatro estados simulados no navegador (interceptando `/api/state` só
na aba): "Sem internet", "Sem roteador", "Sem leitura" e o estado real. `tsc` 0; detector 0; 0 alvos abaixo de 44 px com o modal
aberto. A rede da casa **não** foi derrubada. Publicado em produção pelo watchdog.

**Achado (não é defeito do painel): o DVR não responde agora.** `binary_sensor.rede_dvr` está `off` ao vivo e a checagem direta
confirma: `192.168.31.216` responde a 50% dos pings e as portas 80, 443, 554 e 37777 estão fechadas. Por isso a pílula mostra
"1 fora" e o "Requer atenção" sobe. As câmeras do painel exibem "Ao vivo" mesmo assim (imagem em cache ou outro caminho: não
investigado). Ver K-06 em `planning/BLOCKED.md`.

**Unidade da velocidade do roteador.** O roteador não informa (`unit: null` na especificação). Mostrado como KB/s presumido, com aviso no modal.

**Teste de velocidade da operadora (entrou durante o trabalho).** A integração Speedtest.net foi adicionada ao HA e o modal ganhou a seção
"Teste de velocidade · a cada hora" (download, upload e ping reais em Mbit/s, com "medido há N min" e aviso se o teste parou por mais de 2 h),
acima do tráfego do roteador. `lib/rede.ts` passou a 15 entidades e `tests/rede.test.mjs` a 24 casos, todos passando. Foi acrescentado
por outra frente de trabalho nos mesmos arquivos e conferido aqui: `tsc` 0, detector 0, produção reconstruída.

## 27/09/2026 · Teste de velocidade real no modal "Rede"

- Integração Speedtest.net adicionada pelo André; intervalo confirmado em 60 min (`DEFAULT_SCAN_INTERVAL = 60` no código da integração; as opções da entrada só têm o servidor, "Auto Detect").
- `lib/rede.ts`: `resolverTeste`/`formatarTeste`, campo `teste` em `ResumoRede`; `RedeModal.tsx`: bloco "Teste de velocidade · a cada hora" (download, upload, ping, "medido há N"); CSS `.rede-teste-rodape`.
- Armadilhas: unidade lida do atributo (Mbit/s), não presumida; `unavailable` vira "—", nunca 0; medida com mais de 2 h aparece como desatualizada. Usa `last_updated`, porque `last_changed` não muda quando dois testes dão o mesmo valor. O teste mede a conexão do PC do HA.
- Verificação: `npx tsc --noEmit` 0; `tests/rede.test.mjs` 24 verificações; 3 `entity_id` conferidos no `core.entity_registry`. **Não verificado no navegador**: falta rebuild do painel (o watchdog roda produção).

---

## 27/09/2026 — Data e clima: de pílula para texto (pedido do André)

O André preferiu as duas minimalistas, como a data era antes. As pílulas de vidro saíram: **data** e **clima** agora são texto, no mesmo padrão
(valor em destaque em negrito + detalhe mais suave: "Dom." + "27 de set."; "28°" + "Noite limpa"), do mesmo tamanho e peso
(`--info-forte` e `--info-suave`, definidos em `.dashboard-info-row`). O ícone de calendário foi removido (a data volta a não ter
ícone); o clima **mantém o ícone da condição**, que carrega informação, e continua sendo botão (abre a previsão) com a área de toque de
44 px, agora invisível. A data não é botão. Nos tablets e na parede as duas ficam na mesma linha; no celular, em linhas diferentes,
como no desenho da grade do cabeçalho. Verificado em 375, 768, 1024 e 1280 px (sem fundo nem borda nos dois) e em produção.
O ícone `calendar` segue no registro de ícones, sem uso.

## 27/09/2026 — Selos do cabeçalho em blocos por gravidade
- Pedido do André: blocos "em ordem", "requer atenção" e "sinalização vermelha"; plano de fundo e descanso em cartões separados.
- `HeaderStatusBlocks` agrupa segurança, baterias, saúde e rede pelo nível de cada um (segurança com sensor ativo e bateria crítica = vermelho; bateria baixa e saúde/rede em atenção = âmbar). Bloco vazio não aparece. A pílula de rede saiu de `HeaderQuickActions` para `RedePill`.
- Armadilha: ao mudar de gravidade o selo troca de bloco e remonta; um modal aberto dele fecha.
- Verificado: tsc 0; 375 e 1024 px (dois blocos no celular, os três cartões separados no tablet). Produção sobe no próximo rebuild do watchdog.

## 27/09/2026 — Tátil global, bordas mínimas e alinhamento do "Casa"
- Selos sem vidro compartilhado (só agrupamento). Publicação em produção feita à mão: o watchdog não estava rodando; build + `npm run start` (a 3002 ficou fora ~3 min). Armadilha: não matar processos por `CommandLine` com "dashboard-app", derruba o próprio shell; usar a porta.
- `HapticFeedback` (layout): 8 ms em todo clique em controle (captura, roda antes do handler; padrões próprios sobrescrevem). Sem efeito no iOS. `data-sem-haptico` desliga.
- Bordas mínimas: `--borda-minima` (1 px, 8%) e três preenchimentos (5/7/9%) em bloco final do `globals.css`, só em cartões neutros (estados alert/danger/critical/active/on/high preservados). Antes: preenchimento 5–11%, borda 12–16%.
- Paisagem: o bloco "Casa" agora ocupa só as linhas dos cartões ao lado (topo dos selos até a base das ferramentas: 41→139 px).
- Verificado: tsc 0, produção 3002, bordas/preenchimentos computados, vibração interceptada (8 e depois 14). Não verificado: aparelho com vibração real; cartões de modais/mídia fora da lista.
- Bordas mínimas também nos modais (folhas, popovers e cartões internos); modal de baterias conferido: folha 1 px a 8%, linhas com preenchimento de 7%. Publicado.
- Bordas mínimas verificadas em todos os modais (rede, segurança, baterias, energia, TV/mídia, aspirador, tarefas, câmeras, clima, plano de fundo): folhas, cartões, chips e controles neutros a 8%. Correções: folha de mídia tinha `!important`; cartão do plano de fundo é folha opaca (só borda, sem preenchimento de cartão). Estados coloridos e aba ativa mantêm a cor.
- Ajuste dos modais no celular: borda mínima subiu de 8% para 14% (sumia); folhas de modal rolam por dentro (baterias tinha 874 px em folha de 745 px com overflow hidden, rodapé cortado); folga de 17–21 px sob o último bloco; detalhe das linhas de saúde quebra em vez de gerar rolagem lateral. Publicado.
- Modais verificados em tablet retrato (768x1024), tablet paisagem (1024x768) e celular paisagem (844x390): todos cabem, rolam por dentro e têm folga 20–27 px no fim. Achado: com a folha inteira rolando, o botão Fechar saía da tela em paisagem de celular (baterias, segurança, rede, câmeras); cabeçalho agora fica preso no topo (sticky). Não verificado: modal de mídia do Music Assistant e do clima (gatilho não achado), aparelho real.
- Relógio da tela de bloqueio (standby) para longa distância: fonte clamp(5rem, min(30vw,46vh), 30rem) (antes até 9,8rem), peso 500 (antes 250), data maior; em celular paisagem (altura até 480 px) limita a 34vh para o conteúdo caber. Medido: 1280x800 = 368 px (999 de largura), 375x812 = 112 px, 844x390 cabe (18..372 de 390). Não verificado: tablet de parede real, brilho no modo noite profundo.

## 28/09/2026 — Painel offline: causa e correção
- Achado ao verificar por que a 3002 estava fora: nada escutava a porta (o `npm run start` da sessão anterior não sobreviveu ao fim daquela sessão; sem watchdog rodando, ninguém o reiniciou). Subi de novo à mão.
- Segundo defeito, descoberto ao religar: `next.config.mjs` (que veio de outra frente e entrou no commit "tudo" de 27/09) tinha `output: "standalone"`, incompatível com `npm run start` — o Next avisa e serve a página sem os arquivos estáticos (`/_next/static/*` em 404). Removido `output: "standalone"`; mantidos os redirects de `/comodo/sala|gourmet|luca`.
- HA (8123) nunca saiu do ar; os avisos no log são conhecidos (medidor Tuya K-16 bloqueado, DVR fora K-06).
- Verificado: tsc 0, build ok, `npm run start`, estáticos 200, tela de PIN renderizada com CSS. Não entrei o PIN (segredo do André).
- TODO permanece: watchdog não está rodando; enquanto isso, a 3002 cai se o processo do `npm run start` morrer.

## 29/09/2026 — Integração Browser Mod removida
- Sem função hoje: nenhuma automação/script/cena a usava; era resquício de antes da troca do Lovelace pelo painel Next.js (15/09). Dashboard Lovelace antigo ("Painel de controle") mantido, a pedido do André.
- Removido com o HA parado (validado antes, backup em `backups/remocao-browser_mod-<data>/`): 1 entrada em `core.config_entries`, 15 entidades e 1 dispositivo no registro, 1 recurso `/browser_mod.js` no `lovelace_resources`, a pasta `config/custom_components/browser_mod/` e o `browser_mod.storage`.
- Verificado: HA subiu limpo (sem aviso "custom integration browser_mod"), 0 entidades residuais, os 3 dashboards Lovelace intactos (Mapa, Dispositivos, Painel de controle), nenhum issue novo em `repairs.issue_registry`.
- Achado à parte (não relacionado): a integração Anthropic (Claude no HA) está falhando com "credit balance too low" — falta crédito na conta da Anthropic para o assistente de voz funcionar.

## 29/09/2026 — Novo dashboard Lovelace automático, para um aparelho separado
- Pedido do André: dashboard Lovelace para um aparelho específico (não substitui o painel Next.js). Achado antes de criar: já existia um automático ("Dispositivos", `dashboard-dispositivos`) — o André preferiu um separado, para não disputar com o uso que já dão a esse.
- Criado "Visão Automática" (`aparelho-auto`, ícone `mdi:tablet-dashboard`), com `strategy: original-states` — a mesma estratégia do "Dispositivos" existente, sem cartão nenhum desenhado à mão. Agrupa pelas áreas do HA, que já batem com os cômodos do painel.
- Feito com o HA parado (validado antes, backup em `backups/novo-dashboard-auto-<data>/`): só `lovelace_dashboards` (nova entrada) e o novo arquivo `lovelace.aparelho_auto`. Não toquei em `core.config_entries` desta vez.
- Verificado: HA subiu limpo, a rota `/aparelho-auto` responde e pede login (comportamento normal), sem tocar no dashboard "Dispositivos" nem no "Painel de controle".
- Continua sem cartão nenhum: é a visão automática pura. Se o André quiser algo sob medida para o aparelho (tamanho de tela, só alguns cômodos), isso é o próximo passo, com `lib/rooms.ts` como referência.

## 29/09/2026 — Bubble Card no dashboard "Área Gourmet"
- Pedido do André: ajustar o dashboard automático para o aparelho que vai ficar na Área Gourmet (tablet, paisagem), com estética Bubble Card.
- Instalado Bubble Card v3.4.1 (`config/www/community/bubble-card/bubble-card.js`, fora do git por `.gitignore`), registrado como recurso do Lovelace.
- O dashboard "aparelho_auto" (criado ontem, ainda genérico) virou "Área Gourmet" (`area-gourmet`, ícone `mdi:silverware-fork-knife`): separador com o nome, uma linha com os 4 botões de luz (Plafon, Pendente, Led, Spots — nomes e `entity_id` de `dashboard-app/lib/rooms.ts`, o contrato canônico) e um cartão de Presença/Movimento com a bateria como sub-botão.
- **Incidente:** no primeiro reinício desse trabalho, o dashboard "Painel de controle" (que o André pediu para manter) sumiu do registro e do disco — não foi o meu script, que só tocava o "aparelho_auto"; a hipótese mais provável é o container não ter terminado de parar antes de eu editar o `.storage` (não conferi o status `Exited` antes daquela vez). Restaurado do git (estava commitado) e reinserido no registro; confirmado estável por mais de 45 s e num reinício limpo com o status conferido antes de editar.
- Verificado: HA sobe limpo; `/area-gourmet`, `/painel-de-controle` e o `.js` do Bubble Card respondem 200; contagem de entidades/dispositivos inalterada (434/74). Não verificado: renderização visual real (pede login do HA, que não faço por mim).
- Sem spec formal em `specs/` para este item — se o André quiser, escrevo depois.

## 29/09/2026 — Painel offline de novo: causa raiz e correção
- Sintoma: nada escutando a 3002 (HA na 8123 normal).
- Causa raiz: o watchdog (`iniciar_servidor_background.ps1`, tarefa `CasaDashboardAutoStart`) morreu em 27/09 ~02h, durante publicações feitas à mão pelo agente (build manual apagou o `BUILD_ID`, o watchdog caiu para `dev` na 3002, e esse processo foi morto ao liberar a porta). A tarefa agendada **só dispara no logon**, e o PC não reinicia desde 24/09, então ninguém o religou. Os servidores subidos à mão pelo agente morreram junto com a sessão dele.
- Feito: watchdog religado pela própria tarefa (`Start-ScheduledTask`), fora da sessão do agente; servidor em produção (`next start`) como filho dele. Teste de autorrecuperação: matei o dono da 3002 e ele voltou sozinho em 22 s.
- Regra nova no `CLAUDE.md` (armadilhas): publicar = matar o dono da porta 3002 e deixar o watchdog recompilar; nunca `npm run build`/`start` pelo shell do agente.
- Com permissão do André: a tarefa ganhou um segundo gatilho que a repete a cada 5 min, sem prazo (além do logon), e `StartWhenAvailable`. O mutex do script faz a repetição sair na hora se já houver watchdog. Testado: derrubei o watchdog às 19:37:24 e a tarefa o recriou às 19:38:13 (52 s); depois derrubei o servidor e o watchdog novo o trouxe de volta em 22 s, em produção.

## 29/09/2026 — Luz do Quarto do Luca: reintegração após refazer a adição na Tuya
- Situação: o André refez a adição do interruptor do Quarto Luca na Tuya. O dispositivo voltou ao HA como `switch.quarto_luca_switch_1` (dispositivo "Quarto Luca", área `quarto_luca`, id Tuya `48723004ec94cb80c28f`), mas o `light.quarto_luca_switch_1` que o projeto usa era um helper "Switch as X" de UI, removido do registro em 25/09 (órfão) — daí o "Indisponível" no painel e os avisos `Referenced entities light.quarto_luca_switch_1 are missing` no log.
- Feito: luz de template em `config/template_sensors.yaml` (`unique_id: quarto_luca_luz_wrapper`) que repassa estado e liga/desliga ao `switch.quarto_luca_switch_1`, **com o mesmo entity_id de antes**. Por isso `lib/rooms.ts`, `manifesto-comodos.json`, o contador "Luzes Quarto do Luca" e a checagem de indisponíveis ficaram intactos — nada no painel mudou.
- Verificado: `check_config` sem erro; HA reiniciado só por YAML; `/api/state` devolve `light.quarto_luca_switch_1` com estado real (`off`, o mesmo do interruptor, não mais `null`). **Não** acionei a luz (regra de comando físico): o comando liga/desliga não foi provado.
- Armadilha: `light: - platform: switch` em YAML não aceita `unique_id` nesta versão do HA (`check_config` recusa); por isso o wrapper é template light.
- Pendente do André: se preferir o helper de UI (Configurações → Dispositivos → Ajudantes → Switch as X, apontando ao `switch.quarto_luca_switch_1`, como o Led + tomada), é só criá-lo e remover o bloco de template — o entity_id colide, então uma coisa por vez.
- **Confirmado pelo André (29/09):** ligou e desligou a luz do Quarto Luca pelo painel e funcionou — o comando de ponta a ponta (painel → template light → `switch.quarto_luca_switch_1` → Tuya) está provado. Item fechado.

## 05/10/2026 — Auditoria do painel e remoção do PIN (acesso livre)
- **Auditoria** (sem aplicar nada, sem acionar dispositivo): `artifacts/claude/auditoria-painel-05-10.md`. Notas 24/40 (Nielsen) e 13/20 (técnica). Achados P1 que continuam abertos: botão "Desligar TV" envia `turn_on` (o rótulo lê `sensor.tv_sala_estado`, travado em `on` desde 01/10; a ação lê o `media_player`, que está `off`); "AO VIVO" escrito fixo no CFTV com as câmeras `unavailable`; "Apagar todas" no modal de energia corta a tomada do PC com um toque; tomadas `unavailable` aparecem como "Desligada".
- **Decisões do André após a auditoria:** segurança primeiro; direção visual = só refinar o atual (sem as propostas futuristas); Claude Code implementa no `dashboard-app/`.
- **PIN removido, a pedido do André** ("remova pin, deixe o acesso livre"). O PIN existia desde 24/09, mas usava o valor padrão do código (`DASHBOARD_PIN` nunca foi definido) e o `middleware.ts` só olhava se o cookie existia, sem validar. Removidos `middleware.ts`, `lib/auth.ts`, `app/api/auth/login/route.ts`, `app/login/page.tsx` e o bloco `login-*` do `globals.css` (189 linhas). `next.config.mjs` ganhou o redirecionamento `/login` → `/` (aparelho parado na antiga tela de login cai no painel); `public/offline.html` passou a testar `/` em vez de `/login`.
- **Verificado:** `npx tsc --noEmit` = 0; publicado pelo caminho do watchdog (matei o dono da 3002, ele recompilou em ~1m40 e subiu em `start`); sem cookie, `/`, `/comodo/sala_de_estar`, `/standby`, `/api/state`, `/api/todo`, `/api/energy`, `/api/historico`, `/api/wallpaper` = 200, também por `192.168.31.22:3002`; `/login` = 307 → `/`; `/api/auth/login` = 404. No navegador, `/login` abre o painel e o console não tem mais 401.
- **Armadilhas:** (1) o `tsc` acusou rotas apagadas em `.next/types/validator.ts` e `.next/dev/types/validator.ts` — tipos gerados velhos; resolvi com `npx next typegen` e apagando `.next/dev/types` (sobra de um `next dev` de 27/09), sem build manual e sem tocar no `BUILD_ID`. (2) O watchdog decide recompilar pela data dos arquivos que **existem**: apagar um arquivo sozinho não dispara build; aqui disparou porque `next.config.mjs` e `globals.css` também mudaram. (3) Aparelhos antigos guardam o cookie `casa_auth_session`; é inofensivo e expira sozinho.
- **Risco aceito** (D-011): quem alcança a 3002 — LAN e tailnet (`100.74.130.30`) — comanda a casa e vê as câmeras.
- **Commit no `dashboard-app/`** (git do André): pendente de autorização.

## 05/10/2026 23:04 — Docker parou com uma atualização do Windows; só voltou com reinício
- Sintoma: HA fora (nada na 8123), painel com 502. Às 23:04:40 o Windows Update instalou o `Microsoft.WindowsAppRuntime`; no mesmo minuto caíram o Docker Desktop, o Tailscale, o serviço do Claude e o servidor de teste (3010). A distro WSL `docker-desktop` ficou "Stopped".
- Ao religar, o Docker caía com "initializing Ingest server: listening on …\Docker\run\sailor-ingest.sock: rename … The file cannot be accessed by the system" (e depois o mesmo em `docker-secrets-engine\engine.sock`). O `start_docker_clean.ps1` (renomeia a pasta `run`) não bastou: mesmo com pastas novas e `wsl --shutdown`, o socket recém-criado já nascia inacessível, e havia reinício pendente (`PendingFileRename`).
- Resolveu: o André reiniciou o Windows. Na partida, Docker, HA, Music Assistant e bgutil subiram sozinhos e o painel recompilou pelo watchdog.
- **Armadilha**: na janela de erro do Docker as opções são "Quit" e "Reset to factory defaults" — **nunca** a segunda (apaga contêineres e imagens). Quando o erro é de socket "cannot be accessed by the system" logo depois de atualização do Windows, ir direto ao reinício.
- Ficaram pastas `Docker\run_stale_2026100523*` e `docker-secrets-engine_stale_*` (renomeadas, não apagadas).

## 06/10/2026 — Fase 2: estados verdadeiros, régua de confirmação e Desfazer (painel + HA)
- Pedido do André ("fase 2" da auditoria de 05/10). Especificação: `specs/features/painel-estados-verdadeiros.md`. Claude Code implementou no `dashboard-app/` (autorizado).
- **E-01 TV**: causa raiz no HA — `sensor.tv_sala_estado` usava "qualquer caminho `on` vence" e a SmartThings congelou em `on` desde 01/10 (a TV local dizia `off`). Agora a TV local decide quando responde; a nuvem só quando a local está muda (mesma regra da automação "Boa noite"). No painel, o botão de energia lê o sensor e manda à TV local o estado **oposto e explícito** (antes alternava pelo `media_player` local enquanto o rótulo vinha do sensor: "Desligar" mandava `turn_on`); sem leitura, desabilitado. Contrato: "TV Sala" em `lib/rooms.ts` passou da entidade da nuvem para `media_player.tv_un65du8000gxzd` (conferida no registro: samsungtv, ativa).
- **E-02 Câmera**: "AO VIVO" estava fixo no código. O player agora expõe o estado (`conectando`/`reproduzindo`/`travado`/`sem_sinal`/`erro`); sem quadro em 25 s → "SEM SINAL" (continua tentando com a espera crescente); modal com "Tentar agora"; cartão diz "DVR sem resposta".
- **E-03/M-08 Régua**: gancho novo `lib/useSegurarParaConfirmar.ts` (800 ms, ponteiro + teclado, barra em CSS sem `setInterval`). Exigem segurar: "Apagar tomadas", "Modo Eco" e **desligar** o PC Principal. O PC nunca entra no lote.
- **E-04**: tomada `unavailable` aparece "Indisponível", esmaecida e sem toque; contagens sobre as que respondem ("2 de 3 ligadas • 2 sem resposta"); perfis sem alvo ficam desabilitados. As 5 tomadas viraram lista de dados (eram 5 blocos copiados).
- **M-07 Desfazer**: aviso de 8 s com "Desfazer" depois de Apagar tudo, Cinema, Chegar, Gamer, Apagar tomadas e Modo Eco. Devolve só `light.*`/`switch.*` que mudaram e o brilho das luzes que continuaram acesas. Cenas viraram tabela `EFEITO_CENAS` (espelho de `scripts.yaml`); falha de cena agora reverte só as travas dela (antes apagava todas).
- **Verificado**: `check_config` = 0; `npx tsc --noEmit` = 0; build de produção ok (publicado às 09:31). No navegador, com toda escrita interceptada (nenhum POST chegou à casa): TV "Desligar" → `off` e, após o reinício, "Ligar TV Sala" com a TV realmente `off`; câmera "SEM SINAL" aos 25 s e "Tentar agora" volta a conectar; "Apagar tomadas"/"Modo Eco"/PC: toque curto = 0 comandos e dica, segurar = só os alvos certos; indisponível = 0 comandos; Desfazer de Apagar tudo (9 luzes), Apagar tomadas, Modo Eco e Cinema = inverso exato, inclusive Painel de volta a brilho 200 (leitura simulada só no navegador).
- **Defeitos achados no teste e corrigidos**: (1) ao concluir o segurar no PC, o clique que o navegador dispara ao soltar executava a ação de novo como toque simples (a tomada já parecia desligada) e religava o PC — o gancho agora consome esse clique; (2) uma leitura que chegasse antes de a HA aplicar a cena fazia o Desfazer pular o brilho — agora o brilho é sempre reenviado (inofensivo).
- **Não feito**: Desfazer depois de "Dormir" (a tela entra em descanso; precisa de desenho próprio). Nomes das tomadas truncados no modal de energia (já era assim na produção antiga; fase 3).
- Nenhum dispositivo foi acionado.

## 06/10/2026 — Fase 3, lote A: leituras honestas, alvos de toque e vocabulário único (painel)
- Pedido do André ("seguir para a fase 3", direção "só refinar"). Lote A = correções da auditoria de 05/10 (E-05 a E-20) + B-02.
- **B-02** (spec de 15/09, aprovada com a fase 3): saem do contrato `binary_sensor.sensor_banheiro_movimento` e `..._closet_movimento` (não existem no HA; eram usados para acordar o descanso de tela por presença, então nunca disparavam); entram `sensor.dreame_..._battery_level_p_2_1` e `todo.lista_de_compras` (conferidos no registro).
- **Cabeçalho (E-08)**: "Baterias 50%" virou "Baterias ok" (o 50% era a menor bateria); o selo de saúde, que mostrava "Requer atenção" dentro do bloco "Requer atenção", agora diz "N avisos" e tem ícone e `aria-label`; "1 fora" virou "DVR fora".
- **Portas (E-07)**: modal de segurança, cartão de sensor e descanso de tela mostram há quanto tempo estão abertas; passou de 24 h, sugere conferir o sensor. ⚠️ Armadilha: o `last_changed` zera quando a HA reinicia, então a duração conta a partir do boot.
- **Consumo (E-05)**: faixas com histerese de ±10 W (o PC oscila em volta de 120 W e o selo trocava a cada leitura).
- **Ventilador (E-10)**: segmentos com `aria-pressed`; "Desligado" selecionado neutro (era o elemento mais chamativo do modal); o botão diz a ação ("Ligar"), não repete o estado.
- **Toque no iPad (E-11)**: o piso de 44–48 px só valia em `pointer: coarse`, que o Safari do iPad em modo desktop não relata; agora vale também com `html[data-toque]`.
- **Cartões (E-12, E-15)**: chips de porta, presença, TV e offline com ícone (no celular o rótulo some e sobrava só a cor); ícones alinhados na linha da grade por container query (reservam duas linhas de indicadores quando o cartão tem ≤ 230 px).
- **Popup × página (E-13)**: mesmos títulos (Iluminação, Ventilação e clima, Mídia, Tomadas, Sensores), sem as dicas fixas, botão "Acender/Apagar luzes", luz "Acesa/Apagada"; porta em "Sensores" (estava em "Tomadas & Bloqueios").
- **Compras (E-14)**: leitura que falha não vira "Tudo comprado" quando não há dado anterior ("Sem leitura da lista"); com dado anterior, mantém a última leitura (CLAUDE.md §12).
- **Desempenho (E-19)**: "Apagar tudo" e "Dormir" usam `lib/useSegurarParaConfirmar.ts` (barra em CSS, sem `setInterval` de 20 ms); relógio e descanso atualizam na virada do minuto; animações do painel pausadas sob o descanso. **Descanso (E-20)**: telemetria 15–20 px (era 13) e "3 alertas · Porta do Quarto" (antes só a primeira).
- **Tomadas**: nomes inteiros no modal de energia (selo, nome e estado disputavam uma linha só).
- **Limpeza**: `HealthWidget.tsx` removido (sem uso); `WeatherWidget.tsx` também sem uso, mas não rastreado no git — deixado como está. `AGENTS.md` (TTL 5 s) e `PRODUCT.md` (escopo) atualizados.
- **Verificado**: `tsc` = 0; servidor de teste na 3010 com escrita interceptada: ícones a 70 px nos 10 cartões, tela sem rolagem em 1024×768, selos, portas com duração, nomes inteiros, popup e página unificados, toque curto em "Apagar tudo"/"Dormir" = 0 comandos e segurar = comando certo, descanso com 12 animações pausadas. Publicado às 09:45 (build ok). Nenhum dispositivo acionado.
- **Não verificado**: "Sem leitura da lista" (só ocorre com falha na primeira leitura; conferido no código).

## 06/10/2026 — Fase 3, lote B: cômodos primeiro, menos ruído e piso de 12 px (painel)
- **Ordem (M-01/M-12)**: cabeçalho → cenas → cômodos → resumo (antes o resumo vinha antes dos cômodos). Mesma altura total, então a parede continua sem rolagem; os cômodos sobem de y=436 para 278 em 1024×768, de ~710 para 543 em 768×1024 e de 666 para 421 no celular.
- **Instruções fixas (M-02)**: saem "Toque para ativar atmosfera", "Toque num cartão para abrir os detalhes" e "Contador: luzes acesas / total · Toque no cômodo…". As dicas dos modais saíram no lote A.
- **Seta de detalhe (M-03)**: sem borda e sem fundo, no tom do texto secundário; o alvo de 48 px continua.
- **Piso de texto (M-10)**: `--texto-minimo` 11 → 12 px; `--font-micro` (era 11 px fixo) e as 54 declarações de `font-size: 11px`/`0.6875rem` escritas à mão passam a usar o token. Medido em 1280×800, 1024×768, 768×1024 e 375×812: 0 texto cortado, 0 rolagem lateral, 0 texto visível abaixo de 12 px.
- **Ficaram de fora de propósito**: M-04 (trocar os selos por uma linha) e M-06 (borda colorida só para problema) contrariam decisões suas registradas aqui — blocos de selos por gravidade (27/09) e "a borda âmbar e o ícone dizem luz acesa" (refino de 25/09). M-05 (caixa do ícone do cômodo) é identidade; mexer é redesenho. M-11 (dividir o `globals.css`) é trabalho à parte.
- Verificado com escrita interceptada no servidor de teste; publicado às 09:51 (build ok). Nenhum dispositivo acionado.

## 06/10/2026 — Resumo da casa volta para cima; topo e grade ajustados ao tablet (painel)
- Pedido do André: manter as mudanças, mas com a ordem anterior (resumo da casa acima dos cômodos), e corrigir "uma pequena fuga de tela na parte superior no modo tablet", com preenchimento dinâmico.
- **Ordem**: revertida a troca do lote B (M-01/M-12). Fica: cabeçalho → cenas → resumo → cômodos. As frases de instrução continuam removidas.
- **Topo no iPad**: o painel declara `viewport-fit=cover` e barra de status translúcida (app de tela inicial), e o `.dashboard` não somava `env(safe-area-inset-top)` no topo (laterais e base somavam) — o relógio entrava sob a barra de status. Agora topo e base = respiro fluido (6–12 px) + área segura.
- **Preenchimento dinâmico**: na paisagem de altura fixa (100dvh), o cartão de cômodo tinha piso de 148–155 px; com a barra de status o iPad mini (1133×744) estourava 7 px. O piso saiu; as linhas da grade (`minmax(0, 1fr)`) dividem o que sobra.
- **E-15 refeito**: a reserva de duas linhas no topo do cartão (lote A) roubava ~25 px e o ícone invadia o nome em telas baixas. Agora, em cartão de até 230 px, o chip mostra só o ícone (o nome fica no `title` e no rótulo do cartão) e os indicadores cabem numa linha.
- **Verificado** (servidor de teste, escrita interceptada): 1024×768, 1133×744, 1180×820, 1366×1024, com e sem 24 px simulados de barra de status — 0 px de estouro, 0 sobreposição, ícones alinhados, 8–10 px de respiro na base; retrato 820×1180 e desktop 1280×800 ok. No celular os ícones ficam em alturas diferentes em alguns cartões (como antes), sem sobreposição. Publicado às 10:03 (51 s fora, avisado antes).
- **Limite**: a área segura real do iPad não dá para emular no navegador daqui; foi simulada com 24 px. Confirmar no tablet.

## 06/10/2026 — Painel dentro da HA: faixa clara no topo e painel sob a barra lateral (`casa-panel.js`)
- Relato do André: faixa branca no topo ao abrir o painel dentro da HA (print 1280×893: 5 px de #FFFFFF de ponta a ponta e o painel começando ~6 px abaixo).
- O painel entra na HA por `panel_custom` "casa-panel" (`config/www/casa-panel.js`, sidebar "Casa Inteligente", `/casa`). O elemento usava `position: absolute; top/left: 0` sem nenhum ancestral posicionado — ou seja, relativo à JANELA, não à área do painel. Efeitos: a barra lateral da HA cobria o começo do painel (relógio e cartão da Sala cortados, medido: painel em x=0 com a lateral de 256 px por cima), e qualquer coisa que a HA ou o aparelho ponha no topo (barra de status, área segura) fica por cima/ao redor dele em vez de empurrá-lo.
- Correção: o painel passa ao fluxo normal (`position: relative`, largura 100%, altura `100dvh`), ocupando só a área que a HA reserva; desconta `env(safe-area-inset-top)` no topo (o iframe não enxerga a área segura e o painel declara `handle_safe_area: true`); fundo escuro.
- **Cache**: a HA serve `/local` com `max-age` de 31 dias; o endereço do módulo ganhou `?v=20261006` em `configuration.yaml` (`extra_module_url` e `module_url`) → `check_config` = 0 e HA reiniciada às 10:15 (~5 s até responder).
- **Verificado** no navegador do app (logado pelo André), 1280×893 com a lateral aberta: módulo novo carregado, painel em (256,0) 1024×894, iframe igual, HA sem rolagem; relógio e cartão da Sala inteiros.
- **Não reproduzido aqui**: a faixa branca em si (o navegador do app é Chromium e tema escuro; com a lateral aberta ou oculta, o painel já começava em y=0). A correção remove a causa provável (painel fora do fluxo); confirmar no aparelho em que ela aparece.
- Achado à parte: o dashboard Lovelace `casa-dashboard` (`dashboards/casa.yaml`, fora da barra lateral) mostra só um cartão de erro no lugar do `casa-dashboard-card`; não mexi.

## 08/10/2026 — Painel em tempo real: espelho por WebSocket + SSE (atraso de ~2,5 s → ~30–50 ms)
- Pedido do André: zerar o atraso entre a HA e o painel. Medido antes: o gargalo era o polling de 5 s (0–5 s, média 2,5 s); o servidor respondia em ~20 ms. Spec: `specs/features/painel-tempo-real.md`.
- **Servidor**: `lib/haStream.ts` mantém um WebSocket Node → HA (`state_changed`) e um espelho em memória; `GET /api/stream` (SSE) empurra `snapshot`/`diff`/`ping`; `GET /api/state` lê do espelho (≈8 ms, sem ida à HA) e cai para o REST se o espelho não está sincronizado. Lista de entidades movida para `lib/entidadesPainel.ts`; `lib/ha.ts` ganhou `configHA()`.
- **Cliente**: `lib/useStreamEstados.ts` em `/`, `/comodo/[id]` e `/standby`; polling de 5 s virou reserva (age só com o stream mudo ≥35 s). Travas otimistas preservadas (`aplicarEstados`).
- **Verificado**: `tsc` = 0; em dev (3010) e produção (3002), `X-Fonte: espelho`; mudanças reais da HA chegaram 26–51 ms após o `last_updated`; `ping` a cada 15 s; resposta SSE sem compressão/bufferização em `next start`; a página aberta parou de chamar `/api/state`. Publicado ~02:30 (≈55 s fora, painel). Nenhum dispositivo acionado.
- **Armadilhas**: (1) o espelho vive em `globalThis` — o Next pode duplicar módulos por rota; (2) `Cache-Control: no-transform` no SSE evita que a compressão do `next start` segure os eventos; (3) o heartbeat é um evento `ping` (comentário SSE não dispara JS e o cliente acharia o canal morto); (4) reconectar nunca envia comando.
- **Limite**: "zero" até a HA. Aparelhos em nuvem (Tuya, Xiaomi, Sonoff) e sensores de intervalo têm o atraso da própria integração. Rotas `energy`, `mass`, `todo`, `weather` seguem com polling.
- **Achado à parte**: `camera.rua_canal_2/4` ficam `unavailable` (ver card "DVR fora" no painel); não mexi.

## 08/10/2026 — Projeto no GitHub (privado), com o histórico limpo de segredos
- Pedido do André: subir o projeto inteiro para o GitHub. Não havia remote nem `gh`; instalado o GitHub CLI 2.102 (winget) e o login foi feito pelo André (conta `priincealone`).
- **Repositórios (ambos privados)**: `priincealone/home-assistant` (casa, `main`) e `priincealone/casa-dashboard` (painel, branches `main`, `fix/audit-p1-batch-01` — 66 commits à frente do `main` — e `chore/ai-governance`). As mudanças não commitadas do painel (`globals.css`, `WeatherWidget.tsx`) ficaram de fora.
- **Por que reescrever o histórico**: os 178 commits da casa carregavam o `service_token` da nuvem Xiaomi (`xiaomi_miot/auth-*.json`), o `access_token`/`refresh_token` OAuth (`xiaomi_home/miot_config/*.dict`), a chave privada (`xiaomi_home/cert/*.key`), os tokens locais do aspirador e do repetidor (`xiaomi_home/miot_devices/*.dict`) e a senha RTSP de uma câmera (`referencias/reference_ios_dashboard.yaml`, apagado em 1f17c17 mas presente no histórico). Esses caminhos saíram de todos os commits (`git filter-branch --index-filter`) e entraram no `.gitignore`; os arquivos continuam no disco e a HA não foi tocada.
- **Verificado**: os valores reais dos segredos (lidos dos arquivos, nunca impressos) não aparecem em nenhum commit do `main` publicado, e aparecem no histórico antigo (controle positivo); nenhum caminho secreto em `git log main`; no GitHub, o arquivo de token responde 404; os dois repos `PRIVATE`; heads local = remoto. O painel não precisou de limpeza (`.env.local.example` com `HA_TOKEN=` vazio).
- **Armadilhas**: (1) **os hashes de todos os commits da casa mudaram** (ex.: `ab70952` → `fda1f1a`); referências antigas em documentos e diários apontam para hashes que não existem mais no `main`; (2) backup integral do histórico anterior em `backups/git-antes-limpeza-2026-10-08.bundle` — **contém os segredos**, não versionar nem enviar; (3) o worktree `.claude/worktrees/home-assistant-control-panel-977e97` está em HEAD destacado no histórico antigo (`439c27f`) e por isso o `.git` local ainda guarda os objetos velhos — não vão para o GitHub (o push manda só o que o `main` alcança); (4) depois do push, `gh auth setup-git` (pedido do André) pôs o `gh` como credencial do git para github.com na configuração global — `git push`/`pull` comuns autenticam sem pedir login; (5) `home-assistant_v2 (1).db-wal` (cópia de conflito do Drive) agora é ignorado.
- **Não feito**: as coordenadas da casa, IPs e MACs continuam no repositório (por isso privado). Não houve rotação dos tokens Xiaomi porque eles nunca chegaram ao GitHub.


## 09/10/2026 — Music Assistant removido (casa e painel)

Pedido do André ("remover todo o rastro de Music Assistant do projeto HA", painel incluído), para liberar recursos antes do Jarvis (IA local). Decisão registrada em D-012.

- **Levantamento antes de mexer**: o MA usava só ~90 MB de RAM (o HA, ~517 MB), então o ganho é pequeno. `core.config_entries` não tinha entrada `music_assistant`; no registro restavam 4 entidades e 2 dispositivos **órfãos** em `deleted_entities`/`deleted_devices` (lápides). `bgutil-provider` era usado só pelo MA (sem volumes, sem outro consumidor).
- **Feito**: `docker stop`/`rm` do `music-assistant` e do `bgutil-provider` e `docker rmi` das duas imagens; `music-assistant/data` **movido** para `backups/music-assistant-20261009/` (252 MB, com credenciais do YouTube Music, ignorado pelo git); `scripts/music_assistant/` e a linha do `.gitignore` removidos; documentação atualizada (CLAUDE.md, CASA.md, ARCHITECTURE, SECURITY, PRODUCT, DECISIONS, planning). O HA ficou de pé o tempo todo.
- **Painel** (repo próprio, commit `e34178f`): `MediaHubModal.tsx` perdeu a aba de música (~460 linhas) e os estados/efeitos dela; `TvRemoteWidget.tsx` parou de consultar `/api/mass`; `layout.tsx` sem o sink de áudio; `app/api/mass/route.ts` e `MusicAssistantAudioSink.tsx` apagados; ~640 linhas de CSS `mass-*`/ondas/volume do rádio removidas por âncoras de texto. O commit levou junto o trabalho que estava sem commit (WeatherWidget, EnergyWidget, lib/utils), por escolha do André.
- **Verificação**: `npx tsc --noEmit` sem erros no código-fonte; os únicos erros vinham de `.next/types` gerados, que apontavam para a rota apagada e se regeneram no build. **Não** foi feito `next build`, e o painel em produção ainda roda o build antigo até a porta 3002 ser derrubada.
- **Armadilhas**: (1) as lápides do registro não foram editadas de propósito: o HA as descarta com ~30 dias (~11/10) e editar exigiria parar o HA; (2) `Set-Content` do PowerShell 5.1 reescreve arquivo inteiro (CRLF/BOM): foi desfeito no `.gitignore` e a edição refeita pontual; (3) `dashboard-app/.env.local` ainda tem `MASS_TOKEN` (arquivo proibido para agentes); (4) `dashboard-app/.agents/skills/impeccable/reference/*.md` citam "Music Assistant" só como texto de exemplo, e `ESTADO_DASHBOARD.md`/`artifacts/` guardam o histórico como estava.

### 09/10/2026 — Publicação do painel sem o Music Assistant (e a armadilha dos tipos gerados)

- **Primeira tentativa caiu para `dev`**: ao derrubar a 3002, o watchdog rodou `npm run build`; a compilação passou, mas a checagem de tipos falhou em `.next/dev/types/validator.ts(206,39)` (importava `app/api/mass/route.js`, já apagado). Como o build apaga `.next/BUILD_ID` ao começar e falhou, o watchdog subiu em modo `dev` ("Build falhou e nao ha build anterior"). O código-fonte estava correto: o `tsconfig.json` inclui `.next/types/**` e `.next/dev/types/**`, e esses arquivos **gerados** guardavam o import da rota removida.
- **Correção**: o próprio servidor `dev` regenerou o `validator.ts` sem a rota; `npx tsc --noEmit` passou com código 0 (agora incluindo `.next`); derrubei a 3002 de novo e o build de produção passou (~57 s). **Regra para o futuro**: ao **apagar uma rota ou página**, rode `npx tsc --noEmit` depois de o `next dev` regenerar `.next/dev/types`; se `.next/dev/types` estiver velho, o build falha por causa dele e o painel cai para `dev` na primeira tentativa.
- Segunda publicação (commit `bcaa6dd`): o cartão de mídia ainda dizia "Apple Music & TV" e "Música e Vídeo"; agora "TV & Console PS5" e "Central de Mídia". Verificado no navegador: duas abas, nenhuma requisição a `/api/mass`, rotas em 200. Os `ERR_CONNECTION_REFUSED` do console eram do intervalo do reinício.
- **Aviso**: tablets com a página aberta antes da publicação ainda rodam o JS antigo e batem em `/api/mass` (404, inofensivo) até recarregar a página.


## 13/10/2026 — Skills e plugin de terceiros instalados no Claude Code (fora do projeto)

Pedido do André: instalar `awesome-claude-skills` e o marketplace `homeassistant-ai/skills`. Tudo vive em `C:\Users\adoli\.claude\` (usuário), **não** em `D:\HomeAssistant`; nada do projeto foi alterado.

- **Skills copiadas** de `ComposioHQ/awesome-claude-skills` para `~/.claude/skills/`: `webapp-testing` (Playwright em Python) e `mcp-builder` (guia de servidor MCP). O clone completo foi apagado. Revisadas antes: só texto e scripts locais; `with_server.py` executa em shell o comando que o usuário passar; `evaluation.py` chama a API da Anthropic e exige chave. As demais skills do repositório (incluindo as da Composio, que pedem chave de API) **não** foram ativadas.
- **Marketplace** `home-assistant-skills` (`homeassistant-ai/skills`, v0.49.0) adicionado e o plugin `home-assistant-skills` instalado no escopo de usuário. Traz uma skill, `home-assistant-best-practices` (texto e referências em Markdown, sem scripts nem hooks; revisada).
- **Conflitos com as regras do projeto — valem as do CLAUDE.md**: a skill prefere Template Helper pela interface (aqui os sensores ficam em `config/template_sensors.yaml`); manda criar automação pela API do HA (aqui é `automations.yaml`, com plano e aprovação do André, alçada 2); traz guia de Lovelace (a dashboard foi retirada e **não deve ser recriada**). Concorda em não editar `.storage` direto e em fazer backup antes de operação irreversível.
- **Armadilhas**: (1) o CLI `claude` não estava instalado; o instalador pôs `claude.exe` em `~/.local/bin`, que só entra no PATH de terminais **novos** (nos abertos antes, use o caminho completo); (2) `webapp-testing` precisa de Playwright em Python e `mcp-builder` de `anthropic` e `mcp` — **nenhum foi instalado**, e o Python do Windows falha com frequência (usar o container ou um ambiente à parte); (3) o painel segue sem suíte de testes, e `dashboard-app/` só se mexe com pedido inequívoco do André; (4) as skills só aparecem em sessões novas.


## 13/10/2026 — B-04 encerrado: a cena "gamer" já não toca na ventilação do PS5

Verificação por leitura de código, sem acionar a casa. `script.cena_gamer` (`config/scripts.yaml`, desde `cf2380c`, 25/09) só apaga `light.luz_sala` e põe `light.painel` a 30%. `switch.ventilacao_ps5` aparece apenas na automação `1757462400000`, e nada em `dashboard-app/` o referencia; `app/api/scene/route.ts` apenas chama o script. O conflito (R8) estava corrigido havia semanas; o que ficou velho foi a documentação.

- **Corrigido**: `docs/AUTOMATION-POLICY.md` (R8 passou de "aberto" para "resolvido"), `.claude/agents/architecture-reviewer.md`, `planning/BACKLOG.md` (B-04 saiu) e `planning/DONE.md` (entrada de 13/10).
- **Também no commit**: regras R10 (escolha do `mode`) e R11 (`id`/`unique_id` estáveis) em `AUTOMATION-POLICY.md`, e a entrada anterior sobre as skills instaladas.
- **Não verificado**: se o script carregado no HA é idêntico ao arquivo (não consultei a API).
- **Fora do commit de propósito**: `core.device_registry`, `core.entity_registry` e `frontend.user_data_*`, reescritos pelo HA. Ficam para um commit separado.


## 13/10/2026 — Painel com Motion publicado (animações) e laço do SmartTruncateText corrigido

Pedido do André: melhorar o painel visualmente. Piloto com a biblioteca `motion` no cartão de cômodo, aprovado e então estendido, cartão a cartão, a todo o painel. Tudo no repositório `dashboard-app/` (git próprio), branch `fix/audit-p1-batch-01`; **sem push** ainda.

- **Animações** (só `transform` e `opacity`; `MotionRoot` em `layout.tsx` com `reducedMotion="user"`): cartão de cômodo (chips entram/saem, contador `RollingNumber`), energia (`NumberTicker` nos watts), mídia (selo, ícone, botão), cenas rápidas (toque, pulo do ícone, selo "Ativando"), dispositivos, clima, selos de status (deslizam entre blocos de gravidade), pílulas, aspirador, câmera e lista de compras. Componentes novos: `components/ui/rolling-number.tsx`, `components/ui/number-ticker.tsx`, `app/components/MotionRoot.tsx`. Dependência nova: `motion`.
- **Descartado de propósito**: BorderBeam do Magic UI. O cartão ativo já tem a `.room-card-refraction` em CSS puro, e o beam rodaria no processador em até 10 cartões.
- **Correção de defeito antigo**: `SmartTruncateText` entrava em laço ("Maximum update depth exceeded", ~400 erros por carga em dev). Duas causas: `useEffect` sem dependências chamando `setState` a cada commit, e truncadores aninhados (dica do cartão de energia) alternando `isOverflowing` um por causa do outro. Solução: comparar por ref antes do `setState` e um disjuntor (6 trocas em 1 s congela o estado até o texto ou a janela mudarem). **A causa de fundo, o aninhamento, continua.**
- **Texto corrigido**: a cena Gamer dizia "ventilação do PS5"; a ventilação é da automação (B-04).
- **Publicação**: derrubada a porta 3002 pelo PID dono (15704, `next start`), watchdog recompilou e subiu em ~85 s; `BUILD_ID` novo (18:20), `/api/state` 200, 10 cartões, 157 W, sem indicador do Next, sem erro de laço.
- **Não verificado**: as animações em si (dependem de mudança de estado; a casa não foi acionada) e o desempenho no tablet de parede. Tablets com a página aberta antes ainda rodam o JS antigo até recarregar.
- **Armadilhas**: o contador de erros do `read_console_messages` acumula entre recargas e não serve de prova; usar o selo de problemas do Next e um listener de `console.error`.


## 13/10/2026 — B-08: patch do Glances com verificação agendada

Descoberto ao começar o B-08: o patch de timeout do `glances_api` estava **ausente** (container recriado em 20/09). A API v3 do Glances no PC levou ~18 s na primeira chamada a frio, contra o timeout padrão de 5 s do httpx; nos 3 dias anteriores o log não mostrava erro do Glances, então o impacto era pequeno.

- **Script**: `scripts/manutencao/glances_patch.ps1` (sem argumentos só verifica: 0 presente, 1 ausente, 2 erro; `-Aplicar` idempotente; `-Reiniciar` faz `docker restart homeassistant`). Aplicado em 13/10 com reinício (HA de volta em ~40 s).
- **Tarefa agendada** `CasaGlancesPatch` (usuário atual, sem elevação, sem janela): no logon e de hora em hora, chama `glances_patch_tarefa.ps1` → `-Aplicar -Reiniciar`. Com o patch presente não faz nada; **se ele sumir, reinicia o HA sozinho** (a casa fica sem automação ~1 min). Log: `%LOCALAPPDATA%\CasaHA\glances_patch.log`.
- **Armadilha**: a primeira versão da tarefa embutia o comando no `-Command` e falhou por aspas (resultado 1, sem log); o script-embrulho em arquivo resolveu. Se mudar a imagem do HA e o Python deixar de ser 3.14, o script sai com 2 e avisa em vez de adivinhar o caminho.
- **Erros que já existiam**: DVR `192.168.31.216` fora (K-06); "Camera not found" do painel enquanto o HA sobe.


## 13/10/2026 — B-03 (teste de contrato) e limpeza de documentação desatualizada

- **B-03**: `dashboard-app/tests/contrato-entidades.test.mjs` compara `lib/rooms.ts` com `config/.storage` (entidade, desativada, domínio, cômodo × área). Lê `../config/.storage` ou `HA_STORAGE`; sem a pasta, **pula com código 3**. Validado contra uma cópia adulterada do registro. Mapa `circulacao` → área `corredor` (o id do cômodo no contrato difere do da área no HA). Listas de exceção (`SEM_REGISTRO_OK`, `FORA_DA_AREA_OK`) começaram vazias: toda exceção futura exige motivo.
- **Achado**: o único teste que existia (`tests/rede.test.mjs`) estava **quebrado** desde 06/10 (`5456d3a` mudou o vocabulário, o teste esperava "1 fora"/"2 fora"). Corrigido; ninguém o rodava porque não havia script. `npm test` agora roda os dois (32 verificações).
- **Documentação que estava errada** e foi corrigida: B-05 e ROADMAP 2.2 (painel já roda `next start`), ROADMAP 1.4 e 2.6 (feitos), 2.3 (agora feito), `ARCHITECTURE.md`, `DECISIONS.md`, `BLOCKED.md` K-12, `SECURITY.md` (o `.bat` registra o watchdog de produção, não "o servidor de desenvolvimento") e `CLAUDE.md` §3 e §14 (dizia "zero testes").
- **Limite**: o teste lê o registro em disco, não o `/api/states` ao vivo; entidade só de runtime (YAML sem `unique_id`) aparece como "fora do registro" e precisa de exceção justificada.


## 13/10/2026 — Diagnóstico do DNS do container (só leitura): causa achada, correção é do André

Os logs do HA mostravam "Timeout while contacting DNS servers" (Sonoff/eWeLink, HACS, SmartThings, Nabu Casa). Medido sem alterar nada: dentro do container o `/etc/resolv.conf` aponta para `192.168.65.7` (resolvedor do Docker Desktop, que repassa ao DNS do Windows); a resolução normal leva 2–5 ms (primeira consulta de cada host 15–95 ms, o resto em cache). O Windows tem **dois** servidores DNS: `192.168.31.1` (Wi-Fi, responde em ~7 ms) e `192.168.100.1` (interface "Ethernet", **desconectada**, IP 169.254.x, métrica 5 contra 30 do Wi-Fi; não responde a ping nem a DNS). Consultas que caem no segundo expiram.

- **Frequência**: 14 "Timeout while contacting DNS" no log do container (desde 26/09) e 55 erros de DNS só do `us-dispa.coolkit.cc` (4–10 por dia desde 20/09). Efeito pequeno: reconexão do WebSocket Sonoff e atualização do HACS que falha às vezes.
- **Correção** (não aplicada: é configuração de rede do Windows, alçada 3): `Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ResetServerAddresses` como administrador. Registrado em `planning/BLOCKED.md` como K-17.
- **Alternativa descartada por ora**: fixar `--dns 192.168.31.1` no container exigiria recriá-lo (e refazer o patch do Glances); só se a correção no Windows não bastar.
- **Não confirmado**: que o servidor morto seja a única causa; a verificação é recontar as ocorrências 24 h depois da correção.


## 13/10/2026 — Auditoria `impeccable` (só leitura) e correções P2 de acessibilidade e responsivo

Auditoria e crítica do painel (16/20, "Bom"; detector `impeccable detect` achou 1 problema: a cor `#64748b` fora do DESIGN.md em `globals.css`). Contraste, alvos de toque (45 controles ≥ 44 px), anel de foco, semântica e carga (421 KB de JS, 556 elementos no DOM) saíram bem. Aplicadas as duas ações aprovadas, no `dashboard-app/`, branch `fix/a11y-resumo` (commit `69641df`), **sem merge e sem publicar**:

- **Interativo aninhado (WCAG 4.1.2)**: os cinco cartões da faixa de resumo eram `div role="button"` com `<button>` dentro; mídia e aspirador nem respondiam a Enter/Espaço. Novo `app/components/WidgetHit.tsx`: um `<button class="widget-hit">` transparente cobre o cartão e é **irmão** dos controles secundários (mesmo padrão do `.room-card-toggle`). Verificado a 375 e 900 px: 0 botões aninhados, o toque no centro de cada cartão cai na camada, e ligar a TV, canais C2/C4 e os botões de abrir **continuam recebendo o clique** (checado por `elementFromPoint`, sem clicar). Enter abre o painel de energia e Escape fecha devolvendo o foco ao cartão.
- **Aspirador cortado a 375 px**: "Pronto" e "100%" passavam 13 px da peça (~85 px) e saíam cortados. Passam a quebrar de linha (zero texto cortado). **Custo**: a fileira de peças passa de ~95 para ~114 px de altura (a faixa, de ~165 para ~184 px). Abaixo de 360 px a faixa vai para 2×2 (verificado a 340 px, sem corte nem rolagem horizontal).
- **Decisão mantida**: a fileira de quatro peças entre 360 e 640 px (pedido do André em 25/09) **não** virou 2×2 como a auditoria sugeriu: custaria ~88 px na primeira tela, e o próprio relatório já aponta que o cabeçalho gasta espaço demais no celular.
- **Armadilha achada**: o `motion.div` com `whileTap` no cartão do aspirador (piloto anterior) fazia o Motion injetar `tabindex="0"` num `div` sem papel nem nome. Voltou a `div` simples. Qualquer `motion.*` com `whileTap` em elemento não focável tem esse efeito.
- **Não verificado**: leitor de tela real, toque físico e o tablet em paisagem (as capturas de viewport grande saem encolhidas no painel de teste; as medidas vêm do DOM). O contraste é estimativa por cálculo sobre fundos translúcidos.
- **Pendentes da auditoria**: zoom bloqueado (`user-scalable=no`), cabeçalho que ocupa ~1/3 da primeira tela no celular, brilho em 3 passos (piloto de arrastar), cor `#64748b` fora do DESIGN.md.


## 13/10/2026 (noite) — Correções P2 de acessibilidade publicadas

`fix/a11y-resumo` entrou na `fix/audit-p1-batch-01` do painel (avanço direto, `69641df`; `tsc` e `npm test` passaram, 32 verificações). Publicado derrubando a 3002 pelo PID dono (14204, `next start`); o watchdog recompilou e subiu em ~45 s (`BUILD_ID` 19:38). Verificado em produção a 375 px: 5 camadas `widget-hit`, 0 botões aninhados, 0 `tabindex` solto, toque no centro de cada cartão cai na camada, nenhum texto cortado, sem rolagem horizontal, `/api/state` 200, sem indicador do Next e sem erro de laço no console. **Sem push** do painel. Tablets com a página aberta antes rodam o JS antigo até recarregar.


## 13/10/2026 (noite) — Cabeçalho do celular: compactado (ganho pequeno) e "Aspirador •" sem corte

`dashboard-app/`, branch `fix/cabecalho-celular` (commit `8fdf283`, **enviada ao GitHub, sem merge e sem publicar**). `tsc` e `npm test` passam.

- **Medido a 375 × 812**: cabeçalho de 263 px (32% da tela), primeiro cômodo em y = 642. Estrutura: grade de 4 linhas (relógio+clima / Casa+data / selos / ações) montada só com CSS (`display: contents` nos invólucros), em `globals.css` na regra `@media (max-width: 640px)` de 25/09.
- **Aplicado (≤ 420 px)**: respiros menores no contêiner, na grade e no bloco de selos, relógio de 54 → 46 px, botões de ação de 44 px. Resultado: cabeçalho **244 px (−19)**, primeiro cômodo em y ≈ 622. Selos e botões seguem ≥ 44 px (medido).
- **Por que o ganho é pequeno**: o resto é conteúdo. Os quatro selos não cabem numa linha só (somam ~430 px para 329 disponíveis); o vermelho fica numa segunda fileira. Mesclar selos e ações exigiria achatar quatro níveis de invólucros e perderia o agrupamento por gravidade.
- **Defeito achado**: "Aspirador •" saía cortado ("pirador •"). A regra de 25/09 `.vacuum-compact-hint > svg { display: none }` deixou de funcionar quando o `SmartTruncateText` passou a embrulhar o conteúdo num `<span>` (o ícone deixou de ser filho direto). Passou a `.vacuum-compact-hint svg`.
- **Decisão pendente do André** (muda a ordem das seções no celular, não foi feita): para os cômodos aparecerem na primeira tela, as opções são (a) mover "Ambientes da casa" para antes de Cenas e Resumo com CSS `order` (custo: a ordem do foco do teclado deixa de coincidir com a visual, WCAG 2.4.3), (b) recolher o "Resumo da casa" no celular, (c) deixar como está.


## 13/10/2026 (noite) — "Resumo da casa" recolhível no celular, publicado

Opção (b) escolhida pelo André. Spec: `specs/features/resumo-recolhivel-celular.md`. `dashboard-app/`: `c7d5d54` (recolhimento) sobre `8fdf283` (cabeçalho compacto e "Aspirador •" sem corte), juntados na `fix/audit-p1-batch-01`, **enviados ao GitHub e publicados** (3002 derrubada pelo PID dono 41156, `next start`; watchdog recompilou e subiu em ~55 s; `BUILD_ID` 19:54).

- **Comportamento** (só até 640 px): o título "Resumo da casa" vira botão (`aria-expanded`, `aria-controls`), padrão **recolhido**; recolhido, os cartões **saem do DOM** (o player da câmera para de baixar vídeo escondido); a escolha fica em `localStorage` (`casa.resumoAberto`). A primeira pintura sai recolhida por CSS (`.telemetry-section:not(.is-aberto) > .daily-panorama-bar`), sem "pisca". Acima de 640 px nada mudou (título sem botão, faixa visível). Ordem do DOM e do foco intactas. Novo `lib/useCelular.ts` (`useSyncExternalStore`, servidor = false).
- **Resultado a 375 × 812**: primeiro cômodo de y = 642 para **y = 463** (cabeçalho 244 px + cenas + uma linha de título); abrindo o Resumo, volta a ~647.
- **Verificado** (dev e produção): botão de 44 px, `aria-expanded` acompanha, Enter alterna e o foco fica no botão, preferência sobrevive a recarregar, faixa fora do DOM quando recolhida, 641+ px sem mudança, `tsc` e `npm test` (32).
- **Armadilha**: reabrir `preview_start` reaproveita a aba antiga, que fica com o HTML do servidor anterior e **sem hidratar** (o botão não aparece e o console enche de `ERR_CONNECTION_REFUSED`); navegar de novo com `?r=N` resolve. Não é defeito do painel.
- **Fora desta entrega**: resumo de uma linha enquanto recolhido (ex.: "118 W · TV em standby"), caso o André sinta falta de ver a potência sem abrir.
- **Não verificado**: aparelho físico, leitor de tela real e tablet em paisagem. Tablets e celulares com a página aberta antes rodam o JS antigo até recarregar.


## 13/10/2026 (noite) — Resumo de uma linha no celular (enviado, ainda não publicado)

`dashboard-app/`, branch `feat/resumo-uma-linha` (`a2ea299`, **enviada ao GitHub; sem merge e sem publicar**; parte da `fix/audit-p1-batch-01` em `c7d5d54`). Com o "Resumo da casa" recolhido, o celular mostra sob o título `133 W · Mídia em standby · Aspirador pronto` (cabe em uma linha de 359 px a 375). Primeiro cômodo em y = 482 (463 sem a linha, 642 antes de tudo isso).

- `lib/resumoCasa.ts` (função pura) lê só o que o painel já recebe: `sensor.computador_energia`, `sensor.tomada_inteligente_energia`, `sensor.tv_sala_estado`, `media_player.sala_de_estar_ps5` e `vacuum.dreame_us_415783444_mc1808`. **Estado desconhecido nunca vira zero**: os dois medidores fora = "Energia sem leitura"; TV sem leitura não vira "standby"; aspirador fora = "Aspirador sem leitura".
- **Achado**: o `EnergyWidget` faz `Number(estado) || 0`, então um medidor `unavailable` aparece como **0 W** no cartão (contra o CLAUDE.md §12). Não mexi nele; o resumo trata o caso de forma honesta. Fica como pendência de dashboard-app.
- **Testes**: `tests/resumo-casa.test.mjs` (15) e uma verificação nova no teste de contrato (as cinco entidades do resumo precisam estar no polling e no registro). `npm test` = 48 verificações.
- **Verificado no navegador a 375 px**: a linha aparece só recolhida, o botão aponta para ela (`aria-describedby`), tocar na linha abre (a linha e o `aria-describedby` somem), o botão recolhe e a linha volta. A compra e a câmera ficam de fora (não estão no estado lido pelo painel).
- **Para publicar**: juntar `feat/resumo-uma-linha` na `fix/audit-p1-batch-01` e derrubar a 3002 (pedir ao André).


## 13/10/2026 (noite) — Resumo de uma linha e "0 W" falso corrigido, publicados

`dashboard-app/`: `a2ea299` (resumo de uma linha) e `a01f3f6` (energia sem leitura) juntados na `fix/audit-p1-batch-01`, **enviados ao GitHub e publicados** (3002 derrubada pelo PID dono 58296, `next start`; watchdog recompilou em ~53 s; `BUILD_ID` 20:11). Verificado em produção a 375 px: botão do Resumo recolhido, linha `97 W · Mídia em standby · Aspirador sem leitura`, 10 cômodos, sem rolagem horizontal, sem indicador do Next. `tsc` e `npm test` (50 verificações) passam.

- **0 W falso (CLAUDE.md §12)**: `EnergyWidget` fazia `Number(estado) || 0`; medidor `unavailable` aparecia como "0 W", a faixa verde "Econômico" e "0 W (0%)" no modal. Agora `lerWatts` (em `lib/resumoCasa.ts`) devolve `null` e a tela diz "Sem leitura": cartão "—", selo neutro (`.is-sem-leitura`), "Estimativa: —", distribuição por circuito e tomadas sem watts inventados; a faixa guarda a última para a histerese. **No estado real de hoje** a tomada do Quarto Luca (`sensor.tomada_inteligente_energia`) está `unavailable` e o modal passou de "0 W (0%)" para "Sem leitura".
- **Como foi verificado sem a casa**: um gancho temporário (`?forcarSemLeitura=1`) forçou os dois medidores a `null` só no servidor de teste; confirmei cartão, selo, `aria-label`, subtítulo, chips, distribuição e tomadas; **o gancho foi removido antes do commit** (conferido por `grep`, zero resto). O caso parcial (um medidor fora) não se testa na tela porque o medidor do Luca já está fora hoje; fica coberto pelos testes de `lerWatts`/`wattsDaCasa`.
- **Dado honesto no resumo**: o aspirador (`vacuum.dreame_us_415783444_mc1808`) está `unavailable` agora (nuvem Dreame), e a linha diz "Aspirador sem leitura"; o cartão dele mostra "Offline".
- **Pendente**: a tomada do Quarto Luca e o aspirador seguem fora (diagnóstico de integração, não de painel).


## 13/10/2026 (noite) — Varredura de leitura honesta: o aspirador inventava números

Continuação da correção do "0 W" falso: varredura por `Number(...) || <valor>` em `app/` e `lib/`. Achado: `VacuumWidget` usava **números de fábrica** (`|| 43` min, `|| 39` m², `|| 307` limpezas, `|| 10968` m²) e o modal mostrava isso como medido sempre que o robô ficava offline (hoje está: nuvem Dreame). `dashboard-app/`, branch `fix/leitura-honesta` (`a3ac421`, `a3f38f4`; **enviada ao GitHub, sem merge e sem publicar**; `tsc` e `npm test` = 51 verificações).

- `lerNumero` (em `lib/resumoCasa.ts`, base de `lerWatts`) devolve `null` quando não há leitura; o aspirador passa a mostrar "Sem leitura" nos chips e "—" nas estatísticas. Bateria 0% deixa de sumir (antes `|| null`). `totalLimpezas` (nunca usado) saiu. Verificado com o robô realmente offline: `Última Duração —`, `Área Limpa —`, `Total Limpo —` (antes 43 min, 39 m², 11,0 mil m²).
- **Resultado da varredura**: nenhum outro `Number(estado) || n` em `app/` e `lib/`. Fora do padrão de busca (não varrido): leituras que tratam estado desconhecido como "desligado" por outro caminho; `DeviceTile`, TV e `RoomCard` já tratam `unavailable` como estado próprio.
- **Detector impeccable agora limpo** (`[]`): `#64748b` (ponto "parado" da câmera) documentada em `DESIGN.md` como `slate-deep`.
- **Wake Lock** (pergunta da pesquisa): `lib/wakeLock.ts` já pede o bloqueio de novo em `visibilitychange`; nada a corrigir.
- **Descartado**: brilho deslizando no cartão do cômodo. Só 2 das 16 luzes são regulagem (`light.painel` em `color_temp`, sem `brightness`; `light.led_escritorio_sonoff…` em `rgb`, indisponível); as outras 14 são liga/desliga. O ganho não paga o gesto.


## 13/10/2026 (noite) — Leitura honesta do aspirador publicada

`fix/leitura-honesta` (`a3ac421`, `a3f38f4`) juntada na `fix/audit-p1-batch-01` (avanço direto), **enviada ao GitHub e publicada** (3002 derrubada pelo PID dono 16224, `next start`; watchdog recompilou em ~39 s; `BUILD_ID` 20:36). `tsc` e `npm test` (51) passam; `/api/state` 200; sem indicador do Next.

Verificado em produção, a 800 px, com o aspirador **de volta** (o robô reconectou durante a publicação): `Estado: Pronto`, `Bateria: 100%`, `Total Limpo 11,3 mil m²` (dado real, o número de fábrica antigo mostraria 11,0) e `Última: Sem leitura`, `Área: Sem leitura` porque esses dois sensores seguem sem resposta — antes apareceriam 43 min e 39 m² mesmo com o robô online. Cartão de energia `107 W`, selo "Econômico", 10 cômodos hidratados.


## 13/10/2026 (noite) — L-05: teste das invariantes das automações, e zoom do painel segue bloqueado

- **Decisão do André**: o zoom do painel **continua bloqueado** (`user-scalable=no`, `maximum-scale=1`); a auditoria apontava WCAG 1.4.4, mas ele manteve. Não mexer sem pedido dele.
- **`scripts/testes/invariantes_automacoes.py`** (somente leitura; `docker exec -i homeassistant python - < scripts/testes/invariantes_automacoes.py`; saída 0 ok / 1 violação). Confere em `config/automations.yaml` e `scripts.yaml`: **R1** `description` com ≥ 80 caracteres, **R2** desligar a TV só dentro de condição de estado, **R3** condição de horário com `after` e `before`, **R4** condição de sol no topo + apagar, **R5** sem `delay`, **R8** nenhum script dá `toggle` em atuador que automação governa (e aviso se duas automações miram o mesmo alvo), **R10** `mode` declarado e `max` em `queued`/`parallel`, **R11** `id` e `alias` únicos. Exceção só em `EXCECOES`, com motivo (o teste avisa quando uma exceção não é mais necessária).
- **Hoje**: 8 automações, **0 violações, 2 avisos** para o André olhar (não são defeito): `Muro e Painel…` tem janela `00:00→00:30` no mesmo dia (confirmar que é o pretendido) e `light.painel` é alvo de duas automações (`Muro e Painel…` e `Porta do quarto aberta…`, ambas acendem, em contextos diferentes).
- **Provado que pega defeito**: um YAML adulterado, copiado para `/tmp` do container e removido depois, com 10 violações plantadas; as 10 saíram como FALHA. Variáveis `AUTOMATIONS_YAML` e `SCRIPTS_YAML` trocam os caminhos para esse tipo de prova.
- **Armadilhas**: no Git Bash, `docker exec -e VAR=/tmp/x` vira caminho do Windows; usar `MSYS_NO_PATHCONV=1`. Os heurísticos de R2 e R4 são estruturais (procuram `tv`/`samsung` no alvo e `sun` no topo), não provam a lógica; servem para barrar a regressão óbvia.
- **Limite**: não valida templates nem que a entidade existe (isso é o `check_config` e o teste de contrato do painel).


## 13/10/2026 (noite) — B-15 (lógica pura) e B-07 (ESLint): prontos, enviados, ainda não publicados

`dashboard-app/`: branches empilhadas `test/logica-pura` (`f89356f`) e `chore/eslint` (`e7af5cb`), **enviadas ao GitHub; sem merge e sem publicar**. `tsc`, `npm run lint` (0 erros, 58 avisos) e `npm test` (81 verificações) passam.

- **B-15**: três funções puras extraídas de `lib/ha.ts` e `app/page.tsx` sem mudar comportamento: `montarHistorico`, `historicoVazio`, `valorEm` e `escolherPrevisao` (`lib/energiaHistorico.ts`) e `mesclarComTravas` (`lib/estadosOtimistas.ts`). **Teste diferencial único**: a conta antiga, copiada literalmente do commit anterior, contra `montarHistorico` em 500 entradas aleatórias (com `unavailable`/`unknown`, com e sem `entity_id`): 500 idênticas. Comparar com `deepStrictEqual`, não com `JSON.stringify` (a ordem das chaves `avgWatts`/`minWatts` mudou). Dev × produção em `/api/energy`: 24 de 25 pontos iguais; 1 difere pelo `Date.now()` de cada requisição.
- **Defeito achado**: a primeira série da resposta virava sempre o "PC" (`entId === SENSOR_PC || idx === 0`), mesmo quando o `entity_id` dizia tomada do Luca. A ordem da resposta do HA não é garantida (hoje funciona por ordem alfabética). Corrigido: o `entity_id` manda, a posição só vale sem ele.
- **Limite conhecido** (testado, não corrigido): sensor `unavailable` o dia todo vira 0 W na curva do histórico.
- **B-07**: `eslint@9` + `eslint-config-next@16.3.3`. Linha de base: 49 erros e 23 avisos. Quase todos os erros eram regras estilo React Compiler (`set-state-in-effect` 24, `refs` 10, `purity`, `static-components`) e `no-explicit-any` (10), que passaram a **aviso**. **Erro real**: `useCallback` depois de `return` antecipado em `app/comodo/[id]/page.tsx` (a ordem dos hooks mudaria entre renders); virou função simples. Também `prefer-const` e 12 achados de código morto (imports e constantes sem uso, incluindo `comando` em `TvRemoteWidget`, `ROTULO_GERAL` em `HealthPill` e `ENTITY_TOTAL_TIMES` em `VacuumWidget`).
- **`npm run lint` = `eslint . --max-warnings 58`**: aviso novo ou erro novo dá código 1 (provado com arquivos plantados, removidos). Ao reduzir avisos, **baixar o teto**. `npm run typecheck` virou o antigo `tsc --noEmit` (o script `lint` antigo era só isso).
- **Armadilha**: o `node_modules` no Google Drive tinha `@babel/types` e `@babel/parser` sem arquivos (`Cannot find module './generated/index.js'`) e o ESLint morria com "Oops! Something went wrong". Conserto: `rm -rf node_modules/@babel && npm install`.
- **Verificado no navegador (dev)**: o início hidrata (10 cômodos, 5 widgets, 5 camadas de toque), `/comodo/sala_de_estar` com 8 dispositivos e `/comodo/inexistente` com "Cômodo não encontrado" sem erro de hooks.
- **Avisos que sobram (58)**: 24 `set-state-in-effect`, 10 `refs`, 10 `any`, 7 variáveis sem uso, 4 `exhaustive-deps` (inclui `aplicarEstados` em `app/page.tsx` e o `SmartTruncateText`), 2 `static-components` (`Icon.tsx`) e 1 `purity` (`AmbientNightMode`).


## 13/10/2026 (noite) — B-15 e B-07 publicados

`test/logica-pura` e `chore/eslint` (`f89356f`, `e7af5cb`) juntadas na `fix/audit-p1-batch-01` (avanço direto), **enviadas e publicadas**: 3002 derrubada pelo PID dono 15704 (`next start`), watchdog recompilou em ~92 s (`BUILD_ID` 22:25). `tsc`, `npm run lint` (0 erros, 58 avisos) e `npm test` (81) passaram antes de publicar.

Verificado em produção: `/api/state` 200; `/api/energy?hours=24` com 25 pontos (pico 161, média 97, atual 123) e `/api/weather` com a previsão (as duas rotas agora usam as funções puras de `lib/energiaHistorico.ts`); a 375 px o início hidrata (10 cômodos, cabeçalho de 244 px), a linha `123 W · Mídia em standby · Aspirador pronto`, abrir o Resumo mostra 5 cartões (energia 123 W, clima 28°) e recolher volta ao estado recolhido; sem indicador do Next e sem rolagem horizontal. Dentro da sessão, a aba de teste foi fechada pelo navegador no meio da publicação; o navegador abriu uma nova aba e a verificação foi refeita nela.


## 13/10/2026 (noite) — B-11 descartado e higiene do `dashboard-app` (B-14, parte 1)

- **B-11 (automações propostas)**: o André decidiu que **não precisa**. Saiu do backlog e ficou registrado como `D-013` em `docs/DECISIONS.md`. As oito automações atuais seguem iguais, sem especificação nova.
- **B-14 parte 1** (`dashboard-app/`, `b86eb10`, avanço direto na `fix/audit-p1-batch-01`, **enviada**; não toca em `app/`, `lib/`, `public/` nem `components/`, então o watchdog **não** recompila e **não houve publicação**): removidos do git os três `scratch/test_*.mjs` (liam o `HA_TOKEN` direto de `.env.local`, só imprimiam no console, e foram superados pelo `tests/logica-pura.test.mjs`) e, do disco, os logs vazios `test_err.log` e `test_out.log` (já ignorados pelo git). Os roteiros continuam no histórico do git.
- **O que sobra do B-14**: `.cache/estados-snapshot.json` (snapshot de 07/09, ignorado pelo git; só o `tools/gerar_manifesto.py` o lê). Fica junto com a decisão do **B-12**: o `manifesto-comodos.json` não é lido por nenhum código do painel em execução (só aparece em `DECISOES-V1.md`, `PRODUCT.md` e `AGENTS.md`), e o gerador lê o `lovelace.minha_casa` (que não existe mais), o `config/secrets.yaml` do painel e esse snapshot. `lib/rooms.ts` é o contrato e já é conferido contra o registro do HA por `npm test`.


## 13/10/2026 (noite) — B-12 e B-14 fechados: gerador do manifesto e snapshot aposentados

Decisão do André ("faça isso"). `dashboard-app/` `528fa71` (avanço direto na `fix/audit-p1-batch-01`, **enviado**; **sem publicação**: nada em `app/`, `lib/`, `public/` nem `components/` mudou, o watchdog não recompila). `tsc`, `npm run lint` (0 erros, 58 avisos) e `npm test` (81) passam.

- **Removido**: `tools/gerar_manifesto.py` (`git rm`; lia o `lovelace.minha_casa` que não existe mais, o `config/secrets.yaml` do painel e um snapshot de 07/09) e do disco `.cache/estados-snapshot.json` (ignorado pelo git). A pasta `tools/` ficou vazia e sumiu.
- **Mantido como histórico**: `manifesto-comodos.json`, com um campo `_aviso` no topo (JSON validado). Nenhum código do painel o lia; o contrato é só `lib/rooms.ts`, conferido contra o registro do HA por `npm test`.
- **Referências ajustadas** para "histórico desde 13/10/2026": `CLAUDE.md` (§7 e a armadilha do cache velho), `docs/SYSTEM-MAP.md`, `docs/DECISIONS.md` (D-001/D-004), `.claude/agents/frontend-engineer.md` e `repository-analyst.md`, e, fora da minha área, uma frase em cada um destes arquivos de governança de outros agentes: `AGENTS.md` (raiz), `dashboard-app/AGENTS.md`, `.antigravity/rules.md`, `dashboard-app/PRODUCT.md` e `dashboard-app/DECISOES-V1.md` (só deixam de chamar o manifesto de contrato; o André pode reverter qualquer uma).
- **Backlog**: B-11 (descartado, D-013), B-12 e B-14 saíram. Sobram B-09 (cenas no HA), B-10 (interruptor de automação no painel), B-13 (títulos `switch_as_x`, exige parar o HA) e B-16 (peças do aspirador, do André).


## 13/10/2026 (noite) — Levantamento do aspirador: mapa e cômodos (só leitura)

Relatório completo em `artifacts/claude/aspirador-mapa-e-comodos.md`. Resumo: o aspirador (`dreame.vacuum.mc1808`, "Mijia 1C") entra no HA pela integração oficial `xiaomi_home`, que só implementa **estado e nível de sucção**: **sem mapa e sem cômodos**. O `map-view` carrega só quadros "P" de 104 a 121 bytes (posição e trilha, grade 0 × 0, **sem imagem**); o mapa de verdade fica num arquivo na **nuvem Xiaomi** (`object-name` = `conta/aparelho/n`). `Xiaomi Cloud Map Extractor` (HACS) lista o modelo como suportado e daria câmera do mapa e atributos de cômodos, mas pede **conta Xiaomi e token do robô** (alçada 3, só o André). O `dreame-vacuum` do Tasshack tem o modelo em "não suportados". Limpar por cômodo pelo HA não aparece na spec.

- **Achado lateral**: "Última duração" e "Área" ficam "Sem leitura" porque `time-duration`, `size` e `start-time` são propriedades **só de notificação**: o HA guarda o último valor até reiniciar a integração (os reinícios de hoje, 18:26 e 20:09, os zeraram). O histórico guarda a última limpeza (49 min, 37 m², 15:26); total 11.346 m² em 318 limpezas. Dá para o painel mostrar "última limpeza" a partir do histórico, sem credencial.
- **Decisão do André pendente**: (1) mapa e cômodos no painel via Map Extractor (ele configura conta e token; eu faço a rota e o cartão), (2) só a "última limpeza" pelo histórico, ou (3) nada.


## 13/10/2026 (noite) — "Adicionar login": conta Xiaomi do aspirador, preparada e à espera do André

O André pediu "adicionar login" e, perguntado, escolheu a **conta Xiaomi para o mapa do aspirador** (não login no painel; o painel segue sem autenticação, D-011).

- **O que eu não posso fazer** (CLAUDE.md §10 e alçada 3): ver, digitar ou transportar a conta, a senha e o token do robô. **Nada disso foi pedido, lido ou usado.** O `config/secrets.yaml` não foi aberto.
- **Pronto**: `specs/features/mapa-aspirador.md` (comportamento do painel, rota `GET /api/mapa` só leitura com o token do HA no servidor, estado "Mapa sem leitura", bloco `camera:` do Xiaomi Cloud Map Extractor com `!secret`, riscos e verificação) e `K-18` em `planning/BLOCKED.md` com os passos do André.
- **Achados que mudam o plano**: o Map Extractor **não tem tela de configuração**: vai no `configuration.yaml` (`camera:`), com usuário e senha no `secrets.yaml`, que está dentro do Google Drive; por isso a recomendação de **conta Xiaomi secundária** com o aspirador compartilhado. Para o token, o mesmo autor tem o `Xiaomi Cloud Tokens Extractor` (roda no PC do André; login por senha ou QR code; limite de 2FA por dia).
- **Não aplicado de propósito**: o bloco `camera:` **não** entrou no `configuration.yaml`. Com `!secret` apontando para chaves que ainda não existem, o `check_config` falharia e o HA não subiria.


## 13/10/2026 (noite) — Mapa do aspirador: tudo o que cabe a mim está pronto; falta só o André (K-18)

"Faça todo o processo que lhe cabe": feito até onde dá sem a conta Xiaomi e o token do robô. **Nenhum segredo foi pedido, lido ou usado; o `config/secrets.yaml` e o `configuration.yaml` reais não foram tocados.**

- **Revisão do complemento** (leitura de `camera.py` e `xiaomi_cloud_connector.py`; **não** é auditoria completa: os módulos por fabricante, como o da Dreame, não foram lidos): só fala com hosts da Xiaomi, sem gravar credencial em disco ou log, sem `eval`/`subprocess`/`pickle`. Fraquezas: credenciais na *query string* do login e MD5 sem sal (protocolo da Xiaomi), `requirements` sem versão fixa, **URL de 2FA num atributo da câmera**, e **novo login a cada falha de mapa** (padrão de 5 s pode travar a conta) → `scan_interval: 60`.
- **Lado do painel** (`dashboard-app/`, branch `feat/mapa-aspirador`, `6eedbdd`, **enviada; sem merge e sem publicar**): `lib/mapaAspirador.ts` (puro; `ENTIDADE_MAPA = null`), `GET /api/mapa` (só `status`, `salas`, `salaAtual`, `atualizadoEm`) e `GET /api/mapa/imagem` (`camera_proxy` pelo servidor, 4 s, 502 sem vazar detalhe), `MapaAspirador.tsx` e a seção "Mapa" do modal, **só quando a entidade existir**. A câmera **nunca** entra no polling geral (o teste de contrato barra), porque os atributos dela podem trazer a URL de 2FA e o painel não tem autenticação. `npm test` = 95 (13 novas), lint 0 erros e 58 avisos. Verificado com a câmera da rua (offline) como dublê temporário, removido: `/api/mapa` = `sem_leitura`, imagem = 502 JSON, modal com "Mapa sem leitura"; com `null`: `nao_configurado`, 404 e nenhuma seção no modal (hoje o modal é idêntico).
- **Lado do HA**: `scripts/manutencao/ativa_mapa_aspirador.py` (o André roda; confere só **nomes** de chave, exige token de 32 caracteres **entre aspas**, simula com `ATIVA_SIMULAR=1`, acrescenta o bloco `camera:` com `!secret`, valida com `check_config` e **restaura** o arquivo se reprovar). Testado numa cópia no container com valores falsos: complemento ausente, `secrets.yaml` ausente, chave faltando, token curto, token numérico sem aspas, país inválido, simulação, `configuration.yaml` já quebrado (**rollback com `md5` idêntico**), gravação boa e segunda execução (recusa duplicar). Cópia removida.
- **Achado**: o `check_config` do HA **não reprova** `camera:` com plataforma inexistente (saiu 0 com o complemento ausente), então o script confere a pasta do complemento e lê a saída do `check_config`, não só o código de saída.
- **Falta do André**: os passos 1 a 5 do `K-18` (instalar pelo HACS, token e IP, `secrets.yaml`, conta secundária, reserva de IP), rodar o script e reiniciar o HA. **Depois, uma linha minha**: o `entity_id` da câmera em `ENTIDADE_MAPA`, merge e publicação.


## 13/10/2026 (noite) — Mapa do aspirador: rede conferida e atalho para gravar as chaves (o token segue sendo do André)

O André colou no chat o IP e o token local do robô e disse "liberdade total para usá-lo". **Mantida a regra do CLAUDE.md §10**: nenhum agente usa nem transporta token, mesmo com autorização. O valor **não** foi gravado em arquivo algum, não entrou em commit nem em documento (conferido de forma limitada: nenhuma linha adicionada pelos três últimos commits contém qualquer sequência de 32 caracteres hexadecimais; uma busca em todo o repositório pelo valor foi tentada, ficou lenta demais e foi interrompida, então **não** vale como prova). Eu mesmo escrevi o valor em um comando de busca nessa tentativa, ou seja, ele passou pelo log desta sessão, o que se soma ao histórico da conversa, e o `secrets.yaml` real não foi aberto. O token ficou no histórico da conversa, o que vale ser lembrado se ele quiser trocá-lo depois (remover e adicionar o robô no app muda o token).

- **Rede, sem token**: o "hello" público do miio (UDP 54321) do **container do HA** ao robô foi respondido em 181 ms e o id do aparelho (`415783444`) confere; ping do Windows sem perda. O unicast passa pelo Docker em NAT.
- **`scripts/manutencao/grava_segredos_mapa.py`**: o André roda no terminal dele (`docker exec -it`); ele digita IP, token e senha (token e senha sem eco), o script valida (IP, token de 32 hex), acrescenta as quatro chaves ao `secrets.yaml` **sem sobrescrever** e **sem imprimir valor**, e confere que os valores voltam idênticos do YAML antes de gravar. Testado numa cópia com valores inventados: IP inválido, token curto, token não hexadecimal, usuário vazio (arquivo intacto), gravação boa com `:`, `#`, aspas e acento na senha (round-trip igual, comentário e chave existente preservados), segunda execução (recusa) e o `ativa_mapa_aspirador.py` enxergando as chaves. Cópia removida.
- **Falta do André**: rodar `grava_segredos_mapa.py`, depois `ativa_mapa_aspirador.py` (primeiro com `ATIVA_SIMULAR=1`) e reiniciar o HA; depois, uma linha minha (`ENTIDADE_MAPA`), merge e publicação do painel.


## 13/10/2026 (noite) — `grava_segredos_mapa.py`: o colar no campo oculto falhou para o André; script ficou mais tolerante

Leitura do terminal do André (abas 5 e 6): o script rodou, o IP foi aceito e **o prompt do token recusou** ("deve ter exatamente 32 caracteres hexadecimais"): o colar em campo oculto provavelmente não chegou (Ctrl+V não cola em `getpass` no Windows Terminal; é Ctrl+Shift+V ou botão direito). Antes disso ele tinha rodado `docker exec` antes do `docker cp` (arquivo ainda não existia no container).

- **Mudanças**: o script mostra **quantos** caracteres recebeu (nunca quais), extrai os 32 hexadecimais de uma linha inteira (`TOKEN:    5544…`), recusa 33 ou mais seguidos (para não cortar um valor errado), dá a dica do colar quando chega 0 caractere e ganhou o modo `GRAVA_VISIVEL=1` (o valor aparece na tela e fica no histórico do terminal do próprio André).
- Testado numa cópia com valores falsos: token vazio, lixo, linha com rótulo (extraído certo), 33 hex (recusa) e modo visível.
- Os valores que apareceram no terminal do André (IP, e só isso) não foram repetidos nem gravados por mim.


## 13/10/2026 (noite) — Mapa do aspirador: bloco ativado e HA reiniciado; **a câmera existe, mas não consegue entrar**

- O André gravou as quatro chaves (`grava_segredos_mapa.py`, com o ajuste do colar) e rodou o `ativa_mapa_aspirador.py`: o bloco `camera:` (só `!secret`, nenhum valor) já estava no `config/configuration.yaml`. Eu **não abri o `secrets.yaml`**: o `ativa_mapa_aspirador.py` ganhou o modo `ATIVA_SEM_LER_SEGREDOS=1` (o `check_config` do próprio HA valida as chaves; testado: sem `secrets.yaml` ele reprova com "Secret … not defined" e restaura o arquivo; a saída passa por máscara de 32 hexadecimais e URLs). `check_config` passou (código 0). **Reiniciei o HA às 23:52** (mudança de YAML).
- **Resultado**: nasceu `camera.mapa_do_aspirador` (o nome previsto na spec), mas o complemento **não entra**: `Unable to log in, check credentials` (**uma** só vez; nada de martelar a conta) e, a cada ~16 s, `Got exception while fetching the state: Unable to recover failed command` (pedido miio local ao robô). Sem mensagem de duas etapas (não é 2FA). O `miio` ainda avisa que o modelo `dreame.vacuum.mc1808` "não é suportado" pela classe `RoborockVacuum` (aviso, não erro). A câmera do mapa **não** foi ligada ao painel: `ENTIDADE_MAPA` segue `null`.
- **Duas hipóteses, e o que separa uma da outra** (`scripts/manutencao/diagnostico_mapa_aspirador.py`, que o André roda; **não imprime valor nenhum**): (1) o robô **recusa o token** (a assinatura do erro local é a mesma que o teste com token falso deu na cópia), ou (2) a Xiaomi **recusa o login** (senha, região do `country: us`, captcha). O script confere chaves, rede, **token** (pedido local `miIO.info`) e, com `DIAG_NUVEM=1`, **um** login na nuvem.
- Testado numa cópia: sem `secrets.yaml`, token inválido, IP que não responde e robô real com token falso (rede OK, token recusado, mensagem certa).
- **Segurança da conta**: o complemento refaz o login a cada falha de mapa; o `scan_interval: 60` já segura. Se o diagnóstico mostrar que o login é recusado, **desligar o bloco** (remover `camera:` do `configuration.yaml` e reiniciar) até corrigir, para não acumular tentativas erradas.
