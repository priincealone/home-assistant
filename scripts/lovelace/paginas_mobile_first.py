# -*- coding: utf-8 -*-
"""Aplica o mobile-first nas paginas de comodo, como ja foi feito na Geral.

Mesma falha da Geral: a regra base do `card_mod` valia o desktop e as media
queries `max-width` reduziam. Enquanto o card-mod nao carrega, o
`horizontal-stack` nativo abre em duas colunas -- espremidas no celular.

A conversao inverte isso: `vertical-stack` (empilha nativamente, sem depender
de CSS) e as colunas so aparecem por `min-width`. Os valores de cada faixa sao
lidos do CSS existente, entao cada pagina mantem o layout que ja tinha; o que
muda e a ordem em que as regras se aplicam.

`minmax(0, ...)` em todas as faixas mais `min-width: 0` nos filhos: sem isso, o
`min-width: auto` padrao do grid deixa o conteudo esticar a coluna (medido na
Geral -- o card de clima ia a 422px numa viewport de 375).
"""
import re
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

RE_BASE = re.compile(r'#root\s*\{[^}]*grid-template-columns:\s*([^;!]+)', re.S)
RE_MEDIA = re.compile(
    r'@media\s*\(max-width:\s*(\d+)px\)\s*\{\s*#root\s*\{[^}]*grid-template-columns:\s*([^;!]+)', re.S)


def encolhivel(colunas):
    """Envolve cada faixa `<n>fr` em minmax(0, ...) para o item poder encolher."""
    saida = []
    for token in colunas.split():
        saida.append('minmax(0, %s)' % token if token.endswith('fr') else token)
    return ' '.join(saida)


def converter(css):
    """Reescreve o CSS desktop-first como mobile-first. None se nao reconhecer."""
    base = RE_BASE.search(css)
    faixas = {int(w): c.strip() for w, c in RE_MEDIA.findall(css)}
    if not base or 700 not in faixas:
        return None
    desktop = base.group(1).strip()
    mobile = faixas[700]
    tablet = faixas.get(1000, desktop)

    novo = ("#root {\n"
            "  display: grid !important;\n"
            "  grid-template-columns: %s !important;\n"
            "  gap: 12px !important;\n"
            "  align-items: start !important;\n"
            "}\n"
            "#root > * { min-width: 0 !important; }\n") % encolhivel(mobile)
    if tablet != mobile:
        novo += ("@media (min-width: 701px) {\n"
                 "  #root { grid-template-columns: %s !important; }\n"
                 "}\n") % encolhivel(tablet)
    if desktop != tablet:
        novo += ("@media (min-width: 1001px) {\n"
                 "  #root { grid-template-columns: %s !important; }\n"
                 "}\n") % encolhivel(desktop)
    return novo


cfg = load()
views = cfg['data']['config']['views']
convertidas, ignoradas = 0, []

for i, v in enumerate(views):
    if i == 0:
        continue  # Geral ja foi convertida
    for card in v['cards'][0].get('cards', []):
        css = (card.get('card_mod') or {}).get('style', '')
        if 'grid-template-columns' not in css or 'max-width' not in css:
            continue
        novo = converter(css)
        if not novo:
            ignoradas.append((i, v.get('title')))
            continue
        card['type'] = 'vertical-stack'
        card['card_mod'] = {"style": novo}
        convertidas += 1
        print('view %2d %-16s convertida' % (i, v.get('title')))

print()
print('convertidas:', convertidas, '| nao reconhecidas:', ignoradas or 'nenhuma')

if convertidas:
    save(cfg, tag='paginas_mobile_first')
    restart()
