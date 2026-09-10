# -*- coding: utf-8 -*-
r"""Gera o modelo 3D da casa em GLB, com objetos nomeados, a partir do IFC.

Por que gerar em vez de converter: o `floor3d-card` liga entidade a **objeto
nomeado** dentro do modelo (`object_id`). O IFC do magicplan nomeia tudo de
"Wall"/"Door"/"Window" e nao tem `IFCSPACE`; o USDZ e um bloco anonimo. Nenhum
dos dois serve. Construindo a geometria aqui, os nomes sao decididos por nos --
e o modelo fica **regeneravel**: mudou a planta, roda de novo.

Nao depende de Blender nem de biblioteca 3D. GLB e um cabecalho JSON mais um
buffer binario; ambos escritos com a biblioteca padrao.

Objetos produzidos:

    piso_<comodo>    um por ambiente, e o que muda de cor quando a luz acende
    paredes          malha unica, so cenario
    luz_<entidade>   um por ponto de luz, no teto do respectivo comodo

Sistema de coordenadas: glTF e Y para cima. O plano da planta vira XZ, com a
origem no canto inferior-esquerdo, em metros.
"""
import io
import json
import math
import re
import struct
import unicodedata

IFC = r'C:\Users\adoli\Downloads\Meu novo projeto.ifc'
AMBIENTES = r'C:\HomeAssistant\referencias\planta_ambientes.json'
SAIDA = r'C:\HomeAssistant\config\www\casa3d.glb'

ALTURA_PAREDE = 2.70
ESPESSURA_PISO = 0.02
ALTURA_LUZ = 2.45


def slug(txt):
    t = unicodedata.normalize('NFKD', txt).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '_', t.lower()).strip('_')


# --------------------------------------------------------------------------
# 1. geometria das paredes, vinda do IFC
# --------------------------------------------------------------------------
def ler_paredes():
    txt = io.open(IFC, encoding='utf-8', errors='replace').read()
    ent = {}
    for m in re.finditer(r'#(\d+)= *([A-Z0-9]+)\(([^;]*)\);', txt):
        ent[int(m.group(1))] = (m.group(2), m.group(3))
    pontos = {i: [float(x) for x in re.findall(r'-?\d+\.?\d*(?:E-?\d+)?', a)]
              for i, (t, a) in ent.items() if t == 'IFCCARTESIANPOINT'}

    def alcanca(ini, alvo, prof=0, visto=None):
        if visto is None:
            visto = set()
        if ini in visto or prof > 8 or ini not in ent:
            return []
        visto.add(ini)
        t, a = ent[ini]
        if t == alvo:
            return [ini]
        out = []
        for r in (int(x) for x in re.findall(r'#(\d+)', a)):
            out += alcanca(r, alvo, prof + 1, visto)
        return out

    poligonos = []
    for w in [i for i, (t, _) in ent.items() if t == 'IFCWALL']:
        for pl in alcanca(w, 'IFCPOLYLINE'):
            ids = [int(x) for x in re.findall(r'#(\d+)', ent[pl][1])]
            pts = [pontos[j] for j in ids if j in pontos and len(pontos[j]) >= 2]
            if len(pts) >= 3:
                poligonos.append([(p[0], p[1]) for p in pts])
    return poligonos


# --------------------------------------------------------------------------
# 2. montagem das malhas
# --------------------------------------------------------------------------
class Malha(object):
    """Acumula vertices e triangulos de um objeto."""

    def __init__(self, nome):
        self.nome = nome
        self.v = []
        self.f = []

    def add_v(self, x, y, z):
        self.v.append((x, y, z))
        return len(self.v) - 1

    def caixa(self, x0, z0, x1, z1, y0, y1):
        a = [self.add_v(x, y, z) for y in (y0, y1)
             for (x, z) in ((x0, z0), (x1, z0), (x1, z1), (x0, z1))]
        b, t = a[:4], a[4:]
        for i in range(4):
            j = (i + 1) % 4
            self.f += [(b[i], b[j], t[j]), (b[i], t[j], t[i])]
        self.f += [(t[0], t[1], t[2]), (t[0], t[2], t[3])]
        self.f += [(b[2], b[1], b[0]), (b[3], b[2], b[0])]

    def prisma(self, poligono, y0, y1):
        """Extruda um poligono XZ entre duas alturas."""
        n = len(poligono)
        base = [self.add_v(x, y0, z) for (x, z) in poligono]
        topo = [self.add_v(x, y1, z) for (x, z) in poligono]
        for i in range(n):
            j = (i + 1) % n
            self.f += [(base[i], base[j], topo[j]), (base[i], topo[j], topo[i])]
        for i in range(1, n - 1):
            self.f += [(topo[0], topo[i], topo[i + 1]),
                       (base[0], base[i + 1], base[i])]


def esfera(malha, cx, cy, cz, r, seg=10):
    inicio = len(malha.v)
    for i in range(seg + 1):
        lat = math.pi * i / seg
        for j in range(seg):
            lon = 2 * math.pi * j / seg
            malha.add_v(cx + r * math.sin(lat) * math.cos(lon),
                        cy + r * math.cos(lat),
                        cz + r * math.sin(lat) * math.sin(lon))
    for i in range(seg):
        for j in range(seg):
            a = inicio + i * seg + j
            b = inicio + i * seg + (j + 1) % seg
            c = inicio + (i + 1) * seg + j
            d = inicio + (i + 1) * seg + (j + 1) % seg
            malha.f += [(a, c, d), (a, d, b)]


# --------------------------------------------------------------------------
# 3. escrita do GLB
# --------------------------------------------------------------------------
def escrever_glb(malhas, caminho):
    buf = bytearray()
    acessores, views, meshes, nodes, materiais = [], [], [], [], []

    for m in malhas:
        if not m.f:
            continue
        # posicoes
        off_v = len(buf)
        for (x, y, z) in m.v:
            buf += struct.pack('<fff', x, y, z)
        len_v = len(buf) - off_v
        while len(buf) % 4:
            buf += b'\0'
        # indices
        off_i = len(buf)
        for tri in m.f:
            buf += struct.pack('<III', *tri)
        len_i = len(buf) - off_i
        while len(buf) % 4:
            buf += b'\0'

        xs = [p[0] for p in m.v]; ys = [p[1] for p in m.v]; zs = [p[2] for p in m.v]
        views.append({'buffer': 0, 'byteOffset': off_v, 'byteLength': len_v, 'target': 34962})
        views.append({'buffer': 0, 'byteOffset': off_i, 'byteLength': len_i, 'target': 34963})
        ia = len(acessores)
        acessores.append({'bufferView': len(views) - 2, 'componentType': 5126,
                          'count': len(m.v), 'type': 'VEC3',
                          'min': [min(xs), min(ys), min(zs)],
                          'max': [max(xs), max(ys), max(zs)]})
        acessores.append({'bufferView': len(views) - 1, 'componentType': 5125,
                          'count': len(m.f) * 3, 'type': 'SCALAR'})
        # ⚠️ um material POR objeto. Com material compartilhado, o floor3d-card
        # -- que troca a cor mexendo no material -- ou repinta a casa inteira
        # ou nao repinta nada. Cada piso precisa do seu.
        materiais.append({
            'name': 'mat_%s' % m.nome,
            'pbrMetallicRoughness': {
                'baseColorFactor': [0.82, 0.82, 0.85, 1.0],
                'metallicFactor': 0.0, 'roughnessFactor': 0.85}})
        meshes.append({'name': m.nome,
                       'primitives': [{'attributes': {'POSITION': ia},
                                       'indices': ia + 1,
                                       'material': len(materiais) - 1}]})
        nodes.append({'name': m.nome, 'mesh': len(meshes) - 1})

    gltf = {
        'asset': {'version': '2.0', 'generator': 'planta3d.py (projeto Casa)'},
        'scene': 0,
        'scenes': [{'nodes': list(range(len(nodes)))}],
        'nodes': nodes,
        'meshes': meshes,
        'materials': materiais,
        'accessors': acessores,
        'bufferViews': views,
        'buffers': [{'byteLength': len(buf)}],
    }
    js = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(js) % 4:
        js += b' '
    while len(buf) % 4:
        buf += b'\0'

    total = 12 + 8 + len(js) + 8 + len(buf)
    with io.open(caminho, 'wb') as fh:
        fh.write(struct.pack('<III', 0x46546C67, 2, total))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A)); fh.write(js)
        fh.write(struct.pack('<II', len(buf), 0x004E4942)); fh.write(bytes(buf))
    return total


# --------------------------------------------------------------------------
def principal():
    ambientes = json.load(io.open(AMBIENTES, encoding='utf-8'))
    poligonos = ler_paredes()

    # tudo em metros, origem no canto inferior-esquerdo
    xs = [p[0] for pol in poligonos for p in pol]
    ys = [p[1] for pol in poligonos for p in pol]
    ox, oy = min(xs), min(ys)
    esc = 0.001  # o IFC do magicplan vem em milimetros

    malhas = []

    paredes = Malha('paredes')
    for pol in poligonos:
        paredes.prisma([((x - ox) * esc, (y - oy) * esc) for (x, y) in pol],
                       0.0, ALTURA_PAREDE)
    malhas.append(paredes)

    # um piso por ambiente (ambientes com o mesmo nome viram partes numeradas)
    vistos = {}
    for a in ambientes:
        s = slug(a['nome'])
        vistos[s] = vistos.get(s, 0) + 1
        nome = 'piso_%s' % s if vistos[s] == 1 else 'piso_%s_%d' % (s, vistos[s])
        m = Malha(nome)
        m.caixa(a['x0_m'], a['z0_m'], a['x1_m'], a['z1_m'], 0.0, ESPESSURA_PISO)
        malhas.append(m)
        a['objeto'] = nome

    # uma luminaria por entidade, no centro do ambiente
    for a in ambientes:
        cx = (a['x0_m'] + a['x1_m']) / 2.0
        cz = (a['z0_m'] + a['z1_m']) / 2.0
        for k, ent in enumerate(a['luzes']):
            nome = 'luz_%s' % slug(ent.split('.')[1])
            if any(mm.nome == nome for mm in malhas):
                continue
            m = Malha(nome)
            desloc = (k - (len(a['luzes']) - 1) / 2.0) * 0.5
            esfera(m, cx + desloc, ALTURA_LUZ, cz, 0.12)
            malhas.append(m)
            a.setdefault('objetos_luz', []).append({'objeto': nome, 'entidade': ent})

    tam = escrever_glb(malhas, SAIDA)
    io.open(AMBIENTES, 'w', encoding='utf-8').write(
        json.dumps(ambientes, ensure_ascii=False, indent=2))

    print('modelo gravado: %s (%.0f KB)' % (SAIDA, tam / 1024.0))
    print('%d objetos nomeados:' % len(malhas))
    for m in malhas:
        print('   %-34s %5d vertices  %5d triangulos' % (m.nome, len(m.v), len(m.f)))


if __name__ == '__main__':
    principal()
