# -*- coding: utf-8 -*-
"""Define a internal_url do Home Assistant.

Estava `None`, e isso quebra qualquer fluxo OAuth: a integracao monta o endereco
de retorno a partir dessa configuracao. Sem ela, o navegador nao tem para onde
voltar depois do login -- foi a primeira hipotese para a falha do vinculo Xiaomi
e continua valendo para a integracao oficial, que e a proxima a ser tentada.

Valor: o IP da LAN do PC onde o HA roda (o mesmo que a integracao do Music
Assistant ja tem gravado). Nao mexo na `external_url`: o acesso de fora e pela
tailnet e o OAuth acontece na rede local.

⚠️ `core.config` e reescrito no shutdown -- parar, editar, subir.
"""
import io, json, os, shutil, subprocess, sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE
CFG = os.path.join(os.path.dirname(LOVELACE), 'core.config')
URL = 'http://192.168.31.22:8123'

subprocess.check_call(['docker','stop','homeassistant'])
shutil.copyfile(CFG, os.path.join(BACKUPS,'core.config.bak_internal_url'))
d=json.load(io.open(CFG,encoding='utf-8'))
antes=d['data'].get('internal_url')
assert antes is None, 'internal_url ja estava definida: %r' % antes
d['data']['internal_url']=URL
io.open(CFG,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False))
print('  internal_url: %r -> %r' % (antes, URL))
print('  external_url segue %r (acesso de fora e pela tailnet)' % d['data'].get('external_url'))
subprocess.check_call(['docker','start','homeassistant'])
