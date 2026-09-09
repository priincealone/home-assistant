# -*- coding: utf-8 -*-
r"""A barra lateral para de sumir no desktop da dashboard "Casa".

Sintoma: no desktop a barra lateral nao aparecia. Nao era bug -- o
`input_boolean.modo_quiosque` estava ligado (historico: tres trocas em cinco
segundos as 02:19 de 09/09, a assinatura do gesto de segurar sendo testado), e
o template escondia cabecalho **e** barra em telas acima de 1400px.

O erro estava na configuracao, nao no interruptor. O pedido original foi "tela
cheia no celular"; esconder a barra tambem no desktop foi decisao minha, e ela
cobra caro por dois motivos:

1. **Mata o toque do chip de menu.** O kiosk-mode, quando `hide_sidebar` esta
   ligado, registra um bloqueio em fase de captura do evento
   `hass-toggle-menu` -- exatamente o que o chip dispara. Sobrava so o gesto de
   segurar (que chama `input_boolean.toggle`, um servico, e por isso escapa do
   bloqueio). Um botao com dois gestos e so um funcionando.
2. **No desktop a barra e a navegacao inteira.** Diferente do celular, onde ela
   e gaveta modal de custo zero, no desktop ela e o unico caminho para os
   outros paineis -- e escondia-se justamente onde nao ha chip em toda pagina.

Entao `hide_sidebar` passa a ser sempre `false`, igual ao celular. Tela cheia
continua existindo: e o `hide_header`, que e quem ocupa espaco de fato e segue
preso ao `input_boolean.modo_quiosque` no desktop e sempre ligado no celular.

Efeito colateral desejado: a barra volta **mesmo com o interruptor ligado**,
sem precisar mexer no modo quiosque do tablet de parede.

Nao mexe no `painel_casa` -- aquele dashboard tem o mesmo problema, e pior
(nao tem chip nenhum), mas a correcao dele ainda esta aguardando decisao.
"""
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

QUIOSQUE = "[[[ return is_state('input_boolean.modo_quiosque', 'on') ]]]"

cfg = load()
km = cfg['data']['config']['kiosk_mode']

assert km['hide_sidebar'] == QUIOSQUE, \
    'hide_sidebar do desktop mudou desde a leitura: %r' % km['hide_sidebar']
assert km['mobile_settings']['hide_sidebar'] is False, \
    'o celular deveria estar com hide_sidebar=False: %r' % km['mobile_settings']

km['hide_sidebar'] = False

print('kiosk_mode da dashboard "Casa" agora:')
for chave in ('hide_header', 'hide_sidebar'):
    print('  desktop  %-13s %s' % (chave, km[chave]))
for chave in ('hide_header', 'hide_sidebar'):
    print('  celular  %-13s %s' % (chave, km['mobile_settings'][chave]))

save(cfg, tag='barra_lateral_desktop')
restart()
