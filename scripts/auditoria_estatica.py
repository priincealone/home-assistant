# -*- coding: utf-8 -*-
"""Auditoria estatica da dashboard: le o storage do Lovelace e mede consistencia.

Nao abre navegador -- olha o JSON. Procura o que da para verificar sem render:
cores repetidas fora do padrao, alturas divergentes entre cards do mesmo tipo,
entidades citadas que nao existem mais, templates orfaos e CSS duplicado.
"""
import collections
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ha import load

CORES_PADRAO = {
    '#ff9f0a': 'laranja de luz acesa',
    '#0a84ff': 'azul',
    '#30d158': 'verde',
    '#ff453a': 'vermelho',
    '#5e5ce6': 'roxo',
    '#ffffff': 'branco',
    'white': 'branco',
    'transparent': 'transparente',
}
RE_COR = re.compile(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b')
RE_PX = re.compile(r'"height":\s*"(\d+)px"')


def texto(node):
    return json.dumps(node, ensure_ascii=False)


def main():
    cfg = load()['data']['config']
    views = cfg['views']
    templates = cfg.get('button_card_templates', {})
    bruto = texto(cfg)

    print('=' * 72)
    print('AUDITORIA ESTATICA -- %d paginas, %d templates' % (len(views), len(templates)))
    print('=' * 72)

    # --- 1. paleta ---------------------------------------------------------
    cores = collections.Counter(c.lower() for c in RE_COR.findall(bruto))
    fora = {c: n for c, n in cores.items() if c not in CORES_PADRAO}
    print()
    print('1) PALETA')
    print('   cores hexadecimais distintas: %d' % len(cores))
    print('   fora da paleta declarada no CLAUDE.md: %d' % len(fora))
    for c, n in sorted(fora.items(), key=lambda x: -x[1])[:12]:
        print('      %-9s %d usos' % (c, n))

    # --- 2. alturas por template ------------------------------------------
    print()
    print('2) ALTURAS DECLARADAS')
    alturas = collections.Counter()
    for nome, t in templates.items():
        for h in RE_PX.findall(texto(t)):
            alturas[(nome, h + 'px')] += 1
    for (nome, h), n in sorted(alturas.items()):
        print('   %-16s %-8s' % (nome, h))

    # --- 3. entidades citadas x registro ----------------------------------
    print()
    print('3) ENTIDADES CITADAS NO LOVELACE')
    reg = json.load(io.open(os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), 'config', '.storage', 'core.entity_registry'),
        encoding='utf-8'))
    existentes = {e['entity_id'] for e in reg['data']['entities']}
    citadas = set(re.findall(
        r'"((?:light|switch|sensor|binary_sensor|fan|media_player|remote|scene|todo|weather|person|device_tracker|button|input_boolean|input_number)\.[a-z0-9_]+)"',
        bruto))
    faltando = sorted(citadas - existentes)
    print('   citadas: %d | existentes: %d | inexistentes: %d' % (
        len(citadas), len(citadas & existentes), len(faltando)))
    for e in faltando:
        print('      NAO EXISTE: %s' % e)

    # --- 4. templates orfaos ----------------------------------------------
    print()
    print('4) TEMPLATES')
    usados = collections.Counter(re.findall(r'"template":\s*"([a-z_]+)"', bruto))
    orfaos = [t for t in templates if t not in usados]
    print('   definidos: %d | usados: %d | orfaos: %s' % (
        len(templates), len(usados), orfaos or 'nenhum'))
    for t, n in usados.most_common():
        print('      %-16s %d usos' % (t, n))

    # --- 5. card_mod duplicado --------------------------------------------
    print()
    print('5) CSS REPETIDO (card_mod)')
    estilos = collections.Counter()

    def caminhar(node):
        if isinstance(node, dict):
            cm = (node.get('card_mod') or {}).get('style')
            if isinstance(cm, str):
                estilos[cm.strip()] += 1
            for v in node.values():
                caminhar(v)
        elif isinstance(node, list):
            for v in node:
                caminhar(v)

    caminhar(cfg)
    repetidos = [(s, n) for s, n in estilos.items() if n >= 5]
    print('   blocos distintos: %d | repetidos 5+ vezes: %d' % (len(estilos), len(repetidos)))
    for s, n in sorted(repetidos, key=lambda x: -x[1])[:6]:
        print('      %3d x  %s' % (n, s.replace('\n', ' ')[:64]))

    # --- 6. tamanho por pagina --------------------------------------------
    print()
    print('6) PESO POR PAGINA (bytes de JSON)')
    for i, v in enumerate(views):
        n = len(texto(v))
        print('   %2d %-16s %7d %s' % (i, v.get('title'), n, '#' * (n // 4000)))


if __name__ == '__main__':
    main()
