# -*- coding: utf-8 -*-
r"""Itens 4 e 5: area que faltava e registros orfaos.

**Item 4 -- entidades sem area.** Levantando a lista inteira, a maioria das
entidades sem area nao e defeito: `sun`, `backup`, os sensores do iPhone/iPad,
o Glances do PC e os sensores template sao **servicos**, nao objetos de comodo.
Sobraram dois casos reais:

  `Ventilacao ps5` (Smart Socket with USB/Type-C, 7 entidades)
      Nao era um socket solto: o nome diz o que ele alimenta, e o device `PS5`
      ja esta em `sala_de_estar`. Vai para a mesma area. Marcando o **device**
      em vez de entidade por entidade, as 7 herdam de uma vez.

  `Cozinha/Copa/Varanda` (W603, as teclas cruas por tras do switch_as_x)
      **Fica sem area de proposito**: um unico aparelho fisico que atende tres
      comodos diferentes. Quem carrega a area sao as entidades `light.*` que o
      `switch_as_x` cria, e essas ja estao certas desde a correcao da troca
      Cozinha/Lavanderia. Dar uma area so a ele seria escolher um comodo
      arbitrario entre os tres.

**Item 5 -- registros orfaos.** Cinco entradas no registro de entidades sem
nada por tras. Conferido antes de apagar: nao existe `.storage/input_boolean`
nem `.storage/input_number`, nao ha bloco `input_*` em YAML nenhum, e as cinco
tem **zero referencias** no lovelace e nos YAML.

  input_boolean.modo_quiosque       residuo meu, da volta a visualizacao nativa
  input_boolean.modo_painel         residuo anterior
  input_number.fundo_escurecimento  residuo anterior
  scene.banheiro_em_uso             cena Tuya apagada no app (as outras 3 cenas
  scene.banheiro_vazio              tuya continuam respondendo, entao nao e a
                                    integracao que caiu)

Aqui **apagar** e o certo, nao desativar: nao ha configuracao por tras que
possa recria-las. Se as cenas voltarem a existir na conta Tuya, a integracao
as registra de novo sozinha.

⚠️ Os dois registros sao reescritos pelo Home Assistant no shutdown -- parar,
editar, subir. Nunca `restart`.
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

DEVICE_PS5 = '3d362d969f1969'
AREA_PS5 = 'sala_de_estar'
APAGAR = [
    'input_boolean.modo_quiosque',
    'input_boolean.modo_painel',
    'input_number.fundo_escurecimento',
    'scene.banheiro_em_uso',
    'scene.banheiro_vazio',
]

print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

# --- item 4: area do device que alimenta o PS5 ---------------------------
shutil.copyfile(DEV, os.path.join(BACKUPS, 'core.device_registry.bak_itens_4_5'))
with io.open(DEV, encoding='utf-8') as fh:
    dev = json.load(fh)

alvo = next(d for d in dev['data']['devices'] if d['id'].startswith(DEVICE_PS5))
assert not alvo.get('area_id'), 'esse device ja tem area: %r' % alvo.get('area_id')
alvo['area_id'] = AREA_PS5
print('1) device %r -> area %s' % (alvo.get('name_by_user') or alvo.get('name'), AREA_PS5))

with io.open(DEV, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(dev, ensure_ascii=False))

# --- item 5: apagar os registros orfaos ----------------------------------
shutil.copyfile(ENT, os.path.join(BACKUPS, 'core.entity_registry.bak_itens_4_5'))
with io.open(ENT, encoding='utf-8') as fh:
    reg = json.load(fh)

antes = len(reg['data']['entities'])
existentes = {e['entity_id'] for e in reg['data']['entities']}
for eid in APAGAR:
    assert eid in existentes, 'nao achei %s no registro' % eid

reg['data']['entities'] = [e for e in reg['data']['entities'] if e['entity_id'] not in APAGAR]
depois = len(reg['data']['entities'])
assert antes - depois == len(APAGAR), 'esperava apagar %d, apaguei %d' % (len(APAGAR), antes - depois)

with io.open(ENT, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))

print('2) registro de entidades: %d -> %d (%d orfaos apagados)' % (antes, depois, len(APAGAR)))
for eid in APAGAR:
    print('     %s' % eid)

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
