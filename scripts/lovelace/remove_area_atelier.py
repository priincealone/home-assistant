# -*- coding: utf-8 -*-
"""Remove a area vazia "Atelier Amelia".

Da primeira vez ela voltou, porque o Repetidor ainda existia e a integracao
recria a area a partir do comodo do Mi Home. Agora o dispositivo foi removido
na origem (pelo proprio fluxo de opcoes da integracao, que detectou "Remover 1
dispositivos"), entao nada mais a referencia -- e a remocao deve grudar.

Validado antes do `docker stop`, como manda a licao de hoje.
"""
import io, json, os, shutil, subprocess, sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE
S = os.path.dirname(LOVELACE)
ARE = os.path.join(S, 'core.area_registry')
DEV = os.path.join(S, 'core.device_registry')
ENT = os.path.join(S, 'core.entity_registry')
ALVO = 'atelier_amelia'

devs = json.load(io.open(DEV, encoding='utf-8'))['data']['devices']
ents = json.load(io.open(ENT, encoding='utf-8'))['data']['entities']
usam_d = [d for d in devs if d.get('area_id') == ALVO]
usam_e = [e for e in ents if e.get('area_id') == ALVO]
assert not usam_d, 'ainda ha dispositivos na area: %s' % [d.get('name') for d in usam_d]
assert not usam_e, 'ainda ha entidades na area: %s' % [e['entity_id'] for e in usam_e]
are = json.load(io.open(ARE, encoding='utf-8'))
assert any(a['id'] == ALVO for a in are['data']['areas']), 'area nao existe'
print('validado: area vazia, 0 dispositivos e 0 entidades')

subprocess.check_call(['docker', 'stop', 'homeassistant'])
shutil.copyfile(ARE, os.path.join(BACKUPS, 'core.area_registry.bak_atelier'))
are = json.load(io.open(ARE, encoding='utf-8'))
antes = len(are['data']['areas'])
are['data']['areas'] = [a for a in are['data']['areas'] if a['id'] != ALVO]
io.open(ARE, 'w', encoding='utf-8').write(json.dumps(are, ensure_ascii=False))
print('area removida: %d -> %d' % (antes, len(are['data']['areas'])))
subprocess.check_call(['docker', 'start', 'homeassistant'])
