# -*- coding: utf-8 -*-
r"""Poe os tres dispositivos Xiaomi nos comodos certos.

O vinculo trouxe tudo na area **Closet**, herdada dos comodos do Mi Home. O
Andre corrigiu:

    Luminaria Luca     -> Quarto Luca   (esta la, desligada por enquanto)
    Roteador           -> Closet        (ja estava certo; e o no principal)
    rd15_minet_4138    -> Sala de estar (o outro no da malha)

⚠️ Sendo **rede mesh**, o numero de aparelhos conectados **nao localiza o no**:
o principal reporta os clientes da malha inteira (24 aqui) e o satelite reporta
zero. A evidencia que eu tinha -- o MAC do PC aparecer na lista do "Roteador" --
nao provava proximidade. Quem desempatou foi o Andre.

A luminaria esta com as 7 entidades `unavailable`, coerente com estar desligada.
Nao desativo nem oculto nada: quando ela voltar a tomada, aparece sozinha.

⚠️ Registro de dispositivos e reescrito no shutdown: parar, editar, subir.
"""
import io
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE

DEV = os.path.join(os.path.dirname(LOVELACE), 'core.device_registry')

# trecho identificador do nome -> area de destino
DESTINO = {
    'Luminária Luca': 'quarto_luca',
    'Roteador': 'closet',
    'rd15_minet_4138': 'sala_de_estar',
}

print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

shutil.copyfile(DEV, os.path.join(BACKUPS, 'core.device_registry.bak_areas_xiaomi'))
with io.open(DEV, encoding='utf-8') as fh:
    dev = json.load(fh)

vistos = []
for d in dev['data']['devices']:
    # ⚠️ o nome da luminaria vem com espaco a direita ('Luminária Luca ') --
    # casar sem strip() faz a busca falhar em silencio
    nome = (d.get('name_by_user') or d.get('name') or '').strip()
    if nome not in DESTINO:
        continue
    antes = d.get('area_id')
    d['area_id'] = DESTINO[nome]
    vistos.append(nome)
    print('  %-20s %-14s -> %s' % (nome, antes, d['area_id']))

faltando = set(DESTINO) - set(vistos)
assert not faltando, 'nao achei estes dispositivos: %s' % sorted(faltando)

with io.open(DEV, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(dev, ensure_ascii=False))

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
