# -*- coding: utf-8 -*-
"""P4: Cozinha e Copa deixam de ser paginas e viram popup.

Medido na auditoria: as duas tinham **3 textos na tela inteira** -- uma pagina
para um unico interruptor, com a navegacao custando mais que a acao. O PC ja
funciona assim (chip que abre popup), entao o padrao existe na casa.

O conteudo do popup usa `tile` **nativo**, nao o `entity_card`: aquele template
tem `custom_fields` com um button-card aninhado, e essa combinacao nao recebe
`hass` dentro do popup do Browser Mod -- abre em branco. E a armadilha ja
registrada no ESTADO_DASHBOARD.md.

O vidro do dialogo e o mesmo do popup do PC, copiado do proprio storage para
nao divergir.

⚠️ Remover paginas **muda os indices das views**. Depois disto: Lavanderia sai
de 4 para 2, Area Gourmet de 5 para 3, e assim por diante. Scripts antigos que
usam `views[N]` fixo precisam ser relidos antes de rodar de novo.
"""
import copy
import json
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

LUZES = {
    'Cozinha': ('light.cozinha_copa_varanda_switch_3', 'mdi:lightbulb'),
    'Copa': ('light.cozinha_copa_varanda_switch_2', 'mdi:lightbulb'),
}

cfg = load()
config = cfg['data']['config']
views = config['views']


def achar_popup_existente(node):
    """O card_mod do dialogo do popup do PC, para reaproveitar o vidro."""
    if isinstance(node, dict):
        ta = node.get('tap_action') or {}
        bm = (ta.get('browser_mod') or {}) if isinstance(ta, dict) else {}
        dados = bm.get('data') or {}
        if str(dados.get('title', '')).startswith('PC'):
            return dados.get('card_mod')
        for v in node.values():
            r = achar_popup_existente(v)
            if r:
                return r
    elif isinstance(node, list):
        for v in node:
            r = achar_popup_existente(v)
            if r:
                return r
    return None


vidro = achar_popup_existente(views[0])
assert vidro, 'nao achei o card_mod do popup do PC para copiar'


def popup(nome, entidade):
    return {
        "action": "fire-dom-event",
        "browser_mod": {
            "service": "popup",
            "data": {
                "title": nome,
                "content": {
                    "type": "vertical-stack",
                    "cards": [
                        {"type": "tile", "entity": entidade, "name": "Luz",
                         "icon": LUZES[nome][1], "tap_action": {"action": "toggle"},
                         "icon_tap_action": {"action": "toggle"}},
                    ],
                },
                "initial_style": "normal",
                "card_mod": copy.deepcopy(vidro),
            },
        },
    }


# --- 1. os cards da Geral passam a abrir popup ----------------------------
trocados = []


def usa_template(node, nome):
    """Depois do P3 o campo `template` pode ser lista (["room_mini", "nu"])."""
    t = node.get('template')
    return nome in (t if isinstance(t, list) else [t])


def caminhar(node):
    if isinstance(node, dict):
        if usa_template(node, 'room_mini'):
            nome = (node.get('variables') or {}).get('var_name')
            if nome in LUZES:
                node['tap_action'] = popup(nome, LUZES[nome][0])
                node['variables'].pop('var_path', None)
                trocados.append(nome)
        for v in node.values():
            caminhar(v)
    elif isinstance(node, list):
        for v in node:
            caminhar(v)


caminhar(views[0])
assert sorted(trocados) == ['Copa', 'Cozinha'], 'esperava trocar os dois cards, troquei %s' % trocados
print('1) cards da Geral agora abrem popup: %s' % ', '.join(sorted(trocados)))

# --- 2. remover as duas paginas -------------------------------------------
antes = [v.get('title') for v in views]
config['views'] = [v for v in views if v.get('title') not in LUZES]
print('2) paginas removidas: %d -> %d' % (len(antes), len(config['views'])))

# nada mais pode apontar para as rotas antigas
bruto = json.dumps(config, ensure_ascii=False)
for rota in ('/minha-casa/cozinha', '/minha-casa/copa'):
    assert rota not in bruto, 'ainda existe referencia a %s' % rota
print('3) nenhuma referencia orfa as rotas antigas')

print()
print('ordem nova das paginas:')
for i, v in enumerate(config['views']):
    print('   %2d %s' % (i, v.get('title')))

save(cfg, tag='p4_cozinha_copa_popup')
restart()
