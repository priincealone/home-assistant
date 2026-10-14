# Grava no config/secrets.yaml as 4 chaves do mapa do aspirador (K-18), com VOCÊ digitando os valores.
# Nada passa por conversa, log, commit ou pelo Claude: os valores são lidos do teclado, sem eco (token e senha),
# validados e gravados, e NUNCA são impressos.
#
# Rodar no PowerShell (precisa de terminal interativo, por isso o -it; o arquivo é copiado para dentro do container):
#
#   docker cp scripts/manutencao/grava_segredos_mapa.py homeassistant:/tmp/g.py
#   docker exec -it homeassistant python /tmp/g.py
#   docker exec homeassistant rm /tmp/g.py
#
# TROCAR só alguns valores (ex.: usuário e senha, sem refazer o token): o script substitui APENAS as chaves pedidas:
#
#   docker exec -it -e GRAVA_SUBSTITUIR=usuario,senha homeassistant python /tmp/g.py
#
#   (nomes aceitos: ip, token, usuario, senha; cada um precisa já existir; as outras chaves e o resto do arquivo não mudam)
#
# Colar em campo oculto: no Windows Terminal use Ctrl+Shift+V (ou clique com o botão direito); Ctrl+V não cola ali. O script mostra
# QUANTOS caracteres recebeu (nunca quais). No token ele aceita a linha inteira que a ferramenta imprime ("TOKEN: 5544…"): extrai
# sozinho os 32 caracteres hexadecimais. Se o colar oculto não funcionar de jeito nenhum, use o modo VISÍVEL (o valor aparece na tela
# e fica no histórico do SEU terminal):  docker exec -it -e GRAVA_VISIVEL=1 homeassistant python /tmp/g.py
#
# No modo normal, NÃO sobrescreve: se alguma chave já existir, para sem alterar o arquivo. Variável opcional: CONFIG_DIR (padrão /config).
#
# ATENÇÃO ao usuário: é o da CONTA Xiaomi (e-mail, telefone ou o id numérico da conta, em geral com 10 dígitos). O id de 9 dígitos que a
# ferramenta de tokens imprime ao lado do aparelho é o ID DO ROBÔ, não o da conta: o login falha se ele for usado como usuário.
import getpass
import io
import json
import os
import re
import sys

import yaml

CONFIG = os.environ.get("CONFIG_DIR", "/config")
ARQ = os.path.join(CONFIG, "secrets.yaml")
CHAVES = {
    "ip": "mapa_aspirador_ip",
    "token": "mapa_aspirador_token",
    "usuario": "mapa_xiaomi_usuario",
    "senha": "mapa_xiaomi_senha",
}
RE_IP = re.compile(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$")
RE_TOKEN32 = re.compile(r"(?<![0-9a-fA-F])[0-9a-fA-F]{32}(?![0-9a-fA-F])")
VISIVEL = os.environ.get("GRAVA_VISIVEL") == "1"


def sair(codigo, msg):
    print(msg)
    sys.exit(codigo)


def pedir(rotulo, secreto=False):
    oculto = secreto and not VISIVEL
    leitor = getpass.getpass if oculto else input
    valor = leitor(f"{rotulo}: ").strip()
    if secreto:
        print(f"   (recebi {len(valor)} caracteres)")  # só a quantidade, nunca o conteúdo
    return valor


def ler_valor(nome):
    """Pergunta e valida um dos quatro valores; devolve o texto limpo ou encerra sem gravar nada."""
    if nome == "ip":
        ip = pedir("IP do robô (ex.: 192.168.0.10)")
        m = RE_IP.match(ip)
        if not m or any(int(x) > 255 for x in m.groups()):
            sair(1, "IP inválido. Nada foi gravado.")
        return ip
    if nome == "token":
        bruto = pedir("Token do robô (32 caracteres hexadecimais)", secreto=True)
        achado = RE_TOKEN32.search(bruto)
        if not achado:
            dica = (" Parece que o colar não funcionou (nada chegou): use Ctrl+Shift+V ou o modo visível (GRAVA_VISIVEL=1)."
                    if len(bruto) == 0 else "")
            sair(1, f"Não achei 32 caracteres hexadecimais seguidos no que foi digitado ({len(bruto)} caracteres).{dica} Nada foi gravado.")
        return achado.group(0)
    if nome == "usuario":
        usuario = pedir("Usuário da CONTA Xiaomi (e-mail, telefone ou id da conta; NÃO o id do robô)")
        if not usuario:
            sair(1, "Usuário vazio. Nada foi gravado.")
        return usuario
    senha = pedir("Senha da conta Xiaomi", secreto=True)
    if not senha:
        sair(1, "Senha vazia. Nada foi gravado.")
    return senha


def main():
    if not os.path.isfile(ARQ):
        sair(1, f"Não achei {ARQ}.")
    with io.open(ARQ, encoding="utf-8", newline="") as f:
        texto = f.read()
    existentes = set((yaml.safe_load(texto) or {}).keys())

    substituir = [x.strip() for x in os.environ.get("GRAVA_SUBSTITUIR", "").split(",") if x.strip()]
    invalidos = [x for x in substituir if x not in CHAVES]
    if invalidos:
        sair(1, f"GRAVA_SUBSTITUIR aceita só: {', '.join(CHAVES)} (recebi nomes inválidos).")

    if substituir:
        faltam = [CHAVES[x] for x in substituir if CHAVES[x] not in existentes]
        if faltam:
            sair(1, "Estas chaves ainda não existem, então não há o que substituir: " + ", ".join(faltam) +
                    ". Rode sem GRAVA_SUBSTITUIR para criar as quatro.")
        nomes = substituir
        print("Modo SUBSTITUIR: só estas chaves serão trocadas: " + ", ".join(CHAVES[x] for x in nomes) + ".")
    else:
        ja = [k for k in CHAVES.values() if k in existentes]
        if ja:
            sair(1, "Estas chaves já existem no secrets.yaml e NÃO foram alteradas: " + ", ".join(ja) +
                    ". Para trocar só algumas: docker exec -it -e GRAVA_SUBSTITUIR=usuario,senha homeassistant python /tmp/g.py")
        nomes = list(CHAVES)
        print("Digite os valores. Token e senha não aparecem na tela. Nada é impresso depois.")

    valores = {CHAVES[n]: ler_valor(n) for n in nomes}

    base = texto
    if substituir:
        # tira só as linhas `chave: valor` das chaves trocadas (uma linha cada, como este script grava); o resto fica intacto
        for chave in valores:
            base = re.sub(rf"(?m)^{re.escape(chave)}:[^\n]*\n?", "", base)
    # json.dumps gera uma string entre aspas duplas, que o YAML aceita com segurança (acentos, :, #, aspas, números).
    linhas = ["", "# Mapa do aspirador (K-18). Gravado por scripts/manutencao/grava_segredos_mapa.py"]
    linhas += [f"{chave}: {json.dumps(valor, ensure_ascii=False)}" for chave, valor in valores.items()]
    novo = base.rstrip("\n") + "\n" + "\n".join(linhas) + "\n"

    # confere que o arquivo continua válido, que cada valor volta IGUAL e que NENHUMA outra chave mudou, antes de gravar
    antes = yaml.safe_load(texto) or {}
    lido = yaml.safe_load(novo)
    for chave, valor in valores.items():
        if lido.get(chave) != valor or not isinstance(lido.get(chave), str):
            sair(1, "Os valores não sobreviveriam ao YAML (caractere especial?). Nada foi gravado.")
    for chave, valor in antes.items():
        if chave not in valores and lido.get(chave) != valor:
            sair(1, "A troca alteraria outra chave do arquivo. Nada foi gravado.")
    with io.open(ARQ, "w", encoding="utf-8", newline="") as f:
        f.write(novo)
    print("Gravado: " + ", ".join(valores) + ". Os valores não foram impressos.")
    print("Próximo passo: rodar o diagnóstico (diagnostico_mapa_aspirador.py).")
    return 0


sys.exit(main())
