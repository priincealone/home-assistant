# -*- coding: utf-8 -*-
"""
1. Cards de comodo unificados: nome + contagem de luzes no mesmo card pequeno,
   com todos os comodos presentes. Sai a lista de room_tile da Geral.
2. Popups com vidro (glass) e caixas com a mesma borda da lista de compras.
3. swipe_nav (rolagem lateral entre paginas) — resource + config.
4. Mesmo wallpaper em todas as paginas.
"""
import json, io

P = r'C:\HomeAssistant\config\.storage\lovelace.minha_casa'
R = r'C:\HomeAssistant\config\.storage\lovelace_resources'

c = json.load(io.open(P, encoding='utf-8'))
cfg = c['data']['config']
T = cfg['button_card_templates']
geral = cfg['views'][0]

# ==================================================== 1) template room_mini
NUDE = ("ha-card { background: transparent !important; border: none !important; "
        "box-shadow: none !important; backdrop-filter: none !important; }\n"
        "ha-card::before, ha-card::after { display: none !important; }\n")

T['room_mini'] = {
    "variables": {"var_name": None, "var_sensor": None, "var_lights": [],
                  "var_path": "/", "var_icon": "mdi:lightbulb",
                  "var_color": "#FF9F0A"},
    "type": "custom:button-card",
    "entity": "[[[ return variables.var_sensor ]]]",
    "name": "[[[ return variables.var_name ]]]",
    "show_state": False, "show_icon": False, "show_name": True,
    "tap_action": {"action": "navigate",
                   "navigation_path": "[[[ return variables.var_path ]]]"},
    "custom_fields": {
        "num": ("[[[ if (!variables.var_sensor) return 'Sem luzes';"
                " const n = entity ? parseInt(entity.state) : 0;"
                " if (isNaN(n)) return '--';"
                " if (n === 0) return 'Apagado';"
                " return n === 1 ? '1 acesa' : n + ' acesas'; ]]]"),
        "btn": {"card": {
            "type": "custom:button-card",
            "icon": "[[[ return variables.var_icon ]]]",
            "entity": "[[[ return variables.var_sensor ]]]",
            "show_name": False, "show_state": False,
            "tap_action": {
                "action": "call-service", "service": "homeassistant.toggle",
                "data": {"entity_id": "[[[ return variables.var_lights ]]]"},
            },
            "state": [{
                "operator": ">", "value": 0,
                "styles": {
                    "img_cell": [{"background": "[[[ return variables.var_color ]]]"}],
                    "icon": [{"color": "white"}],
                },
            }],
            "styles": {
                "grid": [{"grid-template-areas": '"i"',
                          "grid-template-columns": "38px",
                          "grid-template-rows": "1fr",
                          "align-items": "center", "align-content": "center",
                          "justify-items": "start"}],
                "icon": [{"width": "25px",
                          "color": "[[[ return variables.var_color ]]]"}],
                "img_cell": [{"justify-self": "start",
                              "background": "rgba(255,255,255,0.12)",
                              "border-radius": "50px",
                              "width": "38px", "height": "38px"}],
                "card": [{"padding": "0px 8px 0px 12px", "width": "58px",
                          "height": "58px", "border-radius": "0px",
                          "background": "rgba(0,0,0,0)", "box-shadow": "none"}],
            },
            "card_mod": {"style": NUDE},
        }},
    },
    "state": [{
        "operator": ">", "value": 0,
        "styles": {
            "card": [{"background": "white"}],
            "name": [{"color": "black"}],
            "custom_fields": {"num": [{"color": "rgba(0,0,0,0.5)"}]},
        },
    }],
    "styles": {
        "grid": [{"grid-template-areas": '"btn n" "btn num"',
                  "grid-template-columns": "min-content 1fr",
                  "grid-template-rows": "1fr 1fr", "align-items": "center"}],
        "name": [{"justify-self": "start", "align-self": "end",
                  "font-size": "14px", "font-weight": "550",
                  "line-height": "1.25", "color": "white",
                  "white-space": "nowrap"}],
        "custom_fields": {"num": [{"color": "rgba(255,255,255,0.5)",
                                   "justify-self": "start", "align-self": "start",
                                   "font-size": "13.5px", "line-height": "1.25",
                                   "font-weight": "400"}]},
        "card": [{"padding": "0px 0px 0px 2px", "border-radius": "22px",
                  "height": "70px"}],
    },
}

ROOMS = [
    (u"Sala de Estar", "sensor.luzes_sala_de_estar", "/minha-casa/sala-de-estar",
     ["light.luz_sala", "light.painel"]),
    (u"Cozinha", "sensor.luzes_cozinha", "/minha-casa/cozinha",
     ["light.cozinha_copa_varanda_switch_3"]),
    (u"Copa", "sensor.luzes_copa", "/minha-casa/copa",
     ["light.cozinha_copa_varanda_switch_2"]),
    (u"Lavanderia", "sensor.luzes_lavanderia", "/minha-casa/lavanderia",
     ["light.cozinha_copa_varanda_switch_1"]),
    (u"\u00c1rea Gourmet", "sensor.luzes_area_gourmet", "/minha-casa/area-gourmet",
     ["light.luzes_externas_switch_1", "light.luzes_externas_switch_2",
      "light.luzes_externas_switch_3", "light.luzes_externas_switch_4"]),
    (u"Quarto do Luca", "sensor.luzes_quarto_do_luca", "/minha-casa/quarto-luca",
     ["light.quarto_luca_switch_1"]),
    (u"Banheiro", "sensor.luzes_banheiro", "/minha-casa/banheiro",
     ["switch.banheiro_switch_1", "switch.banheiro_switch_2"]),
    (u"Circula\u00e7\u00e3o", "sensor.luzes_circulacao", "/minha-casa/circulacao",
     ["light.circulacao_switch_1", "light.circulacao_switch_2"]),
    (u"Closet", "sensor.luzes_closet", "/minha-casa/closet",
     ["light.closet_switch_1", "light.led_escritorio_sonoff_1001dff472"]),
    (u"Quarto", None, "/minha-casa/quarto", []),
]

rooms_grid = {
    "type": "grid", "columns": 2, "square": False,
    "cards": [{
        "type": "custom:button-card", "template": "room_mini",
        "variables": {"var_name": n, "var_sensor": s, "var_path": p,
                      "var_lights": l},
    } for n, s, p, l in ROOMS],
    "card_mod": {"style": "#root { grid-auto-rows: min-content !important; "
                          "gap: 10px !important; }"},
}

body = geral['cards'][0]['cards'][1]
col1, col2, col3 = body['cards'][0], body['cards'][1], body['cards'][2]
col1['cards'] = [col1['cards'][0]]        # so a previsao do tempo
col2['cards'] = [rooms_grid]              # grade unica de comodos

# =============================================== 2) glass + caixas nos popups
DIALOG_GLASS = (
    "wa-dialog::part(dialog) {\n"
    "  background: rgba(18,23,46,0.55) !important;\n"
    "  backdrop-filter: blur(34px) saturate(170%) !important;\n"
    "  -webkit-backdrop-filter: blur(34px) saturate(170%) !important;\n"
    "  border: 1px solid rgba(255,255,255,0.12) !important;\n"
    "  border-radius: 26px !important;\n"
    "  box-shadow: 0 24px 60px rgba(0,0,0,0.45) !important;\n"
    "}\n"
)
# mesma moldura da caixa "Adicionar item" da lista de compras
PILL_MOD = (
    "ha-card {\n"
    "  box-shadow: none !important;\n"
    "  backdrop-filter: none !important;\n"
    "  -webkit-backdrop-filter: none !important;\n"
    "  border: 1px solid rgba(255,255,255,0.12) !important;\n"
    "}\n"
    "ha-card::before, ha-card::after { display: none !important; }\n"
)

def style_pills(node):
    if isinstance(node, list):
        for x in node:
            style_pills(x)
        return
    if not isinstance(node, dict):
        return
    if node.get('type') == 'custom:button-card':
        for s in node.get('styles', {}).get('card', []):
            if s.get('border-radius') == '12px':
                node['card_mod'] = {"style": PILL_MOD}
                if s.get('background') == 'rgba(255,255,255,0.07)':
                    s['background'] = 'rgba(255,255,255,0.07)'
    for k in ('cards', 'card'):
        if k in node:
            style_pills(node[k])

def with_popups(node):
    if isinstance(node, list):
        for x in node:
            with_popups(x)
        return
    if not isinstance(node, dict):
        return
    ta = node.get('tap_action')
    if isinstance(ta, dict) and isinstance(ta.get('browser_mod'), dict):
        data = ta['browser_mod'].get('data', {})
        data['card_mod'] = {"style": {"ha-dialog$": DIALOG_GLASS}}
        style_pills(data.get('content'))
    for k in ('cards', 'card', 'chips'):
        if k in node:
            with_popups(node[k])

with_popups(cfg['views'])

# ============================================ 3) swipe_nav (rolagem lateral)
cfg['swipe_nav'] = {
    "animate": "swipe",
    "animate_duration": 200,
    "swipe_amount": 15,
    "wrap": True,
    "prevent_default": False,
    "enable_mouse_swipe": False,
    "skip_hidden": True,
}

# ============================================= 4) mesmo wallpaper em todas
BG = geral.get('background')
for v in cfg['views']:
    v['background'] = BG

json.dump(c, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False)

# ------------------------------------------------ resource do swipe-navigation
res = json.load(io.open(R, encoding='utf-8'))
urls = [i['url'] for i in res['data']['items']]
if not any('swipe-navigation.js' in u for u in urls):
    res['data']['items'].append({
        "id": "a7d3f1c95b6e4c2ea1f0c8d4e7b93a15",
        "url": "/local/custom-cards/swipe-navigation.js",
        "type": "module",
    })
    json.dump(res, io.open(R, 'w', encoding='utf-8'), ensure_ascii=False)
    print("resource adicionado")
else:
    print("resource ja existia")

print("OK")
