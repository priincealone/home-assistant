# DONE

Concluído e verificado. Mantido porque decisão sem histórico se repete, e porque várias destas
entradas explicam por que o sistema é do jeito que é.

Ordem cronológica inversa. O detalhe de cada uma está em `ESTADO_DASHBOARD.md`.

---

## 13/10/2026 (d)

**B-03 · Teste de contrato entidades × HA** — `dashboard-app/tests/contrato-entidades.test.mjs` (commit `72efee9` no painel): toda entidade de `lib/rooms.ts` existe no `core.entity_registry`, não está desativada, tem o domínio declarado, e cada dispositivo está na área do cômodo (L-01/L-02). Só lê arquivos. Passa hoje (8 verificações) e **falha** de verdade numa cópia adulterada do registro (entidade removida, desativada e fora da área: 3 defeitos, 3 falhas). `npm test` roda também `rede.test.mjs`, que estava **quebrado** desde o vocabulário de 06/10 (duas expectativas velhas, corrigidas). **Limpeza de documentação**: B-05 e ROADMAP 1.4, 2.2, 2.3 e 2.6 já estavam feitos e constavam abertos; CLAUDE.md §3/§14 dizia que não havia teste algum.

---

## 13/10/2026 (c)

**B-08 · Patch do Glances reaplicado automaticamente** — `scripts/manutencao/glances_patch.ps1` (verifica; `-Aplicar` aplica; `-Reiniciar` reinicia o HA) e a tarefa agendada `CasaGlancesPatch` (logon + de hora em hora, sem janela, usuário atual) que o chama pelo `glances_patch_tarefa.ps1`. O patch estava ausente desde a recriação do container (20/09); aplicado em 13/10 com reinício do HA. Verificado: linha `client.get(url, timeout=15)`, 42 sensores no registro, sem erro do Glances nos logs; a tarefa rodou uma vez com o patch presente (exit 0, sem reinício). Log em `%LOCALAPPDATA%CasaHAglances_patch.log`.

---

## 13/10/2026 (b)

**Painel com animações (Motion) publicado** — cartões de cômodo, energia, mídia, cenas, dispositivos, clima, selos, aspirador, câmera e compras; SmartTruncateText sem laço de atualização. Publicado (3002 derrubada, watchdog recompilou). Animações e desempenho no tablet não verificados. Detalhe em ESTADO_DASHBOARD.md.

---

## 13/10/2026

**B-04 · Cena "gamer" × ventilação do PS5 — encerrado** — a cena já é `script.cena_gamer` (`config/scripts.yaml`,
desde `cf2380c`, 25/09): apaga `light.luz_sala` e põe `light.painel` a 30%, sem tocar em `switch.ventilacao_ps5`,
que fica só com a automação. `app/api/scene/route.ts` apenas chama o script; nenhuma referência à tomada em
`dashboard-app/`. Era só documentação desatualizada (`AUTOMATION-POLICY.md` R8, agente `architecture-reviewer`,
BACKLOG), corrigida. Verificado por leitura de código; a casa não foi acionada.

---

## 09/10/2026

**Music Assistant removido da casa e do painel** (D-012, pedido do André) — containers `music-assistant` e
`bgutil-provider` e suas imagens; dados do MA movidos (não apagados) para `backups/music-assistant-20261009/`;
no painel saíram a aba "Música & Som", `app/api/mass`, o sink de áudio e o CSS `mass-*` (commit `e34178f`,
que levou junto o trabalho em andamento que estava sem commit, a pedido). `tsc --noEmit` sem erros fora de
`.next/`. **Publicado** (porta 3002 derrubada duas vezes; produção, `next start`, `BUILD_ID` presente; `/api/mass`
responde 404, bundles sem restos, Central de Mídia com as abas "Vídeo & TV" e "Console PS5"). Pendente do
André: apagar `MASS_TOKEN` do `dashboard-app/.env.local`.

## 08/10/2026

**Projeto no GitHub, privado e sem segredos no histórico** — `priincealone/home-assistant` (casa) e `priincealone/casa-dashboard` (painel, 3 branches). Tokens Xiaomi, chave privada, tokens locais dos aparelhos e uma senha RTSP removidos de todos os commits da casa antes do primeiro push; hashes mudaram. Backup do histórico antigo em `backups/git-antes-limpeza-2026-10-08.bundle` (contém segredos).

**Painel em tempo real** — espelho dos estados da HA por WebSocket no servidor, `/api/stream` (SSE) e polling de 5 s só como reserva. Atraso HA → tela de ~2,5 s (média) para ~30–50 ms; `/api/state` em ~8 ms. Limite: integrações em nuvem têm o atraso próprio. Spec: `specs/features/painel-tempo-real.md`. Publicado, `tsc` = 0.

## 06/10/2026

**Fase 3 do painel, lote B: cômodos primeiro, menos ruído e piso de 12 px** — cômodos antes do resumo (y=436 →
278 na parede, sem rolagem), sem frases de instrução fixas, seta de detalhe discreta, piso de texto de 12 px em
todos os tamanhos. M-04 e M-06 ficaram de fora por contrariarem decisões de 25 e 27/09; M-05 é redesenho; M-11
(dividir o CSS) fica à parte. Publicado às 09:51.

**Fase 3 do painel, lote A: leituras honestas, alvos de toque e vocabulário único** — inclui B-02 (entidades
inexistentes fora do contrato, IDs certos de bateria do aspirador e da lista de compras). Selos do cabeçalho
dizem o que contam; portas com duração; consumo com histerese; ventilador com `aria-pressed`; piso de toque com
`data-toque` (iPad); chips com ícone e ícones alinhados; popup e página do cômodo com o mesmo vocabulário;
"segurar" unificado no gancho; relógio por minuto; animações pausadas no descanso. Verificado no navegador com
escrita interceptada, `tsc` = 0, publicado às 09:45. Detalhe em `ESTADO_DASHBOARD.md`.

**Fase 2 do painel: estados verdadeiros, régua de confirmação e Desfazer** — E-01 a E-04, M-07 e M-08 da
auditoria de 05/10. TV com uma fonte (sensor da HA com a TV local primeiro; botão manda estado explícito;
contrato "TV Sala" na entidade local), selo da câmera vindo do player ("SEM SINAL" em 25 s), "Apagar tomadas",
"Modo Eco" e desligar o PC só segurando (PC fora do lote), tomada indisponível como "Indisponível", Desfazer
de 8 s. Verificado com escrita interceptada no navegador (nenhum comando chegou à casa), `check_config` e
`tsc` = 0, publicado em produção. Spec: `specs/features/painel-estados-verdadeiros.md`. Fica para depois:
Desfazer após "Dormir".

## 05/10/2026

**Painel sem PIN: acesso livre (K-11 e B-01 encerrados por decisão)** — o André escolheu não autenticar o
painel (D-011 em `docs/DECISIONS.md`). Removidos `middleware.ts`, `lib/auth.ts`, `app/api/auth/login`,
`app/login` e os estilos do login; `/login` redireciona para `/`; `offline.html` testa `/` para saber se o
servidor voltou. Verificado em produção, sem cookie: `/`, `/comodo/*`, `/standby` e as rotas de leitura da
API respondem 200 (inclusive pelo IP `192.168.31.22`), `/login` → 307 para `/`, `/api/auth/login` → 404;
`npx tsc --noEmit` passa. Nenhum dispositivo foi acionado. Auditoria que motivou:
`artifacts/claude/auditoria-painel-05-10.md`.

## 26/09/2026

**Novos dispositivos no painel: portas da sala e da lavanderia, Led + tomada do Quarto Luca** — contrato
`lib/rooms.ts` ganhou seis entidades: `binary_sensor.sensor_porta_sala_porta` e `binary_sensor.door_sensor_2_porta`
(só estado, com bateria), `light.led_tomada_switch_1` (Led, a tecla 1 confirmada pelo André) e
`switch.led_tomada_switch_2` (tomada, com comando). Verificado: as seis existem e estão ativas no registro do
HA, `npx tsc --noEmit` passa, `/api/state` devolve o estado real das seis e as três telas (Quarto Luca,
Lavanderia, Sala) as mostram. **Não** foi acionado nenhum ponto: o comando do Led e da tomada não foi
provado. Spec: `specs/features/painel-novos-dispositivos-set26.md`. O medidor de energia ficou de fora (K-16 em
`BLOCKED.md`).

**Monitoramento de rede: internet, DVR e luzes indisponíveis (R-01 a R-05)** — sondas ICMP, sensor de
diagnóstico (gateway × internet × nó da Sala) e três avisos no iPhone. Verificado: `check_config` sem erro,
sensores lendo `ok`, três automações `on`. **Não** foi provada a notificação real (não se derrubou a rede para
testar). Detalhe e armadilhas em `ESTADO_DASHBOARD.md`; spec em `specs/automations/rede-mesh-internet-monitoramento.md`.

---

## 25/09/2026

**PS5 desliga pelo HA (PS5-02) e ventilação em 1 minuto** — repouso por sessão Remote Play
(`pyremoteplay`), repareamento pelo *Reconfigurar*, `media_player.turn_off` confirmado pelo HA. Ventilação
do console: liga em ~1 s e desliga 1 min após ele sair, com reconciliação por minuto (o gatilho `for` sozinho
não cumpria nem os 2 min antigos). Medido em ciclo real. Especificação: `specs/features/ps5-desligar-remote-play.md`;
detalhe e armadilhas em `ESTADO_DASHBOARD.md`. Botão de repouso no painel entregue em seguida (PS5-03, `specs/widgets/ps5-botao-repouso.md`), com confirmação e estado real.

---

**Ícones do painel unificados sobre Phosphor (B-17)** — cinco linguagens de ícone viraram uma: fachada
`<Icon name state size>` sobre `@phosphor-icons/react` (versão fixa), com regra única de peso por estado
(contorno em repouso, preenchido ligado, duotone no cômodo, esmaecido + selo de sem-conexão no offline).
~130 SVGs soltos, 27 emoji, cores fixas no clima e o `icons.tsx` legado saíram; `lucide-react` (nunca usado)
foi removido. Glifo próprio só para o aspirador robô. Áreas restantes com `<svg>`: gráficos de energia,
`TvAppLogos` (marcas) e o `HealthPill` de outra frente. Especificação: `specs/features/icones-phosphor.md`;
auditoria: `artifacts/claude/auditoria-icones.md`. Detalhe em `ESTADO_DASHBOARD.md`.

---

## 19/09/2026

**Vídeo ao vivo direto no card, no HA** — os cards de câmera do dashboard-app já mostravam ao vivo
(feature já existente, descoberta só nesta data). O que faltava era só dentro do próprio Home
Assistant: adicionado no "Painel de controle" (`lovelace.painel_de_controle`, dashboard manual, sem
mexer na dashboard "Dispositivos" que é auto-gerada). Ver `CASA.md` §Câmeras.

**Análise completa do sistema de câmeras para o dashboard-app** — levantamento de integrações
possíveis (ONVIF, `generic`, `go2rtc`, Frigate, Double Take/CompreFace), geração de imagem, captura de
movimento e automações possíveis. Achado principal: o movimento das câmeras da rua não existe como
estado no HA, só como e-mail — por isso o painel não tem como mostrar "movimento agora" nelas.
Documento: `specs/features/cameras-analise-completa-roadmap-dashboard.md`.

**Reprodução das câmeras na TV da sala — descartada e removida** — chegou a funcionar quase por
completo via DLNA (`dlna_dmr` + `go2rtc-cameras` + proxy `go2rtc-tv-proxy`), mas travava ao decodificar
de fato: a câmera manda H.264 High Profile, a TV só decodifica Main/Baseline por esse caminho.
Resolver exigiria transcodificar (CPU real) ou trocar de hardware. André decidiu não seguir e remover
tudo: integração `dlna_dmr` excluída pela UI, containers e imagens Docker removidos, pasta
`go2rtc-cameras/` apagada do disco (guardava a senha do DVR em texto puro). Diagnóstico técnico
preservado em `specs/features/reproducao-cameras-tv.md` (marcado como descartado no topo). Ver
`CASA.md` §Câmeras e `ESTADO_DASHBOARD.md`.

---

## 18/09/2026

**Câmeras Intelbras integradas ao Home Assistant, com clipe de movimento na
nuvem, ponta a ponta** — DVR MHDX 1204-C (`192.168.31.216`), canais 2 e 4
(visão externa para rua), via integração `generic` (RTSP), depois que o
ONVIF nativo falhou por o serviço estar indisponível nesse firmware.
Entidades `camera.rua_canal_2` e `camera.rua_canal_4`, stream principal
(`subtype=0`, trocado de `subtype=1` depois por pedido de qualidade).

Pipeline completo de clipe por movimento: DVR detecta e manda e-mail →
filtro do Gmail arquiva sem notificar → integração `imap` do HA dispara
evento `imap_content` → automação grava 30s de cada câmera
(`camera.record`) → Tarefa Agendada do Windows roda `rclone` a cada 5 min,
sobe pra pasta do Drive e apaga o que passou de 7 dias. Conta de serviço do
Google Cloud **não funciona** para isso (sem cota de armazenamento em Drive
pessoal) — a solução foi `rclone` autenticado como o próprio André (OAuth).
Detalhe completo, incluindo os dois incidentes de senha exposta em captura de
tela (nunca digitada nem usada pelo agente) e a lição sobre editar campos de
formulário por reescrita total em vez de edição pontual, em
`ESTADO_DASHBOARD.md` (entradas de 18/09) e `CASA.md` (seção **Câmeras**).

---

## 15/09/2026

**Estrutura de governança criada** — `docs/` (produto, arquitetura, mapa, política de automação,
segurança, decisões), `planning/` (roadmap e quadros) e `specs/` vazio, esperando a primeira
funcionalidade nova.

**Auditoria técnica independente dos artefatos do Antigravity** — quatro relatórios em
`artifacts/claude/`. Confirmou a infraestrutura descrita e encontrou: a inversão apontada para o lado
errado, 4 entidades inexistentes no contrato, painel sem autenticação, ausência total de testes e a
integração `music_assistant` sumida do HA.

**Inversão Cozinha ↔ Lavanderia encerrada** — corrigida em `lib/rooms.ts`,
`manifesto-comodos.json` e nos nomes das entidades `switch.*`. As outras três fontes (registro `light.*`,
sensores de template e automações) já estavam certas. Verificado: `tsc --noEmit` passa, JSON válido,
HA sobe sem erro novo.

**Dashboard Lovelace "Casa" retirada** — o `dashboard-app` vira o painel principal. Saíram a
dashboard, dez itens do HACS, os cards manuais, o tema `apple_home`, a planta 3D e 2D, 60 scripts de
edição e 46 backups. O painel padrão do usuário, que apontava para a dashboard removida, foi
redirecionado para a tela nativa de Dispositivos.

**`CASA.md` criado** como ponto de partida e `CLAUDE.md` reescrito para a nova direção.

---

## 12/09/2026

**Origem dos acendimentos automáticos identificada** — automações rodando na nuvem Tuya (app Smart
Life), não no Home Assistant. Método: classificar cada acendimento pelo `context` do HA, filtrando
reconexão e partida do container (518 eventos brutos → 244 reais). Ferramentas versionadas em
`scripts/diagnostico/`.

---

## 11/09/2026

**Luz por movimento na Lavanderia e na Área Gourmet** — do pôr do sol ao amanhecer, com desligamento
após 10 minutos sem movimento nos dois ambientes.

**Rotina noturna pela porta do quarto** — fechar apaga a casa e desliga a TV; abrir acende o painel
como luz de guia.

**Correção: a automação ligava a TV em vez de desligar** — a tecla POWER da Samsung alterna. Passou a
condicionar o comando ao estado e a usar um caminho de cada vez. Virou a regra R2 da política.

**Music Assistant integrado ao HA** — container religado, restart automático corrigido, integração
criada, primeiro player com biblioteca navegável. A ponte `hass_players` foi configurada pela API,
porque a interface do Music Assistant congela nesse diálogo.

**YouTube Music preparado** — `bgutil-provider` de pé na rede correta. Descoberto que o endereço padrão
sugerido (`127.0.0.1:4416`) não funciona com o MA em container.

**Alexa Media Player diagnosticado** — barrado pela chave de acesso da conta Amazon, que não atravessa
o proxy da integração. Não é defeito de configuração.

---

## 10/09/2026

**Faxina da tela de Dispositivos** — 82 entidades ocultas (151 de 383 no total), sem perder nada em
uso. **"Roteador Closet"** e **"Roteador Sala"** nomeados.

**Painel Casa removido do HA** — o `dashboard-app` saiu do iframe do Lovelace.

---

## 09/09/2026

**Luz e ventilador do Quarto separados** via LocalTuya, replicando o que já existia na Sala.

**Troca Cozinha × Lavanderia corrigida** na camada `light.*` e nas áreas — e é justamente a correção
que deixou os nomes `switch.*` para trás, o que confundiu a auditoria seis dias depois.

**Primeira automação da casa**: ventilação do PS5 acompanhando o console, com reconciliação periódica.

**Sensores de contexto de mídia** (`sensor.tv_fonte`, `sensor.sala_atividade`) e **conta Xiaomi
vinculada** nas duas regiões, trazendo a luminária e o aspirador.

**Duplicatas de nuvem desativadas**, áreas acertadas, entidades órfãs resolvidas.
