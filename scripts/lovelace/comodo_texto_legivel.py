# -*- coding: utf-8 -*-
"""Tira o texto preto dos cards de comodo quando a luz esta acesa.

Diagnostico feito no navegador, com a luz da sala acesa: o `div` do nome subia
com `color: black` **inline** e o `ha-card` com `background: white`. Nao era o
ripple -- era o proprio template `room_mini`, que tinha um bloco `state` para
"sensor > 0" (alguma luz acesa) pintando o card de branco e o texto de preto.

Isso funcionava enquanto cada card tinha vidro proprio: o card inteiro ficava
claro, no estilo Apple Home. Depois que os comodos viraram um card unico com os
internos "nude" (`background: transparent !important`), o fundo branco passou a
ser bloqueado e sobrava so o texto preto sobre fundo escuro -- ilegivel.

O bloco `state` sai inteiro: o comodo aceso continua sinalizado pelo icone
laranja da lampada e pelo texto "N acesas". As escritas voltam ao padrao
(nome branco, estado em rgba(255,255,255,0.5)).

Reverte tambem o `NO_RIPPLE` aplicado antes num diagnostico errado -- o ripple
do Home Assistant e branco (`--md-ripple-pressed-color: #FFFFFF`), nunca foi o
que escurecia nada.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart
from ui import NUDE

cfg = load()
tpls = cfg['data']['config']['button_card_templates']

# --- a correcao de verdade -------------------------------------------------
antes = tpls['room_mini'].get('state')
assert antes, 'room_mini ja nao tem bloco state'
del tpls['room_mini']['state']
print('room_mini: bloco `state` removido (era %s)' % str(antes)[:70])

# --- revertendo o NO_RIPPLE ------------------------------------------------
for nome in ('room_mini', 'room_tile'):
    if tpls[nome].get('card_mod'):
        tpls[nome]['card_mod'] = None
        print('%s: card_mod do template zerado' % nome)

deck = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][1]['cards'][0]
n = 0
for bloco in deck['cards']:
    for card in bloco.get('cards', []):
        if card.get('template') == 'room_mini':
            card['card_mod'] = {"style": NUDE}
            n += 1
print('room_mini na Geral com NUDE limpo:', n)

save(cfg, tag='comodo_texto_legivel')
restart()
