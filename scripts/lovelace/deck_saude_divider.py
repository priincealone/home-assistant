# -*- coding: utf-8 -*-
"""Afina o separador do deck de saude.

O template `divider` desenha a linha dentro de um card `entities`, que carrega
padding e altura minima do tema -- medido, ocupava 4px de caixa para 1px de
traco, com a linha parando a 309px dos 341px do card e opacidade uniforme
(0.10), o que a deixa com cara de barra, nao de hairline.

Aqui o separador vira um card de 1px com gradiente que desvanece nas pontas.
O gradiente **precisa vir pelo `card_mod` com `!important`**: o tema
`apple_home` define o fundo do `ha-card` e ganha do `styles.card` do
button-card -- medido, o separador subia com `background-image: none` e a linha
simplesmente nao aparecia. Isso nao contraria a regra do projeto (nunca por
`background !important` generico em `ha-card`), porque aqui e um card_mod de um
card so, nao uma regra de tema.

Trocado so no deck de saude; o template `divider` global continua como esta,
porque e usado nas outras paginas ja aprovadas.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

HAIRLINE = (
    "linear-gradient(90deg,"
    " rgba(255,255,255,0) 0%,"
    " rgba(255,255,255,0.16) 18%,"
    " rgba(255,255,255,0.16) 82%,"
    " rgba(255,255,255,0) 100%)"
)

LINE_STYLE = (
    "ha-card { background: %s !important; "
    "min-height: 0 !important; height: 1px !important; "
    "margin: 9px 8px !important; padding: 0px !important; "
    "border: none !important; box-shadow: none !important; "
    "backdrop-filter: none !important; -webkit-backdrop-filter: none !important; "
    "border-radius: 0px !important; overflow: hidden !important; }\n"
    "ha-card::before, ha-card::after { display: none !important; }\n"
) % HAIRLINE

separador = {
    "type": "custom:button-card",
    "show_name": False, "show_icon": False, "show_state": False,
    "tap_action": {"action": "none"},
    "styles": {
        "card": [{"height": "1px", "min-height": "1px", "padding": "0px",
                  "border-radius": "0px", "border": "none", "box-shadow": "none"}],
        "grid": [{"grid-template-areas": '"n"', "grid-template-rows": "1px",
                  "grid-template-columns": "1fr"}],
    },
    "card_mod": {"style": LINE_STYLE},
}


def eh_separador(card):
    """Divider original ou uma versao anterior deste mesmo separador."""
    if card.get('template') == 'divider':
        return True
    alturas = [s.get('height') for s in (card.get('styles', {}).get('card') or [])]
    return '1px' in alturas


cfg = load()
col = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][0]
deck = col['cards'][-1]
assert deck['type'] == 'custom:stack-in-card', 'deck de saude nao esta no fim da coluna'

alvo = [i for i, c in enumerate(deck['cards']) if eh_separador(c)]
assert len(alvo) == 1, 'esperava exatamente um separador no deck (achei %d)' % len(alvo)
deck['cards'][alvo[0]] = separador

save(cfg, tag='deck_saude_hairline')
restart()
