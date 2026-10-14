# Revisão completa do painel pelo visual-gatekeeper — 14/10/2026

Pedido do André: rodar o porteiro em todo o painel; o que já foi publicado também precisa de APROVADO.
Auditado: produção (3002), branch `fix/audit-p1-batch-01` em `14b686d`. Quatro frentes em paralelo.

| Frente | Escopo | Veredito |
| :--- | :--- | :--- |
| A | Tela principal | RECUSADO (3 Altos, 3 Médios, 6 Baixos) |
| B | Modais de cômodo, clima, rede, saúde, baterias, segurança | RECUSADO (4 Altos, 8 Médios, 6 Baixos) |

**Incidente da frente B**: um clique em fila caiu em "Ativar cena Leitura" do LightDimmerModal e mandou `POST /api/control`
para `light.painel`. A rota respondeu 502; conferido no HA: `light.painel` seguiu `off`, `last_changed` 04:11:34Z (antes
da auditoria). Nada a restaurar. Correção: o `visual-gatekeeper` agora instala uma trava de rede (recusa tudo que não for
GET) antes de qualquer interação e não clica por coordenada.
| C | Energia, Mídia, Câmeras | RECUSADO (2 Altos, 6 Médios, 3 Baixos) |
| D | Aspirador, tarefas, galeria, descanso, toasts, estados globais | RECUSADO (1 Alto, 6 Médios, 6 Baixos) |

Legenda de estado: ☐ aberto · ☑ corrigido (aguarda nova revisão) · ✔ aprovado na nova revisão.

## Correções (painel, branch fix/audit-p1-batch-01): aef6bba, 7cf88b8, a974f64, c824155, e477b10, ac8bdb7, e09a018, 2509afc, 2aa580a, fc9e11a, e89fc96, 7ec0023

**Publicado na 3002 em 14/10/2026 por decisão do André, SEM a reauditoria da 4ª rodada** (a 5ª foi interrompida por custo). Rodadas: 1 (publicado), 2, 3 e 4 (3010). Em cada uma as 4 frentes voltaram recusadas e o apontado foi corrigido; a 4ª teve correções ainda sem veredito.

## Frente A — tela principal
- ☑ A-G01 Alto · ícone do cômodo cobre nome e selos em telas baixas (1024×640, 1024×600): `.room-card .room-icon-wrapper` piso 42 px (`globals.css:3614`)
- ☑ A-G02 Alto · "Casa" cortado seco ("Cas") no offline a 320/375: h1 encolhe (`globals.css:13448`), inline-block do SmartTruncate impede reticências
- ☑ A-G03 Alto · `line-height: 1` + `overflow: hidden` corta descendentes: `.dashboard-subtitle`, `.security-micro-label`, `.todo-compact-name`, `.todo-compact-status`, `.tv-compact-text`, `.room-name`
- ☑ A-G04 Médio · aspirador no celular: modo some (`font-size: 0`), sobra "Aspirador •" (`globals.css:13733`, `14722`; `VacuumWidget.tsx:335`)
- ☑ A-G05 Médio · celular oculta controles/informação: `.tv-compact-power`, `.quick-action-btn--night`, selo MODERADO, linhas "Central de Mídia / TV & Console PS5" (`globals.css:13684`, `13656`, `3939`)
- ☑ A-G06 Médio · "Tudo apagado" rolando no celular em paisagem: pílulas `flex: 1 1 auto` roubam a largura (`globals.css:12955`)
- ☐ A-G07 Baixo · cartões do resumo com alturas diferentes entre fileiras
- ☑ A-G08 Baixo · texto grande só aumenta títulos de seção
- ☐ A-G09 Baixo · 2–5 px de diferença entre fileiras
- ☐ A-G10 Baixo · iPad Pro retrato: cartão órfão e rolagem de 50 px
- ☑ A-G11 Baixo · `.tv-compact-badge` sem proteção a texto longo
- ☑ A-G12 Baixo/Médio · selo "CONECTANDO" da câmera passa ~4 px da prévia a 320

## Frente C — Energia, Mídia, Câmeras
- ☑ C-G01 Alto · fechar das Câmeras cortado na borda a 320 (e a 150%); `.surveillance-header-main` sem `min-width:0`, título não quebra (`globals.css:10564`, `10592`)
- ☑ C-G02 Alto · rótulos "Consumo:"/"Estimativa:" passam da borda do chip a 320 (publicado hoje; `globals.css:14805`)
- ☑ C-G03 Médio · chips de energia com alturas diferentes; "~ R$ / 0,13/h" quebra no meio (publicado hoje)
- ☑ C-G04 Médio · Câmeras sem Escape; `aria-hidden` no overlay que contém o diálogo (`SurveillanceHubModal.tsx:93`)
- ☑ C-G05 Médio · paisagem/teclado: Energia e Mídia com janela de conteúdo de 52–145 px (folha não rola; chips `flex-shrink:0`)
- ☑ C-G06 Médio · texto grande não aumenta a maior parte do texto dos modais (px fixos)
- ☑ C-G07 Médio · alvos < 44 px: `.surveillance-tab-pill` (36), `.media-fan-toggle-btn` (36)
- ☑ C-G08 Médio · câmera em destaque fora de 16:9 com `object-fit: fill` (1280×800, 1920×1080)
- ☑ C-G09 Baixo · cabeçalho das Câmeras no celular: "DVR HD" quebra, abas empilham
- ☐ C-G10 Baixo · folha da Mídia muda de altura ao trocar de aba
- ☑ C-G11 Baixo · foco inicial da Energia cai em "Apagar tomadas"

## Frente D — aspirador, tarefas, galeria, descanso, toasts, estados
- ☑ D-G01 Alto · aba "Ajustes & Calibração" sai da tela até 430 px: `.telemetry-stats-grid` 4 colunas fixas, `.control-slider-col` 220 px (`globals.css:11712`, `11780`, `11754`)
- ☑ D-G02 Médio · falha de leitura da lista aparece no modal como "lista zerada" (`TodoListWidget.tsx:155-160`, `197-199`, `236`)
- ☑ D-G03 Médio · item da lista sem espaços (URL) vaza e é cortado seco (`.todo-text`, `globals.css:3138`)
- ☑ D-G04 Médio · Escape não sai do descanso de tela (`AmbientNightMode.tsx:273`)
- ☑ D-G05 Médio · alvos < 44: `.toast-close` 28, `.wallpaper-switch-pill` 48×26, `.wallpaper-reset-btn` 38
- ☑ D-G06 Médio · abas da galeria com 36 px acima de 640 px
- ☑ D-G07 Médio · carregando inicial mostra "Tudo apagado"/"Offline"/"Padrão"; aspirador indisponível inventa modo e deixa controles habilitados (`page.tsx:602`, `VacuumWidget.tsx:157,197,210`)
- ☐ D-B01..B06 Baixos · px fixos em toasts e sucção; alturas de zona a 125%; cabeçalho grande na paisagem; galeria (altura de cartão, aba ativa fora da vista, `.preset-desc` sem title); fechar/Localizar 42 px a 1180×820; faixa de sensores sem indicação de rolagem

## Frente B — cômodos, clima, rede, saúde, baterias, segurança
- ☑ B-G01 Alto · indisponível aparece "Apagada"/"Desligado" com comando habilitado: subcard do RoomPopup, FanControlCard, subtítulo do LightDimmerModal (`RoomPopup.tsx:251`, `FanControlCard.tsx:30,102,108-121`, `LightDimmerModal.tsx:102,217`)
- ☑ B-G02 Alto · `.subcard-grid.is-single` com `1fr` (mínimo automático): cartão de sensor passa da folha a 320 (`globals.css:4158`, `9990`)
- ☑ B-G03 Alto · "Indisponível" cortado seco no `.device-tile__value` a 375 (`DeviceTile.tsx:260`, `globals.css:5727`, `5760`)
- ☑ B-G04 Alto · nome longo do `.subcard` vaza (grupo dimensionado pelo conteúdo), RoomPopup; mesma causa da tomada (`globals.css:13907`)
- ☑ B-G05 Médio · cabeçalho do RoomPopup: nome longo empurra o fechar para fora (`RoomPopup.tsx:133`, `.popup-header-actions` sem `flex-shrink:0`)
- ☑ B-G06 Médio · subcards irmãos com nome desalinhado (selo "Ajustar" empilhado) e alturas diferentes
- ☑ B-G07 Médio · popover de saúde passa da borda inferior em paisagem baixa (`globals.css:12548`, `HealthPill.tsx:100`)
- ☑ B-G08 Médio · faixa de sensores esconde chips sem indicação de rolagem (`globals.css:5816`)
- ☑ B-G09 Médio · Segurança, Baterias e Rede não fecham com Escape
- ☑ B-G10 Médio · texto a 150%: rótulo do `.popup-expand-btn` vaza (nowrap)
- ☑ B-G11 Médio · `.color-temp-chips` com `repeat(2, 1fr)` passa 9 px a 320 (`globals.css:6213`)
- ☑ B-G12 Médio · dimmer: `.temp-chip` 38 px, `.rgb-circle-btn` 38×38, slider 42 px
- ☐ B-Baixos · pílula "Desligado" do ventilador apertada; presets de brilho com larguras desiguais; linhas de Rede/Segurança/Baterias encostam na borda; clima (ordem máx/mín, "Chuva"+"Seco", "9 km/h" quebra); "100.0 %" × "100%"; dimmer sem aviso de falha
