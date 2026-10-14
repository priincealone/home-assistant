# Grava no config/secrets.yaml as 4 chaves do mapa do aspirador (K-18), com VOCÊ digitando os valores.
# Nada passa por conversa, log, commit ou pelo Claude: os valores são lidos do teclado, sem eco (token e senha),
# validados e acrescentados ao final do arquivo, e NUNCA são impressos.
#
# Rodar (precisa de terminal interativo, por isso o -it; a primeira linha copia o script para dentro do container):
#
#   docker cp scripts/manutencao/grava_segredos_mapa.py homeassistant:/tmp/grava_segredos_mapa.py
#   docker exec -it homeassistant python /tmp/grava_segredos_mapa.py
#   docker exec homeassistant rm /tmp/grava_segredos_mapa.py
#
# Depois rode o ativa_mapa_aspirador.py (primeiro com ATIVA_SIMULAR=1). As chaves criadas são:
#   mapa_aspirador_ip, mapa_aspirador_token, mapa_xiaomi_usuario, mapa_xiaomi_senha
#
# Não sobrescreve: se alguma chave já existir, para sem alterar o arquivo. Variável opcional: CONFIG_DIR (padrão /config).
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
RE_TOKEN = re.compile(r"^[0-9a-fA-F]{32}$")


def sair(codigo, msg):
    print(msg)
    sys.exit(codigo)


def pedir(rotulo, secreto=False):
    leitor = getpass.getpass if secreto else input
    return leitor(f"{rotulo}: ").strip()


def main():
    if not os.path.isfile(ARQ):
        sair(1, f"Não achei {ARQ}.")
    with io.open(ARQ, encoding="utf-8", newline="") as f:
        texto = f.read()
    existentes = set((yaml.safe_load(texto) or {}).keys())
    ja = [k for k in CHAVES.values() if k in existentes]
    if ja:
        sair(1, "Estas chaves já existem no secrets.yaml e NÃO foram alteradas: " + ", ".join(ja) +
                ". Apague-as à mão se quiser regravar, ou use outros nomes no ativa_mapa_aspirador.py (ATIVA_CHAVES).")

    print("Digite os valores. Token e senha não aparecem na tela. Nada é impresso depois.")
    ip = pedir("IP do robô (ex.: 192.168.0.10)")
    m = RE_IP.match(ip)
    if not m or any(int(x) > 255 for x in m.groups()):
        sair(1, "IP inválido. Nada foi gravado.")
    token = pedir("Token do robô (32 caracteres hexadecimais)", secreto=True)
    if not RE_TOKEN.match(token):
        sair(1, "O token deve ter exatamente 32 caracteres hexadecimais. Nada foi gravado.")
    usuario = pedir("Usuário da conta Xiaomi (e-mail ou id numérico)")
    if not usuario:
        sair(1, "Usuário vazio. Nada foi gravado.")
    senha = pedir("Senha da conta Xiaomi", secreto=True)
    if not senha:
        sair(1, "Senha vazia. Nada foi gravado.")

    valores = {CHAVES["ip"]: ip, CHAVES["token"]: token, CHAVES["usuario"]: usuario, CHAVES["senha"]: senha}
    # json.dumps gera uma string entre aspas duplas, que o YAML aceita com segurança (acentos, :, #, aspas, números).
    linhas = ["", "# Mapa do aspirador (K-18). Gravado por scripts/manutencao/grava_segredos_mapa.py"]
    linhas += [f"{chave}: {json.dumps(valor, ensure_ascii=False)}" for chave, valor in valores.items()]
    novo = texto.rstrip("\n") + "\n" + "\n".join(linhas) + "\n"

    # confere que o arquivo continua válido e que cada valor volta IGUAL, antes de gravar
    lido = yaml.safe_load(novo)
    for chave, valor in valores.items():
        if lido.get(chave) != valor or not isinstance(lido.get(chave), str):
            sair(1, "Os valores não sobreviveriam ao YAML (caractere especial?). Nada foi gravado.")
    with io.open(ARQ, "w", encoding="utf-8", newline="") as f:
        f.write(novo)
    print("Gravado: " + ", ".join(CHAVES.values()) + ". Os valores não foram impressos.")
    print("Próximo passo: ATIVA_SIMULAR=1 ... ativa_mapa_aspirador.py, depois sem a simulação.")
    return 0


sys.exit(main())
