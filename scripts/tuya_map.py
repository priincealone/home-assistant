# -*- coding: utf-8 -*-
"""Mapeia device_id -> IP dos aparelhos Tuya da LAN.

O anuncio UDP de descoberta e cifrado com uma chave **fixa do protocolo**
(md5 de "yGAdlopoPVldABfn"), a mesma em qualquer instalacao -- nao e a
`local_key` do aparelho. Decifrar o anuncio so revela id, IP e versao.
"""
import hashlib, json, re, select, socket, struct, time
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

KEY = hashlib.md5(b'yGAdlopoPVldABfn').digest()


def ecb(data):
    d = Cipher(algorithms.AES(KEY), modes.ECB()).decryptor()
    out = d.update(data) + d.finalize()
    return out[:-out[-1]] if out and out[-1] <= 16 else out


def gcm(nonce, ct, tag, aad):
    d = Cipher(algorithms.AES(KEY), modes.GCM(nonce, tag)).decryptor()
    d.authenticate_additional_data(aad)
    return d.update(ct) + d.finalize()


def parse(pkt):
    if pkt[:4] == b'\x00\x00\x66\x99':          # protocolo 3.5
        ln = struct.unpack('>I', pkt[14:18])[0]
        return gcm(pkt[18:30], pkt[30:18 + ln - 16], pkt[18 + ln - 16:18 + ln], pkt[4:18])
    if pkt[:4] == b'\x00\x00\x55\xaa':          # 3.1 / 3.3 / 3.4
        # header(16) + retcode(4) + payload + crc(4) + sufixo(4)
        ln = struct.unpack('>I', pkt[12:16])[0]
        corpo = pkt[20:20 + ln - 12]
        if corpo[:1] == b'{':
            return corpo
        return ecb(corpo)
    raise ValueError('prefixo desconhecido')


achados, socks = {}, []
for porta in (6666, 6667):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('', porta)); s.setblocking(False); socks.append(s)

fim = time.time() + 40
while time.time() < fim:
    pronto, _, _ = select.select(socks, [], [], 1.0)
    for s in pronto:
        try:
            dados, addr = s.recvfrom(4096)
        except Exception:
            continue
        try:
            claro = parse(dados)
            m = re.search(rb'\{.*\}', claro, re.S)
            j = json.loads(m.group().decode('utf-8', 'ignore'))
        except Exception as e:
            achados.setdefault('falhou@' + addr[0], {'ip': addr[0], 'ver': str(e)[:40], 'nome': ''})
            continue
        gw = j.get('gwId') or j.get('devId')
        if gw:
            achados[gw] = {'ip': j.get('ip', addr[0]), 'ver': j.get('version'), 'nome': j.get('productKey', '')}

print('%d aparelhos:' % len(achados))
for gw, i in sorted(achados.items(), key=lambda x: x[1]['ip']):
    marca = ''
    if gw == 'eb956546b52fa8a4ddyfom': marca = '   <<< QUARTO'
    if gw == 'eb831a8f3dedb06ad1tric': marca = '   <<< SALA (ja no LocalTuya)'
    print('  %-26s ip=%-16s v=%s%s' % (gw, i['ip'], i['ver'], marca))
