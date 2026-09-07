# -*- coding: utf-8 -*-
"""Botao "+" da lista de compras: 32px -> 44px.

Primeira tentativa foi por `--mdc-icon-button-size`, a variavel classica do
botao de icone do HA. Medido depois: a variavel **estava aplicada** no elemento
(`--mdc-icon-button-size: 44px`) e mesmo assim ele continuava 32x32 -- o
`ha-icon-button` desta versao embrulha um `ha-button` do Material Web, que
ignora a variavel antiga.

Aqui o tamanho vai direto no host, e a cadeia `ha-input$ha-icon-button$` desce
pelos dois shadow roots para esticar o botao interno junto.
"""
import sys
sys.path.insert(0, r'C:\HomeAssistant\scripts')
from ha import load, save, restart

HOST = (
    ".addRow ha-icon-button, ha-icon-button.addButton {\n"
    "  width: 44px !important; height: 44px !important;\n"
    "  --mdc-icon-button-size: 44px !important;\n"
    "}\n"
)
INTERNO = ("ha-button, button, .button {\n"
           "  width: 100% !important; height: 100% !important;\n"
           "}\n")

cfg = load()


def achar_todo(node):
    if isinstance(node, dict):
        if node.get('type') == 'todo-list':
            return node
        for v in node.values():
            r = achar_todo(v)
            if r:
                return r
    elif isinstance(node, list):
        for v in node:
            r = achar_todo(v)
            if r:
                return r
    return None


todo = achar_todo(cfg['data']['config']['views'][0])
assert todo, 'card da lista de compras nao encontrado'
estilo = todo['card_mod']['style']
assert isinstance(estilo, dict), 'esperava card_mod aninhado neste card'

# tira a tentativa anterior, que nao teve efeito
estilo['.'] = '\n'.join(l for l in estilo.get('.', '').splitlines()
                        if 'mdc-icon-button-size' not in l).strip() + '\n'
estilo['.'] = (estilo['.'] + '\n' + HOST).strip() + '\n'
estilo['ha-input$ha-icon-button$'] = INTERNO

print('botao "+": tamanho no host + cadeia ha-input$ha-icon-button$')

save(cfg, tag='p2_botao_adicionar')
restart()
