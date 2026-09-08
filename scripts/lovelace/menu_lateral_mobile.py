# -*- coding: utf-8 -*-
r"""Devolve o menu lateral do Home Assistant no celular; tela cheia vira opcao.

Estado anterior (lido do storage):

    kiosk_mode:
      mobile_settings:
        custom_width: 1400
        hide_sidebar: true
        hide_header: true

Ou seja: em **qualquer** tela abaixo de 1400px -- celular e tablet de parede --
o cabecalho e a barra lateral sumiam de forma incondicional. Sem cabecalho nao
ha botao de menu, e sem botao de menu a barra lateral fica **inalcancavel**: as
outras 10 paginas e as Configuracoes deixam de existir para quem esta no
celular. Era o achado #1 do CRITIQUE_DESIGN.md.

O que este script faz:

1. Troca os dois `true` por um template avaliado pelo proprio kiosk-mode, preso
   a `input_boolean.modo_quiosque`. Desligado (padrao) o painel e um app normal
   do HA; ligado, vira tela cheia. A opcao passa a ser dele, nao do arquivo.

   O template usa a forma **JS** (`[[[ ... ]]]`) e nao a Jinja (`{{ ... }}`):
   Jinja devolveria a string "False", que e verdadeira em JavaScript. Conferido
   no bundle: `www/custom-cards/kiosk-mode.js` aceita as duas formas e expoe
   `is_state` no escopo do template JS.

2. Acrescenta um chip de menu na Geral. Isso e necessario porque a Geral e
   `subview: true`, e numa subview o Home Assistant desenha uma **seta de
   voltar** no lugar do botao de menu -- devolver o cabecalho, sozinho, nao
   devolveria o acesso a barra lateral justamente na pagina inicial. O chip
   dispara `hass-toggle-menu` (nome confirmado no kiosk-mode.js) via
   `browser_mod`, no mesmo padrao `fire-dom-event` que a dashboard ja usa.
   Segurar o chip alterna o modo quiosque.

Escape de emergencia, embutido no kiosk-mode e sem depender de nada disto:
`?disable_km` na URL desliga tudo; `?disable_km&cache` grava a escolha so
naquele aparelho; `?kiosk&cache` faz o contrario; `?clear_km_cache` limpa.
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

CHIP_MENU = {
    "type": "template",
    "icon": "mdi:menu",
    "icon_color": "blue",
    "tap_action": {
        "action": "fire-dom-event",
        "browser_mod": {
            "service": "javascript",
            "data": {"code": ABRIR_MENU},
        },
    },
    "hold_action": {
        "action": "call-service",
        "service": "input_boolean.toggle",
        "service_data": {"entity_id": "input_boolean.modo_quiosque"},
    },
}

cfg = load()
config = cfg['data']['config']

# --- 1. kiosk condicional -------------------------------------------------
km = config['kiosk_mode']
antes = dict(km.get('mobile_settings', {}))
assert antes.get('hide_sidebar') is True and antes.get('hide_header') is True, \
    'mobile_settings mudou desde a leitura; revise antes de rodar: %r' % antes

config['kiosk_mode'] = {
    "hide_header": QUIOSQUE,
    "hide_sidebar": QUIOSQUE,
    "mobile_settings": {
        # mantido: e o que classifica o tablet de parede como "mobile"
        "custom_width": antes['custom_width'],
        "hide_header": QUIOSQUE,
        "hide_sidebar": QUIOSQUE,
    },
}
print('1) kiosk_mode agora depende de input_boolean.modo_quiosque')
print('   antes: %r' % antes)

# --- 2. chip de menu na Geral --------------------------------------------
chips = config['views'][0]['cards'][0]['cards'][0]['cards'][1]
assert chips.get('type') == 'custom:mushroom-chips-card', \
    'esperava o chips-card da Geral, achei %r' % chips.get('type')

ja_tem = any(c.get('icon') == 'mdi:menu' for c in chips['chips'])
assert not ja_tem, 'o chip de menu ja existe -- script ja foi rodado'

chips['chips'].insert(0, CHIP_MENU)
print('2) chip "menu" inserido na Geral (%d chips no total)' % len(chips['chips']))

save(cfg, tag='menu_lateral_mobile')
restart()
