# -*- coding: utf-8 -*-
"""P3 da auditoria: templates orfaos e paleta.

**Templates orfaos** (#11): sete dos quinze nao eram usados por card nenhum --
confirmado procurando `"template": "<nome>"` e a forma em lista no storage
inteiro, inclusive dentro de outros templates. Sao 12.288 bytes, 7% do arquivo.

Em vez de apagar, ficam arquivados em `referencias/templates-arquivados.json`:
`device_tile` e `room_tile` foram desenhados com cuidado e podem voltar, e o
`room_tile` e o unico registro do que a pagina Comodos (removida na interface)
usava.

**Paleta** (#13): duas consolidacoes, as unicas que sao inconsistencia de
verdade --

- `#ff9800` (laranja do Material) -> `#FF9F0A`, o laranja iOS que o projeto usa
  para luz acesa. Eram 3 usos, dois deles em `var_color` de cards de LED.
- `#FF375F` -> `#FF453A`. O rosa-vermelho aparecia 12 vezes, sempre como topo
  das escalas dos medidores (`from: 0.85`), fazendo par com `#30D158` e
  `#FF9F0A`. O papel e legitimo -- o que nao fazia sentido era ser um vermelho
  diferente do `#FF453A` ja usado no resto da dashboard.

As cores de marca (Netflix, Prime, Spotify, Disney) ficam como estao: sao
identidade de terceiro, nao decisao de design nossa.
"""
import io
import json
import os
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

ORFAOS = ['divider', 'heading', 'room_row', 'weather_widget',
          'device_tile', 'room_tile', 'panel_tile']
TROCAS = {'#ff9800': '#FF9F0A', '#FF375F': '#FF453A', '#ff375f': '#FF453A'}

cfg = load()
config = cfg['data']['config']
antes = len(json.dumps(config, ensure_ascii=False))

# --- 1. arquivar e remover os orfaos --------------------------------------
tpls = config['button_card_templates']
arquivo = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))), 'referencias', 'templates-arquivados.json')

guardados = {}
for nome in ORFAOS:
    assert nome in tpls, 'template %s nao existe mais' % nome
    guardados[nome] = tpls.pop(nome)

with io.open(arquivo, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps({
        '_nota': ('Templates que sairam do lovelace.minha_casa por nao estarem '
                  'em uso (auditoria de 07/09/2026). Para reativar, colar de '
                  'volta em button_card_templates.'),
        'templates': guardados,
    }, ensure_ascii=False, indent=2))
print('1) %d templates arquivados em referencias/templates-arquivados.json' % len(guardados))

# --- 2. consolidar as duas cores ------------------------------------------
bruto = json.dumps(config, ensure_ascii=False)
contagem = {velho: bruto.count(velho) for velho in TROCAS}
for velho, novo in TROCAS.items():
    bruto = bruto.replace(velho, novo)
config = json.loads(bruto)
cfg['data']['config'] = config
for velho, novo in TROCAS.items():
    if contagem[velho]:
        print('2) %s -> %s (%d usos)' % (velho, novo, contagem[velho]))

depois = len(json.dumps(config, ensure_ascii=False))
print()
print('storage: %d -> %d bytes (%.1f%% menor)' % (antes, depois, 100 * (antes - depois) / antes))

save(cfg, tag='p3_limpeza')
restart()
