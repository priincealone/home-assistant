# -*- coding: utf-8 -*-
r"""Acerta os nomes das entidades `switch.*` do interruptor de tres teclas.

Historia: em 09/09/2026 a troca Cozinha x Lavanderia foi corrigida na camada
`light.*` (a que o painel e as automacoes usam) e nas areas, mas as entidades
`switch.*` de base ficaram com os rotulos antigos e invertidos:

    switch.cozinha_copa_varanda_switch_1   name='Lavanderia'   <- errado
    switch.cozinha_copa_varanda_switch_3   name='Cozinha'      <- errado

    light.cozinha_copa_varanda_switch_1    name='Cozinha'      area=Cozinha
    light.cozinha_copa_varanda_switch_3    name='Lavanderia'   area=Lavanderia

Nao mudava comportamento -- essas entidades sao a fonte do `switch_as_x` e nao
sao usadas por nada. Mas confundem: foi exatamente esse rotulo velho que levou a
auditoria do Antigravity a concluir que a inversao estava no lado do Home
Assistant, quando estava no painel.

⚠️ Muda apenas o campo `name` do registro. **O `entity_id` nao muda**, entao
nenhum contrato, automacao ou sensor de template e afetado.

⚠️ `core.entity_registry` e reescrito pelo Home Assistant no desligamento:
validar antes, `docker stop`, editar, `docker start`. Nunca `docker restart`.

Uso:
    docker exec -i homeassistant python - --validar < este.py     (HA de pe)
    docker stop homeassistant
    docker run --rm -i -v C:/HomeAssistant/config:/config \
        --entrypoint python ghcr.io/home-assistant/home-assistant:stable - < este.py
    docker start homeassistant
"""
import io
import json
import os
import sys

REG = '/config/.storage/core.entity_registry'
VALIDAR = '--validar' in sys.argv

# entity_id -> (nome que esta la hoje, nome correto)
TROCAS = {
    'switch.cozinha_copa_varanda_switch_1': ('Lavanderia', 'Cozinha'),
    'switch.cozinha_copa_varanda_switch_3': ('Cozinha', 'Lavanderia'),
}

reg = json.load(io.open(REG, encoding='utf-8'))
entidades = {e['entity_id']: e for e in reg['data']['entities']}

# --- validacao: confere que o mundo esta como o script espera ---------------
for eid, (atual, novo) in TROCAS.items():
    assert eid in entidades, 'nao achei %s no registro' % eid
    encontrado = (entidades[eid].get('name') or '').strip()
    assert encontrado == atual, (
        '%s tem name=%r, esperava %r. Alguem ja mexeu -- pare e confira.'
        % (eid, encontrado, atual))
    print('%-46s %r -> %r' % (eid, atual, novo))

# a camada light.* e a referencia: se ela nao estiver como esperado, o sentido
# da correcao muda e este script estaria propagando o erro
REFERENCIA = {
    'light.cozinha_copa_varanda_switch_1': 'Cozinha',
    'light.cozinha_copa_varanda_switch_3': 'Lavanderia',
}
for eid, esperado in REFERENCIA.items():
    encontrado = (entidades[eid].get('name') or '').strip()
    assert encontrado == esperado, (
        'referencia quebrada: %s tem name=%r, esperava %r' % (eid, encontrado, esperado))
print('referencia light.* confere: switch_1=Cozinha, switch_3=Lavanderia')

if VALIDAR:
    print('\n--validar: nada foi alterado')
    raise SystemExit(0)

# --- aplicacao (HA parado) --------------------------------------------------
alterados = 0
for e in reg['data']['entities']:
    if e['entity_id'] in TROCAS:
        e['name'] = TROCAS[e['entity_id']][1]
        alterados += 1
with io.open(REG, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))
print('\n%d nomes corrigidos' % alterados)
