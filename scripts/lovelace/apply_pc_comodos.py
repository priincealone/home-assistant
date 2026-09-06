# -*- coding: utf-8 -*-
import json, io

P = r'C:\HomeAssistant\config\.storage\lovelace.minha_casa'
c = json.load(io.open(P, encoding='utf-8'))
d = c['data']['config']
geral = d['views'][0]

NUDE = ("ha-card { border: none !important; box-shadow: none !important; "
        "background: transparent !important; backdrop-filter: none !important; "
        "-webkit-backdrop-filter: none !important; }\n"
        "ha-card::before, ha-card::after { display: none !important; }\n")


def label(text):
    return {
        "type": "custom:button-card",
        "name": text,
        "show_name": True,
        "show_icon": False,
        "tap_action": {"action": "none"},
        "styles": {
            "card": [{"background": "transparent", "box-shadow": "none", "height": "16px",
                      "padding": "0px 2px", "justify-content": "start", "border-radius": "0px"}],
            "name": [{"font-size": "9.5px", "font-weight": "700",
                      "color": "rgba(255,255,255,0.45)", "text-transform": "uppercase",
                      "letter-spacing": "0.08em", "justify-self": "start"}],
            "grid": [{"grid-template-rows": "1fr", "align-items": "center",
                      "align-content": "center", "justify-items": "center"}],
        },
        "card_mod": {"style": NUDE + "ha-card { border-radius: 0 !important; }\n"},
    }


def pill(icon, name, bg, tap_action, icon_color="white", name_color="white"):
    return {
        "type": "custom:button-card",
        "icon": icon,
        "name": name,
        "show_name": True,
        "show_icon": True,
        "tap_action": tap_action,
        "styles": {
            "grid": [{"grid-template-areas": '"i n"', "grid-template-columns": "18px max-content",
                      "gap": "7px", "align-items": "center", "justify-content": "center",
                      "grid-template-rows": "1fr", "align-content": "center"}],
            "card": [{"height": "40px", "padding": "0px 10px", "border-radius": "12px",
                      "background": bg, "box-shadow": "none"}],
            "img_cell": [{"width": "18px", "height": "18px", "justify-self": "center"}],
            "icon": [{"width": "17px", "color": icon_color}],
            "name": [{"font-size": "12.5px", "font-weight": "600", "color": name_color,
                      "white-space": "nowrap", "justify-self": "start"}],
        },
        "card_mod": {"style": NUDE},
    }


def gauge(entity, name, mx):
    return {
        "type": "custom:modern-circular-gauge",
        "entity": entity, "name": name, "min": 0, "max": mx,
        "segments": [{"from": 0, "color": "#30D158"},
                     {"from": mx * 0.6, "color": "#FF9F0A"},
                     {"from": mx * 0.85, "color": "#FF375F"}],
        "card_mod": {"style": NUDE},
    }


# ------------------------------------------------------------- 1) popup do PC
pc_popup_content = {
    "type": "vertical-stack",
    "cards": [
        label("Status"),
        {
            "type": "grid", "columns": 2, "square": False,
            "cards": [
                {
                    "type": "custom:button-card",
                    "entity": "binary_sensor.pc_andre",
                    "icon": "[[[ return entity && entity.state === 'on' ? 'mdi:lan-connect' : 'mdi:lan-disconnect'; ]]]",
                    "name": "[[[ return entity && entity.state === 'on' ? 'Conectado' : 'Offline'; ]]]",
                    "show_name": True, "show_icon": True,
                    "tap_action": {"action": "more-info"},
                    "styles": {
                        "grid": [{"grid-template-areas": '"i n"',
                                  "grid-template-columns": "18px max-content",
                                  "gap": "7px", "align-items": "center", "justify-content": "center",
                                  "grid-template-rows": "1fr", "align-content": "center"}],
                        "card": [{"height": "40px", "padding": "0px 10px", "border-radius": "12px",
                                  "box-shadow": "none",
                                  "background": "[[[ return entity && entity.state === 'on' ? 'rgba(48,209,88,0.28)' : 'rgba(255,255,255,0.07)'; ]]]"}],
                        "img_cell": [{"width": "18px", "height": "18px", "justify-self": "center"}],
                        "icon": [{"width": "17px",
                                  "color": "[[[ return entity && entity.state === 'on' ? '#30D158' : 'rgba(255,255,255,0.55)'; ]]]"}],
                        "name": [{"font-size": "12.5px", "font-weight": "600", "color": "white",
                                  "white-space": "nowrap", "justify-self": "start"}],
                    },
                    "card_mod": {"style": NUDE},
                },
                pill("mdi:power", "Ligar PC", "rgba(48,209,88,0.28)",
                     {"action": "call-service", "service": "button.press",
                      "target": {"entity_id": "button.pc_andre"}}, icon_color="#30D158"),
            ],
            "card_mod": {"style": "#root { gap: 8px !important; grid-auto-rows: min-content !important; }"},
        },
        label("Desempenho"),
        {
            "type": "grid", "columns": 3, "square": False,
            "cards": [
                gauge("sensor.pc_andre_cpu_load", "CPU", 1),
                gauge("sensor.pc_andre_memory_usage", "RAM", 100),
                gauge("sensor.pc_andre_c_disk_usage", "Disco C:", 100),
            ],
            "card_mod": {"style": "#root { gap: 8px !important; grid-auto-rows: min-content !important; }"},
        },
        label("Hist\u00f3rico"),
        {
            "type": "custom:mini-graph-card",
            "entities": [
                {"entity": "sensor.pc_andre_memory_usage", "name": "RAM"},
                {"entity": "sensor.pc_andre_c_disk_usage", "name": "Disco C:"},
            ],
            "hours_to_show": 24, "points_per_hour": 2, "line_width": 2,
            "font_size": 65, "animate": True,
            "show": {"labels": True, "extrema": False},
            "color_thresholds": [{"value": 0, "color": "#30D158"},
                                 {"value": 60, "color": "#FF9F0A"},
                                 {"value": 85, "color": "#FF375F"}],
            "card_mod": {"style": NUDE + "ha-card { padding: 4px 2px !important; }\n"},
        },
        label("Sistema"),
        {
            "type": "grid", "columns": 2, "square": False,
            "cards": [
                pill("mdi:clock-outline",
                     "[[[ const s = states['sensor.pc_andre_uptime']; return s ? s.state : '\u2014'; ]]]",
                     "rgba(255,255,255,0.07)",
                     {"action": "more-info", "entity": "sensor.pc_andre_uptime"},
                     icon_color="rgba(255,255,255,0.75)"),
                pill("mdi:memory",
                     "[[[ const s = states['sensor.pc_andre_threads']; return s ? s.state + ' threads' : '\u2014'; ]]]",
                     "rgba(255,255,255,0.07)",
                     {"action": "more-info", "entity": "sensor.pc_andre_threads"},
                     icon_color="rgba(255,255,255,0.75)"),
            ],
            "card_mod": {"style": "#root { gap: 8px !important; grid-auto-rows: min-content !important; }"},
        },
    ],
    "card_mod": {"style": "#root { gap: 10px !important; }"},
}

chips = geral['cards'][0]['cards'][0]['cards'][1]
chips['chips'][3] = {
    "type": "template",
    "entity": "binary_sensor.pc_andre",
    "icon": "mdi:desktop-tower-monitor",
    "icon_color": "{{ 'green' if is_state('binary_sensor.pc_andre','on') else 'grey' }}",
    "content": "{{ 'Conectado' if is_state('binary_sensor.pc_andre','on') else 'Offline' }}",
    "tap_action": {
        "action": "fire-dom-event",
        "browser_mod": {
            "service": "popup",
            "data": {"title": "PC do Andr\u00e9", "content": pc_popup_content,
                     "initial_style": "normal"},
        },
    },
}

# --------------------------------------------------- 2) card unico de comodos
ROOMS = [
    ("Sala de Estar",  "mdi:sofa",                  "sensor.luzes_sala_de_estar",  "/minha-casa/sala-de-estar"),
    ("Cozinha",        "mdi:countertop",            "sensor.luzes_cozinha",        "/minha-casa/cozinha"),
    ("Copa",           "mdi:silverware-fork-knife", "sensor.luzes_copa",           "/minha-casa/copa"),
    ("Lavanderia",     "mdi:washing-machine",       "sensor.luzes_lavanderia",     "/minha-casa/lavanderia"),
    ("\u00c1rea Gourmet", "mdi:grill-outline",      "sensor.luzes_area_gourmet",   "/minha-casa/area-gourmet"),
    ("Quarto do Luca", "mdi:teddy-bear",            "sensor.luzes_quarto_do_luca", "/minha-casa/quarto-luca"),
    ("Banheiro",       "mdi:shower",                "sensor.luzes_banheiro",       "/minha-casa/banheiro"),
    ("Circula\u00e7\u00e3o", "mdi:stairs",          "sensor.luzes_circulacao",     "/minha-casa/circulacao"),
    ("Closet",         "mdi:hanger",                "sensor.luzes_closet",         "/minha-casa/closet"),
]
rooms_js = json.dumps([{"n": n, "i": i, "s": s, "p": p} for n, i, s, p in ROOMS],
                      ensure_ascii=False)

# navegacao SPA a partir do HTML do custom_field (aspas escapadas p/ atributo)
NAV_TPL = ("history.pushState(null,&quot;&quot;,&quot;__P__&quot;);"
           "window.dispatchEvent(new CustomEvent(&quot;location-changed&quot;,"
           "{bubbles:true,composed:true}));event.stopPropagation();")

rooms_field = (
    "[[[\n"
    "  const R = " + rooms_js + ";\n"
    "  const on = R.filter(r => { const s = states[r.s]; return s && parseInt(s.state) > 0; });\n"
    "  const nav = p => '" + NAV_TPL + "'.replace('__P__', p);\n"
    "  if (!on.length) return '<div class=\"km-empty\">'\n"
    "    + '<ha-icon icon=\"mdi:lightbulb-off-outline\"></ha-icon>'\n"
    "    + '<span>Nenhuma luz acesa</span></div>';\n"
    "  return '<div class=\"km-row\">' + on.map(r =>\n"
    "      '<div class=\"km-room\" title=\"' + r.n + '\" onclick=\"' + nav(r.p) + '\">'\n"
    "    + '<ha-icon icon=\"' + r.i + '\"></ha-icon>'\n"
    "    + '<span class=\"km-badge\">' + states[r.s].state + '</span>'\n"
    "    + '</div>').join('') + '</div>';\n"
    "]]]"
)

header_field = (
    "[[[\n"
    "  const t = states['sensor.luzes_acesas_total'];\n"
    "  const n = t ? parseInt(t.state) : 0;\n"
    "  const nav = '" + NAV_TPL.replace('__P__', '/minha-casa/comodos') + "';\n"
    "  return '<div class=\"km-head\">'\n"
    "    + '<span class=\"km-title\">C\u00f4modos acesos</span>'\n"
    "    + '<span class=\"km-count\">' + n + (n === 1 ? ' luz' : ' luzes') + '</span>'\n"
    "    + '<span class=\"km-all\" onclick=\"' + nav + '\">'\n"
    "    + '<ha-icon icon=\"mdi:view-grid-outline\"></ha-icon></span>'\n"
    "    + '</div>';\n"
    "]]]"
)

EXTRA_STYLES = """
.km-head { display: flex; align-items: center; gap: 8px; width: 100%; }
.km-title { font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
            text-transform: uppercase; color: rgba(255,255,255,0.45); }
.km-count { font-size: 10px; font-weight: 700; color: #FF9F0A; }
.km-all { margin-left: auto; display: flex; align-items: center; cursor: pointer;
          opacity: 0.45; transition: opacity 0.2s; }
.km-all:hover { opacity: 1; }
.km-all ha-icon { --mdc-icon-size: 17px; width: 17px; height: 17px; color: white; }

.km-row { display: flex; flex-wrap: wrap; gap: 10px; width: 100%; }
.km-room { position: relative; width: 58px; height: 58px; border-radius: 18px;
           background: rgba(255,159,10,0.20);
           border: 1px solid rgba(255,159,10,0.32);
           display: flex; align-items: center; justify-content: center;
           cursor: pointer; box-sizing: border-box;
           transition: transform 0.24s cubic-bezier(0.34,1.56,0.64,1); }
.km-room:active { transform: scale(0.93); }
.km-room ha-icon { --mdc-icon-size: 27px; width: 27px; height: 27px; color: #FF9F0A; }
.km-badge { position: absolute; top: -6px; right: -6px;
            min-width: 19px; height: 19px; border-radius: 10px;
            background: #FF9F0A; color: #12172E;
            font-size: 11px; font-weight: 800; line-height: 1;
            display: flex; align-items: center; justify-content: center;
            padding: 0 5px; box-sizing: border-box; }

.km-empty { display: flex; align-items: center; justify-content: center;
            gap: 8px; width: 100%; min-height: 58px; }
.km-empty ha-icon { --mdc-icon-size: 20px; width: 20px; height: 20px;
                    color: rgba(255,255,255,0.35); }
.km-empty span { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.40); }
"""

comodos_card = {
    "type": "custom:button-card",
    "show_icon": False, "show_name": False, "show_state": False,
    "tap_action": {"action": "none"},
    "custom_fields": {"hdr": header_field, "rooms": rooms_field},
    "styles": {
        "card": [{"padding": "14px 16px 16px 16px"}],
        "grid": [{"grid-template-areas": '"hdr" "rooms"', "grid-template-columns": "1fr",
                  "grid-template-rows": "min-content 1fr", "gap": "12px",
                  "align-items": "start", "justify-items": "stretch"}],
        "custom_fields": {"hdr": [{"width": "100%", "justify-self": "stretch"}],
                          "rooms": [{"width": "100%", "justify-self": "stretch"}]},
    },
    "extra_styles": EXTRA_STYLES,
}

body = geral['cards'][0]['cards'][1]
col1, col2 = body['cards'][0], body['cards'][1]

# coluna 1: fica so a previsao do tempo (grid de 4 entity_cards removido)
col1['cards'] = [col1['cards'][0]]
# coluna 2: card unico de comodos (lista de room_tile + gauges do PC removidos)
col2['cards'] = [comodos_card]

json.dump(c, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False)
print("OK")
