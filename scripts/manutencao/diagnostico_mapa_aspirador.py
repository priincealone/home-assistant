# Diagnóstico do mapa do aspirador (K-18): separa "o token está errado" de "o login da conta Xiaomi falhou".
# QUEM RODA: o André (este script abre o secrets.yaml). NENHUM valor é impresso: nem IP, nem token, nem usuário, nem senha, nem URL de 2FA.
#
#   No PowerShell (o operador < NÃO existe lá: copie o arquivo para dentro do container e rode pelo caminho):
#     docker cp scripts/manutencao/diagnostico_mapa_aspirador.py homeassistant:/tmp/d.py
#     docker exec homeassistant python /tmp/d.py
#     docker exec homeassistant rm /tmp/d.py
#   (no Git Bash/WSL também serve:  docker exec -i homeassistant python - < scripts/manutencao/diagnostico_mapa_aspirador.py)
#
# Passos (cada um diz OK ou FALHOU e o que fazer):
#   1. as quatro chaves existem e o token é um texto de 32 hexadecimais;
#   2. o robô responde ao "hello" público do miio (rede);
#   3. o robô aceita o TOKEN (pedido local miIO.info, só na sua rede);
#   4. OPCIONAL, só com DIAG_NUVEM=1: um (1) login na nuvem Xiaomi, igual ao do complemento. Cada tentativa errada conta contra o limite
#      da conta; rode no máximo uma vez e só se o passo 3 passou.
#
# DIAG_SO_NUVEM=1 pula os passos 2 e 3 (rede e token) e vai direto ao login na nuvem, que agora mostra o CÓDIGO e a DESCRIÇÃO que a Xiaomi
# devolve (código numérico, texto de motivo e os NOMES dos campos da resposta; nunca senha, token, URL ou valores de sessão).
# Variáveis (vão DENTRO do docker exec, antes do nome do container): ATIVA_CHAVES (mesmo formato do ativa_mapa_aspirador.py),
# DIAG_NUVEM=1, CONFIG_DIR (padrão /config). Exemplo do login na nuvem, UMA vez:
#     docker exec -e DIAG_NUVEM=1 homeassistant python /tmp/d.py
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


def nuvem(dados, ch):
    """Um login na nuvem Xiaomi (passos 1 e 2 do complemento) mostrando só o diagnóstico seguro da resposta."""
    try:
        sys.path.insert(0, CONFIG)
        from custom_components.xiaomi_cloud_map_extractor.common.xiaomi_cloud_connector import XiaomiCloudConnector
    except Exception as e:
        passo(4, False, f"não consegui carregar o conector do complemento ({type(e).__name__})")
        return 1
    c = XiaomiCloudConnector(str(dados[ch['usuario']]), str(dados[ch['senha']]))
    # mesma preparação do login() do complemento
    c._session.cookies.set('sdkVersion', 'accountsdk-18.8.15', domain='mi.com')
    c._session.cookies.set('sdkVersion', 'accountsdk-18.8.15', domain='xiaomi.com')
    c._session.cookies.set('deviceId', c._device_id, domain='mi.com')
    c._session.cookies.set('deviceId', c._device_id, domain='xiaomi.com')
    capturada = {}
    original = c._session.post

    def captura(*a, **k):
        r = original(*a, **k)
        try:
            capturada['status'] = r.status_code
            capturada['json'] = c.to_json(r.text)
        except Exception:
            capturada['json'] = None
        return r

    c._session.post = captura
    if not c.login_step_1():
        passo(4, False, "a Xiaomi nem entregou a página de login (passo 1): sem internet no container, bloqueio de DNS/rede ou a conta/IP em quarentena. Tente de outra rede mais tarde.")
        return 1
    ok2 = c.login_step_2()
    resp = capturada.get('json') or {}
    # Só campos seguros: código, texto do motivo (sem URLs) e se existem os campos que indicam captcha, 2FA ou sucesso.
    codigo = resp.get('code')
    motivo = re.sub(r'https?://\S+', '<url>', str(resp.get('desc', '')))[:160]
    campos = sorted(k for k in resp.keys() if k not in ('ssecurity', 'passToken', 'location', 'nonce', 'userId', 'cUserId', 'psecurity'))
    print(f"    resposta da Xiaomi: status HTTP {capturada.get('status')}, code={codigo}, desc='{motivo}'")
    print('    campos da resposta (só os nomes):', ', '.join(campos))
    print('    pede captcha:', 'captchaUrl' in resp, '| pede confirmação (2FA):', 'notificationUrl' in resp, '| devolveu credencial de sessão:', 'ssecurity' in resp)
    if ok2:
        passo(4, True, "o login na nuvem Xiaomi funcionou")
    elif ok2 is None:
        passo(4, False, "a Xiaomi pediu CONFIRMAÇÃO EM DUAS ETAPAS (a URL não é mostrada aqui): veja o atributo two_factor_auth_url da câmera no HA, abra-a na MESMA rede e espere 1 hora antes de tentar de novo")
    else:
        passo(4, False, "a Xiaomi recusou o login; o code e o desc acima dizem o motivo (70016 costuma ser usuário ou senha errados; um captchaUrl pede captcha)")
    return 0 if resultado['falhas'] == 0 else 1


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

    if os.environ.get("DIAG_SO_NUVEM") == "1":
        return nuvem(dados, ch)

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
              "Para testar uma vez: docker exec -e DIAG_NUVEM=1 homeassistant python /tmp/d.py")
        return 0 if resultado["falhas"] == 0 else 1
    return nuvem(dados, ch)


sys.exit(main())
