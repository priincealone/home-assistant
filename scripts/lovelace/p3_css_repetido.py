# -*- coding: utf-8 -*-
"""P3 #12: o CSS que estava copiado card a card vira template.

Medido: 47.524 bytes do storage eram `card_mod` em texto, e 34.356 desses eram
repeticao literal -- 20,8% do arquivo. Os quatro blocos mais copiados aparecem
**so** em `custom:button-card`, que aceita heranca por template, entao dá para
declarar uma vez e referenciar.

Os quatro, com o nome que recebem:

  36x  sem_moldura   sem borda, sombra ou blur, e sem arredondamento
  28x  nu            transparente e sem moldura nenhuma
  16x  borda_fina    sem sombra nem blur, mas com a borda de 1px do vidro
  13x  sem_fundo     transparente, mantendo o arredondamento herdado

Regra de seguranca: um card so troca o `card_mod` por template se o template
que ele **ja** usa nao definir `card_mod` proprio. `shortcut_tile` e
`room_header` definem, e no button-card o card_mod de um template sobrescreve o
do outro em vez de somar -- esses cards ficam como estao.
"""
import json
import sys

sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

NOMES = {
    ("ha-card { border: none !important; box-shadow: none !important; backdrop-filter: none !important; "
     "-webkit-backdrop-filter: none !important; }\n"
     "ha-card::before, ha-card::after { display: none !important; }\n"
     "ha-card { border-radius: 0 !important; }"): 'sem_moldura',
    ("ha-card { background: transparent !important; border: none !important; box-shadow: none !important; "
     "backdrop-filter: none !important; border-radius: 0px !important; }"): 'nu',
    ("ha-card {\n  box-shadow: none !important;\n  backdrop-filter: none !important;\n"
     "  -webkit-backdrop-filter: none !important;\n  border: 1px solid rgba(255,255,255,0.12) !important;\n}\n"
     "ha-card::before, ha-card::after { display: none !important; }"): 'borda_fina',
    ("ha-card { background: transparent !important; border: none !important; box-shadow: none !important; "
     "backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }\n"
     "ha-card::before, ha-card::after { display: none !important; }"): 'sem_fundo',
}

cfg = load()
config = cfg['data']['config']
tpls = config['button_card_templates']
antes = len(json.dumps(config, ensure_ascii=False))

com_cardmod_proprio = {n for n, t in tpls.items() if t.get('card_mod')}
print('templates que ja trazem card_mod (nao serao combinados): %s'
      % (sorted(com_cardmod_proprio) or 'nenhum'))

# --- cria os templates -----------------------------------------------------
for css, nome in NOMES.items():
    assert nome not in tpls, 'ja existe um template chamado %s' % nome
    tpls[nome] = {"card_mod": {"style": css + "\n"}}

trocados = {n: 0 for n in NOMES.values()}
pulados = []


def normalizar(t):
    if t is None:
        return []
    return list(t) if isinstance(t, list) else [t]


def caminhar(node):
    if isinstance(node, dict):
        if node.get('type') == 'custom:button-card':
            css = (node.get('card_mod') or {}).get('style')
            nome = NOMES.get(css.strip()) if isinstance(css, str) else None
            if nome:
                atuais = normalizar(node.get('template'))
                if any(t in com_cardmod_proprio for t in atuais):
                    pulados.append(atuais)
                else:
                    node.pop('card_mod')
                    novos = atuais + [nome]
                    node['template'] = novos[0] if len(novos) == 1 else novos
                    trocados[nome] += 1
        for v in node.values():
            caminhar(v)
    elif isinstance(node, list):
        for v in node:
            caminhar(v)


caminhar(config['views'])

for nome, n in trocados.items():
    print('  %-13s %d cards' % (nome, n))
if pulados:
    print('  pulados (template com card_mod proprio): %d' % len(pulados))

depois = len(json.dumps(config, ensure_ascii=False))
print()
print('storage: %d -> %d bytes (%.1f%% menor)' % (antes, depois, 100 * (antes - depois) / antes))

save(cfg, tag='p3_css_repetido')
restart()
