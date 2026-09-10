# -*- coding: utf-8 -*-
r"""Uma TV fisica, tres dispositivos no Home Assistant. Deixa a lista honesta.

O Andre notou duas TVs na lista tendo so uma. Sao tres, e nenhuma e engano de
cadastro -- sao a mesma TV vista por caminhos diferentes:

  Tv                    SmartThings (nuvem)  media_player + 7 sensores
                        Unica que reporta fonte, canal e consumo.
  Tv (UN65DU8000GXZD)   SamsungTV (local)    media_player + remote
                        Dona do `remote.`, que o widget de controle remoto
                        do painel usa em 30 lugares. A SmartThings nao expoe
                        `remote` nenhum.
  Light Sensor - Tv     SmartThings          o sensor de luz ambiente da TV

As duas primeiras ficam: o painel usa as duas de proposito, e consolidar
custaria ou o controle remoto ou a leitura de fonte/canal/energia. O que estava
faltando era o **nome dizer qual e qual** -- e isso conserta exatamente o que
incomodava, sem quebrar nada.

O terceiro nao e uma TV: e o sensor de luminosidade embutido, filho da TV
SmartThings (`via_device_id`), ja com `disabled_by: user` e as tres entidades
desativadas. Sai da lista.

⚠️ Renomear o **dispositivo** muda o rotulo composto de todas as entidades
dele: "Tv Energia" vira "TV Sala (nuvem) Energia". Isso e desejado. Os
`entity_id` nao mudam, entao nada no painel quebra.

⚠️ Apagar pode nao grudar. A licao das cenas do banheiro: entidade que uma
integracao viva ainda enxerga volta no boot seguinte. Se o sensor de luz
reaparecer, o certo e deixa-lo desativado -- que ja e o estado dele.

⚠️ Registros reescritos no shutdown: parar, editar, subir.
"""
import io
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE

STORAGE = os.path.dirname(LOVELACE)
DEV = os.path.join(STORAGE, 'core.device_registry')
ENT = os.path.join(STORAGE, 'core.entity_registry')

RENOMEAR = {
    '613e8e37356634': 'TV Sala (nuvem)',    # SmartThings
    '335842dec8b6a7': 'TV Sala (local)',    # SamsungTV
}
APAGAR = '38c4b334d133f9'                   # Light Sensor - Tv

print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

shutil.copyfile(DEV, os.path.join(BACKUPS, 'core.device_registry.bak_tv'))
shutil.copyfile(ENT, os.path.join(BACKUPS, 'core.entity_registry.bak_tv'))

with io.open(DEV, encoding='utf-8') as fh:
    dev = json.load(fh)
with io.open(ENT, encoding='utf-8') as fh:
    reg = json.load(fh)

# --- 1. renomear as duas TVs ---------------------------------------------
for prefixo, novo in RENOMEAR.items():
    d = next(x for x in dev['data']['devices'] if x['id'].startswith(prefixo))
    antes = d.get('name_by_user') or d.get('name')
    d['name_by_user'] = novo
    print('1) %r -> %r' % (antes, novo))

# --- 2. apagar o sensor de luz -------------------------------------------
alvo = next(x for x in dev['data']['devices'] if x['id'].startswith(APAGAR))
assert alvo.get('disabled_by') == 'user', 'esperava o sensor de luz desativado, achei %r' % alvo.get('disabled_by')
id_completo = alvo['id']

n_ent = len([e for e in reg['data']['entities'] if e.get('device_id') == id_completo])
reg['data']['entities'] = [e for e in reg['data']['entities'] if e.get('device_id') != id_completo]
dev['data']['devices'] = [x for x in dev['data']['devices'] if x['id'] != id_completo]
print('2) %r apagado (%d entidades junto)' % (alvo.get('name_by_user') or alvo.get('name'), n_ent))

with io.open(DEV, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(dev, ensure_ascii=False))
with io.open(ENT, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
