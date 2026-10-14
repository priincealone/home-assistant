# Diagnóstico do mapa do aspirador (K-18): separa "o token está errado" de "o login da conta Xiaomi falhou".
# QUEM RODA: o André (este script abre o secrets.yaml). NENHUM valor é impresso: nem IP, nem token, nem usuário, nem senha, nem URL de 2FA.
#
#   docker exec -i homeassistant python - < scripts/manutencao/diagnostico_mapa_aspirador.py
#
# Passos (cada um diz OK ou FALHOU e o que fazer):
#   1. as quatro chaves existem e o token é um texto de 32 hexadecimais;
#   2. o robô responde ao "hello" público do miio (rede);
#   3. o robô aceita o TOKEN (pedido local miIO.info, só na sua rede);
#   4. OPCIONAL, só com DIAG_NUVEM=1: um (1) login na nuvem Xiaomi, igual ao do complemento. Cada tentativa errada conta contra o limite
#      da conta; rode no máximo uma vez e só se o passo 3 passou.
#
# Variáveis: ATIVA_CHAVES (mesmo formato do ativa_mapa_aspirador.py), DIAG_NUVEM=1, CONFIG_DIR (padrão /config).
import io
import os
import re
import socket
import struct
import sys

import yaml

CONFIG = os.environ.get("CONFIG_DIR", "/config")
PADRAO = "ip=mapa_aspirador_ip,token=mapa_aspirador_token,usuario=mapa_xiaomi_usuario,senha=mapa_xiaomi_senha"
RE_TOKEN = re.compile(r"^[0-9a-fA-F]{32}$")
RE_IP = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
resultado = {"falhas": 0}


def passo(n, ok, msg):
    print(f"[{n}] {'OK    ' if ok else 'FALHOU'} {msg}")
    if not ok:
        resultado["falhas"] += 1
    return ok


def chaves():
    mapa = {}
    for par in os.environ.get("ATIVA_CHAVES", PADRAO).split(","):
        k, _, v = par.partition("=")
        mapa[k.strip()] = v.strip()
    return mapa


def main():
    ch = chaves()
    caminho = os.path.join(CONFIG, "secrets.yaml")
    if not os.path.isfile(caminho):
        print(f"Não achei {caminho}.")
        return 1
    with io.open(caminho, encoding="utf-8") as f:
        dados = yaml.safe_load(f) or {}

    # 1) chaves
    faltam = [ch[k] for k in ("ip", "token", "usuario", "senha") if dados.get(ch[k]) in (None, "")]
    token = dados.get(ch["token"])
    ip = dados.get(ch["ip"])
    ok1 = not faltam and isinstance(token, str) and bool(RE_TOKEN.match(token)) and isinstance(ip, str) and bool(RE_IP.match(ip))
    if faltam:
        passo(1, False, "faltam ou estão vazias no secrets.yaml: " + ", ".join(faltam))
    elif not isinstance(token, str):
        passo(1, False, "o token virou NÚMERO no YAML: coloque-o entre aspas")
    elif not RE_TOKEN.match(token):
        passo(1, False, f"o token deve ter 32 caracteres hexadecimais (tem {len(token)})")
    elif not isinstance(ip, str) or not RE_IP.match(ip):
        passo(1, False, "o IP não tem o formato 0.0.0.0")
    else:
        passo(1, True, "chaves presentes; token com 32 hexadecimais; IP no formato certo")
    if not ok1:
        return 1

    # 2) hello miio (rede)
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(3)
    did = None
    try:
        s.sendto(bytes.fromhex("21310020") + b"\xff" * 28, (ip, 54321))
        resp, _ = s.recvfrom(1024)
        did = struct.unpack(">I", resp[8:12])[0]
        passo(2, True, "o robô respondeu pela rede (UDP 54321)")
    except socket.timeout:
        passo(2, False, "o robô não respondeu em 3 s: IP mudou (reserve no roteador), robô sem wifi, ou bloqueio de UDP 54321")
        return 1
    finally:
        s.close()

    # 3) token (local)
    try:
        from miio import Device
        info = Device(ip, token).info()
        passo(3, True, f"o robô aceitou o token (modelo {getattr(info, 'model', '?')}, firmware {getattr(info, 'firmware_version', '?')})")
    except Exception as e:
        passo(3, False, f"o robô NÃO aceitou o token ({type(e).__name__}): token errado ou de outro aparelho. "
                        "Refaça a extração do token (o Xiaomi Cloud Tokens Extractor, a mesma região do robô) e regrave com o grava_segredos_mapa.py.")
        return 1
    _ = did

    # 4) nuvem (opcional)
    if os.environ.get("DIAG_NUVEM") != "1":
        print("[4] PULADO login na nuvem (de propósito: cada tentativa errada conta contra o limite da conta). "
              "Para testar uma vez: docker exec -i -e DIAG_NUVEM=1 homeassistant python - < …")
        return 0 if resultado["falhas"] == 0 else 1
    try:
        sys.path.insert(0, CONFIG)
        from custom_components.xiaomi_cloud_map_extractor.common.xiaomi_cloud_connector import XiaomiCloudConnector
        c = XiaomiCloudConnector(str(dados[ch["usuario"]]), str(dados[ch["senha"]]))
        logou = bool(c.login())
        pendente_2fa = bool(getattr(c, "two_factor_auth_url", None))
        if logou:
            passo(4, True, "o login na nuvem Xiaomi funcionou")
        elif pendente_2fa:
            passo(4, False, "a Xiaomi pediu CONFIRMAÇÃO EM DUAS ETAPAS (o URL não é mostrado aqui): abra o aviso no HA ou o e-mail da Xiaomi, "
                            "confirme a partir da MESMA rede do HA, e espere 1 hora antes de tentar de novo")
        else:
            passo(4, False, "a Xiaomi recusou o login sem pedir 2FA: usuário ou senha errados, conta de outra região (troque o ATIVA_PAIS e rode o "
                            "ativa_mapa_aspirador.py de novo), ou captcha exigido (entre uma vez no app da Xiaomi e tente mais tarde)")
    except Exception as e:
        passo(4, False, f"não consegui testar o login ({type(e).__name__})")
    return 0 if resultado["falhas"] == 0 else 1


sys.exit(main())
