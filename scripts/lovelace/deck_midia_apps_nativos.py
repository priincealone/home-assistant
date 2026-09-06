# -*- coding: utf-8 -*-
"""Reverte os tiles de musica para os apps nativos.

O caminho do Music Assistant foi abandonado (nao ha player de audio na casa
que vire media_player no HA), entao os dois tiles voltam a ser atalhos: no
iPhone/iPad os links music.apple.com e music.youtube.com abrem direto os apps
nativos instalados.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
col = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][2]
tiles = col['cards'][0]['cards'][2]['cards']
alvos = {t['variables']['var_name']: t for t in tiles}

alvos['Apple Music']['tap_action'] = {"action": "url", "url_path": "https://music.apple.com"}
alvos['YouTube Music']['tap_action'] = {"action": "url", "url_path": "https://music.youtube.com"}

save(cfg, tag='deck_apps_nativos')
restart()
