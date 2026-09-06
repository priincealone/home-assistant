# -*- coding: utf-8 -*-
"""Tira a camada escura que o clique deixava sobre as legendas dos comodos.

O ripple padrao do Home Assistant e uma camada escura desenhada por cima do
card. Enquanto cada card de comodo tinha o proprio vidro, ela quase nao
aparecia; depois que os cards viraram "nude" dentro de um card unico, ela passou
a cair direto sobre o texto e os nomes/estados ficavam pretos ao toque.

Aplica o NUDE novo (que ja carrega o NO_RIPPLE) nos comodos da Geral e poe o
NO_RIPPLE no template `room_tile`, da pagina Comodos, cujos cards nao definem
card_mod proprio -- o card_mod do card sobrescreve o do template, entao os dois
lugares precisam ser tratados de forma diferente.

As cores do texto nao sao tocadas: continuam as do template (nome branco,
estado em rgba(255,255,255,0.5)).
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart
from ui import NUDE, NO_RIPPLE

cfg = load()

# --- Geral: os 10 room_mini dentro do card unico ---------------------------
# coluna do meio (indice 1) -> primeiro card = o card unico dos comodos
deck = cfg['data']['config']['views'][0]['cards'][0]['cards'][1]['cards'][1]['cards'][0]
assert deck['type'] == 'custom:stack-in-card', 'card unico dos comodos mudou de forma'
n = 0
for bloco in deck['cards']:
    for card in bloco.get('cards', []):
        if card.get('template') == 'room_mini':
            card['card_mod'] = {"style": NUDE}
            n += 1
print('room_mini atualizados na Geral:', n)

# --- Pagina Comodos: o template room_tile ----------------------------------
tpl = cfg['data']['config']['button_card_templates']['room_tile']
tpl['card_mod'] = {"style": NO_RIPPLE}
print('room_tile: NO_RIPPLE aplicado no template')

# --- room_mini tambem no template, para usos sem card_mod proprio ----------
cfg['data']['config']['button_card_templates']['room_mini']['card_mod'] = {"style": NO_RIPPLE}

save(cfg, tag='sem_ripple_preto')
restart()
