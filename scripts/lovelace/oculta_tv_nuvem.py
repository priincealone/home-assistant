# -*- coding: utf-8 -*-
"""Oculta da interface as entidades da TV de nuvem, mantendo-as vivas.

`hidden_by` e diferente de `disabled_by`: a entidade continua existindo, com
estado, e continua respondendo a automacoes, templates e a API. So deixa de
aparecer nas listagens automaticas e nos seletores. Cards do Lovelace que a
citam **explicitamente** seguem renderizando -- e e esse o caso: o painel usa
`media_player.sala_de_estar_tv` em 3 lugares (views Geral e Sala de Estar).

Alvo: as 8 entidades do dispositivo `TV Sala (nuvem)` (SmartThings). A TV local
(SamsungTV), dona do `remote` que o controle remoto usa, fica visivel.

Nao existe `hidden_by` no registro de dispositivos -- so em entidades. Por isso
a marcacao e entidade por entidade.
"""
import io, json, os, shutil, subprocess, sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE
ENT = os.path.join(os.path.dirname(LOVELACE), 'core.entity_registry')
DEVICE = '613e8e37356634'

subprocess.check_call(['docker','stop','homeassistant'])
shutil.copyfile(ENT, os.path.join(BACKUPS,'core.entity_registry.bak_oculta_tv_nuvem'))
reg=json.load(io.open(ENT,encoding='utf-8'))
n=0
for e in reg['data']['entities']:
    if str(e.get('device_id','')).startswith(DEVICE):
        assert not e.get('hidden_by'), '%s ja estava oculta' % e['entity_id']
        e['hidden_by']='user'; n+=1
        print('  oculta: %s' % e['entity_id'])
assert n==8, 'esperava 8 entidades da TV de nuvem, achei %d' % n
io.open(ENT,'w',encoding='utf-8').write(json.dumps(reg,ensure_ascii=False))
subprocess.check_call(['docker','start','homeassistant'])
print('container no ar')
