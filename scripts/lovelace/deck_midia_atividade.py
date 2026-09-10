# -*- coding: utf-8 -*-
r"""Poe `sensor.sala_atividade` no deck de Midia da Geral.

O deck tem tres pecas: o rotulo "MIDIA", a linha do player com o controle
remoto, e a grade de atalhos. A linha de status entra **entre o rotulo e o
player** -- e ali que ela responde a pergunta que o deck levanta ("o que esta
tocando?") antes de mostrar os controles.

O sensor ja carrega o proprio icone (muda entre PlayStation, TV e sofa conforme
o contexto), entao o card so precisa exibir `icon` + `state`.

Estilo: usa o template `sem_fundo` em vez de repetir o bloco de `card_mod` que
os vizinhos repetem card a card -- e o que o CLAUDE.md pede depois da limpeza do
P3. O arredondamento vai por `styles.card`, ja que `sem_fundo` preserva o raio
herdado e aqui o card e uma linha dentro de outro cartao.
"""
import json
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

LINHA = {
    "type": "custom:button-card",
    "template": "sem_fundo",
    "entity": "sensor.sala_atividade",
    "show_name": False,
    "show_icon": True,
    "show_state": True,
    "tap_action": {"action": "more-info"},
    "styles": {
        "card": [
            {"background": "transparent", "box-shadow": "none",
             "height": "26px", "padding": "0px 6px 4px 6px",
             "justify-content": "start", "border-radius": "0px"}
        ],
        "grid": [
            {"grid-template-areas": '"i s"',
             "grid-template-columns": "20px 1fr",
             "grid-template-rows": "1fr",
             "align-items": "center", "gap": "6px"}
        ],
        "icon": [{"width": "15px", "color": "#FF9F0A"}],
        "img_cell": [{"justify-self": "start", "width": "15px", "height": "15px"}],
        "state": [
            {"font-size": "12.5px", "font-weight": "550",
             "color": "rgba(255,255,255,0.82)", "justify-self": "start",
             "letter-spacing": "-0.01em"}
        ],
    },
}

cfg = load()
config = cfg['data']['config']
deck = config['views'][0]['cards'][0]['cards'][1]['cards'][2]['cards'][0]

assert deck.get('type') == 'custom:stack-in-card', \
    'esperava o stack do deck de Midia, achei %r' % deck.get('type')
rotulo = deck['cards'][0]
assert rotulo.get('name') == 'Mídia', 'esperava o rotulo "Midia" em cards[0], achei %r' % rotulo.get('name')
assert not any(c.get('entity') == 'sensor.sala_atividade' for c in deck['cards']), \
    'a linha de atividade ja existe -- script ja rodou'

deck['cards'].insert(1, LINHA)
print('linha inserida no deck de Midia (agora %d cards):' % len(deck['cards']))
for i, c in enumerate(deck['cards']):
    print('   [%d] %-24s %s' % (i, c.get('type'), c.get('name') or c.get('entity') or ''))

# nada mais pode ter sido movido de lugar
assert deck['cards'][0] is rotulo, 'o rotulo saiu do topo'
assert deck['cards'][2].get('type') == 'custom:stack-in-card', 'a linha do player saiu do lugar'
assert deck['cards'][3].get('type') == 'grid', 'a grade de atalhos saiu do lugar'

save(cfg, tag='deck_midia_atividade')
restart()
