# -*- coding: utf-8 -*-
"""Monta o manifesto de comodos do dashboard-app.

Cruza tres fontes:

1. `config/template_sensors.yaml` -- os sensores `sensor.luzes_<comodo>` que o
   projeto Lovelace criou, cada um com a lista curada de luzes daquele comodo.
2. `config/.storage/lovelace.minha_casa` -- os cards `room_mini` da Geral (nome,
   rota e lista de luzes por comodo) e as linhas `light_row` da pagina Luzes,
   que e a lista completa de interruptores da casa.
3. `GET /api/states` ao vivo -- para confirmar que cada entidade ainda existe e
   responde, e capturar o estado atual.

Nao escreve nada no Home Assistant: so le.
"""
import io
import json
import os
import re
import unicodedata
import urllib.request

import yaml

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # dashboard-app
CASA = os.path.dirname(RAIZ)                                         # C:\HomeAssistant
SAIDA = os.path.join(RAIZ, 'manifesto-comodos.json')

DOMINIOS = 'light|switch|fan|media_player|sensor|binary_sensor'
RE_ENTIDADE = re.compile("'((?:" + DOMINIOS + ")[.][a-z0-9_]+)'")


def segredos():
    with io.open(os.path.join(RAIZ, 'config', 'secrets.yaml'), encoding='utf-8') as fh:
        return yaml.safe_load(fh)


SNAPSHOT = os.path.join(RAIZ, '.cache', 'estados-snapshot.json')


def estados(url, token):
    """Estados ao vivo pela API. Cai no instantaneo local se o token nao valer.

    Retorna (dict_por_entity_id, origem). O instantaneo veio de `hass.states`
    lido da sessao autenticada do navegador, quando o token de longa duracao
    tinha sido revogado -- serve para revisar o manifesto, mas nao substitui a
    API: envelhece.
    """
    req = urllib.request.Request(url.rstrip('/') + '/api/states',
                                 headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return {e['entity_id']: e for e in json.load(r)}, 'API /api/states (ao vivo)'
    except urllib.error.HTTPError as e:
        if e.code != 401 or not os.path.exists(SNAPSHOT):
            raise
        print('!! API respondeu 401 (token invalido ou revogado) -- usando o instantaneo local')
        bruto = json.load(io.open(SNAPSHOT, encoding='utf-8'))['estados']
        convertido = {k: {'entity_id': k, 'state': v['state'],
                          'attributes': {'friendly_name': v.get('name')}}
                      for k, v in bruto.items()}
        return convertido, 'instantaneo do navegador (%s)' % os.path.basename(SNAPSHOT)


def slug(nome):
    """'Luzes Quarto do Luca' -> 'luzes_quarto_do_luca', como o HA gera o id."""
    limpo = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode()
    return re.sub(r'_+', '_', re.sub(r'[^a-z0-9]+', '_', limpo.lower())).strip('_')


def sensores_de_luz():
    """{ 'sensor.luzes_x': (nome, [entidades]) } lido do template_sensors.yaml.

    A chave sai do **nome** do sensor, nao do `unique_id`: os dois divergem
    (unique_id `luzes_quarto_luca_count` vira `sensor.luzes_quarto_do_luca`,
    porque o entity_id nasce do nome). Casar pelo unique_id apontava uma
    divergencia falsa no Quarto do Luca.
    """
    p = os.path.join(CASA, 'config', 'template_sensors.yaml')
    texto = io.open(p, encoding='utf-8').read().replace('!secret ', 'secret_')
    blocos = yaml.safe_load(texto)
    achados = {}
    for bloco in blocos:
        for s in (bloco.get('sensor') or []):
            nome = s.get('name') or ''
            if not nome.lower().startswith('luzes '):
                continue
            entidades = RE_ENTIDADE.findall(s.get('state', ''))
            achados['sensor.' + slug(nome)] = (nome, entidades)
    return achados


def lovelace():
    """Cards room_mini da Geral e linhas light_row da pagina Luzes."""
    p = os.path.join(CASA, 'config', '.storage', 'lovelace.minha_casa')
    cfg = json.load(io.open(p, encoding='utf-8'))['data']['config']

    comodos, luzes_pagina = [], []

    def caminhar(node):
        if isinstance(node, dict):
            tpl = node.get('template')
            v = node.get('variables') or {}
            if tpl == 'room_mini':
                comodos.append({
                    'nome': v.get('var_name'),
                    'rota': v.get('var_path'),
                    'sensor': v.get('var_sensor'),
                    'luzes': list(v.get('var_lights') or []),
                })
            elif tpl == 'light_row':
                luzes_pagina.append({'nome': v.get('var_name'), 'entidade': v.get('var_entity')})
            for x in node.values():
                caminhar(x)
        elif isinstance(node, list):
            for x in node:
                caminhar(x)

    caminhar(cfg['views'])
    return comodos, luzes_pagina


def descrever(eid, st):
    """Entrada do manifesto para uma entidade, com o que a API respondeu."""
    if eid not in st:
        return {'entity_id': eid, 'dominio': eid.split('.')[0], 'existe': False,
                'nome': None, 'estado': None, 'indisponivel': True}
    e = st[eid]
    return {
        'entity_id': eid,
        'dominio': eid.split('.')[0],
        'existe': True,
        'nome': (e.get('attributes') or {}).get('friendly_name'),
        'estado': e.get('state'),
        'indisponivel': e.get('state') in ('unavailable', 'unknown'),
    }


def main():
    s = segredos()
    st, origem = estados(s['ha_url'], s['ha_token'])
    sensores = sensores_de_luz()
    comodos, luzes_pagina = lovelace()

    manifesto = {
        'gerado_de': {
            'estados_ao_vivo': len(st),
            'fonte_comodos': 'lovelace.minha_casa (room_mini) + template_sensors.yaml',
            'fonte_estados': origem,
        },
        'comodos': [],
        'luzes_sem_comodo': [],
        'divergencias': [],
    }

    vistas = set()
    for c in comodos:
        entidades = [descrever(e, st) for e in c['luzes']]
        vistas.update(c['luzes'])
        sensor = descrever(c['sensor'], st) if c['sensor'] else None

        do_yaml = sensores.get(c['sensor'], (None, []))[1] if c['sensor'] else []
        if c['sensor'] and sorted(do_yaml) != sorted(c['luzes']):
            manifesto['divergencias'].append({
                'comodo': c['nome'],
                'no_card': sorted(c['luzes']),
                'no_sensor_template': sorted(do_yaml),
            })

        manifesto['comodos'].append({
            'nome': c['nome'],
            'rota': c['rota'],
            'sensor_contagem': sensor,
            'entidades': entidades,
            'total_entidades': len(entidades),
            'todas_respondem': all(e['existe'] and not e['indisponivel'] for e in entidades),
        })

    for l in luzes_pagina:
        if l['entidade'] and l['entidade'] not in vistas:
            item = descrever(l['entidade'], st)
            item['rotulo_na_pagina_luzes'] = l['nome']
            manifesto['luzes_sem_comodo'].append(item)

    with io.open(SAIDA, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(manifesto, ensure_ascii=False, indent=2))

    print('estados ao vivo: %d entidades' % len(st))
    print('comodos no manifesto: %d' % len(manifesto['comodos']))
    print()
    print('%-16s %-5s %-6s %s' % ('COMODO', 'ENTS', 'OK?', 'ESTADOS'))
    for c in manifesto['comodos']:
        txt = ', '.join('%s=%s' % (e['entity_id'].split('.')[1][:20], e['estado'])
                        for e in c['entidades'])
        print('%-16s %-5d %-6s %s' % (c['nome'], c['total_entidades'],
                                      'sim' if c['todas_respondem'] else 'NAO', txt[:66]))
    print()
    total = sum(c['total_entidades'] for c in manifesto['comodos'])
    print('entidades mapeadas em comodos: %d' % total)
    print('luzes da pagina Luzes sem comodo: %d' % len(manifesto['luzes_sem_comodo']))
    for l in manifesto['luzes_sem_comodo']:
        print('   %-40s rotulo=%-12s existe=%s estado=%s' % (
            l['entity_id'], l.get('rotulo_na_pagina_luzes'), l['existe'], l['estado']))
    print()
    print('divergencias card x sensor: %d' % len(manifesto['divergencias']))
    for d in manifesto['divergencias']:
        print('   %s' % d['comodo'])
        print('      card  : %s' % d['no_card'])
        print('      sensor: %s' % d['no_sensor_template'])
    print()
    print('manifesto salvo em %s' % SAIDA)


if __name__ == '__main__':
    main()
