# Câmeras — análise completa e roadmap para o dashboard-app

> Documento de análise/planejamento (não é implementação). Escrito antes de qualquer mudança em
> código, conforme `CLAUDE.md` §16. Cobre o estado real de hoje (19/09/2026) — HA e dashboard-app —
> e todas as opções de integração, geração de imagem, captura de movimento e automação encontradas,
> para o André (ou o Antigravity) decidir o que vale implementar a seguir.

## 1. Resumo executivo

O sistema de câmeras já tem duas metades maduras que **não conversam sobre movimento**:

- **Lado Home Assistant**: DVR → RTSP → 2 entidades `camera.*` → clipe de 30s por e-mail de alarme →
  upload pro Drive. Funciona ponta a ponta, testado.
- **Lado dashboard-app**: já existe um hub de vigilância completo (`SurveillanceHubModal`), com
  vídeo ao vivo (HLS via WebSocket do HA), snapshot com fallback elegante, gravação manual e duas
  visualizações (dual/single). Muito mais avançado do que a spec de 18/09/2026 registrava — foi
  construído depois, provavelmente no Antigravity.

**A lacuna real não é "colocar câmera no painel" — isso já foi feito e bem feito.** A lacuna é: **o
movimento nas câmeras da rua não existe como estado dentro do Home Assistant.** Ele só existe como
e-mail → evento `imap_content`, que dispara a gravação e nada mais. Não há `binary_sensor` de
movimento para essas câmeras (ao contrário dos sensores internos — Lavanderia, Gourmet, Banheiro,
Closet —, que têm `binary_sensor.sensor_*_movimento` e por isso já aparecem no chip de presença, no
`HeaderAlertPill` e no modo noturno do painel). Por isso o painel não tem, e não pode ter hoje, um
badge "movimento agora" nas câmeras da rua: a informação simplesmente não chega até ele.

Todo o resto deste documento detalha as opções para fechar essa lacuna (e outras menores) e lista as
automações que cada opção libera.

## 2. Inventário do que existe hoje

### 2.1 Hardware e integração no HA

- DVR **Intelbras MHDX 1204-C** (`192.168.31.216`), Dahua OEM, 4 canais físicos, 2 em uso (canal 2 e
  4 — câmeras **Intelbras VHD 3230** analógicas, sem IP próprio, ligadas por coaxial).
- Integração `generic` (RTSP), não ONVIF — o ONVIF fecha `/onvif/device_service` sem responder nesse
  firmware (confirmado por curl direto). RTSP funciona via
  `rtsp://usuario:senha@192.168.31.216:554/cam/realmonitor?channel=N&subtype=0` (`subtype=0` = stream
  principal/HD, trocado de `subtype=1` em 18/09 por qualidade de imagem).
- Entidades: `camera.rua_canal_2`, `camera.rua_canal_4`.
- Card de vídeo ao vivo também existe direto no HA — "Painel de controle" (`lovelace.painel_de_controle`),
  adicionado em 19/09 (ver `CASA.md` §Câmeras) — mas isso é redundante com o hub do dashboard-app, que é
  o painel principal da casa.

### 2.2 Pipeline de movimento → clipe → nuvem

```
DVR detecta movimento (canal 2 ou 4)
  → e-mail de alarme (SMTP Gmail, an.diogo98@gmail.com)
  → filtro do Gmail arquiva + marcador "DVR" (não notifica o André)
  → integração `imap` do HA lê o marcador, dispara evento `imap_content`
  → automação "Movimento nas câmeras da rua grava clipe de 30s" (config/automations.yaml)
      grava as DUAS câmeras via `camera.record` (não dá pra saber qual canal disparou,
      o assunto do e-mail é igual pros dois)
  → arquivo em config/www/clipes_movimento/<câmera>_<data>_<hora>.mp4
  → Tarefa Agendada do Windows "CameraClipesDriveSync" (a cada 5 min, fora do container)
      roda rclone (autenticado como a conta pessoal do André, não conta de serviço)
  → rclone move → pasta "Câmeras - Clipes de Movimento" no Drive
  → rclone delete --min-age 7d → limpeza automática, sem lógica própria de retenção
```

Tudo testado ponta a ponta. Pontos fracos conhecidos:
- O gatilho é **e-mail**, não um evento nativo do HA — adiciona 2 elos (SMTP + IMAP) que podem
  falhar silenciosamente (sem alerta configurado se o e-mail não chegar).
- Grava as duas câmeras sempre, mesmo quando só uma teve movimento.
- Nenhuma classificação do que causou o movimento (pessoa, carro, folha ao vento) — o DVR decide
  sozinho, sem zona configurável a partir do HA.
- Retenção de 7 dias é fixa no script PowerShell — mudar exige editar o `.ps1` e reagendar, não dá
  pra ajustar pelo painel.

### 2.3 O que já existe no dashboard-app (levantado nesta análise, lendo o código)

Já implementado, funcionando, **não precisa ser criado de novo**:

| Peça | Arquivo | O que faz |
| :--- | :--- | :--- |
| Vídeo ao vivo (HLS) | `app/api/camera/[id]/hls/[...file]/route.ts` + `lib/cameraStream.ts` | Abre WebSocket com o HA, chama `camera/stream`, pega o token HLS e faz proxy dos segmentos. Reutiliza o token por até 3 min. |
| Snapshot | `app/api/camera/[id]/snapshot/route.ts` | Extrai um frame JPEG do MJPEG contínuo (`/api/camera_proxy_stream`) porque o snapshot estático (`/api/camera_proxy`) do HA dá erro; se tudo falhar, gera um **placeholder SVG elegante** ("Stream em reconexão/standby") em vez de quebrar a UI. |
| Stream MJPEG bruto | `app/api/camera/[id]/stream/route.ts` | Proxy direto do `camera_proxy_stream`, com suporte a abortar se o cliente fechar. |
| Gravação manual | `app/api/camera/record/route.ts` | Chama `camera.record` do HA sob demanda (30s), fora do fluxo automático de movimento. |
| Hub de vigilância | `app/components/SurveillanceHubModal.tsx` | Modal com os 2 canais, modo dual/single, botão de gravar, texto explicando a sincronização com o Drive. |
| Widgets menores | `CameraGlanceWidget.tsx`, `CameraLiveCard.tsx`, `CameraLivePlayer.tsx` | Blocos de preview usados em outras telas. |
| Rota de TV | `app/api/camera/cast/route.ts` | **Descontinuada** (retorna 410) — condiz com a pausa decidida em 19/09 no lado do HA (`planning/BLOCKED.md` K-14), embora o texto do dashboard-app diga "abortada" e o lado HA diga "pausado por decisão" — vale alinhar a redação um dia, não é urgente. |
| Rotas de debug | `app/api/camera/debug`, `stream-diag`, `ws-test`, `ws-persist-test` | Stubs/diagnóstico deixados no código (3 delas retornam 404 fixo) — parecem sobra de investigação, candidatas a limpeza futura (fora do escopo deste documento). |

**O que NÃO existe no dashboard-app** (confirmado por grep, não por suposição):
- Nenhum indicador de "movimento agora" nas câmeras da rua (só existe para os sensores internos, via
  `HeaderAlertPill` e `RoomCard`).
- Nenhuma galeria/histórico dos clipes já gravados (nem os locais, nem os que já foram pro Drive).
- Nenhum controle de retenção (os 7 dias fixos do rclone) pelo painel.
- Nenhuma configuração de zona/sensibilidade de movimento (essa configuração é só no DVR).

## 3. Todas as integrações possíveis (HA) — mapeadas, não implementadas

| Opção | O que dá | Custo/risco | Veredito |
| :--- | :--- | :--- | :--- |
| **ONVIF** | Descoberta automática, PTZ se houvesse | Já tentado, esse firmware não responde no endpoint | Descartado, documentado |
| **`generic` (RTSP) — atual** | Simples, já funciona, HD | Nenhum recurso além do vídeo | Manter como base |
| **`go2rtc`** (rodou em containers dedicados para o caso da TV, **removidos em 19/09/2026** junto com aquela tentativa — ver §8) | Snapshot HTTP nativo (`/api/frame.jpeg`) muito mais rápido que o `ffmpeg`/MJPEG que o dashboard-app usa hoje como workaround; também WebRTC de baixa latência | Precisaria subir um container novo, dedicado a isso — não tem mais nada de graça reaproveitável | Ainda válido como ideia, mas o custo mudou: ver §4 |
| **Frigate** (NVR com detecção de objeto/pessoa via IA, roda em container próprio) | `binary_sensor` por câmera e por zona ("pessoa", "carro", "animal"), clipes só do que interessa, timeline com miniaturas, integra nativamente com HA | Container adicional (CPU/GPU para inferência — sem GPU dedicada, roda em CPU, mais lento), mais uma peça de infraestrutura pra manter | **Candidato principal** para fechar a lacuna do §1 — ver §5 |
| **Double Take / CompreFace** (reconhecimento facial sobre o Frigate) | Sabe dizer "é o André" vs "desconhecido" | Depende do Frigate já estar rodando; mais complexidade | Só faz sentido depois do Frigate, não é prioridade agora |
| **`deepstack`/plataforma `image_processing` legada** | Detecção de objeto mais simples | Tecnologia sendo descontinuada pelo próprio HA em favor do Frigate | Não recomendado, caminho sem futuro |
| **Snapshot HTTP nativo do DVR** (`/cgi-bin/snapshot.cgi`) | Miniatura instantânea sem `ffmpeg` | **Testado em 19/09**: autenticação Digest funciona, mas o DVR recusa com `ErrorCode 268632081` (permissão insuficiente na conta) | Bloqueado por configuração do próprio DVR — nível 3, só o André mexe na conta |
| **HA Cloud (Nabu Casa)** | Exporia scripts como dispositivos Alexa, TTS externo, etc. | Assinatura paga | André já decidiu não assinar por enquanto (ver spec da TV) |

## 4. Geração de imagem — comparação concreta

O dashboard-app hoje contorna um bug do HA (snapshot estático via `camera_proxy` retorna erro) lendo o
primeiro frame do stream MJPEG contínuo — funciona, mas é mais lento e mais pesado (abre uma conexão de
stream inteira só pra pegar 1 frame) do que precisaria ser.

**Alternativa que existiu, mas foi desmontada**: enquanto a tentativa de TV estava de pé, um container
`go2rtc` já rodava e serviria `http://<container>:1984/api/frame.jpeg?src=rua_canal_2` — um snapshot
JPEG direto, sem o overhead de abrir stream inteiro. Esses containers foram removidos em 19/09/2026
junto com a integração de TV (decisão do André, ver §8), então essa rota deixou de ser "grátis" — hoje
exigiria subir um `go2rtc` novo, só para isso. Continua sendo uma opção válida se o ganho de
performance do snapshot compensar rodar mais um container, mas não é mais um reaproveitamento sem
custo. Também dependeria do dashboard-app rodar na mesma rede Docker (hoje não roda — é processo Node
no host, decisão em aberto em `planning/BLOCKED.md` K-12).

## 5. Captura de movimento — o que muda com Frigate

Hoje "movimento" é um evento binário que o DVR decide sozinho e comunica só por e-mail. Colocar o
**Frigate** na frente dos mesmos streams RTSP (sem tirar o DVR, ele continua gravando localmente)
daria ao HA:

- `binary_sensor.rua_canal_2_motion` / `_person` / `_car` — estado real, atualizado em tempo real,
  que o dashboard-app já sabe consumir (é o mesmo padrão dos sensores internos em `lib/rooms.ts`).
- Clipes automáticos **só de eventos relevantes** (filtra "pessoa" de "árvore balançando"), com
  miniatura e timeline — reduz o volume de clipes de 30s genéricos que vão pro Drive hoje.
- Possibilidade de zona: por exemplo, ignorar movimento na calçada distante e só alarmar perto do
  portão.
- Isso substituiria o gatilho por e-mail inteiro (menos frágil que SMTP+IMAP) — mas é uma mudança de
  arquitetura, não um ajuste pequeno, e pede planejamento e teste antes de tirar o pipeline atual do
  ar.

**Não é uma recomendação de implementar agora** — é a opção que resolve a lacuna do resumo executivo,
registrada para o André decidir se o ganho compensa rodar mais um serviço.

## 6. Lista de automações possíveis (novas, além da existente)

Nenhuma destas está implementada — é o catálogo para priorizar.

**Segurança / percepção**
1. Badge "movimento agora" nas câmeras da rua no dashboard-app (depende do Frigate ou de algum
   `binary_sensor` equivalente — hoje não é possível, é o item do §1).
2. Card resumindo "N clipes hoje" / "última detecção às HH:MM" no painel (viável hoje sem Frigate: dá
   pra contar execuções da automação existente via `logbook`, ainda que sem saber qual canal).
3. Se `person.andre` = ausente **e** e-mail de alarme chegar, algo mais visível que hoje (hoje é
   silencioso por decisão explícita do André — qualquer notificação aqui precisa ser **opt-in**,
   nunca por padrão).

**Conveniência**
4. Botão "ver histórico de clipes" no painel, listando os arquivos já sincronizados no Drive (exige
   uma rota nova que leia a pasta do Drive — via `rclone lsjson`, por exemplo — não existe hoje).
5. Controle de retenção pelo painel (trocar os "7 dias" fixos do rclone por um valor configurável).
6. Retomar a reprodução na TV da sala (K-14, pausada por decisão do André em 19/09 — infraestrutura
   pronta, só falta decidir entre transcodificar H.264 High→Main ou comprar Fire TV Stick).

**Manutenção**
7. Alerta se a Tarefa Agendada `CameraClipesDriveSync` falhar (hoje não há checagem — se o rclone
   parar de rodar silenciosamente, ninguém percebe até faltar espaço ou faltar clipe).
8. Alerta se o e-mail de alarme parar de chegar por X horas (sentinela do próprio pipeline — hoje
   também não existe).
9. Lembrete anual para o `client_id` do rclone antes dele ser desativado durante 2026 (ver `CASA.md`).

## 7. Contrato de API sugerido (se o André quiser priorizar o item do §1/§6)

Seguindo o padrão já usado (`app/api/camera/[id]/...`), sem implementar agora:

- `GET /api/camera/[id]/motion` — estado atual de movimento (depende de Frigate ou equivalente
  existir; sem isso, não há dado real para servir).
- `GET /api/camera/clips?dias=7` — lista de clipes (local + Drive), pensada para a galeria do §6.4.
- `POST /api/camera/retention` — grava a política de retenção num `input_number`/`input_text` do HA,
  que o script `sincronizar_clipes_drive.ps1` passaria a ler em vez de ter "7d" fixo no código.

## 8. Riscos e pendências identificados durante esta análise

- **O painel não tem autenticação** (fato já conhecido, documentado em `CLAUDE.md` §Armadilhas) —
  isso é agravado por expor vídeo ao vivo da rua: quem alcançar a porta 3002 vê a câmera da casa.
  Vale lembrar isso ao priorizar qualquer novo recurso de câmera.
- O bloqueio de permissão do `snapshot.cgi` no DVR (§3) seria resolvido revendo as permissões da
  conta usada — não investiguei mais fundo por ser nível 3 (só o André mexe na conta do DVR).
- **Atualização de 19/09/2026, depois desta análise**: a tentativa de TV (`dlna_dmr`, containers
  `go2rtc-cameras`/`go2rtc-tv-proxy`, incluindo o arquivo com a senha do DVR em texto puro que estava
  registrado aqui) foi **removida por completo** a pedido do André — ver `planning/DONE.md` e
  `CASA.md` §Câmeras. O `go2rtc` como opção pro §4 continua de pé como ideia, só deixou de ser
  reaproveitamento gratuito (§4 já atualizado).

## 9. Recomendação de prioridade (opinião, não decisão)

Se for pra escolher um próximo passo só, o de maior alavancagem é o **Frigate** (§5) — é a única
peça que resolve a lacuna real (movimento como estado, não como e-mail) e desbloqueia praticamente
tudo do §6 de uma vez. Tudo mais no documento é incremental e pode ser feito independente, na ordem
que o André preferir.
