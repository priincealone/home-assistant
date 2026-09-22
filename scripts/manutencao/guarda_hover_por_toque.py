# -*- coding: utf-8 -*-
r"""Reforço do C-06 — hover também depende do atributo `data-toque` no <html>.

Motivo (22/09/2026, relatado pelo André num iPad Pro 10.9"): o Safari do iPad
roda em "modo desktop" por padrão e **mente nas media queries** — relata
`hover: hover` e `pointer: fine` mesmo sendo operado com o dedo. A guarda
`@media (hover: hover) and (pointer: fine)` casa, o hover é aplicado no toque
e o card fica aceso depois que o dedo sai.

Media query não resolve esse caso. O que não mente é `navigator.maxTouchPoints`
e o `pointerType` do evento. Um script no `<head>` marca o `<html>` com
`data-toque`, e cada regra de hover passa a exigir a ausência dessa marca.

As duas camadas convivem: a media query protege quem responde a verdade
(Android/Chrome), o atributo protege quem não responde (iPad).

    python guarda_hover_por_toque.py --validar
    python guarda_hover_por_toque.py
"""
import io
import re
import sys

CSS = "dashboard-app/app/globals.css"
VALIDAR = "--validar" in sys.argv
ABERTURA = "@media (hover: hover) and (pointer: fine) {"
PREFIXO = "html:not([data-toque]) "

texto = io.open(CSS, encoding="utf-8").read()
total = texto.count(ABERTURA)
if total == 0:
    raise SystemExit("nenhum bloco de hover encontrado — o C-06 ja foi revertido?")


SEM_COMENTARIO = re.compile(r"/\*.*?\*/", re.S)


def so_codigo(t):
    return SEM_COMENTARIO.sub("", t).strip()


def prefixar(lista):
    """Prefixa cada seletor da lista, preservando comentários e recuo.

    Um comentário antes do seletor é comum aqui, e prefixá-lo produziria CSS
    inválido — por isso o prefixo entra depois dele, não antes.
    """
    partes = []
    for parte in lista.split(","):
        limpo = so_codigo(parte)
        if not limpo or limpo.startswith(PREFIXO) or limpo.startswith("@"):
            partes.append(parte)
            continue
        # posição onde o seletor de fato começa (depois de comentários e espaços)
        corte = parte.rfind("*/")
        corte = 0 if corte == -1 else corte + 2
        cabeca, cauda = parte[:corte], parte[corte:]
        recuo = cauda[:len(cauda) - len(cauda.lstrip())]
        partes.append(cabeca + recuo + PREFIXO + cauda.strip())
    return ",".join(partes)


saida = []
i = 0
tocados = 0
while True:
    j = texto.find(ABERTURA, i)
    if j == -1:
        saida.append(texto[i:])
        break
    fim_abertura = j + len(ABERTURA)
    fim_seletor = texto.find("{", fim_abertura)
    seletor = texto[fim_abertura:fim_seletor]
    saida.append(texto[i:fim_abertura])

    # Um bloco pode conter outro igual (aninhamento que o C-06 produziu em um
    # ponto). Nesse caso não há seletor para prefixar aqui: segue para o de
    # dentro, que será encontrado na próxima volta.
    if so_codigo(seletor).startswith("@"):
        i = fim_abertura
        continue

    saida.append(prefixar(seletor))
    tocados += 1
    i = fim_seletor

novo = "".join(saida)

print("blocos de hover: %d" % total)
print("seletores prefixados: %d" % tocados)
print("ocorrencias de :hover  antes=%d  depois=%d" % (texto.count(":hover"), novo.count(":hover")))
print("chaves balanceadas: %s" % ("sim" if novo.count("{") == novo.count("}") else "NAO"))

assert novo.count(":hover") == texto.count(":hover")
assert novo.count("{") == novo.count("}")

if VALIDAR:
    print("\n--validar: nada foi gravado")
    raise SystemExit(0)

io.open(CSS, "w", encoding="utf-8").write(novo)
print("\ngravado em %s" % CSS)
