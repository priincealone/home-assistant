# -*- coding: utf-8 -*-
r"""Desfaz a troca fisica entre o interruptor da Cozinha e o da Lavanderia.

O aparelho `cozinha_copa_varanda` e um interruptor de 3 teclas. O cadastro
dizia:

    switch_1  "Lavanderia"  area Lavanderia   <- usado pela pagina Lavanderia
    switch_2  "Copa"        area Copa         <- ok, nao se mexe
    switch_3  "Cozinha"     area Cozinha      <- usado pelo card/popup Cozinha

O Andre relatou que, na parede, as teclas 1 e 3 estao invertidas: quem manda na
Cozinha e a tecla 1, e quem manda na Lavanderia e a tecla 3.

O cadastro era **coerente consigo mesmo e errado com a casa**, e por isso a
correcao tem que ser feita nos dois lados ao mesmo tempo -- mexer so num deles
apenas muda a inconsistencia de lugar:

    registro   troca nome amigavel e area entre switch_1 e switch_3
    lovelace   troca as referencias: Cozinha passa a usar switch_1,
               Lavanderia passa a usar switch_3

Resultado: `switch_1` vira "Cozinha"/area Cozinha e e o que o card da Cozinha
aciona; `switch_3` vira "Lavanderia"/area Lavanderia e e o que a pagina da
Lavanderia aciona. O sufixo `_1`/`_3` do entity_id continua sendo so o numero
da tecla -- nao carrega comodo, entao nao precisa (nem deve) ser renomeado.

⚠️ O registro de entidades e reescrito pelo Home Assistant quando ele para.
Editar com o container no ar perde a alteracao. Por isso este script para o
container, edita, e sobe de novo -- nao usa `restart`.

Se a inversao relatada estiver ao contrario do que entendi, rodar de novo
desfaz: a operacao e simetrica.
"""
import io
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE, load, save

REGISTRY = os.path.join(os.path.dirname(LOVELACE), 'core.entity_registry')
A = 'light.cozinha_copa_varanda_switch_1'
B = 'light.cozinha_copa_varanda_switch_3'


def sh(*args):
    subprocess.check_call(args)


# --- 1. parar o container antes de tocar no registro ----------------------
print('parando o container (o registro e reescrito no shutdown)...')
sh('docker', 'stop', 'homeassistant')

# --- 2. trocar nome e area entre as duas entidades ------------------------
shutil.copyfile(REGISTRY, os.path.join(BACKUPS, 'core.entity_registry.bak_cozinha_lavanderia'))
with io.open(REGISTRY, encoding='utf-8') as fh:
    reg = json.load(fh)

por_id = {e['entity_id']: e for e in reg['data']['entities']}
ea, eb = por_id[A], por_id[B]
antes = [(A, ea.get('name'), ea.get('area_id')), (B, eb.get('name'), eb.get('area_id'))]

for campo in ('name', 'area_id'):
    ea[campo], eb[campo] = eb.get(campo), ea.get(campo)

with io.open(REGISTRY, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))

print('1) registro:')
for eid, nome, area in antes:
    novo = por_id[eid]
    print('   %-38s %r/%s  ->  %r/%s' % (eid, nome, area, novo.get('name'), novo.get('area_id')))

# --- 3. trocar as referencias no lovelace ---------------------------------
cfg = load()
bruto = json.dumps(cfg['data']['config'], ensure_ascii=False)
n_a, n_b = bruto.count(A), bruto.count(B)
assert n_a and n_b, 'esperava referencias das duas entidades, achei %d e %d' % (n_a, n_b)

MARCA = '__TROCA__'
bruto = bruto.replace(A, MARCA).replace(B, A).replace(MARCA, B)
cfg['data']['config'] = json.loads(bruto)
save(cfg, tag='corrige_cozinha_lavanderia')
print('2) lovelace: %d referencias de switch_1 e %d de switch_3 trocadas entre si' % (n_a, n_b))

# --- 4. subir ------------------------------------------------------------
sh('docker', 'start', 'homeassistant')
print('container no ar de novo')
