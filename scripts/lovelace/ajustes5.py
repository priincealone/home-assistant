# -*- coding: utf-8 -*-
"""
1. Volta os cards de comodo da Geral ao formato anterior (entity_card + room_tile)
2. Padroniza o botao do controle remoto com os botoes on/off e volume da TV
3. Botao de voltar no room_header (navegacao em modo painel, sem abas)
4. Legenda acima da lista de compras
5. Afastamento das extremidades no modo painel (<= 1400px)
"""
import json, io

P = r'C:\HomeAssistant\config\.storage\lovelace.minha_casa'
BAK = r'C:\HomeAssistant\backups\lovelace.minha_casa.bak_pc_comodos'

c = json.load(io.open(P, encoding='utf-8'))
bak = json.load(io.open(BAK, encoding='utf-8'))

d = c['data']['config']
geral = d['views'][0]
body = geral['cards'][0]['cards'][1]
col1, col2, col3 = body['cards'][0], body['cards'][1], body['cards'][2]

bak_body = bak['data']['config']['views'][0]['cards'][0]['cards'][1]
bak_col1, bak_col2 = bak_body['cards'][0], bak_body['cards'][1]

NUDE_KEEP_BG = ("ha-card { border: none !important; box-shadow: none !important; "
                "backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }\n"
                "ha-card::before, ha-card::after { display: none !important; }\n")
NUDE = ("ha-card { background: transparent !important; border: none !important; "
        "box-shadow: none !important; backdrop-filter: none !important; }\n"
        "ha-card::before, ha-card::after { display: none !important; }\n")

# ---------------------------------------------------------------- 1) reverter
# coluna 1: previsao + grid de 4 entity_card (como estava)
col1['cards'] = [col1['cards'][0], bak_col1['cards'][1]]
# coluna 2: lista de room_tile (como estava). Os gauges do PC NAO voltam:
# essa mudanca o usuario aprovou e agora vivem no popup do chip.
col2['cards'] = [bak_col2['cards'][0]]

# ------------------------------------------- 2) botao do controle remoto da TV
tv_stack = col3['cards'][0]
remote = tv_stack['cards'][1]
remote['styles'] = {
    "card": [{"width": "42px", "height": "42px", "padding": "0px",
              "border-radius": "12px", "box-shadow": "none",
              "background": "rgba(255,255,255,0.05)"}],
    "grid": [{"grid-template-rows": "1fr", "align-items": "center",
              "align-content": "center", "justify-items": "center"}],
    "img_cell": [{"width": "21px", "height": "21px", "justify-self": "center"}],
    "icon": [{"width": "21px", "color": "rgba(255,255,255,0.95)"}],
}
# align-self: end alinha com a linha de controles do mushroom (a ha-card e o
# proprio item do grid — hui-card usa display: contents)
remote['card_mod'] = {"style": (
    "ha-card {\n"
    "  align-self: end !important;\n"
    "  justify-self: end !important;\n"
    "  margin: 0 0 12px 0 !important;\n"
    "  width: 42px !important;\n"
    "  height: 42px !important;\n"
    "  border-radius: 12px !important;\n"
    "  background: rgba(255,255,255,0.05) !important;\n"
    "  border: none !important;\n"
    "  box-shadow: none !important;\n"
    "  backdrop-filter: none !important;\n"
    "  -webkit-backdrop-filter: none !important;\n"
    "}\n"
    "ha-card::before, ha-card::after { display: none !important; }\n"
    "ha-card:hover { background: rgba(255,255,255,0.11) !important; }\n"
)}
# a coluna do botao nao precisa de 1fr
tv_stack['card_mod'] = {"style": {
    "hui-horizontal-stack-card$": (
        "#root {\n"
        "  grid-template-columns: 1fr max-content !important;\n"
        "  align-items: end !important;\n"
        "  gap: 0px !important;\n"
        "}\n"
    ),
    ".": "ha-card { overflow: visible !important; }\n",
}}

# -------------------------------------- 3) botao de voltar no cabecalho da pagina
d['button_card_templates']['room_header'] = {
    "variables": {"var_name": "name"},
    "type": "custom:button-card",
    "name": "[[[ return variables.var_name ]]]",
    "icon": "mdi:chevron-left",
    "show_state": False,
    "show_name": True,
    "show_icon": True,
    "tap_action": {"action": "navigate", "navigation_path": "/minha-casa/geral"},
    "styles": {
        "grid": [{"grid-template-areas": '"i n"',
                  "grid-template-columns": "48px 1fr",
                  "grid-template-rows": "1fr",
                  "align-items": "center", "align-content": "center",
                  "gap": "6px"}],
        "card": [{"background": "transparent", "height": "58px",
                  "border-radius": "0px", "margin-top": "6px",
                  "margin-bottom": "0px", "box-shadow": "none",
                  "padding": "0px"}],
        "img_cell": [{"width": "38px", "height": "38px", "justify-self": "start",
                      "border-radius": "13px",
                      "background": "rgba(255,255,255,0.10)",
                      "border": "1px solid rgba(255,255,255,0.10)"}],
        "icon": [{"width": "24px", "color": "rgba(255,255,255,0.95)"}],
        "name": [{"justify-self": "start", "font-size": "30px",
                  "font-weight": "bold", "color": "var(--primary-text-color)",
                  "filter": "drop-shadow(rgba(0,0,0,0.5) 0.1rem 0.1rem 1.5px)"}],
    },
    "card_mod": {"style": NUDE + "ha-card:hover #img-cell "
                 "{ background: rgba(255,255,255,0.18) !important; }\n"},
}

# ------------------------------------------- 4) legenda da lista de compras
def label(text):
    return {
        "type": "custom:button-card",
        "name": text,
        "show_name": True, "show_icon": False,
        "tap_action": {"action": "none"},
        "styles": {
            "card": [{"background": "transparent", "box-shadow": "none",
                      "height": "18px", "padding": "0px 4px",
                      "justify-content": "start", "border-radius": "0px"}],
            "name": [{"font-size": "10px", "font-weight": "700",
                      "color": "rgba(255,255,255,0.45)",
                      "text-transform": "uppercase",
                      "letter-spacing": "0.08em", "justify-self": "start"}],
            "grid": [{"grid-template-rows": "1fr", "align-items": "center",
                      "align-content": "center"}],
        },
        "card_mod": {"style": NUDE + "ha-card { border-radius: 0 !important; }\n"},
    }

# insere a legenda logo antes do todo-list, sem duplicar se ja existir
todo_idx = next(i for i, x in enumerate(col3['cards']) if x.get('type') == 'todo-list')
if todo_idx == 0 or col3['cards'][todo_idx - 1].get('name') != 'Lista de compras':
    col3['cards'].insert(todo_idx, label('Lista de compras'))

# ---------------------------- 5) afastamento das extremidades no modo painel
PANEL_PADDING = (
    "@media (max-width: 1400px) {\n"
    "  #root {\n"
    "    padding: 18px 16px 28px 16px !important;\n"
    "    box-sizing: border-box !important;\n"
    "  }\n"
    "}\n"
    "@media (max-width: 500px) {\n"
    "  #root {\n"
    "    padding: 16px 14px 26px 14px !important;\n"
    "  }\n"
    "}\n"
)
for v in d['views']:
    root = v['cards'][0]
    existing = root.get('card_mod', {}).get('style', '')
    if isinstance(existing, str) and 'max-width: 1400px' in existing:
        continue
    root['card_mod'] = {"style": (existing + PANEL_PADDING) if isinstance(existing, str)
                        else PANEL_PADDING}

json.dump(c, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False)
print("OK")
