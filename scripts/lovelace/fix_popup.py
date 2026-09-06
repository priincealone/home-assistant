# -*- coding: utf-8 -*-
"""Corrige o popup do PC: devolve o fundo das pills (o card_mod anterior tinha
`background: transparent !important`, que sobrescreve o styles.card do
button-card) e formata o uptime em texto legivel."""
import json, io

P = r'C:\HomeAssistant\config\.storage\lovelace.minha_casa'
c = json.load(io.open(P, encoding='utf-8'))
geral = c['data']['config']['views'][0]
chips = geral['cards'][0]['cards'][0]['cards'][1]
popup = chips['chips'][3]['tap_action']['browser_mod']['data']['content']

# card_mod que NAO mexe no background (para pills coloridas)
NUDE_KEEP_BG = ("ha-card { border: none !important; box-shadow: none !important; "
                "backdrop-filter: none !important; "
                "-webkit-backdrop-filter: none !important; }\n"
                "ha-card::before, ha-card::after { display: none !important; }\n")

cards = popup['cards']

# --- Status: pill de conexao + Ligar PC ---
for card in cards[1]['cards']:
    card['card_mod'] = {"style": NUDE_KEEP_BG}

# --- Historico: mini-graph mais compacto e com cores distintas ---
graph = cards[5]
graph.pop('color_thresholds', None)
graph['line_color'] = ['#0A84FF', '#FF9F0A']
graph['height'] = 90
graph['show'] = {"name": False, "icon": False, "state": False,
                 "legend": True, "labels": True, "fill": "fade"}

# --- Sistema: uptime legivel + threads, com fundo de volta ---
sistema = cards[7]['cards']
sistema[0]['name'] = (
    "[[[\n"
    "  const s = states['sensor.pc_andre_uptime'];\n"
    "  if (!s) return '\u2014';\n"
    "  const ms = Date.now() - new Date(s.state).getTime();\n"
    "  if (isNaN(ms)) return s.state;\n"
    "  const h = Math.floor(ms / 3600000);\n"
    "  const m = Math.floor((ms % 3600000) / 60000);\n"
    "  const d = Math.floor(h / 24);\n"
    "  return d > 0 ? ('Ligado h\u00e1 ' + d + 'd ' + (h % 24) + 'h')\n"
    "               : ('Ligado h\u00e1 ' + h + 'h ' + m + 'min');\n"
    "]]]"
)
for card in sistema:
    card['card_mod'] = {"style": NUDE_KEEP_BG}

json.dump(c, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False)
print("OK")
