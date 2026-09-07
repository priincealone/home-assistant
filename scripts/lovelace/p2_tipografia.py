# -*- coding: utf-8 -*-
"""P2 #9 e #10: nenhum texto abaixo de 11px.

Levantado com regua no navegador, por pagina:

  Geral        4 chips a 10,8px | "Atualizado"/"ha X" a 10,5px | "Lista de
               compras" a 10px
  PC           legenda do mini-graph a 8,4px (com o nome bruto da entidade,
               "PC Andre Memory usage") e min/max a 9,76px; unidade do medidor
               a 7,92px
  Closet       mesmos numeros do medidor e do grafico
  Quarto Luca  idem

O piso adotado e **11px**, com 12px para os chips do topo, que sao o primeiro
texto que se le na Geral. Onde o texto vem de dentro de um componente de
terceiro (Mushroom, mini-graph-card, modern-circular-gauge), o ajuste vai por
`card_mod` mirando o seletor interno -- levantado no DOM, nao chutado.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
views = cfg['data']['config']['views']
mudancas = []


def percorrer(node, visitar):
    if isinstance(node, dict):
        visitar(node)
        for v in node.values():
            percorrer(v, visitar)
    elif isinstance(node, list):
        for v in node:
            percorrer(v, visitar)


def acrescentar_css(card, css):
    """Concatena CSS no card_mod, respeitando a forma (string ou dict)."""
    estilo = card.setdefault('card_mod', {}).setdefault('style', '')
    if isinstance(estilo, dict):
        estilo['.'] = (estilo.get('.', '') + '\n' + css).strip() + '\n'
    else:
        card['card_mod']['style'] = (estilo + '\n' + css).strip() + '\n'


# --- 1. chips do topo: 10,8 -> 12px ---------------------------------------
# `--chip-font-size` e a variavel do proprio Mushroom; mexer nela evita brigar
# com o CSS interno do componente.
def chips(node):
    if node.get('type') == 'custom:mushroom-chips-card':
        acrescentar_css(node, 'ha-card { --chip-font-size: 12px !important; }')
        mudancas.append('chips do topo -> 12px')


percorrer(views[0], chips)


# --- 2. rotulos de secao: piso de 11px ------------------------------------
def rotulos(node):
    estilos = (node.get('styles') or {}).get('name')
    if not estilos:
        return
    for regra in estilos:
        tam = regra.get('font-size', '')
        if tam.endswith('px') and float(tam[:-2]) < 11:
            regra['font-size'] = '11px'
            mudancas.append('rotulo "%s" %s -> 11px' % (str(node.get('name'))[:24], tam))


for v in views:
    percorrer(v, rotulos)


# --- 3. rodape do deck de saude: 10,5 -> 11,5px ---------------------------
def rodape(node):
    for chave in ('name', 'label'):
        for regra in ((node.get('styles') or {}).get(chave) or []):
            tam = regra.get('font-size', '')
            if tam in ('10.5px', '10px'):
                regra['font-size'] = '11.5px'
                mudancas.append('rodape/legenda %s -> 11.5px' % tam)


percorrer(views[0], rodape)


# --- 4. mini-graph-card: legenda e min/max --------------------------------
GRAFICO_CSS = (
    ".graph__legend__item span, .graph__legend span,\n"
    ".graph__labels span, .graph__labels .label--min, .graph__labels .label--max\n"
    "{ font-size: 11px !important; }\n"
)
NOMES_PC = {
    'sensor.pc_andre_memory_usage': 'Memória',
    'sensor.pc_andre_c_disk_usage': 'Disco C:',
    'sensor.pc_andre_cpu_load': 'CPU',
}


def graficos(node):
    if node.get('type') != 'custom:mini-graph-card':
        return
    acrescentar_css(node, GRAFICO_CSS)
    mudancas.append('mini-graph: legenda e min/max -> 11px')
    # a legenda mostrava o nome bruto da entidade ("PC Andre Memory usage")
    novas = []
    for e in node.get('entities', []):
        eid = e if isinstance(e, str) else e.get('entity')
        if eid in NOMES_PC:
            novas.append({'entity': eid, 'name': NOMES_PC[eid]})
            mudancas.append('serie renomeada -> %s' % NOMES_PC[eid])
        else:
            novas.append(e)
    if novas:
        node['entities'] = novas


for v in views:
    percorrer(v, graficos)


# --- 5. medidor circular: unidade a 7,92px --------------------------------
# O texto mora no shadow root do `modern-circular-gauge-state`; `$` no card-mod
# e o que atravessa essa fronteira.
def medidores(node):
    if node.get('type') != 'custom:modern-circular-gauge':
        return
    estilo = node.setdefault('card_mod', {}).setdefault('style', '')
    if isinstance(estilo, str):
        estilo = {'.': estilo}
    estilo['modern-circular-gauge-state$'] = (
        'text tspan, text { font-size: 11px !important; }\n')
    base = estilo.get('.', '')
    if 'max-width: 155px' in base:
        estilo['.'] = base.replace('max-width: 155px', 'max-width: 168px')
    node['card_mod']['style'] = estilo
    mudancas.append('medidor: unidade -> 11px')


for v in views:
    percorrer(v, medidores)


for m in mudancas:
    print('  ' + m)
print('total: %d ajustes' % len(mudancas))

save(cfg, tag='p2_tipografia')
restart()
