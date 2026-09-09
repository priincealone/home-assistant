# -*- coding: utf-8 -*-
r"""Item 6: desativa as duas entidades de nuvem duplicadas dos ventiladores.

Cada um dos dois aparelhos "Luz/ventilador" aparece duas vezes no Home
Assistant: pela nuvem Tuya, que expoe **so o ventilador** e sem direcao, e pelo
LocalTuya, que abre o mesmo aparelho em luz + ventilador com velocidade e
direcao. Desde que o Quarto foi separado, as de nuvem nao servem para nada:

    fan.luz_ventilador     nuvem, Quarto   -> substituida por fan.ventilador_quarto
    fan.luz_ventilador_2   nuvem, Sala     -> substituida por fan.ventilador_sala

Conferido antes de mexer: cada um desses dispositivos de nuvem tem **essa unica
entidade**, e nao ha nenhuma referencia as duas no lovelace nem nos YAML.

Por que **desativar** e nao apagar: a integracao Tuya de nuvem continua
necessaria -- e ela que entrega o `light.painel`. Uma entidade apagada do
registro seria recriada na proxima atualizacao da integracao; desativada, nao
volta e o caminho de reverter e um clique. Os dispositivos ficam como cascas
vazias, o que e esperado.

⚠️ Registro reescrito no shutdown: parar, editar, subir. Nunca `restart`.
"""
import io
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE

REGISTRY = os.path.join(os.path.dirname(LOVELACE), 'core.entity_registry')
ALVOS = ('fan.luz_ventilador', 'fan.luz_ventilador_2')

print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

shutil.copyfile(REGISTRY, os.path.join(BACKUPS, 'core.entity_registry.bak_duplicatas_nuvem'))
with io.open(REGISTRY, encoding='utf-8') as fh:
    reg = json.load(fh)

por_id = {e['entity_id']: e for e in reg['data']['entities']}
for eid in ALVOS:
    assert eid in por_id, 'nao achei %s' % eid
    e = por_id[eid]
    assert e.get('platform') == 'tuya', '%s nao e da integracao de nuvem' % eid
    assert not e.get('disabled_by'), '%s ja estava desativada' % eid
    e['disabled_by'] = 'user'
    print('  %-24s desativada (platform=%s)' % (eid, e['platform']))

with io.open(REGISTRY, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
