# -*- coding: utf-8 -*-
"""Pagina Luzes: os 18 botoes de 32px passam a ter alvo de 44px.

Medido na auditoria: 18 botoes circulares de 32x32 numa pagina de linhas de
52px de altura -- abaixo dos 44x44 que WCAG 2.5.5 e o HIG pedem, e e a tela que
se usa com a mao ocupada.

A correcao **nao muda o desenho**: o botao passa a medir 44x44 com 6px de
padding e `background-clip: content-box`, entao o circulo pintado continua com
os mesmos 32px de antes -- cresce so a area que responde ao toque. Cabe dentro
da linha de 52px, entao a altura da pagina nao muda.

O icone sobe de 15px para 17px, proporcao equivalente a que tinha no circulo
menor.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
toggle = cfg['data']['config']['button_card_templates']['light_row']['custom_fields']['toggle']['card']

card = toggle['styles']['card'][0]
assert card.get('width') == '32px', 'o botao ja nao mede 32px (%s)' % card.get('width')

card.update({
    'width': '44px',
    'height': '44px',
    'padding': '6px',            # 44 - 2*6 = 32px de circulo pintado
    'background-clip': 'content-box',
    'box-sizing': 'border-box',
})
toggle['styles']['icon'][0]['width'] = '17px'

# o mesmo vale para o estado aceso, que pinta o fundo pelo bloco `state`
for estado in toggle.get('state', []):
    for regra in (estado.get('styles', {}).get('card') or []):
        regra.setdefault('background-clip', 'content-box')

print('light_row: alvo do toggle 32px -> 44px (circulo pintado segue com 32px)')

save(cfg, tag='p2_alvos_luzes')
restart()
