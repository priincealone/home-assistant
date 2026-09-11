# -*- coding: utf-8 -*-
r"""Renomeia o roteador do Closet e tira o ruido da tela de Dispositivos.

Duas coisas num ciclo so, porque ambas mexem nos registros e cada ciclo custa
um restart.

**Criterio para ocultar**: entidade que nao e *estado observavel* nem controle
util -- configuracao de fabrica, identificador tecnico, interface de rede
virtual, ou metrica duplicada por outra fonte melhor.

⚠️ **Nada que o painel use e tocado.** A lista de "em uso" e montada varrendo
lovelace, automations, template_sensors, scripts, scenes, configuration e o
camera_aspirador -- e serve de veto. Foi assim que `bloqueio_para_criancas`,
`geocoded_location`, `battery_level` e os sensores de disco do PC ficaram de
fora do corte, mesmo casando com padroes de ruido.

`hidden_by` e nao `disabled_by`: as entidades continuam vivas, com estado,
servindo automacoes e a API. So somem das listagens e dos seletores.

O que **nao** e ocultado, de proposito:

  - `update.*` -- atualizacao pendente e informacao acionavel
  - `light.*_luz_de_fundo` -- sao luzes de verdade, controlaveis
  - qualquer coisa citada em configuracao
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import BACKUPS, LOVELACE

STORAGE = os.path.dirname(LOVELACE)
ENT = os.path.join(STORAGE, 'core.entity_registry')
DEV = os.path.join(STORAGE, 'core.device_registry')
CONFIG = os.path.dirname(STORAGE)

RUIDO = [
    # Glances: interfaces virtuais do PC, sem significado para a casa
    (r'^sensor\.pc_andre_(loopback|vethernet|conexao_de_rede_bluetooth|conexao_local)',
     'interfaces de rede virtuais do PC'),
    # mobile_app: saude que os sensores de webhook ja cobrem melhor
    (r'^sensor\.(iphone|ipad)_de_andre_(health_steps|active_energy|resting_energy|vo2_max|'
     r'weight|body_fat_percentage|heart_rate|heart_rate_variability|resting_heart_rate|'
     r'walking_heart_rate_average|lean_body_mass|height|blood_pressure_systolic|'
     r'blood_pressure_diastolic|blood_glucose|blood_oxygen|respiratory_rate|water|'
     r'basal_body_temperature|body_temperature|walking_running_distance|flights_climbed|'
     r'floors_ascended|floors_descended|distance|exercise_time|average_active_pace|'
     r'steps|activity|pressure)$',
     'saude do celular, duplicada pelos sensores de webhook'),
    # mobile_app: identificadores tecnicos
    (r'^(sensor|binary_sensor)\.(iphone|ipad)_de_andre_(bssid|ssid|sim_1|sim_2|app_version|'
     r'kiosk_mode|last_update_trigger|connection_type|audio_output|camera_stream|'
     r'camera_motion|storage|location_permission)$',
     'identificadores tecnicos do celular'),
    # configuracao de fabrica dos aparelhos, nao estado
    (r'_(power_on_behavior|modo_de_luz_indicadora)$', 'preferencia de fabrica do aparelho'),
    (r'_indicator_light$', 'LED indicador do roteador'),
    # roteadores: eventos e configuracao interna
    (r'^event\.xiaomi_cn_\d+_rd15_', 'eventos internos do roteador'),
    (r'^text\.xiaomi_cn_\d+_rd15_', 'configuracao interna do roteador'),
    (r'_connect_device_ids_', 'lista crua de MACs conectados'),
]

# --- 1. quem esta em uso (veto) -------------------------------------------
blob = []
for nome in ('.storage/lovelace.minha_casa', 'automations.yaml', 'template_sensors.yaml',
             'scripts.yaml', 'scenes.yaml', 'configuration.yaml', 'camera_aspirador.yaml'):
    f = os.path.join(CONFIG, nome)
    if os.path.exists(f):
        blob.append(io.open(f, encoding='utf-8', errors='replace').read())
usadas = set(re.findall(r'\b[a-z_]+\.[a-z0-9_]+\b', '\n'.join(blob)))

reg = json.load(io.open(ENT, encoding='utf-8'))
alvos, vetadas = {}, []
for e in reg['data']['entities']:
    if e.get('hidden_by') or e.get('disabled_by'):
        continue
    for padrao, motivo in RUIDO:
        if re.search(padrao, e['entity_id']):
            if e['entity_id'] in usadas:
                vetadas.append(e['entity_id'])
            else:
                alvos[e['entity_id']] = motivo
            break

print('entidades a ocultar: %d' % len(alvos))
por_motivo = {}
for eid, m in alvos.items():
    por_motivo.setdefault(m, []).append(eid)
detalhar = '--simular' in sys.argv
for m in sorted(por_motivo):
    print('   %-52s %d' % (m, len(por_motivo[m])))
    if detalhar:
        for eid in sorted(por_motivo[m]):
            print('        %s' % eid)
if vetadas:
    print('\nVETADAS por estarem em uso no painel: %s' % ', '.join(sorted(vetadas)))

dev = json.load(io.open(DEV, encoding='utf-8'))
antigo = [d for d in dev['data']['devices']
          if (d.get('name_by_user') or d.get('name') or '').strip() == 'Roteador']
assert len(antigo) == 1, 'esperava 1 aparelho "Roteador", achei %d' % len(antigo)

if detalhar:
    print('\n--simular: nada foi alterado')
    raise SystemExit(0)

# --- 2. so agora mexe -----------------------------------------------------
print('\nparando o container...')
subprocess.check_call(['docker', 'stop', 'homeassistant'])
shutil.copyfile(ENT, os.path.join(BACKUPS, 'core.entity_registry.bak_limpa_dispositivos'))
shutil.copyfile(DEV, os.path.join(BACKUPS, 'core.device_registry.bak_limpa_dispositivos'))

reg = json.load(io.open(ENT, encoding='utf-8'))
n = 0
for e in reg['data']['entities']:
    if e['entity_id'] in alvos:
        e['hidden_by'] = 'user'
        n += 1
io.open(ENT, 'w', encoding='utf-8').write(json.dumps(reg, ensure_ascii=False))
print('1) %d entidades ocultas' % n)

dev = json.load(io.open(DEV, encoding='utf-8'))
for d in dev['data']['devices']:
    if (d.get('name_by_user') or d.get('name') or '').strip() == 'Roteador':
        d['name_by_user'] = 'Roteador Closet'
        print('2) "Roteador" -> "Roteador Closet"')
io.open(DEV, 'w', encoding='utf-8').write(json.dumps(dev, ensure_ascii=False))

subprocess.check_call(['docker', 'start', 'homeassistant'])
print('container no ar')
