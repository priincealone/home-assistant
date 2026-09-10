# -*- coding: utf-8 -*-
"""O Repetidor voltou depois de apagado -- a integracao ainda o enxerga.

Quarta ocorrencia da mesma licao nesta sessao (cenas do banheiro, duplicatas de
ventilador, sensor de luz da TV, agora este). Apagar do registro so gruda para
orfao de verdade; o que uma integracao viva ainda lista volta no boot seguinte,
com device_id novo.

Correcao: desativar as 10 entidades. Assim nao voltam, independentemente do que
a nuvem responda.
"""
import io, json, os, shutil, subprocess, sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE
ENT = os.path.join(os.path.dirname(LOVELACE), 'core.entity_registry')

reg=json.load(io.open(ENT,encoding='utf-8'))
alvo=[e for e in reg['data']['entities'] if 'xiaomi_us_607172138_v6' in e['entity_id']]
assert len(alvo)==10, 'esperava 10 entidades do Repetidor, achei %d' % len(alvo)
assert not any(e.get('disabled_by') for e in alvo), 'alguma ja estava desativada'
print('validado: %d entidades do Repetidor' % len(alvo))

subprocess.check_call(['docker','stop','homeassistant'])
shutil.copyfile(ENT, os.path.join(BACKUPS,'core.entity_registry.bak_repetidor'))
reg=json.load(io.open(ENT,encoding='utf-8'))
n=0
for e in reg['data']['entities']:
    if 'xiaomi_us_607172138_v6' in e['entity_id']:
        e['disabled_by']='user'; n+=1
io.open(ENT,'w',encoding='utf-8').write(json.dumps(reg,ensure_ascii=False))
print('%d entidades do Repetidor desativadas' % n)
subprocess.check_call(['docker','start','homeassistant'])
