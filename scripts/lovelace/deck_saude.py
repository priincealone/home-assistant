# -*- coding: utf-8 -*-
"""Deck de saude na Geral, abaixo do clima (coluna da esquerda).

Replica a arquitetura do `health_template` da dashboard de referencia --
blocos separados por divider, com o sono e o coracao em destaque e as metricas
de atividade numa linha de tiles -- adaptada as metricas que o Garmin manda
para o Apple Saude e que o Atalho do iPhone empurra para o webhook do HA.

A referencia mostra score de sono, estagios (deep/rem/light) e FC min/med/max;
nada disso existe aqui, entao o bloco de sono vira horas dormidas e o de
coracao, a FC de repouso.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

NUDE = ("ha-card { background: transparent !important; border: none !important; "
        "box-shadow: none !important; backdrop-filter: none !important; "
        "-webkit-backdrop-filter: none !important; border-radius: 0px !important; }\n"
        "ha-card::before, ha-card::after { display: none !important; }\n")


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


def destaque(entity, nome, icon, cor):
    """Numero grande com o icone a esquerda -- sono e frequencia cardiaca."""
    return {
        "type": "custom:button-card",
        "entity": entity, "name": nome, "icon": icon,
        "show_name": True, "show_icon": True, "show_state": True,
        "tap_action": {"action": "more-info"},
        "styles": {
            # px explicitos: `min-content` zera a celula do icone (armadilha conhecida)
            "grid": [{"grid-template-areas": '"i s" "i n"',
                      "grid-template-columns": "36px 1fr",
                      "grid-template-rows": "24px 16px",
                      "align-items": "center"}],
            "card": [{"background": "transparent", "height": "56px",
                      "padding": "0px 4px", "justify-content": "start",
                      "justify-items": "start"}],
            "img_cell": [{"width": "28px", "height": "28px", "justify-self": "start"}],
            "icon": [{"width": "24px", "height": "24px", "color": cor}],
            "state": [{"font-size": "19px", "font-weight": "600", "color": "white",
                       "justify-self": "start", "align-self": "end"}],
            "name": [{"font-size": "11.5px", "font-weight": "500",
                      "color": "rgba(255,255,255,0.5)", "justify-self": "start",
                      "align-self": "start"}],
        },
        "card_mod": {"style": NUDE},
    }


def stat(entity, nome, icon, cor):
    return {
        "type": "custom:button-card", "template": "sensor_tile",
        "entity": entity,
        "variables": {"var_name": nome, "var_icon": icon, "var_color": cor},
        "card_mod": {"style": "ha-card { border: none !important; }\n"},
    }


cfg = load()
col = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][0]
assert col['cards'][0]['type'] == 'weather-forecast', 'coluna da esquerda mudou'

deck = {
    "type": "custom:stack-in-card",
    "mode": "vertical",
    "cards": [
        label("Saúde"),
        {
            "type": "grid", "columns": 2, "square": False,
            "cards": [
                destaque("sensor.saude_sono", "Sono", "mdi:sleep", "#5E5CE6"),
                destaque("sensor.saude_fc_de_repouso", "Repouso", "mdi:heart-pulse", "#FF453A"),
            ],
            "card_mod": {"style": "ha-card { --ha-card-border-width: 0px; }\n"},
        },
        {"type": "custom:button-card", "template": "divider"},
        {
            "type": "grid", "columns": 3, "square": False,
            "cards": [
                stat("sensor.saude_passos", "Passos", "mdi:shoe-print", "#30D158"),
                stat("sensor.saude_distancia", "Distância", "mdi:map-marker-distance", "#0A84FF"),
                stat("sensor.saude_calorias", "Calorias", "mdi:fire", "#FF9F0A"),
            ],
            "card_mod": {"style": "ha-card { --ha-card-border-width: 0px; }\n"},
        },
        {
            "type": "custom:button-card",
            "entity": "sensor.saude_atualizado_em",
            "name": "Atualizado", "show_name": True, "show_icon": False,
            "show_state": False, "show_last_changed": True,
            "tap_action": {"action": "none"},
            "styles": {
                "grid": [{"grid-template-areas": '"n l"',
                          "grid-template-columns": "max-content 1fr",
                          "grid-template-rows": "1fr", "align-items": "center"}],
                "card": [{"background": "transparent", "height": "20px",
                          "padding": "2px 6px 0px 6px", "justify-content": "start"}],
                "name": [{"font-size": "10.5px", "color": "rgba(255,255,255,0.35)",
                          "justify-self": "start"}],
                "label": [{"font-size": "10.5px", "color": "rgba(255,255,255,0.35)",
                           "justify-self": "start", "padding-left": "4px"}],
            },
            "card_mod": {"style": NUDE},
        },
    ],
    "card_mod": {"style": "ha-card { padding: 6px 12px 12px 12px !important; }\n"},
}

col['cards'].append(deck)

save(cfg, tag='deck_saude')
restart()
