# -*- coding: utf-8 -*-
r"""Aplica ao dashboard "Painel Casa" (lovelace.painel_casa) o mesmo
`kiosk_mode` ja validado na dashboard "Casa" (lovelace.minha_casa).

O Painel Casa foi criado so com a view `panel: true` + card iframe -- sem
nenhum bloco `kiosk_mode`, entao abrir o painel pela sidebar continua
mostrando o cabecalho e a barra lateral do HA por cima do iframe do
dashboard-app. A dashboard "Casa" ja resolveu isso hoje (scripts
`menu_lateral_mobile.py` + `tela_cheia_mobile.py`): celular sempre em tela
cheia (`hide_header: true`, `hide_sidebar: false` -- a barra continua
alcancavel pelo gesto de arrastar da borda, sem precisar de botao de menu),
telas largas dependem de `input_boolean.modo_quiosque`. Este script copia a
mesma config, ponto a ponto, para o Painel Casa.
"""
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart, ROOT
import os

MINHA_CASA = os.path.join(ROOT, 'config', '.storage', 'lovelace.minha_casa')
PAINEL = os.path.join(ROOT, 'config', '.storage', 'lovelace.painel_casa')

origem = load(MINHA_CASA)['data']['config']['kiosk_mode']

cfg = load(PAINEL)
config = cfg['data']['config']

assert 'kiosk_mode' not in config, 'Painel Casa ja tem kiosk_mode -- revise antes de rodar'
config['kiosk_mode'] = origem
print('kiosk_mode copiado de "Casa" para "Painel Casa": %r' % origem)

save(cfg, tag='painel_casa_tela_cheia', path=PAINEL)
restart()
