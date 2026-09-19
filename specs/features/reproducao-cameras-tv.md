# Reprodução das câmeras da rua na TV da sala

## Problema

As câmeras `camera.rua_canal_2` e `camera.rua_canal_4` (DVR Intelbras, ver
`CASA.md` §Câmeras) só são visíveis no HA (Ferramentas de Desenvolvedor,
histórico de logbook) ou em um navegador. Não há como o André dar uma olhada
rápida na câmera da rua na TV da sala, que é a tela grande da casa.

Investigado e descartado como caminho de exibição:

- **Chromecast/AirPlay/Google Cast** — a rede Docker Desktop/WSL2 é NAT sem
  multicast (mDNS/SSDP de broadcast não atravessam), confirmado em
  `docs/ARCHITECTURE.md`. Nenhum desses protocolos de descoberta funciona.
- **`samsungtv` (integração já instalada, local)** — os atributos atuais de
  `media_player.tv_un65du8000gxzd` e `remote.tv_un65du8000gxzd` não expõem
  `source_list` nem `app_list` (verificado lendo o `state_attributes` do
  `home-assistant_v2.db` direto, só leitura). Essa integração aqui é
  essencialmente controle remoto por tecla, não um alvo de cast de mídia.
- **Comprar um Fire TV Stick / Android box** — resolveria, mas o André não
  quis essa rota agora; ficou como alternativa futura se o DLNA abaixo não se
  sustentar.

Caminho confirmado, sem hardware novo:

- **A TV já responde como servidor DLNA MediaRenderer.** Testado direto na
  rede (`curl http://192.168.31.250:9197/dmr`, só leitura HTTP unicast — não
  usa SSDP nem multicast): devolve a descrição UPnP completa, com os serviços
  `AVTransport`, `RenderingControl` e `ConnectionManager`, e a TV se declara
  `WebURIPlayable` (capacidade Samsung de abrir uma URL de vídeo/página
  diretamente). A integração `dlna_dmr` do HA aceita configuração **manual**
  por URL de descrição, sem depender da descoberta automática — que seria o
  único ponto bloqueado pelo multicast.

## Comportamento esperado

1. `go2rtc` (já instalado) expõe `camera.rua_canal_2` e `camera.rua_canal_4`
   como stream HTTP consumível (HLS ou MJPEG/WebRTC-para-HTTP, a confirmar
   qual formato o `AVTransport` da TV realmente reproduz).
2. Nova integração `dlna_dmr`, adicionada manualmente com a URL de descrição
   `http://192.168.31.250:9197/dmr` (não por descoberta automática — não
   funcionaria pela falta de multicast). Isso cria um `media_player` novo
   representando a TV como alvo DLNA.
3. Um script novo (`config/scripts.yaml`), ex. `mostrar_camera_rua`, chama
   `media_player.play_media` nesse `media_player` DLNA com a URL do stream do
   `go2rtc` do canal desejado.
4. Disparo **só via Home Assistant** por enquanto — botão no painel de
   Ferramentas de Desenvolvedor, automação futura, tag NFC, o que o André
   preferir. **Alexa fica fora do escopo desta primeira entrega** (ver seção
   abaixo).
5. Depois de um tempo (a definir com o André — ex. 3 minutos, ou até o André
   trocar de fonte manualmente), a TV não precisa voltar sozinha a nada: como
   é vídeo sob demanda, não há "fonte anterior" a restaurar no sentido de
   HDMI/canal — o `play_media` só substitui o que a TV está tocando via DLNA.

## Alexa — fora de escopo por decisão do André (18/09/2026)

A única rota viável hoje para comando de voz sem reviver a integração
`alexa_media` (removida do disco, sem entrada em `core.config_entries`,
bloqueada por passkey vs senha+2FA — ver `CASA.md`) é o Home Assistant Cloud
(Nabu Casa), que expõe scripts como dispositivos Alexa via relay na nuvem,
contornando o problema de multicast/SSDP local. O André decidiu não assinar
por enquanto. Quando ele quiser retomar, o disparo por voz é: script
`mostrar_camera_rua` já pronto (criado nesta funcionalidade) → só falta expor
esse script ao Alexa via Nabu Casa ou reativar `alexa_media` com senha+2FA.

## Entidades e integrações envolvidas

- `camera.rua_canal_2`, `camera.rua_canal_4` (já existentes)
- `go2rtc` (já instalado; confirmar configuração do stream HTTP de saída)
- Nova integração `dlna_dmr`, host `192.168.31.250:9197/dmr` (config manual)
- Novo script em `config/scripts.yaml`

## Dono do atuador / o que acontece se o HA reiniciar no meio

O atuador é a TV (`media_player` novo, via `dlna_dmr`). Não é um atuador de
risco (luz, tranca, aquecedor) — pior caso de queda no meio é a TV ficar
tocando o stream até alguém trocar de fonte manualmente ou o script rodar de
novo. **Um atuador, um dono**: nenhuma outra automação hoje mexe com a fonte
de vídeo da TV (confirmado — grep em `automations.yaml`/`scripts.yaml` sem
resultado para TV/cast/chromecast). Se o HA reiniciar, o `media_player` DLNA
é recriado do zero pela config da integração; nenhum estado pendente fica
"travado".

## Fora do escopo (por enquanto)

- Comando de voz via Alexa (ver seção acima — bloqueado por decisão de não
  assinar Nabu Casa agora)
- Mostrar as câmeras no `dashboard-app` — mudança de contrato à parte, exige
  pedido inequívoco do André (regra do `CLAUDE.md` §6)
- Qualquer automação automática de exibição (ex. "mostra sozinha quando
  alguém toca a campainha") — esta spec cobre só o disparo manual via HA
- Comprar Fire TV Stick/Android box — só entra se o caminho DLNA não se
  sustentar nos testes

## Como se verifica que funcionou

1. `curl http://192.168.31.250:9197/dmr` responde com a descrição UPnP —
   **já verificado** nesta spec.
2. Adicionar a integração `dlna_dmr` manualmente na UI do HA (ou via
   `.storage`, com o cuidado de sempre: validar → `docker stop` → editar →
   `docker start`, nunca `docker restart`) e confirmar que o `media_player`
   novo aparece com estado disponível.
3. Confirmar no `go2rtc` qual URL de stream HTTP está disponível para
   `camera.rua_canal_2`/`camera.rua_canal_4`.
4. Chamar o script `mostrar_camera_rua` uma vez, teste curto: confirmar que a
   imagem da câmera aparece na TV. Trocar de fonte manualmente ao final do
   teste (não há "estado anterior" de HDMI a restaurar, já que é reprodução
   DLNA, não troca de entrada).
5. Registrar em `ESTADO_DASHBOARD.md` e `CASA.md` o resultado do teste —
   inclusive se o `WebURIPlayable` permitir abrir a página do player web do
   `go2rtc` diretamente, o que dispensaria decidir entre HLS/MJPEG.
