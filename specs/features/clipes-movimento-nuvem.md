# Clipes de movimento das câmeras externas, salvos no Google Drive

## Problema

As câmeras `camera.rua_canal_2` e `camera.rua_canal_4` (DVR Intelbras MHDX
1204-C) só oferecem vídeo ao vivo no Home Assistant (ver `CASA.md` §Câmeras).
Não há registro do que aconteceu quando ninguém estava olhando, nem cópia fora
do DVR local. O André quer um clipe curto salvo na nuvem toda vez que uma das
câmeras detecta movimento — não gravação contínua, só por evento.

O DVR grava localmente e tem detecção de movimento própria, já habilitada e
funcionando por canal (confirmado em Configurações → Eventos → Detectar →
Movimento). O que falta é: (a) um sinal de que o movimento aconteceu chegando
ao HA, e (b) um clipe de vídeo de fato saindo do DVR para algum lugar que o HA
consiga subir à nuvem.

Investigado e descartado:

- **ONVIF** — indisponível nesse firmware (ver `CASA.md`, mesma seção). Sem
  ONVIF, não há assinatura de evento de movimento nativa do HA para este DVR.
- **FTP automático de clipe no alarme** — o menu de vinculação de evento do
  DVR (Eventos → Detectar → Movimento → Mais) não oferece FTP, só "Enviar
  e-mail" (com anexo de foto), "Alarme Upload" (HTTP, mas sem campo de destino
  visível — parece reservado à nuvem Intelbras/app Guardian) e outras ações
  locais (buzzer, sirene, mensagem).
- **E-mail com vídeo anexado** — o anexo do alarme por e-mail em DVRs desta
  linha é só uma foto (JPEG), não um clipe.

## Comportamento esperado

1. DVR detecta movimento no canal 2 ou 4 (já configurado, não mexer na
   sensibilidade/zona sem pedido à parte).
2. DVR manda e-mail de alarme (com foto) para uma caixa que o HA monitora via
   integração `imap` (só leitura). Conta escolhida: `an.diogo98@gmail.com`
   (SMTP configurado no próprio DVR, senha de app do Gmail — André insere
   direto nas telas do DVR e do HA, nunca na conversa).
3. Automação do HA, ao ver o e-mail chegar, identifica o canal pelo texto do
   assunto/corpo e chama `camera.record` na entidade correspondente
   (`camera.rua_canal_2` ou `camera.rua_canal_4`), gravando ~15 s de RTSP ao
   vivo (stream principal, `subtype=0`, para qualidade — diferente do
   `subtype=1` usado na visualização contínua).
4. Clipe salvo temporariamente em `config/www/clipes_movimento/` (ou
   equivalente), depois enviado ao Google Drive (conta e autenticação de
   André — arquivo de credencial colocado por ele, nunca digitado na
   conversa).
5. Confirmado o upload, o arquivo local é apagado (decisão do André: sem
   buffer local).

## Entidades e integrações envolvidas

- `camera.rua_canal_2`, `camera.rua_canal_4` (já existentes)
- Nova integração `imap` (só leitura da caixa de e-mail)
- Nova automação em `config/automations.yaml`, com a justificativa de praxe na
  `description`
- Script/serviço de upload para o Google Drive (a decidir: `rclone` local ou
  chamada direta à API com conta de serviço)

## Dono do atuador / o que acontece se o HA reiniciar no meio

Não há atuador físico envolvido — é só leitura de câmera e envio de arquivo.
Se o HA cair no meio de uma gravação, o pior caso é perder aquele clipe
específico; não há estado pendente que precise reconciliação (diferente das
automações de luz do `docs/AUTOMATION-POLICY.md`).

## Fora do escopo (por enquanto)

- Gravação contínua 24/7
- Detecção de pessoa (só o movimento genérico do DVR)
- Mostrar os clipes no `dashboard-app` (painel) — fica para quando o André
  pedir, é mudança de contrato à parte
- Ajustar sensibilidade/zona de detecção do DVR

## Como se verifica que funcionou

1. Provocar um movimento real e breve na frente de uma das câmeras (rápido,
   devolvendo a área ao estado anterior — nenhum atuador físico é acionado
   aqui, então não há "estado anterior" a restaurar, só o próprio movimento).
2. Confirmar que o e-mail de alarme chegou na caixa monitorada.
3. Confirmar no log do HA que a automação disparou e identificou o canal
   certo.
4. Confirmar que um arquivo `.mp4` novo apareceu na pasta certa do Google
   Drive, com data/hora batendo.
5. Confirmar que a cópia local foi removida depois do upload confirmado.
