# -*- coding: utf-8 -*-
r"""Descobre o que andou acendendo luzes e tomadas, e por ordem de quem.

Motivo: o André observou interruptores acendendo sozinhos. A pergunta nao e
"quais acenderam" -- isso o historico ja mostra -- e sim **quem mandou**.

O Home Assistant carrega um `context` em cada mudanca de estado, e e nele que
esta a resposta:

    context_user_id   preenchido -> alguem clicou (app, dashboard, voz)
    context_parent_id preenchido -> foi consequencia de outro evento
    os dois vazios               -> veio de fora do Home Assistant, isto e,
                                    o proprio aparelho ou a nuvem do fabricante

Esse ultimo caso e o interessante: se nao ha contexto nenhum, **nao foi o Home
Assistant que acendeu**. Sobra o app do fabricante, uma rotina na nuvem (Tuya,
Xiaomi, Alexa, SmartThings), o interruptor fisico, ou o retorno de energia com
`power_on_behavior` mandando ligar.

Le o banco em modo somente leitura, com o container em pe.
"""
import io
import os
import sqlite3
import sys
import time

# Roda tanto no Windows quanto dentro do container (util quando o python do
# Windows nao responde): `docker exec -i homeassistant python - < este.py`
WINDOWS = r'C:\HomeAssistant\config\home-assistant_v2.db'
BANCO = WINDOWS if os.path.exists(WINDOWS) else '/config/home-assistant_v2.db'
HORAS = int(sys.argv[1]) if len(sys.argv) > 1 else 48

con = sqlite3.connect('file:%s?mode=ro' % BANCO.replace('\\', '/'), uri=True)
con.row_factory = sqlite3.Row
corte = time.time() - HORAS * 3600

# --- 1. quem disparou cada acendimento ------------------------------------
# ⚠️ Duas fontes de falso positivo, e as duas enganam:
#
#   1. **Reconexao.** Um aparelho que estava `unavailable` e volta registra
#      'on', mas ninguem acendeu nada -- ele ja estava aceso. So conta como
#      acendimento quem veio de 'off'.
#   2. **Partida do Home Assistant.** Ao subir, ele repovoa os estados e dezenas
#      de entidades marcam 'on' no mesmo segundo. Por isso o `old.state` e lido
#      junto, em vez de olhar so o estado novo.
#
# Cada interruptor aparece duas vezes no banco (`switch.x` original e `light.x`
# criado pelo switch_as_x); sao a mesma tecla fisica, contadas uma vez so.
linhas = con.execute("""
    SELECT m.entity_id,
           s.last_updated_ts AS ts,
           COALESCE(old.state, '?') AS anterior,
           s.context_user_id_bin   IS NOT NULL AS tem_usuario,
           s.context_parent_id_bin IS NOT NULL AS tem_pai
      FROM states s
      JOIN states_meta m ON m.metadata_id = s.metadata_id
 LEFT JOIN states old    ON old.state_id = s.old_state_id
     WHERE s.last_updated_ts > ?
       AND s.state = 'on'
       AND (m.entity_id LIKE 'light.%' OR m.entity_id LIKE 'switch.%')
  ORDER BY s.last_updated_ts
""", (corte,)).fetchall()

reais = [r for r in linhas if r['anterior'] == 'off']
print('janela: ultimas %d horas' % HORAS)
print('registros "on": %d | acendimentos de verdade (vindos de off): %d\n'
      % (len(linhas), len(reais)))
linhas = reais


def origem(r):
    if r['tem_usuario']:
        return 'pessoa (app/dashboard)'
    if r['tem_pai']:
        return 'automacao/cena do HA'
    return 'FORA DO HA (aparelho ou nuvem)'


resumo = {}
for r in linhas:
    chave = (r['entity_id'], origem(r))
    resumo[chave] = resumo.get(chave, 0) + 1

print('%-46s %-32s %s' % ('entidade', 'origem', 'vezes'))
for (eid, o), n in sorted(resumo.items(), key=lambda x: -x[1]):
    print('%-46s %-32s %d' % (eid, o, n))

# --- 2. os sem contexto, um a um, que sao os suspeitos --------------------
sem = [r for r in linhas if not r['tem_usuario'] and not r['tem_pai']]
if sem:
    print('\n--- acendimentos sem contexto (nao partiram do Home Assistant) ---')
    # agrupa por segundo: varias teclas no mesmo instante e assinatura de cena,
    # nao de alguem apertando uma por uma
    porsegundo = {}
    for r in sem:
        porsegundo.setdefault(int(r['ts']), []).append(r['entity_id'])
    for ts in sorted(porsegundo)[-40:]:
        nomes = sorted(set(e.split('.', 1)[1] for e in porsegundo[ts]))
        marca = '   <<< varias juntas' if len(nomes) > 1 else ''
        print('  %s  %s%s' % (time.strftime('%d/%m %H:%M:%S', time.localtime(ts)),
                              ', '.join(nomes), marca))

# --- 3. reinicios do HA no periodo, para cruzar com quedas de energia -----
try:
    arranques = con.execute("""
        SELECT e.time_fired_ts AS ts
          FROM events e
          JOIN event_types t ON t.event_type_id = e.event_type_id
         WHERE t.event_type = 'homeassistant_start' AND e.time_fired_ts > ?
      ORDER BY e.time_fired_ts
    """, (corte,)).fetchall()
    if arranques:
        print('\n--- partidas do Home Assistant no periodo ---')
        for a in arranques:
            print('  %s' % time.strftime('%d/%m %H:%M:%S', time.localtime(a['ts'])))
except sqlite3.Error as err:
    print('\n(nao consegui ler os eventos: %s)' % err)

con.close()
