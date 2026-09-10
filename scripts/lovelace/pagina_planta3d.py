# -*- coding: utf-8 -*-
r"""Cria a pagina "Planta" com o modelo 3D interativo.

O `floor3d-card` liga entidade a objeto nomeado. Como o modelo foi **gerado**
por `scripts/planta3d.py`, os nomes sao conhecidos e o mapeamento sai daqui,
sem digitacao manual:

    piso_<comodo>    muda de cor quando ha luz acesa no comodo
    luz_<entidade>   emite luz junto com a lampada real
    paredes          cenario

Para a cor do piso, prefere-se o **sensor de contagem** do proprio projeto
(`sensor.luzes_<comodo>`), que ja resolve "qualquer luz acesa" -- melhor que
amarrar o piso a uma unica lampada quando o comodo tem duas. O Quarto e a
excecao: nao tem sensor de contagem (ate ontem nao tinha luz nenhuma), entao
usa a propria `light.luz_quarto`.

⚠️ O caminho do modelo e `/local/`, que o Home Assistant serve a partir de
`config/www/`.
"""
import io
import json
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

AMBIENTES = r'C:\HomeAssistant\referencias\planta_ambientes.json'
LARANJA = '#FF9F0A'

# comodo -> sensor de contagem de luzes ja existente no projeto
SENSOR = {
    'Quarto Luca': 'sensor.luzes_quarto_do_luca',
    'Sala': 'sensor.luzes_sala_de_estar',
    'Closet': 'sensor.luzes_closet',
    'Banheiro': 'sensor.luzes_banheiro',
    'Copa': 'sensor.luzes_copa',
    'Cozinha': 'sensor.luzes_cozinha',
    # 'Quarto' nao tem sensor -- cai na luz direta
}

ambientes = json.load(io.open(AMBIENTES, encoding='utf-8'))

entidades = []
vistos_piso = set()

for a in ambientes:
    obj = a['objeto']
    if obj in vistos_piso or not a['luzes']:
        continue
    vistos_piso.add(obj)
    sensor = SENSOR.get(a['nome'])
    if sensor:
        # contagem: qualquer valor acima de zero acende o piso
        cond = [{'state': str(n), 'color': LARANJA} for n in range(1, 6)]
        entidades.append({'entity': sensor, 'type3d': 'color',
                          'object_id': obj, 'colorcondition': cond})
    else:
        entidades.append({'entity': a['luzes'][0], 'type3d': 'color',
                          'object_id': obj,
                          'colorcondition': [{'state': 'on', 'color': LARANJA}]})

for a in ambientes:
    for l in a.get('objetos_luz', []):
        entidades.append({'entity': l['entidade'], 'type3d': 'light',
                          'object_id': l['objeto'],
                          'light': {'lumens': 900, 'color': LARANJA}})

CARD = {
    'type': 'custom:floor3d-card',
    'path': '/local/',
    'objfile': 'casa3d.glb',
    'backgroundColor': '#0a0d12',
    'globalLightPower': 0.35,
    'shadow': 'no',
    'header': 'no',
    'entities': entidades,
}

# --- o piso do segundo trecho do Banheiro acompanha o primeiro -------------
segundo = [a for a in ambientes if a['objeto'].endswith('_2')]
for a in segundo:
    base = [e for e in entidades if e.get('type3d') == 'color'
            and e['object_id'] == a['objeto'].rsplit('_', 1)[0]]
    if base:
        copia = dict(base[0])
        copia['object_id'] = a['objeto']
        entidades.append(copia)

cfg = load()
config = cfg['data']['config']
titulos = [v.get('title') for v in config['views']]
assert 'Planta' not in titulos, 'a pagina Planta ja existe'

fundo = config['views'][1].get('background')
config['views'].append({
    'title': 'Planta',
    'path': 'planta',
    'icon': 'mdi:floor-plan',
    'type': 'panel',
    'background': fundo,
    'show_icon_and_title': True,
    'cards': [CARD],
})

print('pagina "Planta" criada (view %d)' % (len(config['views']) - 1))
print('%d mapeamentos no card:' % len(entidades))
for e in entidades:
    print('   %-10s %-34s <- %s' % (e['type3d'], e['object_id'], e['entity']))

save(cfg, tag='pagina_planta3d')
restart()
