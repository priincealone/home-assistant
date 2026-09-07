# -*- coding: utf-8 -*-
"""Geral em mobile-first: o layout certo no celular deixa de depender do CSS.

Sintoma: no app do iPhone a Geral abre quebrada -- tres colunas espremidas,
textos cortados -- e so se conserta ao atualizar a pagina.

Causa: as colunas eram definidas por `card_mod`, com a **regra base valendo o
desktop** e media queries `max-width` reduzindo. Enquanto o card-mod (que e um
recurso do frontend) nao carrega, o `horizontal-stack` nativo renderiza suas
tres colunas iguais -- ou seja, o layout de desktop numa tela de 375px. No
refresh o recurso ja esta em cache, aplica a tempo e tudo se ajeita.

Correcao: **o padrao passa a ser o celular, sem depender de CSS nenhum.** Os
dois stacks viram `vertical-stack`, que empilha nativamente, e as colunas so
aparecem via `min-width`:

    sem card-mod  -> 1 coluna (correto no celular)
    >= 701px      -> 2 colunas
    >= 1001px     -> layout completo

No desktop, se o CSS atrasar, o pior caso vira um instante de coluna unica --
bem menos grave que a tela ilegivel do celular.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

HEADER_CSS = """#root {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 6px !important;
  align-items: center !important;
}
/* relogio escondido por padrao: o iOS ja mostra a hora na barra de status */
#root > *:last-child { display: none !important; }
@media (min-width: 701px) {
  #root { grid-template-columns: 1fr auto !important; gap: 10px !important; }
}
@media (min-width: 1001px) {
  #root {
    grid-template-columns: minmax(300px, 1.3fr) auto minmax(130px, 0.7fr) !important;
    gap: 16px !important;
  }
  #root > *:last-child { display: block !important; }
}
"""

CORPO_CSS = """#root {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 12px !important;
  align-items: start !important;
}
@media (min-width: 701px) {
  #root { grid-template-columns: 1fr 1fr !important; }
}
@media (min-width: 1001px) {
  #root { grid-template-columns: 1.05fr 1.35fr 1.2fr !important; }
}
"""

cfg = load()
raiz = cfg['data']['config']['views'][0]['cards'][0]
header, corpo = raiz['cards'][0], raiz['cards'][1]

for card, css, nome in ((header, HEADER_CSS, 'header'), (corpo, CORPO_CSS, 'corpo')):
    assert card['type'] in ('horizontal-stack', 'vertical-stack'), 'estrutura da Geral mudou'
    card['type'] = 'vertical-stack'          # empilhar e o padrao nativo agora
    card['card_mod'] = {"style": css}
    print('%s: vertical-stack + CSS mobile-first' % nome)

save(cfg, tag='geral_mobile_first')
restart()
