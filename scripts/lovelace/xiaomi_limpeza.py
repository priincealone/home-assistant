# -*- coding: utf-8 -*-
r"""Limpeza depois do vinculo Xiaomi: resíduos fora, ruido do aspirador oculto.

Tres decisoes do Andre:

  1. O aspirador fica no **Closet** mesmo -- nada a fazer.
  2. O **Repetidor** e a area **Atelier Amelia** sao residuos de outra
     configuracao, ja apagados no Mi Home. Saem daqui tambem.
  3. As **50 propriedades cruas** do aspirador ficam **ocultas**.

Sobre (3): o aspirador traz 64 entidades e so 14 sao uteis (a entidade `vacuum`,
bateria, carga, falha e vida dos consumiveis). As outras 50 sao propriedades
MIoT expostas uma a uma, com nomes como "* clean start-clean". O marcador e
limpo: `original_name` comecando com `*`.

`hidden_by` e nao `disabled_by`: continuam vivas, com estado, servindo
automacoes e a API -- so somem das listagens e dos seletores. Mesmo tratamento
dado a TV de nuvem.

Sobre (2): **apagar so gruda se nada mais enxergar o dispositivo.** Tres vezes
hoje um registro apagado voltou no boot seguinte porque a integracao ainda o via
(cenas do banheiro, duplicatas de ventilador, sensor de luz da TV). Aqui o
Andre confirmou que o aparelho ja saiu da conta Xiaomi, entao a remocao deve
grudar -- mas isso **precisa ser conferido depois do restart**. Se voltar, o
certo e desativar.

⚠️ Toda a validacao acontece **antes** do `docker stop`. Hoje um assert disparou
depois de parar o container e o Home Assistant ficou fora do ar sem necessidade.
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
ENT = os.path.join(STORAGE, 'core.entity_registry')
DEV = os.path.join(STORAGE, 'core.device_registry')
ARE = os.path.join(STORAGE, 'core.area_registry')

AREA_RESIDUO = 'atelier_amelia'

# --- 1. tudo conferido ANTES de parar o container -------------------------
with io.open(ENT, encoding='utf-8') as fh:
    reg = json.load(fh)
with io.open(DEV, encoding='utf-8') as fh:
    dev = json.load(fh)
with io.open(ARE, encoding='utf-8') as fh:
    are = json.load(fh)

repetidor = [d for d in dev['data']['devices']
             if (d.get('name_by_user') or d.get('name') or '').strip() == 'Repetidor']
assert len(repetidor) == 1, 'esperava 1 Repetidor, achei %d' % len(repetidor)
rep_id = repetidor[0]['id']

rep_ents = [e for e in reg['data']['entities'] if e.get('device_id') == rep_id]
assert len(rep_ents) == 10, 'esperava 10 entidades do Repetidor, achei %d' % len(rep_ents)

cruas = [e for e in reg['data']['entities']
         if 'dreame_us' in e['entity_id'] and str(e.get('original_name') or '').startswith('*')]
assert len(cruas) == 50, 'esperava 50 propriedades cruas, achei %d' % len(cruas)
assert not any(e.get('hidden_by') for e in cruas), 'alguma ja estava oculta'

na_area = [d for d in dev['data']['devices']
           if d.get('area_id') == AREA_RESIDUO and d['id'] != rep_id]
assert not na_area, 'a area %s ainda tem outros dispositivos: %s' % (
    AREA_RESIDUO, [d.get('name') for d in na_area])

ent_na_area = [e for e in reg['data']['entities'] if e.get('area_id') == AREA_RESIDUO]
assert not ent_na_area, 'ha entidades presas a area: %s' % [e['entity_id'] for e in ent_na_area]

areas_antes = len(are['data']['areas'])
assert any(a['id'] == AREA_RESIDUO for a in are['data']['areas']), 'area %s nao existe' % AREA_RESIDUO

print('validado: Repetidor com %d entidades, %d propriedades cruas, area livre' %
      (len(rep_ents), len(cruas)))

# --- 2. so agora mexe ------------------------------------------------------
print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

for origem, destino in ((ENT, 'core.entity_registry'), (DEV, 'core.device_registry'),
                        (ARE, 'core.area_registry')):
    shutil.copyfile(origem, os.path.join(BACKUPS, destino + '.bak_xiaomi_limpeza'))

for e in cruas:
    e['hidden_by'] = 'user'
print('1) %d propriedades cruas do aspirador ocultas' % len(cruas))

reg['data']['entities'] = [e for e in reg['data']['entities'] if e.get('device_id') != rep_id]
dev['data']['devices'] = [d for d in dev['data']['devices'] if d['id'] != rep_id]
print('2) Repetidor removido (%d entidades junto)' % len(rep_ents))

are['data']['areas'] = [a for a in are['data']['areas'] if a['id'] != AREA_RESIDUO]
print('3) area "Atelier Amelia" removida (%d -> %d areas)' % (areas_antes, len(are['data']['areas'])))

for caminho, dados in ((ENT, reg), (DEV, dev), (ARE, are)):
    with io.open(caminho, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(dados, ensure_ascii=False))

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
