# -*- coding: utf-8 -*-
"""Unifica os 10 cards de comodo da Geral num card so.

Antes: um `grid` de 2 colunas com 10 `room_mini`, cada um com o proprio vidro,
separados por gap de 10px. Agora: um unico `stack-in-card` com 5 fileiras de
dois comodos, separadas pelo mesmo hairline do deck de saude -- os cards
internos ficam nude e so a moldura externa desenha o vidro.

Altura: o bloco antigo media 5x70px + 4 gaps de 10px = 390px. Para o card unico
ficar proporcional as colunas vizinhas, o hairline usa margem vertical de 4px
(4+1+4 = 9px por separador), fechando 350 + 36 + padding = ~400px.
"""
import copy
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart
from ui import hairline, NUDE

cfg = load()
col = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][1]
grid = col['cards'][0]
assert grid['type'] == 'grid' and len(grid['cards']) == 10, 'coluna dos comodos mudou de forma'

comodos = copy.deepcopy(grid['cards'])
for c in comodos:
    c['card_mod'] = {"style": NUDE}

linhas = []
for i in range(0, len(comodos), 2):
    linhas.append({
        "type": "grid", "columns": 2, "square": False,
        "cards": comodos[i:i + 2],
        "card_mod": {"style": "#root { gap: 10px !important; } ha-card { --ha-card-border-width: 0px; }\n"},
    })
    if i + 2 < len(comodos):
        linhas.append(hairline(margem_vertical=4, margem_lateral=6))

col['cards'][0] = {
    "type": "custom:stack-in-card",
    "mode": "vertical",
    "cards": linhas,
    "card_mod": {"style": "ha-card { padding: 6px 10px !important; }\n"},
}

save(cfg, tag='comodos_card_unico')
restart()
