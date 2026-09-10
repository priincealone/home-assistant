# -*- coding: utf-8 -*-
"""Apagar o dispositivo do sensor de luz saiu pela culatra.

Antes: dispositivo `disabled_by: user`, e as 3 entidades `disabled_by: device`
-- desativadas *por causa* do pai. Ao apagar o pai, o SmartThings recriou tudo
no boot seguinte e as entidades voltaram **ativas**, reportando iluminancia 92 e
brightness 2. Ou seja, a limpeza ressuscitou o que devia sumir.

Correcao: desativar as tres entidades **diretamente** (`disabled_by: user`).
Assim nao depende de o dispositivo existir nem de quem e o pai -- e a
integracao pode recriar o dispositivo a vontade.

Terceira vez que a mesma licao aparece nesta sessao: o que uma integracao viva
ainda enxerga nao se apaga, se desativa.
"""
import io, json, os, shutil, subprocess, sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE
ENT = os.path.join(os.path.dirname(LOVELACE), 'core.entity_registry')

subprocess.check_call(['docker','stop','homeassistant'])
shutil.copyfile(ENT, os.path.join(BACKUPS,'core.entity_registry.bak_light_sensor'))
reg=json.load(io.open(ENT,encoding='utf-8'))
n=0
for e in reg['data']['entities']:
    if 'light_sensor' in e['entity_id']:
        e['disabled_by']='user'; n+=1
        print('  desativada: %s' % e['entity_id'])
assert n==3, 'esperava 3 entidades, achei %d' % n
io.open(ENT,'w',encoding='utf-8').write(json.dumps(reg,ensure_ascii=False))
subprocess.check_call(['docker','start','homeassistant'])
print('container no ar')
