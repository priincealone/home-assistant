# -*- coding: utf-8 -*-
r"""Retira a dashboard Lovelace "Casa" e tudo que só existia para ela.

Decisão do André em 15/09/2026: o painel principal passa a ser o
`dashboard-app` (Antigravity). Dispositivos, áreas, automações e sensores de
template **ficam** — são a base que o app consome.

Roda em dois modos, pela própria imagem do Home Assistant (o Python do Windows
não responde de forma confiável):

    --validar   com o HA de pé, só lê e diz o que faria
    (sem flag)  com o HA PARADO, aplica

    docker exec -i homeassistant python - --validar < este.py
    docker stop homeassistant
    docker run --rm -i -v C:/HomeAssistant/config:/config \
        --entrypoint python ghcr.io/home-assistant/home-assistant:stable - < este.py
    docker start homeassistant

⚠️ Com o HA parado porque os arquivos de `.storage` são reescritos por ele no
desligamento — editar com ele de pé perderia a edição.

O que sai, e por quê:

  - `lovelace.minha_casa` e a entrada dela em `lovelace_dashboards`
  - os cards do HACS usados só pela dashboard, e os `custom-cards` manuais —
    replicando o desinstalar do HACS: marca de instalado, pasta em
    `www/community` e o recurso registrado no frontend (sem este último, o
    navegador fica pedindo um arquivo que não existe)
  - os temas `apple_home` e Frosted Glass (o perfil usa o tema padrão)
  - planta 3D e 2D (`casa3d.glb`, `planta_*.png`) — o André não vai usar
  - Xiaomi Cloud Map Extractor e `camera_aspirador.yaml`, que só alimentavam o
    card do aspirador e estavam desligados

O que **não** sai: `browser_mod` (ponto de som do Music Assistant) e seu recurso
automático, HACS, e todas as integrações de dispositivo.

O painel padrão do usuário apontava para `minha-casa`. Sem trocar, abrir o HA
cairia numa página inexistente — vai para `dashboard-dispositivos`, a nativa.
"""
import io
import json
import os
import shutil
import sys

CFG = '/config'
ST = CFG + '/.storage'
VALIDAR = '--validar' in sys.argv

DASHBOARD = 'minha_casa'
URL_DASHBOARD = 'minha-casa'
USUARIO = ST + '/frontend.user_data_c0b35248cc324c8fbad96cbba945fc6e'
NOVO_PADRAO = 'dashboard-dispositivos'

# repositório HACS -> pasta que ele ocupa
HACS = {
    '680112919': 'www/community/Bubble-Card',
    '146194325': 'www/community/button-card',
    '1230813119': 'www/community/card-mod-studio',
    '361776538': 'www/community/floor3d-card',
    '190927524': 'www/community/lovelace-card-mod',
    '444350375': 'www/community/lovelace-mushroom',
    '151280062': 'www/community/mini-graph-card',
    '871730343': 'www/community/modern-circular-gauge',
    '1012545675': 'themes/Frosted Glass',
    '299753146': 'custom_components/xiaomi_cloud_map_extractor',
}
CHAVES_INSTALACAO = ('installed', 'installed_commit', 'version_installed')

AVULSOS = [
    'www/custom-cards',
    'www/casa3d.glb', 'www/planta_casa.png', 'www/planta_numerada.png',
    'themes/apple_home.yaml', 'themes/apple_home.yaml.bak_before_reference_glass',
    'camera_aspirador.yaml',
    '.storage/lovelace.' + DASHBOARD,
]

# qualquer recurso de frontend com um destes trechos sai
RECURSOS_QUE_SAEM = ('/hacsfiles/', '/local/custom-cards/')


def ler(p):
    return json.load(io.open(p, encoding='utf-8'))


def gravar(p, d):
    with io.open(p, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(d, ensure_ascii=False, indent=2))


def existe(rel):
    return os.path.exists(os.path.join(CFG, rel))


# --- validação: nada muda aqui ---------------------------------------------
dash = ler(ST + '/lovelace_dashboards')
assert any(i.get('id') == DASHBOARD for i in dash['data']['items']), 'dashboard ja nao existe'

repos = ler(ST + '/hacs.repositories')['data']
for rid, pasta in HACS.items():
    assert rid in repos, 'repositorio %s sumiu do HACS' % rid
    print('HACS  %-60s instalado=%s pasta=%s' % (
        repos[rid]['full_name'], repos[rid].get('installed'), existe(pasta)))

recursos = ler(ST + '/lovelace_resources')['data']['items']
saem = [r['url'] for r in recursos if any(t in r['url'] for t in RECURSOS_QUE_SAEM)]
ficam = [r['url'] for r in recursos if r['url'] not in saem]
print('\nrecursos que saem (%d):' % len(saem))
for u in saem:
    print('  -', u)
print('recursos que ficam: %s' % ficam)
assert any('browser_mod' in u for u in ficam), 'o recurso do browser_mod nao pode sair'

print('\navulsos:')
for rel in AVULSOS:
    print('  %-55s %s' % (rel, 'existe' if existe(rel) else 'ja ausente'))

usuario = ler(USUARIO)
print('\npainel padrao atual: %s -> vai para %s' % (
    usuario['data']['core'].get('default_panel'), NOVO_PADRAO))

if VALIDAR:
    print('\n--validar: nada foi alterado')
    raise SystemExit(0)

# --- aplicação (HA parado) --------------------------------------------------
dash['data']['items'] = [i for i in dash['data']['items'] if i.get('id') != DASHBOARD]
gravar(ST + '/lovelace_dashboards', dash)
print('\n1) dashboard retirada da barra lateral')

bruto = ler(ST + '/hacs.repositories')
for rid, pasta in HACS.items():
    for k in CHAVES_INSTALACAO:
        bruto['data'][rid].pop(k, None)
    alvo = os.path.join(CFG, pasta)
    if os.path.isdir(alvo):
        shutil.rmtree(alvo)
gravar(ST + '/hacs.repositories', bruto)
print('2) %d itens desinstalados do HACS' % len(HACS))

res = ler(ST + '/lovelace_resources')
res['data']['items'] = [r for r in res['data']['items']
                        if not any(t in r['url'] for t in RECURSOS_QUE_SAEM)]
gravar(ST + '/lovelace_resources', res)
print('3) %d recursos de frontend retirados' % len(saem))

for rel in AVULSOS:
    alvo = os.path.join(CFG, rel)
    if os.path.isdir(alvo):
        shutil.rmtree(alvo)
    elif os.path.exists(alvo):
        os.remove(alvo)
print('4) avulsos apagados')

usuario['data']['core']['default_panel'] = NOVO_PADRAO
barra = usuario['data'].get('sidebar', {})
barra['panelOrder'] = [p for p in barra.get('panelOrder', [])
                       if p not in (URL_DASHBOARD, 'painel-casa')]
gravar(USUARIO, usuario)
print('5) painel padrao -> %s' % NOVO_PADRAO)

conf = io.open(CFG + '/configuration.yaml', encoding='utf-8').read()
bloco = ('# Mapa do aspirador com posicao ao vivo (Xiaomi Cloud Map Extractor).\n'
         '# DESLIGADO: a conta Xiaomi exige verificacao em todo login.\n'
         '# camera: !include camera_aspirador.yaml\n')
if bloco in conf:
    io.open(CFG + '/configuration.yaml', 'w', encoding='utf-8').write(
        conf.replace(bloco, '').rstrip('\n') + '\n')
    print('6) include comentado do aspirador retirado do configuration.yaml')
