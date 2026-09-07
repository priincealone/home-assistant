# -*- coding: utf-8 -*-
"""Impede o conteudo de esticar a coluna unica no celular.

Medido depois da passada mobile-first: com `grid-template-columns: 1fr`, o card
de clima subia com 422px numa viewport de 375 -- seis cards transbordando. E o
`min-width: auto` que todo item de grid tem por padrao: o `1fr` nao encolhe
abaixo da largura "natural" do conteudo (aqui, a previsao de cinco dias).

Correcao: `minmax(0, 1fr)` em todas as faixas, mais `min-width: 0` nos filhos
diretos -- que e a forma canonica de deixar um item de grid encolher.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

HEADER_CSS = """#root {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 6px !important;
  align-items: center !important;
}
#root > * { min-width: 0 !important; }
/* relogio escondido por padrao: o iOS ja mostra a hora na barra de status */
#root > *:last-child { display: none !important; }
@media (min-width: 701px) {
  #root { grid-template-columns: minmax(0, 1fr) auto !important; gap: 10px !important; }
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
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 12px !important;
  align-items: start !important;
}
#root > * { min-width: 0 !important; }
@media (min-width: 701px) {
  #root { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
}
@media (min-width: 1001px) {
  #root {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.35fr) minmax(0, 1.2fr) !important;
  }
}
"""

cfg = load()
raiz = cfg['data']['config']['views'][0]['cards'][0]
raiz['cards'][0]['card_mod'] = {"style": HEADER_CSS}
raiz['cards'][1]['card_mod'] = {"style": CORPO_CSS}

save(cfg, tag='geral_minmax')
restart()
