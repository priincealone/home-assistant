# Invariantes estruturais de config/automations.yaml (docs/AUTOMATION-POLICY.md; test-gap-analysis L-05).
# SOMENTE LEITURA: lê o YAML, não fala com o HA e não aciona nada. Rodar com o Python do container
# (o do Windows falha com frequência e PyYAML já está lá):
#
#   docker exec -i homeassistant python - < scripts/testes/invariantes_automacoes.py
#
# Código de saída: 0 tudo certo (ou só exceções conhecidas), 1 violação nova.
#
# Cada regra cita o R-número da política. Exceção conhecida só entra em EXCECOES com o MOTIVO por escrito:
# é uma dívida, não um silenciador. Se a exceção deixar de ser necessária, o teste avisa para tirá-la.
import io, os, sys
import yaml

# Os caminhos podem ser trocados por AUTOMATIONS_YAML / SCRIPTS_YAML (usado para provar que o teste pega defeito).
ARQ_AUTOMACOES = os.environ.get("AUTOMATIONS_YAML", "/config/automations.yaml")
ARQ_SCRIPTS = os.environ.get("SCRIPTS_YAML", "/config/scripts.yaml")

# (id da automação, regra) -> motivo
EXCECOES = {}

SERVICOS_APAGAR = {"turn_off", "toggle"}  # toggle também pode apagar


def carregar(caminho):
    with io.open(caminho, encoding="utf-8") as f:
        return yaml.safe_load(f) or []


def lista(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


def percorrer(no, nivel=0, dentro_de_condicao=False):
    """Gera (nó, dentro_de_choose_ou_if) para todo dicionário aninhado em actions."""
    if isinstance(no, dict):
        yield no, dentro_de_condicao
        for chave, valor in no.items():
            cond = dentro_de_condicao or chave in ("choose", "if", "conditions", "condition")
            yield from percorrer(valor, nivel + 1, cond)
    elif isinstance(no, list):
        for item in no:
            yield from percorrer(item, nivel + 1, dentro_de_condicao)


def acoes_de(a):
    return lista(a.get("actions") if "actions" in a else a.get("action"))


def condicoes_de(a):
    return lista(a.get("conditions") if "conditions" in a else a.get("condition"))


def nome_servico(no):
    return no.get("action") or no.get("service") or ""


def alvos(no):
    ids = []
    for chave in ("target", "data"):
        d = no.get(chave)
        if isinstance(d, dict):
            ids += lista(d.get("entity_id"))
    ids += lista(no.get("entity_id"))
    return [i for i in ids if isinstance(i, str)]


def main():
    automacoes = carregar(ARQ_AUTOMACOES)
    falhas, avisos, usadas = [], [], set()

    def viola(a, regra, msg):
        chave = (str(a.get("id")), regra)
        if chave in EXCECOES:
            usadas.add(chave)
            avisos.append(f"[{regra}] {a.get('alias')}: {msg}  (exceção conhecida: {EXCECOES[chave]})")
        else:
            falhas.append(f"[{regra}] {a.get('alias')} (id {a.get('id')}): {msg}")

    ids, aliases = {}, {}
    for a in automacoes:
        i, nome = a.get("id"), a.get("alias")
        # R11 · identidade estável
        if not i or not isinstance(i, str):
            viola(a, "R11", "sem `id` (texto)")
        elif i in ids:
            viola(a, "R11", f"`id` repetido com '{ids[i]}'")
        ids[i] = nome
        if nome in aliases:
            viola(a, "R11", "`alias` repetido")
        aliases[nome] = i

        # R1 · explica a si mesma
        desc = (a.get("description") or "").strip()
        if len(desc) < 80:
            viola(a, "R1", f"`description` com {len(desc)} caracteres (mínimo 80 para dizer o quê, o porquê e a armadilha)")

        # R10 · mode de propósito
        modo = a.get("mode")
        if modo is None:
            viola(a, "R10", "sem `mode` declarado")
        elif modo in ("queued", "parallel") and "max" not in a:
            viola(a, "R10", f"`mode: {modo}` sem `max` (a fila cresce sem limite)")

        acoes = acoes_de(a)
        conds = condicoes_de(a)

        # R5 · temporizador é `for:` no gatilho
        for no, _ in percorrer(acoes):
            if "delay" in no:
                viola(a, "R5", f"usa `delay` ({no['delay']}); temporizador é `for:` no gatilho")

        # R3 · janela de horário
        for no, _ in percorrer(conds + acoes):
            if no.get("condition") == "time":
                tem_a, tem_b = "after" in no, "before" in no
                if tem_a != tem_b:
                    viola(a, "R3", "condição de horário com só `after` ou só `before` (não atravessa a meia-noite)")
                if tem_a and tem_b and isinstance(no["after"], str) and isinstance(no["before"], str) and no["after"] < no["before"]:
                    # janela comum no mesmo dia; só é problema se a intenção for noturna: avisa
                    avisos.append(f"[R3] {nome}: janela {no['after']}→{no['before']} no mesmo dia (confirme que não devia atravessar a meia-noite)")

        # R4 · condição de sol guarda só o acender
        sol_no_topo = [c for c in conds if isinstance(c, dict) and (c.get("condition") == "sun" or c.get("entity_id") == "sun.sun")]
        if sol_no_topo:
            for no, _ in percorrer(acoes):
                if nome_servico(no).split(".")[-1] in SERVICOS_APAGAR and nome_servico(no).split(".")[0] in ("light", "switch"):
                    viola(a, "R4", "condição de sol no topo e a automação também apaga: acender exige escuro, apagar não")
                    break

        # R2 · desligar TV só condicionado ao estado
        for no, protegido in percorrer(acoes):
            srv = nome_servico(no)
            if srv in ("media_player.turn_off", "remote.turn_off", "media_player.toggle"):
                if any("tv" in e or "samsung" in e for e in alvos(no)) and not protegido:
                    viola(a, "R2", f"{srv} na TV sem condição de estado (a tecla POWER alterna: com a TV apagada, liga)")

    # R8 · um atuador, um dono
    dono = {}
    for a in automacoes:
        for no, _ in percorrer(acoes_de(a)):
            if nome_servico(no).split(".")[-1] in {"turn_on", "turn_off", "toggle"}:
                for e in alvos(no):
                    dono.setdefault(e, set()).add(a.get("alias"))
    for e, donos in sorted(dono.items()):
        if len(donos) > 1:
            avisos.append(f"[R8] {e} é alvo de {len(donos)} automações: {', '.join(sorted(donos))} (confirme que é a mesma intenção, uma acende e a outra apaga)")

    # R8 (scripts) · nenhum script dá toggle em atuador que automação governa
    try:
        scripts = yaml.safe_load(io.open(ARQ_SCRIPTS, encoding="utf-8")) or {}
        for sid, corpo in scripts.items():
            for no, _ in percorrer(corpo.get("sequence", [])):
                if nome_servico(no).endswith(".toggle"):
                    for e in alvos(no):
                        if e in dono:
                            falhas.append(f"[R8] script.{sid} dá toggle em {e}, governado por: {', '.join(sorted(dono[e]))}")
    except FileNotFoundError:
        avisos.append("scripts.yaml não encontrado: R8 dos scripts não verificado")

    # exceções que não são mais necessárias
    for chave in EXCECOES:
        if chave not in usadas:
            avisos.append(f"exceção {chave} não é mais necessária: tire de EXCECOES")

    print(f"{len(automacoes)} automações lidas de {ARQ_AUTOMACOES}")
    for m in avisos:
        print("AVISO ", m)
    for m in falhas:
        print("FALHA ", m)
    print(f"\n{len(falhas)} violação(ões), {len(avisos)} aviso(s)")
    return 1 if falhas else 0


sys.exit(main())
