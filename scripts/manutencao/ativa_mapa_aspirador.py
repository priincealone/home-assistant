# Ativa o mapa do aspirador no HA (K-18, specs/features/mapa-aspirador.md): acrescenta o bloco `camera:` do
# Xiaomi Cloud Map Extractor ao configuration.yaml, com `!secret`, e valida com check_config.
#
# QUEM RODA: o André, DEPOIS de instalar o complemento pelo HACS e de gravar IP, token e conta Xiaomi no
# config/secrets.yaml. O script só confere se as CHAVES existem; nenhum valor é impresso, copiado ou enviado.
#
#   docker exec -i homeassistant python - < scripts/manutencao/ativa_mapa_aspirador.py
#
# Variáveis (docker exec -e NOME=valor ...), todas opcionais:
#   ATIVA_CHAVES   nomes das chaves no secrets.yaml, no formato  ip=a,token=b,usuario=c,senha=d
#                  (padrão: ip=mapa_aspirador_ip,token=mapa_aspirador_token,usuario=mapa_xiaomi_usuario,senha=mapa_xiaomi_senha)
#   ATIVA_PAIS     país da conta Xiaomi: cn, de, us, ru, tw, sg, in, i2   (padrão: us, como as entidades dreame_us_…)
#   ATIVA_SIMULAR  1 = só confere, não escreve nada
#   ATIVA_SEM_LER_SEGREDOS  1 = NÃO abre o secrets.yaml: a validação das chaves fica com o próprio HA (o check_config lê o secrets por conta
#                  própria e reprova se faltar chave ou se o token não for um texto de 32 caracteres). Usado quando quem roda NÃO é o dono
#                  do arquivo (o Claude). A saída do check_config passa por uma máscara (32 hexadecimais e URLs viram ***).
#   CONFIG_DIR     pasta de configuração (padrão /config; serve para testar numa cópia)
#
# Saída: 0 pronto (ou simulação ok), 1 falta algo (mensagem diz o quê), 2 o check_config reprovou e o
# configuration.yaml foi RESTAURADO exatamente como estava. O script NÃO reinicia o HA.
import io
import os
import re
import subprocess
import sys

import yaml

CONFIG = os.environ.get("CONFIG_DIR", "/config")
SIMULAR = os.environ.get("ATIVA_SIMULAR") == "1"
SEM_LER = os.environ.get("ATIVA_SEM_LER_SEGREDOS") == "1"
PAIS = os.environ.get("ATIVA_PAIS", "us")
PAISES = {"cn", "de", "us", "ru", "tw", "sg", "in", "i2"}
PADRAO = "ip=mapa_aspirador_ip,token=mapa_aspirador_token,usuario=mapa_xiaomi_usuario,senha=mapa_xiaomi_senha"
PLATAFORMA = "xiaomi_cloud_map_extractor"


def chaves():
    brutas = os.environ.get("ATIVA_CHAVES", PADRAO)
    mapa = {}
    for par in brutas.split(","):
        k, _, v = par.partition("=")
        mapa[k.strip()] = v.strip()
    faltam = [k for k in ("ip", "token", "usuario", "senha") if not mapa.get(k)]
    if faltam:
        sair(1, f"ATIVA_CHAVES sem: {', '.join(faltam)} (formato ip=a,token=b,usuario=c,senha=d)")
    return mapa


def mascarar(texto):
    """Tira da saída do check_config qualquer 32 hexadecimais e URL (podem ser token ou convite de 2FA)."""
    texto = re.sub(r"(?<![0-9a-fA-F])[0-9a-fA-F]{32}(?![0-9a-fA-F])", "***", texto)
    return re.sub(r"https?://\S+", "***", texto)


def sair(codigo, msg):
    print(msg)
    sys.exit(codigo)


def bloco(ch):
    # scan_interval 60: o complemento refaz o login a cada falha de mapa e o padrão (5 s) pode travar a conta Xiaomi.
    # store_map_*: false, para não deixar planta da casa em /tmp. attributes: só o que o painel usa.
    return (
        "\n# Mapa do aspirador (Xiaomi Cloud Map Extractor): K-18, specs/features/mapa-aspirador.md\n"
        "camera:\n"
        f"  - platform: {PLATAFORMA}\n"
        "    name: Mapa do aspirador\n"
        f"    host: !secret {ch['ip']}\n"
        f"    token: !secret {ch['token']}\n"
        f"    username: !secret {ch['usuario']}\n"
        f"    password: !secret {ch['senha']}\n"
        f"    country: {PAIS}\n"
        '    draw: ["all"]\n'
        "    attributes: [calibration_points, rooms, room_numbers, vacuum_room_name]\n"
        "    scan_interval: 60\n"
        "    store_map_raw: false\n"
        "    store_map_image: false\n"
    )


def main():
    if PAIS not in PAISES:
        sair(1, f"ATIVA_PAIS '{PAIS}' inválido; use um de {sorted(PAISES)}")
    ch = chaves()

    # 1) complemento instalado?
    if not os.path.isdir(os.path.join(CONFIG, "custom_components", PLATAFORMA)):
        sair(1, f"Falta instalar o complemento: não existe {CONFIG}/custom_components/{PLATAFORMA}. "
                "No HACS: Integrações, buscar 'Xiaomi Cloud Map Extractor', baixar, reiniciar o HA.")

    if not SEM_LER:
        # 2) as chaves existem no secrets.yaml? (só os NOMES são lidos para comparar; valores nunca saem daqui)
        caminho_sec = os.path.join(CONFIG, "secrets.yaml")
        if not os.path.isfile(caminho_sec):
            sair(1, f"Não achei {caminho_sec}.")
        with io.open(caminho_sec, encoding="utf-8") as f:
            presentes = set((yaml.safe_load(f) or {}).keys())
        ausentes = [nome for nome in ch.values() if nome not in presentes]
        if ausentes:
            sair(1, "Faltam no secrets.yaml (só você abre esse arquivo): " + ", ".join(sorted(ausentes)) +
                    ". Se já existirem com outros nomes, rode de novo com ATIVA_CHAVES=ip=…,token=…,usuario=…,senha=…")
        # valores vazios também reprovam, sem imprimir nada deles
        with io.open(caminho_sec, encoding="utf-8") as f:
            dados = yaml.safe_load(f) or {}
        vazios = [nome for nome in ch.values() if dados.get(nome) in (None, "")]
        if vazios:
            sair(1, "Chaves sem valor no secrets.yaml: " + ", ".join(sorted(vazios)))
        token = dados.get(ch["token"])
        if not isinstance(token, str):
            # token só de dígitos (ou do tipo "1e5…") vira número no YAML e o complemento o rejeita: precisa de aspas
            sair(1, f"A chave '{ch['token']}' virou número no YAML. Coloque o token ENTRE ASPAS no secrets.yaml.")
        if len(token) != 32:
            sair(1, f"A chave '{ch['token']}' deve ter 32 caracteres (o complemento exige); tem {len(token)}. Confira o token do robô.")


    else:
        print("(modo ATIVA_SEM_LER_SEGREDOS: o secrets.yaml não foi aberto; o check_config confere as chaves)")

    # 3) configuration.yaml: sem duplicar
    caminho_cfg = os.path.join(CONFIG, "configuration.yaml")
    with io.open(caminho_cfg, encoding="utf-8", newline="") as f:
        original = f.read()
    if PLATAFORMA in original:
        sair(1, "O configuration.yaml já tem o bloco do Map Extractor; nada a fazer.")
    if any(linha.startswith("camera:") for linha in original.splitlines()):
        sair(1, "Já existe uma chave `camera:` de nível raiz no configuration.yaml; acrescente a plataforma a ela à mão "
                "(duas chaves `camera:` não valem em YAML).")

    novo = original.rstrip("\n") + "\n" + bloco(ch)
    if SIMULAR:
        print("SIMULAÇÃO: tudo certo para ativar (complemento instalado, chaves e token conferidos, sem `camera:` duplicada).")
        print("Bloco que seria acrescentado ao configuration.yaml:")
        print(bloco(ch))
        return 0

    # 4) escreve, valida, e restaura se reprovar
    with io.open(caminho_cfg, "w", encoding="utf-8", newline="") as f:
        f.write(novo)
    r = subprocess.run([sys.executable, "-m", "homeassistant", "--script", "check_config", "-c", CONFIG],
                       capture_output=True, text=True)
    saida_cc = (r.stdout + r.stderr)
    reprovou = r.returncode != 0 or any(m in saida_cc for m in ("Failed config", "Invalid config", "ERROR", "Error"))
    if reprovou:
        with io.open(caminho_cfg, "w", encoding="utf-8", newline="") as f:
            f.write(original)
        saida = (r.stdout + r.stderr).strip().splitlines()
        print("check_config REPROVOU; configuration.yaml restaurado como estava. Últimas linhas:")
        print(mascarar("\n".join(saida[-15:])))
        return 2
    print("check_config passou e o bloco foi acrescentado ao configuration.yaml.")
    print("Falta reiniciar o HA (docker restart homeassistant). O mapa pode levar alguns minutos para aparecer;")
    print("se a Xiaomi pedir confirmação em duas etapas, o aviso aparece no HA (não peça de novo antes de uma hora).")
    return 0


sys.exit(main())
