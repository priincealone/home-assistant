# DONE

Concluído e verificado. Mantido porque decisão sem histórico se repete, e porque várias destas
entradas explicam por que o sistema é do jeito que é.

Ordem cronológica inversa. O detalhe de cada uma está em `ESTADO_DASHBOARD.md`.

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
