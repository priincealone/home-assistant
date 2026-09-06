# -*- coding: utf-8 -*-
"""Pecas visuais reaproveitaveis da dashboard.

Comecou com o separador do deck de saude: como ele passou a ser usado em mais
de um lugar, o estilo mora aqui para nao virar copia divergente.
"""

HAIRLINE_GRADIENT = (
    "linear-gradient(90deg,"
    " rgba(255,255,255,0) 0%,"
    " rgba(255,255,255,0.16) 18%,"
    " rgba(255,255,255,0.16) 82%,"
    " rgba(255,255,255,0) 100%)"
)

# Sem fundo, borda, sombra ou blur proprios -- so o card externo desenha o vidro.
NUDE = (
    "ha-card { background: transparent !important; border: none !important; "
    "box-shadow: none !important; backdrop-filter: none !important; "
    "-webkit-backdrop-filter: none !important; }\n"
    "ha-card::before, ha-card::after { display: none !important; }\n"
)


def hairline(margem_vertical=9, margem_lateral=8):
    """Fio de 1px que desvanece nas pontas.

    O gradiente precisa vir pelo `card_mod` com `!important`: o fundo que o tema
    `apple_home` aplica no `ha-card` ganha do `styles.card` do button-card, e a
    linha some (medido -- subia com `background-image: none`).
    """
    style = (
        "ha-card { background: %s !important; "
        "min-height: 0 !important; height: 1px !important; "
        "margin: %dpx %dpx !important; padding: 0px !important; "
        "border: none !important; box-shadow: none !important; "
        "backdrop-filter: none !important; -webkit-backdrop-filter: none !important; "
        "border-radius: 0px !important; overflow: hidden !important; }\n"
        "ha-card::before, ha-card::after { display: none !important; }\n"
    ) % (HAIRLINE_GRADIENT, margem_vertical, margem_lateral)
    return {
        "type": "custom:button-card",
        "show_name": False, "show_icon": False, "show_state": False,
        "tap_action": {"action": "none"},
        "styles": {
            "card": [{"height": "1px", "min-height": "1px", "padding": "0px",
                      "border-radius": "0px", "border": "none", "box-shadow": "none"}],
            "grid": [{"grid-template-areas": '"n"', "grid-template-rows": "1px",
                      "grid-template-columns": "1fr"}],
        },
        "card_mod": {"style": style},
    }
