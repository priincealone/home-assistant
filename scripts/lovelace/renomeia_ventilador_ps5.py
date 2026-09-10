# -*- coding: utf-8 -*-
r"""Da nome legivel a tomada do ventilador do PS5.

Antes o painel mostrava **"Ventilacao ps5 Socket 1"**. Esse rotulo e montado em
duas partes, porque a entidade tem `has_entity_name: True`: nome do aparelho +
nome da entidade. Entao os dois pedacos precisam ser tratados, nao so um:

    aparelho   "Ventilacao ps5"  -> "Ventilacao PS5"   (so a caixa da sigla)
    entidade   "Socket 1"        -> "Ventilador"
    entity_id  ...socket_1       -> switch.ventilacao_ps5

O `entity_id` vale a pena aqui, diferente do caso das teclas do interruptor: um
`switch.smart_socket_with_usb_type_c_3_socket_1` nao diz nada, e ele aparece
escrito na automacao. Depois da troca a automacao fica autoexplicativa.

O `socket_2` fica como esta -- nao esta em uso e o Andre nao disse o que e.

⚠️ Registro reescrito no shutdown: parar, editar, subir.
⚠️ A automacao cita a entidade duas vezes; as duas sao trocadas aqui. Se ficasse
so o registro renomeado, a automacao apontaria para uma entidade inexistente e
falharia calada.
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
AUTO = os.path.join(os.path.dirname(STORAGE), 'automations.yaml')

VELHO = 'switch.smart_socket_with_usb_type_c_3_socket_1'
NOVO = 'switch.ventilacao_ps5'

print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

# --- entidade -------------------------------------------------------------
shutil.copyfile(ENT, os.path.join(BACKUPS, 'core.entity_registry.bak_ventilador_ps5'))
with io.open(ENT, encoding='utf-8') as fh:
    reg = json.load(fh)

por_id = {e['entity_id']: e for e in reg['data']['entities']}
assert VELHO in por_id, 'nao achei %s' % VELHO
assert NOVO not in por_id, '%s ja existe' % NOVO
e = por_id[VELHO]
e['entity_id'], e['name'] = NOVO, 'Ventilador'
print('1) entidade: %s -> %s  (name "Socket 1" -> "Ventilador")' % (VELHO, NOVO))

with io.open(ENT, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))

# --- aparelho -------------------------------------------------------------
shutil.copyfile(DEV, os.path.join(BACKUPS, 'core.device_registry.bak_ventilador_ps5'))
with io.open(DEV, encoding='utf-8') as fh:
    dev = json.load(fh)

alvo = next(d for d in dev['data']['devices'] if d['id'] == e['device_id'])
antigo = alvo.get('name_by_user') or alvo.get('name')
alvo['name_by_user'] = 'Ventilação PS5'
print('2) aparelho: %r -> %r' % (antigo, alvo['name_by_user']))

with io.open(DEV, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(dev, ensure_ascii=False))

# --- automacao ------------------------------------------------------------
with io.open(AUTO, encoding='utf-8') as fh:
    texto = fh.read()
n = texto.count(VELHO)
assert n == 2, 'esperava 2 referencias na automacao, achei %d' % n
with io.open(AUTO, 'w', encoding='utf-8') as fh:
    fh.write(texto.replace(VELHO, NOVO))
print('3) automacao: %d referencias atualizadas' % n)

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
