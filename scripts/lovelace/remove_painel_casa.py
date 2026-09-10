# -*- coding: utf-8 -*-
r"""Tira o painel "Painel Casa" (iframe do dashboard-app) do Home Assistant.

O Andre voltou a trabalhar no `dashboard-app` dentro do Antigravity e vai
resubir uma versao otimizada depois. Ate la o painel sai da barra lateral.

O que sai:
  - a entrada `painel_casa` em `.storage/lovelace_dashboards` (a linha da
    barra lateral)
  - o arquivo `.storage/lovelace.painel_casa` (a view com o card iframe)

O que **nao** sai:
  - o container `painel-casa`, que continua servindo o app na porta 3001. Ele
    e a ferramenta de trabalho dele no Antigravity; derrubar seria atrapalhar.
  - o diretorio `dashboard-app/`, que nunca se toca sem pedido inequivoco.

O arquivo da dashboard vai para `backups/` antes de sumir, para a volta ser
so recolocar -- o card era um `iframe` apontando para o IP Tailscale na 3001.

⚠️ Os registros de storage sao reescritos pelo Home Assistant no shutdown:
parar, editar, subir. Validacao antes do `docker stop`.
"""
import io
import json
import os
import shutil
import subprocess
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE

STORAGE = os.path.dirname(LOVELACE)
REG = os.path.join(STORAGE, 'lovelace_dashboards')
VIEW = os.path.join(STORAGE, 'lovelace.painel_casa')
ALVO = 'painel_casa'

# --- validacao antes de parar nada ----------------------------------------
with io.open(REG, encoding='utf-8') as fh:
    reg = json.load(fh)
itens = reg['data']['items']
achados = [d for d in itens if d.get('id') == ALVO]
assert len(achados) == 1, 'esperava 1 dashboard %s, achei %d' % (ALVO, len(achados))
assert os.path.exists(VIEW), 'nao achei %s' % VIEW
print('validado: dashboard %r (%s), arquivo de %d bytes' % (
    achados[0].get('title'), achados[0].get('url_path'), os.path.getsize(VIEW)))
print('   dashboards antes: %s' % ', '.join(d.get('id') for d in itens))

print('parando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])

shutil.copyfile(REG, os.path.join(BACKUPS, 'lovelace_dashboards.bak_remove_painel'))
shutil.copyfile(VIEW, os.path.join(BACKUPS, 'lovelace.painel_casa.bak_removido'))

with io.open(REG, encoding='utf-8') as fh:
    reg = json.load(fh)
reg['data']['items'] = [d for d in reg['data']['items'] if d.get('id') != ALVO]
with io.open(REG, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps(reg, ensure_ascii=False))
os.remove(VIEW)

print('1) entrada removida da barra lateral')
print('2) %s apagado (copia em backups/lovelace.painel_casa.bak_removido)' % os.path.basename(VIEW))
print('   dashboards depois: %s' % ', '.join(d.get('id') for d in reg['data']['items']))

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container do Home Assistant no ar')
