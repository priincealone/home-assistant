# Reprodução das câmeras da rua na TV da sala

> ⚠️ **DESCARTADO E REMOVIDO em 19/09/2026.** André decidiu não seguir por esse
> caminho (H.264 High Profile da câmera incompatível com o Main/Baseline que a
> TV decodifica via DLNA — ver seção "Causa raiz" abaixo) e pediu para remover
> toda a infraestrutura, não só pausar. Removido: integração `dlna_dmr`,
> containers `go2rtc-cameras`/`go2rtc-tv-proxy` e suas imagens, pasta
> `go2rtc-cameras/` do disco. Ver `CASA.md` §Câmeras e `planning/DONE.md`.
> Este arquivo fica só como registro do diagnóstico técnico (útil se o assunto
> voltar) — **nada aqui está implementado ou ativo hoje**.

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

1. **Não usa o `go2rtc` interno do HA** — verificado (`docker exec homeassistant
   cat` no yaml temporário do processo) que essa instância escuta só em socket
   Unix (`api.listen: ""`), com usuário/senha gerados e o próprio arquivo diz
   "gerenciado pelo Home Assistant, não editar manualmente". Não é para uso
   externo.
2. Em vez disso, usa o recurso nativo do HA de **media source de câmera**
   (`media-source://camera/camera.rua_canal_2`), o mesmo mecanismo por trás do
   botão "reproduzir no Chromecast" já embutido no card de câmera do HA. O
   próprio `media_player.play_media` resolve essa URI para um stream HLS
   assinado, servido pela porta do próprio HA (8123) — sem precisar reconfigurar
   nada de stream à parte.
3. Nova integração `dlna_dmr`, adicionada manualmente com a URL de descrição
   `http://192.168.31.250:9197/dmr` (não por descoberta automática — não
   funcionaria pela falta de multicast). Isso cria um `media_player` novo
   representando a TV como alvo DLNA.
4. Um script novo (`config/scripts.yaml`), ex. `mostrar_camera_rua`, chama
   `media_player.play_media` nesse `media_player` DLNA com
   `media_content_id: media-source://camera/camera.rua_canal_2` (ou `_4`) e
   `media_content_type: video`.
5. Disparo **só via Home Assistant** por enquanto — botão no painel de
   Ferramentas de Desenvolvedor, automação futura, tag NFC, o que o André
   preferir. **Alexa fica fora do escopo desta primeira entrega** (ver seção
   abaixo).
6. Depois de um tempo (a definir com o André — ex. 3 minutos, ou até o André
   trocar de fonte manualmente), a TV não precisa voltar sozinha a nada: como
   é vídeo sob demanda, não há "fonte anterior" a restaurar no sentido de
   HDMI/canal — o `play_media` só substitui o que a TV está tocando via DLNA.

**Risco confirmado, vira bloqueio real (19/09/2026)**: testado na TV real —
`media_player.play_media` com `media-source://camera/...` devolve erro DLNA
716 (Resource not found). Causa confirmada via `GetProtocolInfo` (SOAP,
`ConnectionManager1`, consulta direta à TV): ela só aceita `video/mp4`
progressivo e `audio/mp4` via `AVTransport` — **nenhum `m3u8`/HLS, nenhum
RTSP** na lista de formatos suportados. O media source de câmera do HA
resolve para HLS, que essa TV não entende por esse caminho. O plano B (RTSP
direto) também não se sustenta — RTSP não aparece nos protocolos aceitos.

**Novo plano (implementado)**: servir a câmera como `video/mp4` progressivo
(fragmentado, HTTP), não HLS. André aprovou instância própria de `go2rtc`
(container `go2rtc-cameras`, portas 1984/8554, separado do gerenciado pelo
HA). Descoberto que o stream principal das câmeras (`subtype=0`) é H.265,
incompatível — reconfigurado pra usar `subtype=1` (H.264) só nessa
instância, sem tocar na config da integração `generic` que o André já
ajustou.

**Três causas de rejeição encontradas em sequência, com log de depuração do
`dlna_dmr`/`async_upnp_client`** (ver `planning/IN_PROGRESS.md` P-04 para o
relato completo):

1. `protocolInfo` malformado — o `async_upnp_client` usa o `Content-Type` cru
   do `go2rtc` (`video/mp4; codecs="..."`) como mime-type, que não bate com
   nenhum perfil da TV. Corrigido com proxy `nginx` (`go2rtc-tv-proxy`, porta
   1985) reescrevendo o cabeçalho.
2. `DLNA.ORG_PN` nunca preenchido — só vem de um cabeçalho
   `ContentFeatures.dlna.org` que o servidor precisa mandar; o HA não infere
   sozinho. Adicionado no mesmo proxy.
3. **Causa raiz final, ainda não resolvida**: o vídeo real é H.264 **High
   Profile** (confirmado via `ffprobe` direto no stream), mas a TV só
   declara suportar perfis **Main/Baseline** no `GetProtocolInfo`. A TV
   aceita a negociação (progresso real) mas falha ao decodificar de fato.

**Bloqueio atual**: precisa transcodificar High → Main/Baseline via `ffmpeg`
(gasto de CPU real, diferente do remux gratuito feito até aqui), ou
reconsiderar o Fire TV Stick (opção descartada no início) para fugir de vez
das restrições de perfil DLNA dessa TV. Decisão do André pendente.

Ver `planning/IN_PROGRESS.md` P-04 para o estado exato e os logs de cada
etapa.

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
3. Chamar `media_player.play_media` no novo `media_player` DLNA com
   `media-source://camera/camera.rua_canal_2`, teste curto: confirmar que a
   imagem da câmera aparece na TV. Trocar de fonte manualmente ao final do
   teste (não há "estado anterior" de HDMI a restaurar, já que é reprodução
   DLNA, não troca de entrada).
4. Se o passo 3 falhar (TV não reproduz HLS via DLNA), registrar o erro exato
   e avaliar o plano B (RTSP direto) ou outras alternativas — sem insistir
   silenciosamente.
5. Registrar em `ESTADO_DASHBOARD.md` e `CASA.md` o resultado do teste.
