# -*- coding: utf-8 -*-
"""Tile de passos: mostra so o numero.

Na faixa de ~1000px a coluna da esquerda estreita e "7.842 passos" era cortado
(medido depois das correcoes do P1 -- o unico truncado que restava). A unidade
e redundante: o rotulo do proprio tile ja diz "Passos". Fica o numero, formatado
em pt-BR.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
deck = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][0]['cards'][-2]
assert deck['type'] == 'custom:stack-in-card', 'deck de saude mudou de lugar'

alvo = None
for bloco in deck['cards']:
    for card in bloco.get('cards', []) if isinstance(bloco, dict) else []:
        if card.get('entity') == 'sensor.saude_passos':
            alvo = card
assert alvo, 'tile de passos nao encontrado'

alvo['state_display'] = ("[[[ const n = Number(entity.state);"
                         " return isNaN(n) ? entity.state : n.toLocaleString('pt-BR'); ]]]")
print('tile de passos: unidade removida do estado')

save(cfg, tag='p1_passos')
restart()
