# -*- coding: utf-8 -*-
r"""Descarta a dashboard YAML "Painel Novo" (18-19/09/2026) e o que veio com ela.

Pedido do André em 19/09/2026: "remova todo conteúdo referente ao painel criado
recentemente no HA, painel novo, descarte-o".

O que sai:
  - Bubble-Card e Mushroom do HACS (reinstalados só para o Painel Novo; o
    "Painel de controle" não usa nenhum card custom) — marca de instalado,
    pasta em `www/community` e recurso de frontend
  - `painel-novo` da lista de painéis ocultos do usuário

Fora deste script (arquivos de YAML, editados com o HA de pé):
  - bloco `lovelace:` do `configuration.yaml`
  - `config/dashboards/painel-novo.yaml`

O que **fica**: o "Painel de controle" (`lovelace.painel_de_controle`), com os
cards de câmera ao vivo, e o recurso do `browser_mod`.

    docker exec -i homeassistant python - --validar < este.py
    docker stop homeassistant
    docker run --rm -i -v C:/HomeAssistant/config:/config \
        --entrypoint python ghcr.io/home-assistant/home-assistant:stable - < este.py
    docker start homeassistant
"""
import io
import json
import os
import shutil
import sys

CFG = '/config'
ST = CFG + '/.storage'
VALIDAR = '--validar' in sys.argv
USUARIO = ST + '/frontend.user_data_c0b35248cc324c8fbad96cbba945fc6e'

HACS = {
    '680112919': 'www/community/Bubble-Card',
    '444350375': 'www/community/lovelace-mushroom',
}
RECURSOS_QUE_SAEM = ('/hacsfiles/Bubble-Card/', '/hacsfiles/lovelace-mushroom/')
CHAVES_INSTALACAO = ('installed', 'installed_commit', 'version_installed')


def ler(p):
    return json.load(io.open(p, encoding='utf-8'))


def gravar(p, d):
    with io.open(p, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(d, ensure_ascii=False, indent=2))


# --- validação --------------------------------------------------------------
repos = ler(ST + '/hacs.repositories')['data']
for rid, pasta in HACS.items():
    assert rid in repos, 'repositorio %s sumiu do HACS' % rid
    print('HACS  %-30s instalado=%s pasta=%s' % (
        repos[rid]['full_name'], repos[rid].get('installed'),
        os.path.isdir(os.path.join(CFG, pasta))))

res = ler(ST + '/lovelace_resources')
saem = [r['url'] for r in res['data']['items'] if r['url'].startswith(RECURSOS_QUE_SAEM)]
ficam = [r['url'] for r in res['data']['items'] if r['url'] not in saem]
print('recursos que saem: %s' % saem)
print('recursos que ficam: %s' % ficam)
assert any('browser_mod' in u for u in ficam), 'o recurso do browser_mod nao pode sair'

painel = io.open(ST + '/lovelace.painel_de_controle', encoding='utf-8').read()
assert 'custom:bubble-card' not in painel and 'custom:mushroom' not in painel, \
    'o Painel de controle usa um dos cards que sairiam'

usuario = ler(USUARIO)
ocultos = usuario['data'].get('sidebar', {}).get('hiddenPanels', [])
print('paineis ocultos: %s' % ocultos)

if VALIDAR:
    print('\n--validar: nada foi alterado')
    raise SystemExit(0)

# --- aplicação (HA parado) --------------------------------------------------
bruto = ler(ST + '/hacs.repositories')
for rid, pasta in HACS.items():
    for k in CHAVES_INSTALACAO:
        bruto['data'][rid].pop(k, None)
    alvo = os.path.join(CFG, pasta)
    if os.path.isdir(alvo):
        shutil.rmtree(alvo)
gravar(ST + '/hacs.repositories', bruto)
print('1) Bubble-Card e Mushroom desinstalados do HACS')

res['data']['items'] = [r for r in res['data']['items'] if r['url'] not in saem]
gravar(ST + '/lovelace_resources', res)
print('2) %d recursos de frontend retirados' % len(saem))

usuario['data']['sidebar']['hiddenPanels'] = [p for p in ocultos if p != 'painel-novo']
gravar(USUARIO, usuario)
print('3) painel-novo retirado da barra lateral do usuario')
