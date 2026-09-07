# -*- coding: utf-8 -*-
"""P1 da auditoria: os cinco erros visiveis na tela.

1. Sala de Estar mostrava "NaN C" -- o mini-graph-card imprime a conta quando o
   sensor de temperatura esta `unavailable` (o dispositivo esta offline). O card
   passa a viver dentro de um `conditional`: some enquanto nao ha dado e volta
   sozinho quando o sensor responder.
2. Quarto mostrava "Indisponivel" -- mesma ideia para o `fan.luz_ventilador`,
   que depende da pendencia do LocalTuya. Melhor a pagina nao ter o card do que
   ter um card dizendo que nao funciona.
3. Geral: o item da lista de compras transbordava o card (medido: 352px de texto
   terminando em 1087px numa viewport de 1027). O texto passa a quebrar linha.
4. Sala de Estar: "Sensor de Luz TV" era o unico texto truncado no celular.
   Passa a quebrar em duas linhas em vez de virar reticencias.
5. Banheiro e Closet tinham cards de movimento apontando para
   `binary_sensor.sensor_banheiro_movimento` e `..._closet_movimento`, que **nao
   existem** no registro -- nunca acenderiam. Os cards saem.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
views = cfg['data']['config']['views']


def envolver_em_conditional(pai, indice, entidade):
    """Troca pai['cards'][indice] por um conditional que oculta se indisponivel."""
    original = pai['cards'][indice]
    pai['cards'][indice] = {
        "type": "conditional",
        "conditions": [
            {"condition": "state", "entity": entidade, "state_not": "unavailable"},
            {"condition": "state", "entity": entidade, "state_not": "unknown"},
        ],
        "card": original,
    }
    return original.get('type')


# --- 1. NaN na Sala de Estar ----------------------------------------------
def achar_pai(node, teste):
    """(pai, indice) do primeiro card em uma lista `cards` que satisfaz teste."""
    if isinstance(node, dict):
        if isinstance(node.get('cards'), list):
            for i, c in enumerate(node['cards']):
                if isinstance(c, dict) and teste(c):
                    return node, i
        for v in node.values():
            r = achar_pai(v, teste)
            if r:
                return r
    elif isinstance(node, list):
        for v in node:
            r = achar_pai(v, teste)
            if r:
                return r
    return None


achado = achar_pai(views[1], lambda c: c.get('type') == 'custom:mini-graph-card')
assert achado, 'card de temperatura nao encontrado na Sala de Estar'
sala, idx = achado
tipo = envolver_em_conditional(sala, idx, 'sensor.sensor_temperatura_e_humidade_temperatura')
print('1) Sala de Estar: %s agora so aparece com sensor disponivel' % tipo)

# --- 2. "Indisponivel" no Quarto ------------------------------------------
quarto = views[6]['cards'][0]['cards'][1]['cards'][0]
alvo = quarto['cards'][0]
assert alvo.get('entity') == 'fan.luz_ventilador', 'card do ventilador mudou de lugar'
tipo = envolver_em_conditional(quarto, 0, 'fan.luz_ventilador')
print('2) Quarto: %s some enquanto o ventilador estiver offline' % tipo)

# --- 3. lista de compras transbordando -------------------------------------
QUEBRA = (
    "ha-card { overflow: hidden !important; }\n"
    "ha-check-list-item, ha-list-item, .mdc-list-item, .mdc-list-item__text,\n"
    "ha-check-list-item span, .mdc-list-item__primary-text {\n"
    "  white-space: normal !important;\n"
    "  overflow-wrap: anywhere !important;\n"
    "  word-break: break-word !important;\n"
    "  text-overflow: clip !important;\n"
    "  line-height: 1.25 !important;\n"
    "}\n"
)


def achar_todo(node):
    if isinstance(node, dict):
        if node.get('type') == 'todo-list':
            return node
        for v in node.values():
            r = achar_todo(v)
            if r:
                return r
    elif isinstance(node, list):
        for v in node:
            r = achar_todo(v)
            if r:
                return r
    return None


todo = achar_todo(views[0])
assert todo, 'card da lista de compras nao encontrado'
# o card_mod deste card ja usa a forma aninhada (dict): "." alcanca o shadow
# root do todo-list, que e onde os itens moram. Concatenar la, sem perder o
# estilo do campo "Adicionar item".
estilo = (todo.setdefault('card_mod', {})).setdefault('style', {})
if isinstance(estilo, dict):
    estilo['.'] = (estilo.get('.', '') + '\n' + QUEBRA).strip() + '\n'
else:
    todo['card_mod']['style'] = (estilo + '\n' + QUEBRA).strip() + '\n'
print('3) Geral: itens da lista de compras passam a quebrar linha')

# --- 4. "Sensor de Luz TV" truncado ----------------------------------------
DUAS_LINHAS = (
    "ha-card #name, ha-card .name {\n"
    "  white-space: normal !important;\n"
    "  overflow: visible !important;\n"
    "  text-overflow: clip !important;\n"
    "  line-height: 1.15 !important;\n"
    "  font-size: 12.5px !important;\n"
    "}\n"
)
card_sensor = views[1]['cards'][0]['cards'][1]['cards'][0]['cards'][2]
assert card_sensor['variables']['var_name'] == 'Sensor de Luz TV', 'card do sensor mudou de lugar'
estilo = (card_sensor.get('card_mod') or {}).get('style', '')
card_sensor['card_mod'] = {"style": (estilo + "\n" + DUAS_LINHAS) if estilo else DUAS_LINHAS}
print('4) Sala de Estar: "Sensor de Luz TV" quebra em duas linhas')

# --- 5. cards de movimento sem entidade ------------------------------------
FANTASMAS = ('binary_sensor.sensor_banheiro_movimento',
             'binary_sensor.sensor_closet_movimento')
removidos = []


def podar(node):
    if isinstance(node, dict):
        for chave in ('cards', 'columns'):
            if isinstance(node.get(chave), list):
                antes = len(node[chave])
                node[chave] = [c for c in node[chave]
                               if not (isinstance(c, dict) and c.get('entity') in FANTASMAS)]
                if len(node[chave]) != antes:
                    removidos.append(chave)
                for c in node[chave]:
                    podar(c)
        for k, v in node.items():
            if k not in ('cards', 'columns'):
                podar(v)
    elif isinstance(node, list):
        for v in node:
            podar(v)


podar(cfg['data']['config'])
print('5) Banheiro e Closet: %d card(s) de movimento sem entidade removidos' % len(removidos))

save(cfg, tag='p1_erros_visiveis')
restart()
