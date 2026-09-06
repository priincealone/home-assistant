# -*- coding: utf-8 -*-
"""Deck "Buscar" na Geral: onde estao os aparelhos.

Usa os `device_tracker` que o app do Home Assistant ja publica no iPhone e no
iPad -- sem tocar na conta iCloud, sem senha e sem integracao de terceiros. O
endereco vem do `sensor.*_geocoded_location` do proprio app, e a bateria do
`sensor.*_battery_level`.

AirTags e outros itens do app Buscar **nao entram por aqui**: a Apple nao expoe
API para eles e a integracao `icloud` do core nao os enxerga. Isso exigiria uma
integracao de terceiros logada na conta Apple (ver ESTADO_DASHBOARD.md).
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart
from ui import hairline, NUDE

VERDE = "#30D158"
AZUL = "#0A84FF"


def label(text):
    return {
        "type": "custom:button-card", "name": text,
        "show_name": True, "show_icon": False, "show_state": False,
        "tap_action": {"action": "none"},
        "styles": {
            "card": [{"background": "transparent", "box-shadow": "none",
                      "height": "22px", "padding": "8px 4px 0px 4px",
                      "justify-content": "start", "border-radius": "0px"}],
            "name": [{"font-size": "11px", "font-weight": "700",
                      "color": "rgba(255,255,255,0.4)", "text-transform": "uppercase",
                      "letter-spacing": "0.06em", "justify-self": "start"}],
            "grid": [{"grid-template-rows": "1fr", "align-items": "center",
                      "align-content": "center"}],
        },
        "card_mod": {"style": NUDE},
    }


def item(nome, icone, tracker, bateria, geo):
    """Uma linha: icone + nome + onde esta (e a bateria)."""
    onde = (
        "[[[ const s = states['%s'];"
        " let onde = s ? s.state : 'desconhecido';"
        " if (onde === 'home') { onde = 'Em casa'; }"
        " else if (onde === 'not_home') {"
        "   const g = states['%s'];"
        "   onde = (g && g.state && !['unknown','unavailable',''].includes(g.state))"
        "     ? g.state.split(',')[0] : 'Fora de casa'; }"
        " const b = states['%s'];"
        " const bat = (b && !isNaN(parseInt(b.state))) ? ' · ' + parseInt(b.state) + '%%' : '';"
        " return onde + bat; ]]]"
    ) % (tracker, geo, bateria)

    cor = (
        "[[[ const s = states['%s'];"
        " return (s && s.state === 'home') ? '%s' : '%s'; ]]]"
    ) % (tracker, VERDE, AZUL)

    return {
        "type": "custom:button-card",
        "entity": tracker, "name": nome, "icon": icone,
        "show_name": True, "show_icon": True, "show_state": False,
        "show_label": True, "label": onde,
        "tap_action": {"action": "more-info"},
        "styles": {
            # px explicitos na celula do icone: `min-content` a zera
            "grid": [{"grid-template-areas": '"i n" "i l"',
                      "grid-template-columns": "34px 1fr",
                      "grid-template-rows": "17px 15px",
                      "align-items": "center"}],
            "card": [{"background": "transparent", "height": "44px",
                      "padding": "0px 4px", "justify-content": "start",
                      "justify-items": "start"}],
            "img_cell": [{"width": "26px", "height": "26px", "justify-self": "start"}],
            "icon": [{"width": "22px", "height": "22px", "color": cor}],
            "name": [{"font-size": "13.5px", "font-weight": "550", "color": "white",
                      "justify-self": "start", "align-self": "end"}],
            "label": [{"font-size": "12px", "font-weight": "400",
                       "color": "rgba(255,255,255,0.5)", "justify-self": "start",
                       "align-self": "start", "white-space": "nowrap",
                       "overflow": "hidden", "text-overflow": "ellipsis"}],
        },
        "card_mod": {"style": NUDE},
    }


cfg = load()
col = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][0]

deck = {
    "type": "custom:stack-in-card",
    "mode": "vertical",
    "cards": [
        label("Buscar"),
        item("iPhone de André", "mdi:cellphone",
             "device_tracker.iphone_de_andre",
             "sensor.iphone_de_andre_battery_level",
             "sensor.iphone_de_andre_geocoded_location"),
        hairline(margem_vertical=4, margem_lateral=6),
        item("iPad de André", "mdi:tablet",
             "device_tracker.ipad_de_andre",
             "sensor.ipad_de_andre_battery_level",
             "sensor.ipad_de_andre_geocoded_location"),
    ],
    "card_mod": {"style": "ha-card { padding: 6px 12px 12px 12px !important; }\n"},
}

col['cards'].append(deck)

save(cfg, tag='deck_buscar')
restart()
