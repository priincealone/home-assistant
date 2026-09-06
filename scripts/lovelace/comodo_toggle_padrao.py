# -*- coding: utf-8 -*-
"""Botao de luz do comodo: apagar/acender todas, em vez de inverter cada uma.

`homeassistant.toggle` com uma lista de entidades inverte **cada** entidade
individualmente. Num comodo com duas ou mais luzes em estados diferentes (uma
acesa, uma apagada), tocar no botao trocava as duas de lugar em vez de deixar o
comodo todo aceso ou todo apagado -- o estado final dependia do estado inicial,
que e justamente o que o Andre reclamou.

Padrao novo, previsivel: **se qualquer luz do comodo estiver acesa, apaga
todas; se estiverem todas apagadas, acende todas.** O servico e escolhido por
template JS no proprio `tap_action`.

`homeassistant.turn_on`/`turn_off` (e nao `light.*`) porque alguns comodos
listam interruptores (`switch.*`) junto das luzes.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

SERVICE_TPL = (
    "[[[ const l = variables.var_lights || []; "
    "const algumaAcesa = l.some(e => states[e] && states[e].state === 'on'); "
    "return algumaAcesa ? 'homeassistant.turn_off' : 'homeassistant.turn_on'; ]]]"
)

cfg = load()
tpls = cfg['data']['config']['button_card_templates']

alvos = {
    'room_mini': ('btn', 'Geral'),
    'room_tile': ('one', 'pagina Comodos'),
}

for nome, (campo, onde) in alvos.items():
    tap = tpls[nome]['custom_fields'][campo]['card']['tap_action']
    assert tap.get('service') == 'homeassistant.toggle', \
        '%s ja nao usa homeassistant.toggle (%s)' % (nome, tap.get('service'))
    tap['service'] = SERVICE_TPL
    print('%-10s (%s): servico agora e condicional' % (nome, onde))

save(cfg, tag='comodo_toggle_padrao')
restart()
