# -*- coding: utf-8 -*-
"""As duas cenas do banheiro voltam depois de apagadas: a integracao Tuya as
recria no boot, ou seja, elas ainda existem na conta -- so respondem
`unavailable`. Apagar do registro nao gruda; desativar, sim (mesmo caminho das
duplicatas de nuvem dos ventiladores)."""
import io, json, os, shutil, subprocess, sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE

ENT = os.path.join(os.path.dirname(LOVELACE), 'core.entity_registry')
ALVOS = ('scene.banheiro_em_uso', 'scene.banheiro_vazio')

subprocess.check_call(['docker', 'stop', 'homeassistant'])
shutil.copyfile(ENT, os.path.join(BACKUPS, 'core.entity_registry.bak_cenas_banheiro'))
reg = json.load(io.open(ENT, encoding='utf-8'))
por = {e['entity_id']: e for e in reg['data']['entities']}
for eid in ALVOS:
    assert eid in por, 'nao achei %s' % eid
    assert por[eid].get('platform') == 'tuya'
    por[eid]['disabled_by'] = 'user'
    print('  %s desativada' % eid)
io.open(ENT, 'w', encoding='utf-8').write(json.dumps(reg, ensure_ascii=False))
subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
