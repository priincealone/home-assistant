# -*- coding: utf-8 -*-
"""Pagina Luzes: respiro nas bordas, nomes sem repeticao do comodo e a
secao Entrada (interruptor que existe na casa e nao estava em lugar nenhum
do dashboard)."""
import json, io

P = r'C:\HomeAssistant\config\.storage\lovelace.minha_casa'
c = json.load(io.open(P, encoding='utf-8'))
view = c['data']['config']['views'][12]
hstack = view['cards'][0]['cards'][1]
stacks = hstack['cards']

NUDE_ROW = ("ha-card { background: transparent !important; border: none !important; "
            "box-shadow: none !important; backdrop-filter: none !important; "
            "border-radius: 0px !important; }")

LABEL_STYLE = {
    "card": [{"background": "transparent", "box-shadow": "none", "height": "26px",
              "padding": "10px 4px 0px 4px", "justify-content": "start"}],
    "name": [{"font-size": "11px", "font-weight": "700",
              "color": "rgba(255,255,255,0.4)", "text-transform": "uppercase",
              "letter-spacing": "0.06em", "justify-self": "start"}],
}

def label(text):
    return {"type": "custom:button-card", "show_name": True, "show_icon": False,
            "show_state": False, "name": text, "tap_action": {"action": "none"},
            "styles": json.loads(json.dumps(LABEL_STYLE)),
            "card_mod": {"style": NUDE_ROW}}

def row(name, entity):
    return {"type": "custom:button-card", "template": "light_row",
            "variables": {"var_name": name, "var_entity": entity},
            "card_mod": {"style": NUDE_ROW}}

# ------------------------------------------------- 1) respiro nas bordas
# O stack-in-card vinha com padding 0 e as linhas usam so 4px, entao o texto
# ficava a 5px da borda do card (o padrao do projeto e 12-16px).
for st in stacks:
    st['card_mod'] = {"style": "ha-card { padding: 6px 12px 12px 12px !important; }\n"}

# --------------------------------- 2) nomes sem repetir o nome da secao
for st in stacks:
    section = None
    for card in st['cards']:
        if card.get('template') != 'light_row':
            section = card.get('name')
            continue
        n = card['variables']['var_name']
        if section:
            for dash in (u' \u2014 ', u' \u2013 ', u' - '):
                if n.startswith(section + dash):
                    n = n[len(section) + len(dash):]
                    break
            if n == section:
                n = u'Luz'
        card['variables']['var_name'] = n

# ------------------------------- 3) secao Entrada (estava fora do dashboard)
if not any('entrada' in json.dumps(x, ensure_ascii=False) for st in stacks
           for x in st['cards']):
    stacks[1]['cards'] += [
        label(u'Entrada'),
        row(u'Muro', 'switch.entrada_switch_1'),
        row(u'Corredor', 'switch.entrada_switch_2'),
    ]

json.dump(c, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False)
print('OK')
