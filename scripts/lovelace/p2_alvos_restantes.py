# -*- coding: utf-8 -*-
"""P2 #7 e #8: os alvos de toque que sobraram.

A auditoria contou 7 alvos abaixo de 44px na Geral e na Sala de Estar. Medindo
de novo, agora perguntando **se cada alvo pequeno esta dentro de uma area
clicavel maior**, tres deles caem:

  mushroom-shape-icon 36x36 (Geral)      dentro de mushroom-state-item 244x56
  mushroom-shape-icon 36x36 (Sala)       dentro de mushroom-state-item 241x56
  button-card 392x22 "Nada tocando"      dentro de um bloco clicavel de 464x70

Nesses o dedo acerta a linha inteira; o elemento pequeno e so o desenho. Nao ha
o que corrigir -- e teria sido facil "consertar" o que nao estava quebrado.

Sobram tres alvos isolados, todos na Geral:

  button 166x42   power do media player     falta 2px de altura
  button 42x42    volume do media player    falta 2px
  ha-icon-button 32x32  "+" da lista de compras   falta 12px

Os dois primeiros saem pela variavel `--control-height` do proprio Mushroom
(padrao 42px). O terceiro, por `--mdc-icon-button-size`, a variavel do botao
nativo do Home Assistant.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

cfg = load()
views = cfg['data']['config']['views']


def percorrer(node, visitar):
    if isinstance(node, dict):
        visitar(node)
        for v in node.values():
            percorrer(v, visitar)
    elif isinstance(node, list):
        for v in node:
            percorrer(v, visitar)


def acrescentar(card, css, chave='.'):
    estilo = card.setdefault('card_mod', {}).setdefault('style', '')
    if isinstance(estilo, dict):
        estilo[chave] = (estilo.get(chave, '') + '\n' + css).strip() + '\n'
    else:
        card['card_mod']['style'] = (estilo + '\n' + css).strip() + '\n'


feitos = []

# --- 1 e 2. botoes do media player: 42 -> 44px ----------------------------
CONTROLE = 'ha-card { --control-height: 44px !important; }'


def media(node):
    if node.get('type') == 'custom:mushroom-media-player-card':
        acrescentar(node, CONTROLE)
        feitos.append('media player: --control-height 42px -> 44px')


percorrer(views, media)

# --- 3. botao "+" da lista de compras: 32 -> 44px -------------------------
BOTAO = ('ha-icon-button { --mdc-icon-button-size: 44px !important; }\n'
         '.addRow ha-icon-button { --mdc-icon-button-size: 44px !important; }')


def lista(node):
    if node.get('type') == 'todo-list':
        acrescentar(node, BOTAO)
        feitos.append('lista de compras: botao "+" 32px -> 44px')


percorrer(views[0], lista)

for f in feitos:
    print('  ' + f)
assert feitos, 'nenhum card alvo encontrado'

save(cfg, tag='p2_alvos_restantes')
restart()
