# -*- coding: utf-8 -*-
r"""Item 3: o ponto chamado "Circulacao" na Area Gourmet vira "Plafons".

O Andre confirmou que o errado era o **nome**, nao a area -- a luz fica na Area
Gourmet, onde ja estava e onde o painel a usa.

Detalhe que decidiu onde mexer: o `original_name` das duas entidades ainda e
"Switch 1". Nome vindo da Tuya apareceria como `original_name`; "Circulacao"
esta no campo `name`, que so existe quando alguem renomeou **dentro do Home
Assistant**. Ou seja, o rotulo errado mora aqui, nao no app da Tuya.

Sao quatro lugares para o mesmo ponto:

    switch.luzes_externas_switch_1   registro -- a tecla crua da Tuya
    light.luzes_externas_switch_1    registro -- o embrulho do switch_as_x
    view 3  (Area Gourmet)           var_name do card
    view 10 (Luzes)                  var_name da linha

⚠️ A palavra "Circula" aparece 6 vezes no lovelace, e as outras 4 sao o comodo
Circulacao de verdade. Por isso a troca no painel e feita **so** nos objetos que
tambem tragam `var_entity: light.luzes_externas_switch_1` -- nunca por busca e
substituicao no texto inteiro.

⚠️ Registro reescrito no shutdown: parar, editar, subir. Nunca `restart`.
"""
import io
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE, load, save

ENT = os.path.join(os.path.dirname(LOVELACE), 'core.entity_registry')
ENTIDADE = 'light.luzes_externas_switch_1'
REGISTRO = ('switch.luzes_externas_switch_1', ENTIDADE)
VELHO, NOVO = 'Circulação', 'Plafons'

print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

shutil.copyfile(ENT, os.path.join(BACKUPS, 'core.entity_registry.bak_plafons'))
with io.open(ENT, encoding='utf-8') as fh:
    reg = json.load(fh)

por_id = {e['entity_id']: e for e in reg['data']['entities']}
for eid in REGISTRO:
    e = por_id[eid]
    assert e.get('name') == VELHO, '%s tem name=%r, esperava %r' % (eid, e.get('name'), VELHO)
    e['name'] = NOVO
    print('  registro: %-34s %r -> %r' % (eid, VELHO, NOVO))

with io.open(ENT, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))

# --- painel: so os objetos que apontam para ESTA entidade -----------------
cfg = load()
trocados = []


def caminhar(node):
    if isinstance(node, dict):
        if node.get('var_entity') == ENTIDADE and node.get('var_name') == VELHO:
            node['var_name'] = NOVO
            trocados.append(node.get('var_icon') or 'linha')
        for v in node.values():
            caminhar(v)
    elif isinstance(node, list):
        for v in node:
            caminhar(v)


caminhar(cfg['data']['config']['views'])
assert len(trocados) == 2, 'esperava 2 rotulos no painel, troquei %d' % len(trocados)
print('  painel: %d rotulos trocados (Area Gourmet e Luzes)' % len(trocados))

restantes = json.dumps(cfg['data']['config'], ensure_ascii=False).count('Circula')
print('  sobraram %d ocorrencias de "Circula" -- devem ser o comodo Circulacao' % restantes)

save(cfg, tag='renomeia_plafons')

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
