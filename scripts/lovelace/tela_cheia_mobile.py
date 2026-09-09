# -*- coding: utf-8 -*-
r"""Celular volta a abrir em tela cheia -- sem perder o acesso a barra lateral.

O pedido e simples: em dispositivo movel, tela cheia. A armadilha nao e.

Lendo o `www/custom-cards/kiosk-mode.js`, `hide_sidebar` faz **duas** coisas:

    this.styleManager.addStyle(We.SIDEBAR, ...)                  // some com a barra
    main.host.addEventListener('hass-toggle-menu', blockEventHandler, true)

O segundo registro e um bloqueio em fase de captura do evento
`hass-toggle-menu` -- exatamente o evento que o chip de menu da Geral dispara.
Ou seja: **`hide_sidebar: true` engole o chip**. As duas coisas nao podem
conviver.

E `hide_sidebar` nao paga nada em troca. Numa tela estreita a barra lateral do
Home Assistant ja e uma gaveta modal, fechada por padrao, ocupando zero pixel.
Quem ocupa espaco e o cabecalho. Entao:

    mobile:  hide_header  = true    -> tela cheia de verdade
             hide_sidebar = false   -> zero pixel de custo, chip continua vivo

Rotas de saida em cada pagina, conferidas uma a uma antes de decidir:

  - Geral      chip `mdi:menu` -> abre a barra lateral
  - as outras  o template `room_header` ja traz um chevron para /minha-casa/geral

Como o cabecalho some no celular tambem nas paginas de comodo, este script
acrescenta `hold_action` ao `room_header`: segurar o titulo de qualquer comodo
abre a barra lateral direto, sem passar pela Geral. Uma edicao no template,
vale para os 10.

Em telas largas nada muda: continua valendo o `input_boolean.modo_quiosque`.
E o escape embutido do kiosk-mode segue disponivel em qualquer aparelho --
`?disable_km` na URL, `?disable_km&cache` para gravar so naquele.
"""
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

QUIOSQUE = "[[[ return is_state('input_boolean.modo_quiosque', 'on') ]]]"

ABRIR_MENU = (
    "document.querySelector('home-assistant')"
    ".dispatchEvent(new CustomEvent('hass-toggle-menu',"
    "{bubbles: true, composed: true}))"
)

MENU_ACTION = {
    "action": "fire-dom-event",
    "browser_mod": {"service": "javascript", "data": {"code": ABRIR_MENU}},
}

cfg = load()
config = cfg['data']['config']

# --- 1. celular em tela cheia --------------------------------------------
km = config['kiosk_mode']
assert km['mobile_settings']['hide_header'] == QUIOSQUE, \
    'mobile_settings mudou desde a leitura: %r' % km['mobile_settings']

km['mobile_settings'] = {
    "custom_width": km['mobile_settings']['custom_width'],
    "hide_header": True,
    # NAO ligar: bloqueia o evento hass-toggle-menu e mata o chip de menu,
    # sem devolver um unico pixel (a barra ja e gaveta modal no celular).
    "hide_sidebar": False,
}
print('1) celular: hide_header=True, hide_sidebar=False (chip preservado)')
print('   telas largas seguem em input_boolean.modo_quiosque')

# --- 2. segurar o titulo do comodo abre a barra lateral -------------------
rh = config['button_card_templates']['room_header']
assert 'hold_action' not in rh, 'room_header ja tem hold_action; revise'
rh['hold_action'] = MENU_ACTION
print('2) room_header ganhou hold_action -> abre a barra lateral (10 paginas)')

save(cfg, tag='tela_cheia_mobile')
restart()
