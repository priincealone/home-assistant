# -*- coding: utf-8 -*-
"""Deck de midia na Geral: agrupa TV e PS5 (o que ja existe na casa) com
YouTube Music e Apple Music num unico card, na coluna da direita.

O card solto da TV (stack-in-card horizontal com o mushroom-media-player e o
botao do controle remoto) nao e descartado -- ele passa a ser a primeira linha
do deck, e o botao do controle remoto vira tambem o toque do tile "TV".
"""
import copy
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
col = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][2]

tv_stack = col['cards'][0]
assert tv_stack['type'] == 'custom:stack-in-card', 'coluna da direita mudou de forma'
tap_remote = copy.deepcopy(tv_stack['cards'][1]['tap_action'])   # popup do controle

# --- estilos compartilhados ------------------------------------------------
NUDE = ("ha-card { background: transparent !important; border: none !important; "
        "box-shadow: none !important; backdrop-filter: none !important; "
        "-webkit-backdrop-filter: none !important; border-radius: 0px !important; }\n"
        "ha-card::before, ha-card::after { display: none !important; }\n")


def label(text):
    """Legenda de secao, no mesmo padrao das outras paginas."""
    return {
        "type": "custom:button-card",
        "name": text,
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


def tile(name, icon, gradient, tap):
    """Tile de midia (template shortcut_tile: 74px, icone + nome)."""
    return {
        "type": "custom:button-card",
        "template": "shortcut_tile",
        "variables": {"var_name": name, "var_icon": icon},
        "styles": {"card": [{"background": gradient}]},
        "tap_action": tap,
        "card_mod": {"style": NUDE},
    }


def rgba_gradient(rgb, strong=True):
    a1, a2 = (0.30, 0.08) if strong else (0.10, 0.02)
    return ("linear-gradient(135deg, rgba(%s,%s), rgba(%s,%s))" % (rgb, a1, rgb, a2))


def reactive(entity, rgb):
    """Gradiente forte quando o aparelho esta ligado, apagado quando nao esta."""
    on = rgba_gradient(rgb, True)
    off = rgba_gradient('255,255,255', False)
    return ("[[[ const s = states['%s']; return (s && s.state !== 'off' && "
            "s.state !== 'unavailable' && s.state !== 'standby' && s.state !== 'unknown') "
            "? '%s' : '%s'; ]]]" % (entity, on, off))


# --- os quatro tiles -------------------------------------------------------
tiles = [
    tile("YouTube Music", "mdi:youtube", rgba_gradient("255,0,0"),
         {"action": "url", "url_path": "https://music.youtube.com"}),
    tile("Apple Music", "mdi:apple", rgba_gradient("250,36,60"),
         {"action": "url", "url_path": "https://music.apple.com"}),
    tile("TV", "mdi:television", reactive("media_player.sala_de_estar_tv", "10,132,255"),
         tap_remote),
    tile("PS5", "mdi:sony-playstation", reactive("media_player.sala_de_estar_ps5", "0,112,209"),
         {"action": "more-info", "entity": "media_player.sala_de_estar_ps5"}),
]

# --- o deck ----------------------------------------------------------------
tv_inner = copy.deepcopy(tv_stack)
tv_inner['card_mod'] = {"style": NUDE}

deck = {
    "type": "custom:stack-in-card",
    "mode": "vertical",
    "cards": [
        label("Mídia"),
        tv_inner,
        {
            "type": "grid",
            "columns": 2,
            "square": False,
            "cards": tiles,
            "card_mod": {"style": "ha-card { --ha-card-border-width: 0px; }\n"},
        },
    ],
    "card_mod": {"style": "ha-card { padding: 6px 12px 12px 12px !important; }\n"},
}

col['cards'][0] = deck

save(cfg, tag='deck_midia')
restart()
