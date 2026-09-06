# -*- coding: utf-8 -*-
"""Compacta cards com espaco sobrando e corrige alinhamento vertical do
conteudo, em todas as paginas."""
import json, io

P = r'C:\HomeAssistant\config\.storage\lovelace.minha_casa'
c = json.load(io.open(P, encoding='utf-8'))
cfg = c['data']['config']
T = cfg['button_card_templates']

# =========================================================== entity_card (27x)
# Era 78px com o bloco de texto 6px abaixo do centro (medido: 7px em cima,
# 1px embaixo). Agora 72px com as duas linhas encostando no centro do card.
ec = T['entity_card']
ec['styles']['grid'] = [{
    "grid-template-areas": '"btn n" "btn num"',
    "grid-template-columns": "min-content 1fr",
    "grid-template-rows": "1fr 1fr",
    "align-items": "center",
}]
ec['styles']['name'] = [{
    "justify-self": "start", "align-self": "end",
    "font-size": "14px", "font-weight": "550",
    "line-height": "1.25", "padding-top": "0px", "color": "white",
}]
ec['styles']['custom_fields']['num'] = [{
    "color": "rgba(255,255,255,0.5)", "justify-self": "start",
    "align-self": "start", "font-size": "13.5px",
    "line-height": "1.25", "padding-bottom": "0px", "font-weight": "400",
}]
ec['styles']['card'] = [{
    "padding": "0px 0px 0px 2px", "border-radius": "22px", "height": "70px",
}]
btn = ec['custom_fields']['btn']['card']
btn['styles']['card'] = [{
    "padding": "0px 8px 0px 12px", "width": "58px", "height": "58px",
    "border-radius": "0px", "background": "rgba(0,0,0,0)", "box-shadow": "none",
}]
btn['styles']['grid'] = [{
    "grid-template-areas": '"i"', "grid-template-columns": "38px",
    "grid-template-rows": "1fr", "align-items": "center",
    "align-content": "center", "justify-items": "start",
}]

# ============================================================ apple_scene (2x)
# Faltava grid-template-rows: 1fr — o #container do button-card cria 4 linhas
# e o conteudo encostava no topo.
sc = T['apple_scene']
sc['styles']['grid'] = [{
    "grid-template-areas": '"i n"', "grid-template-columns": "min-content 1fr",
    "grid-template-rows": "1fr", "align-items": "center",
    "align-content": "center",
}]
sc['styles']['card'] = [{
    "background-color": "rgba(255,255,255,0.06)", "border-radius": "18px",
    "height": "56px", "padding": "0px 14px",
}]

# ========================================================== shortcut_tile (2x)
st = T['shortcut_tile']
st['styles']['grid'] = [{
    "grid-template-areas": '"i" "n"',
    "grid-template-rows": "min-content min-content",
    "align-content": "center",
}]
st['styles']['card'] = [{
    "background": "[[[ return variables.var_gradient ]]]",
    "border-radius": "18px", "height": "74px", "padding": "12px",
    "justify-content": "start", "justify-items": "start",
    "border": "1px solid rgba(255,255,255,0.08)",
}]
st['styles']['name'] = [{
    "font-size": "13px", "font-weight": "550", "color": "white",
    "justify-self": "start", "padding-top": "7px",
    "letter-spacing": "-0.01em",
}]

# ============================================================ sensor_tile (1x)
se = T['sensor_tile']
se['styles']['grid'] = [{
    "grid-template-areas": '"i" "n" "s"',
    "grid-template-rows": "min-content min-content min-content",
    "align-content": "center",
}]
se['styles']['card'] = [{
    "background": "rgba(255,255,255,0.05)", "border-radius": "18px",
    "height": "80px", "padding": "10px 12px",
    "border": "1px solid rgba(255,255,255,0.08)",
    "justify-content": "start", "justify-items": "start",
}]
se['styles']['name'] = [{"font-size": "13px", "font-weight": "600",
                        "color": "white", "padding-top": "5px"}]

# ============================================================ now_playing (1x)
# 130px para 20px de texto + capa de 96px. Agora 100px com capa de 72px.
npl = T['now_playing']
npl['styles']['grid'] = [{
    "grid-template-areas": '"art info"', "grid-template-columns": "72px 1fr",
    "grid-template-rows": "1fr", "align-items": "center",
    "align-content": "center",
}]
npl['styles']['card'] = [{"height": "98px", "padding": "13px", "overflow": "hidden"}]
art = npl['custom_fields']['art']['card']
art['styles']['card'] = [{"background": "rgba(255,255,255,0.06)",
                          "border-radius": "14px", "height": "72px",
                          "width": "72px", "padding": "0px"}]
art['styles']['icon'] = [{"width": "30px", "color": "rgba(255,255,255,0.5)"}]
info = npl['custom_fields']['info']['card']
info['styles']['card'] = [{"background": "transparent",
                           "padding": "0px 0px 0px 13px",
                           "justify-self": "start", "justify-content": "start"}]
info['styles']['grid'] = [{"justify-items": "start", "grid-template-rows": "1fr",
                           "align-content": "center"}]
info['styles']['label'] = [{"font-size": "13px", "color": "rgba(255,255,255,0.6)",
                            "justify-self": "start", "margin-top": "4px"}]

# ============================================================== room_tile (16x)
# Altura padrao 140px (pagina Comodos) para nome + badge de 25px.
T['room_tile']['styles']['card'] = [{
    "padding": "13px 16px 14px 16px", "height": "102px", "align-content": "end",
    "opacity": "[[[ return variables.var_motion ? '0.75' : '1' ]]]",
    "border-radius": "22px",
}]

# ================================================ ajustes por tipo de card
GAUGE_COMPACT = ("ha-card { padding: 10px !important; }\n"
                 "ha-card .container { max-width: 155px !important; "
                 "margin: 0 auto !important; }\n")

def tweak(node):
    """Percorre a config aplicando ajustes por tipo de card."""
    if isinstance(node, list):
        for x in node:
            tweak(x)
        return
    if not isinstance(node, dict):
        return

    t = node.get('type')

    if t == 'custom:modern-circular-gauge':
        cm = node.get('card_mod', {}).get('style', '')
        if isinstance(cm, str) and 'max-width: 155px' not in cm:
            node['card_mod'] = {"style": cm + GAUGE_COMPACT}

    elif t == 'custom:mini-graph-card':
        node.setdefault('height', 88)
        node.setdefault('line_width', 2)
        node.setdefault('font_size', 60)

    elif t == 'custom:mushroom-template-card':
        cm = node.get('card_mod', {}).get('style', '')
        if isinstance(cm, str) and '84px' in cm:
            node['card_mod'] = {"style": cm.replace('84px', '74px')}

    elif node.get('template') == 'shortcut_tile':
        for s in node.get('styles', {}).get('card', []):
            if s.get('height') == '84px':
                s['height'] = '74px'

    for k in ('cards', 'card', 'chips', 'elements'):
        if k in node:
            tweak(node[k])
    # popups em tap_action
    ta = node.get('tap_action')
    if isinstance(ta, dict):
        bm = ta.get('browser_mod')
        if isinstance(bm, dict):
            tweak(bm.get('data', {}).get('content'))

tweak(cfg['views'])

json.dump(c, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False)
print("OK")
