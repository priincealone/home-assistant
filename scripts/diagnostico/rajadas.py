# -*- coding: utf-8 -*-
r"""Investiga os acendimentos em rajada: queda de energia ou mao humana?

A pergunta que decide: **o aparelho tinha acabado de voltar?**

Se um interruptor fica `unavailable` e reaparece com as teclas ligadas, nao
foi ninguem -- foi o retorno de energia (ou de Wi-Fi) com o `power_on_behavior`
mandando ligar. Se ele estava vivo o tempo todo e as teclas subiram uma por
segundo, foi alguem apertando.

Para cada acendimento sem contexto, mostra quanto tempo antes o mesmo aparelho
esteve indisponivel.
"""
import os
import sqlite3
import sys
import time

WINDOWS = r'C:\HomeAssistant\config\home-assistant_v2.db'
BANCO = WINDOWS if os.path.exists(WINDOWS) else '/config/home-assistant_v2.db'
HORAS = int(sys.argv[1]) if len(sys.argv) > 1 else 48

con = sqlite3.connect('file:%s?mode=ro' % BANCO.replace('\\', '/'), uri=True)
con.row_factory = sqlite3.Row
corte = time.time() - HORAS * 3600

# acendimentos reais sem contexto, so o dominio switch (evita a duplicata light)
acend = con.execute("""
    SELECT m.entity_id, s.last_updated_ts AS ts
      FROM states s
      JOIN states_meta m ON m.metadata_id = s.metadata_id
 LEFT JOIN states old    ON old.state_id = s.old_state_id
     WHERE s.last_updated_ts > ? AND s.state = 'on' AND old.state = 'off'
       AND m.entity_id LIKE 'switch.%'
       AND s.context_user_id_bin IS NULL AND s.context_parent_id_bin IS NULL
  ORDER BY s.last_updated_ts
""", (corte,)).fetchall()

# todos os momentos em que cada entidade ficou indisponivel
indisp = {}
for r in con.execute("""
    SELECT m.entity_id, s.last_updated_ts AS ts
      FROM states s
      JOIN states_meta m ON m.metadata_id = s.metadata_id
     WHERE s.last_updated_ts > ? AND s.state IN ('unavailable', 'unknown')
       AND m.entity_id LIKE 'switch.%'
""", (corte - 3600,)):
    indisp.setdefault(r['entity_id'], []).append(r['ts'])

print('acendimentos sem contexto (dominio switch): %d\n' % len(acend))
print('%-19s %-42s %s' % ('quando', 'entidade', 'caiu quantos segundos antes?'))

recente, antigo = 0, 0
for r in acend:
    quedas = [t for t in indisp.get(r['entity_id'], []) if t < r['ts']]
    if quedas:
        atraso = r['ts'] - max(quedas)
        nota = '%6.0fs' % atraso
        if atraso < 120:
            nota += '  <<< ACABOU DE VOLTAR'
            recente += 1
        else:
            antigo += 1
    else:
        nota = '   nunca caiu'
        antigo += 1
    print('%-19s %-42s %s' % (
        time.strftime('%d/%m %H:%M:%S', time.localtime(r['ts'])), r['entity_id'], nota))

print('\nlogo apos voltar (ate 2 min): %d   |   com o aparelho vivo: %d' % (recente, antigo))

# como cada interruptor esta configurado para se comportar ao voltar a energia
print('\n--- comportamento programado no retorno de energia ---')
for r in con.execute("""
    SELECT m.entity_id, s.state, MAX(s.last_updated_ts) AS ts
      FROM states s
      JOIN states_meta m ON m.metadata_id = s.metadata_id
     WHERE m.entity_id LIKE 'select.%power_on_behavior%'
  GROUP BY m.entity_id
"""):
    print('  %-52s %s' % (r['entity_id'], r['state']))

con.close()
