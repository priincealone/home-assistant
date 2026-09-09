# -*- coding: utf-8 -*-
r"""Arruma as entidades novas do Quarto e liga tudo no painel.

O LocalTuya acabou de abrir o aparelho do Quarto (`eb956546b52fa8a4ddyfom`,
192.168.31.206, protocolo 3.4) em dois canais, espelhando a Sala:

    light  DP 5   Luz Quarto
    fan    DP 1   Ventilador Quarto   (velocidade no DP 4, direcao no DP 101)

Mas os entity_id que ele gera carregam o nome do aparelho na frente --
`light.luz_ventilador_quarto_luz_quarto` -- enquanto os da Sala sao limpos
(`light.luz_sala`). Este script alinha os dois pares a mesma convencao e da
area aos quatro: os da Sala tambem estavam **sem area nenhuma**, item 4 da
lista de pendencias, e nao fazia sentido corrigir so metade.

Depois liga no painel:

  - card "Quarto" da Geral, que estava com `var_lights: []` e disparava um
    `turn_on` de lista vazia -- controle quebrado servido como se funcionasse
    (achado #4 da auditoria)
  - pagina do Quarto, que so tinha o `fan.luz_ventilador` da nuvem

⚠️ `core.entity_registry` e reescrito pelo Home Assistant no shutdown. Editar
com o container no ar perde tudo -- por isso este script para, edita e sobe.

A entidade de nuvem `fan.luz_ventilador` continua existindo e nao e removida
aqui: ela e a duplicata que a nuvem Tuya expoe do mesmo aparelho (mesmo caso do
`fan.luz_ventilador_2` da Sala). Limpar as duas e o item 6, decisao a parte.
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

# entity_id atual -> (entity_id novo, nome amigavel, area)
RENOMEAR = {
    'light.luz_ventilador_quarto_luz_quarto': ('light.luz_quarto', 'Luz Quarto', 'quarto'),
    'fan.luz_ventilador_quarto_ventilador_quarto': ('fan.ventilador_quarto', 'Ventilador Quarto', 'quarto'),
}
# so area, ja tem nome bom (item 4 das pendencias)
AREA_SO = {
    'light.luz_sala': 'sala_de_estar',
    'fan.ventilador_sala': 'sala_de_estar',
}

print('parando o container (o registro e reescrito no shutdown)...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

shutil.copyfile(REGISTRY, os.path.join(BACKUPS, 'core.entity_registry.bak_quarto_luz_ventilador'))
with io.open(REGISTRY, encoding='utf-8') as fh:
    reg = json.load(fh)

por_id = {e['entity_id']: e for e in reg['data']['entities']}

for velho, (novo, nome, area) in RENOMEAR.items():
    assert velho in por_id, 'nao achei %s no registro' % velho
    assert novo not in por_id, '%s ja existe -- script ja rodou?' % novo
    e = por_id[velho]
    e['entity_id'], e['name'], e['area_id'] = novo, nome, area
    print('  %-46s -> %-24s area=%s' % (velho, novo, area))

for eid, area in AREA_SO.items():
    if eid in por_id and not por_id[eid].get('area_id'):
        por_id[eid]['area_id'] = area
        print('  %-46s    area=%s (item 4)' % (eid, area))

with io.open(REGISTRY, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))

# --- painel ---------------------------------------------------------------
cfg = load()
config = cfg['data']['config']


def caminhar(node, visitar):
    if isinstance(node, dict):
        visitar(node)
        for v in node.values():
            caminhar(v, visitar)
    elif isinstance(node, list):
        for v in node:
            caminhar(v, visitar)


achou = []


def consertar_card(n):
    t = n.get('template')
    if 'room_mini' not in (t if isinstance(t, list) else [t]):
        return
    v = n.get('variables') or {}
    if v.get('var_name') != 'Quarto':
        return
    assert v.get('var_lights') == [], 'esperava var_lights vazio, achei %r' % v.get('var_lights')
    v['var_lights'] = ['light.luz_quarto']
    achou.append('card da Geral')


caminhar(config['views'][0], consertar_card)
assert achou, 'nao achei o card Quarto da Geral'

# a pagina do Quarto passa a usar o ventilador local (tem velocidade e direcao)
bruto = json.dumps(config, ensure_ascii=False)
n = bruto.count('fan.luz_ventilador"')
bruto = bruto.replace('fan.luz_ventilador"', 'fan.ventilador_quarto"')
config = json.loads(bruto)
cfg['data']['config'] = config
print('  pagina do Quarto: %d referencias a fan.luz_ventilador -> fan.ventilador_quarto' % n)

save(cfg, tag='quarto_luz_ventilador')

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
