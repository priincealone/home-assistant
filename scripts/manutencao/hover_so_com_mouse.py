# -*- coding: utf-8 -*-
r"""C-06 — envolve toda regra `:hover` em `@media (hover: hover)`.

Problema (medido em 22/09/2026): `globals.css` tem 157 regras `:hover` e uma
única media query de ponteiro grosso, que neutraliza cinco seletores. Num
painel de parede, operado só com o dedo, o navegador aplica o estado de hover
no toque e **o mantém depois que o dedo sai** — o cartão fica parecendo aceso
sem estar. É o "sticky hover".

A correção na raiz não é neutralizar caso a caso: é declarar que hover só
existe onde há um dispositivo capaz de pairar. `@media (hover: hover)` é
exatamente isso, e `@media` aninhado dentro de `@media` é CSS válido.

O que o script NÃO toca:
  - `@keyframes` (o conteúdo não são regras de seletor)
  - regras já dentro de um bloco `pointer: coarse` ou `hover: none` — ali a
    intenção é justamente desfazer o hover no toque

    python hover_so_com_mouse.py --validar   # não grava, só conta
    python hover_so_com_mouse.py             # grava
"""
import io
import re
import sys

CSS = "dashboard-app/app/globals.css"
VALIDAR = "--validar" in sys.argv

ENVOLVE = "@media (hover: hover) {\n"
SEM_HOVER = re.compile(r"pointer\s*:\s*coarse|hover\s*:\s*none")


def fim_do_bloco(s, i):
    """Recebe o índice de '{' e devolve o índice logo após o '}' que o fecha."""
    profundidade = 0
    while i < len(s):
        c = s[i]
        if c == "{":
            profundidade += 1
        elif c == "}":
            profundidade -= 1
            if profundidade == 0:
                return i + 1
        i += 1
    raise ValueError("bloco sem fechamento")


envolvidas = [0]


def transformar(s, dentro_de_toque=False):
    """Percorre um trecho de CSS e devolve o trecho transformado."""
    saida = []
    i = 0
    while i < len(s):
        abre = s.find("{", i)
        if abre == -1:
            saida.append(s[i:])
            break

        prelude = s[i:abre]
        fim = fim_do_bloco(s, abre)
        corpo = s[abre + 1:fim - 1]
        nome = prelude.strip()

        if nome.startswith("@keyframes") or nome.startswith("@-webkit-keyframes"):
            saida.append(s[i:fim])

        elif nome.startswith("@media") or nome.startswith("@supports") or nome.startswith("@layer"):
            toque = dentro_de_toque or bool(SEM_HOVER.search(nome))
            saida.append(prelude + "{" + transformar(corpo, toque) + "}")

        elif ":hover" in prelude and not dentro_de_toque:
            envolvidas[0] += 1
            recuo = prelude[:len(prelude) - len(prelude.lstrip("\n"))]
            saida.append(recuo + ENVOLVE + prelude.lstrip("\n") + "{" + corpo + "}\n}")

        else:
            saida.append(s[i:fim])

        i = fim
    return "".join(saida)


original = io.open(CSS, encoding="utf-8").read()
antes_hover = original.count(":hover")
antes_chaves = original.count("{") - original.count("}")
assert antes_chaves == 0, "o arquivo de origem ja esta desbalanceado (%d)" % antes_chaves

novo = transformar(original)

depois_hover = novo.count(":hover")
saldo_chaves = novo.count("{") - novo.count("}")

print("ocorrencias de :hover  antes=%d  depois=%d" % (antes_hover, depois_hover))
print("regras envolvidas em @media (hover: hover): %d" % envolvidas[0])
print("chaves balanceadas: %s" % ("sim" if saldo_chaves == 0 else "NAO (%d)" % saldo_chaves))
print("linhas: antes=%d depois=%d" % (original.count("\n"), novo.count("\n")))

assert depois_hover == antes_hover, "o numero de :hover nao pode mudar"
assert saldo_chaves == 0, "chaves desbalanceadas no resultado"

if VALIDAR:
    print("\n--validar: nada foi gravado")
    raise SystemExit(0)

io.open(CSS, "w", encoding="utf-8").write(novo)
print("\ngravado em %s" % CSS)
