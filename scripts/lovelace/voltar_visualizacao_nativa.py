# -*- coding: utf-8 -*-
r"""Desfaz toda a camada de quiosque: as duas dashboards voltam ao nativo.

O Home Assistant volta a desenhar cabecalho e barra lateral do jeito dele, em
qualquer largura de tela, nas duas dashboards. Some tudo o que foi construido
em cima disso nos ultimos commits, porque cada peca so existia para compensar
o que o quiosque escondia:

  lovelace.minha_casa   bloco `kiosk_mode`
  lovelace.painel_casa  bloco `kiosk_mode`  (herdado em b097bd0)
  Geral                 chip `mdi:menu`     -- o cabecalho nativo ja traz o
                                               botao de menu
  template room_header  `hold_action`       -- idem

O `input_boolean.modo_quiosque` sai do `configuration.yaml` em separado: ele
existia unicamente para alimentar esses templates e, sem eles, seria um
interruptor morto na interface.

Nada disto se perde: os scripts que montaram cada peca continuam em
scripts/lovelace/ (`menu_lateral_mobile.py`, `tela_cheia_mobile.py`,
`barra_lateral_desktop.py`), e servem de base para quando a decisao vier.
"""
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import LOVELACE, load, save, restart

import os

PAINEL = os.path.join(os.path.dirname(LOVELACE), 'lovelace.painel_casa')

feito = []

# --- 1. dashboard "Casa" ---------------------------------------------------
cfg = load()
config = cfg['data']['config']

assert 'kiosk_mode' in config, 'a Casa ja esta sem kiosk_mode'
config.pop('kiosk_mode')
feito.append('Casa: bloco kiosk_mode removido')

chips = config['views'][0]['cards'][0]['cards'][0]['cards'][1]
assert chips.get('type') == 'custom:mushroom-chips-card', \
    'esperava o chips-card da Geral, achei %r' % chips.get('type')
antes = len(chips['chips'])
chips['chips'] = [c for c in chips['chips'] if c.get('icon') != 'mdi:menu']
assert len(chips['chips']) == antes - 1, 'nao achei o chip de menu para remover'
feito.append('Geral: chip mdi:menu removido (%d -> %d chips)' % (antes, len(chips['chips'])))

rh = config['button_card_templates']['room_header']
assert 'hold_action' in rh, 'room_header ja esta sem hold_action'
rh.pop('hold_action')
feito.append('room_header: hold_action removido (vale para as 10 paginas)')

save(cfg, tag='voltar_visualizacao_nativa')

# --- 2. dashboard "Painel Casa" -------------------------------------------
cfg2 = load(PAINEL)
assert 'kiosk_mode' in cfg2['data']['config'], 'o Painel Casa ja esta sem kiosk_mode'
cfg2['data']['config'].pop('kiosk_mode')
feito.append('Painel Casa: bloco kiosk_mode removido')
save(cfg2, tag='voltar_visualizacao_nativa', path=PAINEL)

for f in feito:
    print('  ' + f)

restart()
