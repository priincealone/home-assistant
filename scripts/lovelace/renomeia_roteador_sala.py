# -*- coding: utf-8 -*-
"""Da nome ao no mesh da sala.

O `rd15_minet_4138` e o identificador de fabrica -- o aparelho nunca foi
nomeado. O outro no, na Closet, o Andre ja tinha chamado de "Roteador".

Renomear o **dispositivo** propaga para o rotulo de todas as entidades dele,
como aconteceu com a "Ventilacao PS5" e com as TVs.

⚠️ Registro reescrito no shutdown: validar, parar, editar, subir.
"""
import io, json, os, shutil, subprocess, sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE

DEV = os.path.join(os.path.dirname(LOVELACE), 'core.device_registry')
ANTIGO, NOVO = 'rd15_minet_4138', 'Roteador Sala'

dev = json.load(io.open(DEV, encoding='utf-8'))
alvo = [d for d in dev['data']['devices']
        if (d.get('name_by_user') or d.get('name') or '').strip() == ANTIGO]
assert len(alvo) == 1, 'esperava 1 aparelho %r, achei %d' % (ANTIGO, len(alvo))
print('validado: %r | modelo %s | area %r' % (ANTIGO, alvo[0].get('model'), alvo[0].get('area_id')))

subprocess.check_call(['docker', 'stop', 'homeassistant'])
shutil.copyfile(DEV, os.path.join(BACKUPS, 'core.device_registry.bak_roteador_sala'))
dev = json.load(io.open(DEV, encoding='utf-8'))
for d in dev['data']['devices']:
    if (d.get('name_by_user') or d.get('name') or '').strip() == ANTIGO:
        d['name_by_user'] = NOVO
        print('  %r -> %r' % (ANTIGO, NOVO))
io.open(DEV, 'w', encoding='utf-8').write(json.dumps(dev, ensure_ascii=False))
subprocess.check_call(['docker', 'start', 'homeassistant'])
