# -*- coding: utf-8 -*-
"""Liga o tile do Apple Music ao Music Assistant.

O Apple Music ja esta autenticado no MA e tocando pelo Web Player, entao o
tile deixa de abrir o site da Apple e passa a abrir a interface do Music
Assistant -- que e onde a musica realmente toca. Usa o IP da LAN (e nao
localhost) para funcionar tambem no iPad e no celular.

O tile do YouTube Music continua apontando para o site ate o provider ser
autenticado (depende do cookie de sessao, que so o Andre pode fornecer).
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

MA_URL = 'http://192.168.31.22:8095'

cfg = load()
col = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][2]
tiles = col['cards'][0]['cards'][2]['cards']

alvos = {t['variables']['var_name']: t for t in tiles}
assert 'Apple Music' in alvos and 'YouTube Music' in alvos, 'deck mudou de forma'

alvos['Apple Music']['tap_action'] = {"action": "url", "url_path": MA_URL}
alvos['YouTube Music']['tap_action'] = {"action": "url", "url_path": "https://music.youtube.com"}

save(cfg, tag='deck_midia_ma')
restart()
