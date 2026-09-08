# -*- coding: utf-8 -*-
"""Registra o dashboard-app (container painel-casa:3001) como um dashboard
novo na sidebar do HA, via card iframe em uma view panel.

panel_iframe (integracao YAML) foi removido do HA nesta versao (2026.9) --
o caminho atual e um dashboard de storage com uma view `panel: true` e um
card `type: iframe` apontando para a URL do container.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, backup, restart, ROOT
import io
import json
import os

DASHBOARDS = os.path.join(ROOT, 'config', '.storage', 'lovelace_dashboards')
PAINEL = os.path.join(ROOT, 'config', '.storage', 'lovelace.painel_casa')
URL = 'http://100.74.130.30:3001'

# 1) registra a entrada no indice de dashboards
cfg = load(DASHBOARDS)
items = cfg['data']['items']
if not any(i['id'] == 'painel_casa' for i in items):
    items.append({
        'id': 'painel_casa',
        'icon': 'mdi:view-dashboard-variant',
        'title': 'Painel Casa',
        'url_path': 'painel-casa',
        'require_admin': False,
        'show_in_sidebar': True,
        'mode': 'storage',
    })
    save(cfg, tag='add_painel_casa', path=DASHBOARDS)
else:
    print('dashboard "painel_casa" ja registrado em lovelace_dashboards')

# 2) cria o storage do dashboard em si (uma view panel com o card iframe)
painel_cfg = {
    'version': 1,
    'minor_version': 1,
    'key': 'lovelace.painel_casa',
    'data': {
        'config': {
            'views': [
                {
                    'title': 'Painel Casa',
                    'path': 'painel-casa',
                    'panel': True,
                    'cards': [
                        {
                            'type': 'iframe',
                            'url': URL,
                            'aspect_ratio': '100%',
                        }
                    ],
                }
            ]
        }
    },
}
with io.open(PAINEL, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(painel_cfg, ensure_ascii=False, indent=2))
print('gravado: %s' % PAINEL)

restart()
