# -*- coding: utf-8 -*-
"""Devolve a linha da pagina Luzes a altura original.

Ao subir o alvo do toggle de 32 para 44px, a linha cresceu junto: medido, 52px
-> 64px, e a pagina de 840 -> 948px. O botao passou a ser o elemento mais alto
da linha, e o padding de 10px em cima e embaixo somava a ele.

Compensa reduzindo o padding vertical da linha para 4px: 44 + 4 + 4 = 52px,
exatamente a altura de antes. O alvo continua com 44px -- ele agora ocupa quase
toda a altura da linha, em vez de sobrar espaco morto em volta.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
linha = cfg['data']['config']['button_card_templates']['light_row']['styles']['card'][0]
assert linha['padding'] == '10px 6px 10px 4px', 'padding da linha mudou (%s)' % linha['padding']
linha['padding'] = '4px 6px 4px 4px'
print('light_row: padding vertical 10px -> 4px (linha volta a 52px)')

save(cfg, tag='p2_altura_linha')
restart()
