# -*- coding: utf-8 -*-
r"""Utilitario do projeto Home Assistant.

Editar a dashboard significa editar o arquivo de storage do Lovelace
(`config/.storage/lovelace.minha_casa`, um JSON) diretamente -- o editor RAW
do navegador corrompe blocos grandes. Este modulo padroniza o ciclo:

    backup -> carregar JSON -> alterar -> salvar -> docker restart

Uso como biblioteca (padrao dos scripts em scripts/lovelace/):

    import sys; sys.path.insert(0, r'C:\HomeAssistant\scripts')
    from ha import load, save, backup, restart

    cfg = load()
    cfg['data']['config']['views'][0]['title'] = 'Geral'
    save(cfg, tag='titulo_geral')   # ja faz backup antes de gravar
    restart()

Uso como CLI:

    python scripts/ha.py views              # lista as paginas (indice + titulo)
    python scripts/ha.py templates          # lista os button_card_templates
    python scripts/ha.py get views.0.cards  # imprime um trecho do JSON
    python scripts/ha.py backup ajuste7     # so o backup
    python scripts/ha.py restart            # so o restart do container
"""
import io
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOVELACE = os.path.join(ROOT, 'config', '.storage', 'lovelace.minha_casa')
RESOURCES = os.path.join(ROOT, 'config', '.storage', 'lovelace_resources')
BACKUPS = os.path.join(ROOT, 'backups')
CONTAINER = 'homeassistant'


def load(path=LOVELACE):
    """Le o storage do Lovelace como dict."""
    with io.open(path, encoding='utf-8') as fh:
        return json.load(fh)


def backup(tag, path=LOVELACE):
    """Copia o arquivo atual para backups/<nome>.bak_<tag>. Retorna o destino."""
    if not os.path.isdir(BACKUPS):
        os.makedirs(BACKUPS)
    dest = os.path.join(BACKUPS, '%s.bak_%s' % (os.path.basename(path), tag))
    shutil.copyfile(path, dest)
    return dest


def save(cfg, tag, path=LOVELACE):
    """Faz backup e grava o dict de volta no storage (UTF-8, sem ASCII escapes)."""
    dest = backup(tag, path)
    with io.open(path, 'w', encoding='utf-8') as fh:
        fh.write(json.dumps(cfg, ensure_ascii=False, indent=2))
    print('backup: %s' % dest)
    print('gravado: %s' % path)
    return dest


def restart():
    """`docker restart homeassistant` -- obrigatorio depois de editar o storage."""
    print('docker restart %s ...' % CONTAINER)
    return subprocess.call(['docker', 'restart', CONTAINER])


def views(cfg=None):
    """Lista (indice, titulo, path, nº de cards) de cada pagina."""
    cfg = cfg or load()
    out = []
    for i, v in enumerate(cfg['data']['config'].get('views', [])):
        out.append((i, v.get('title', ''), v.get('path', ''), len(v.get('cards', []))))
    return out


def templates(cfg=None):
    """Nomes dos button_card_templates definidos no proprio storage."""
    cfg = cfg or load()
    return sorted(cfg['data']['config'].get('button_card_templates', {}).keys())


def dig(cfg, dotted):
    """Navega 'views.0.cards.1' dentro de cfg['data']['config']."""
    node = cfg['data']['config']
    for part in dotted.split('.'):
        if part == '':
            continue
        node = node[int(part)] if part.isdigit() else node[part]
    return node


def _main(argv):
    cmd = argv[0] if argv else 'views'
    if cmd == 'views':
        for i, title, path, n in views():
            print('%2d  %-20s %-20s %d cards' % (i, title, path, n))
    elif cmd == 'templates':
        for name in templates():
            print(name)
    elif cmd == 'get':
        print(json.dumps(dig(load(), argv[1]), ensure_ascii=False, indent=2))
    elif cmd == 'backup':
        print(backup(argv[1] if len(argv) > 1 else 'manual'))
    elif cmd == 'restart':
        return restart()
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(_main(sys.argv[1:]))
