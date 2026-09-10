import socket
MSG=b'SRCH * HTTP/1.1\r\ndevice-discovery-protocol-version:00030010\r\n\r\n'
s=socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(6)
try:
    s.sendto(MSG, ('192.168.31.245', 987))
    d,a=s.recvfrom(2048)
    print('resposta de %s:' % a[0])
    for l in d.decode('utf-8','ignore').splitlines():
        if l.strip(): print('   ', l.strip())
except Exception as e:
    print('sem resposta:', repr(e))
