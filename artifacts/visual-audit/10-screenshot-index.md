# 10 — Índice de Capturas de Tela e Evidências Visuais

**Documento**: `artifacts/visual-audit/10-screenshot-index.md`  
**Data**: 16/09/2026  
**Escopo**: Mapeamento de todas as capturas de tela coletadas durante as 6 fases de auditoria.

---

## 1. Capturas da Fase 2 — Inventário de Telas

| # | Arquivo | Tela / Superfície | Viewport | Descrição |
|:---:|:---|:---|:---:|:---|
| 1 | `media_1789604601743.png` | Login (`/login`) | 500×749 | Tela de login com keypad numérico |
| 2 | `media_1789604608791.png` | Login — PIN parcial | 500×749 | Dots parcialmente preenchidos |
| 3 | `media_1789604636606.png` | Login — Erro de PIN | 500×749 | Animação shake-fail e dots vermelhos |
| 4 | `media_1789604688014.png` | Home (`/`) — Visão geral | 500×749 | Dashboard principal mobile |
| 5 | `media_1789604710421.png` | Home — Cabeçalho | 500×749 | Relógio, badges e ações rápidas |
| 6 | `media_1789604736340.png` | Home — Grade de cômodos | 500×749 | 10 cards de cômodos |
| 7 | `media_1789604789738.png` | Home — Barra panorâmica | 500×749 | 5 widgets diários |
| 8 | `media_1789604850469.png` | RoomPopup — Sala de Estar | 500×749 | Modal de subcards com dispositivos |
| 9 | `media_1789604920444.png` | RoomPopup — Cozinha | 500×749 | Cômodo com ponto único |
| 10 | `media_1789604998856.png` | MediaHubModal — TV | 500×749 | Central de mídia e D-pad |
| 11 | `media_1789605086095.png` | EnergyWidget — Gráfico | 500×749 | Gráfico spline 24h e tomadas |
| 12 | `media_1789605182058.png` | VacuumWidget — Aspirador | 500×749 | Status do robô e consumíveis |
| 13 | `media_1789605284330.png` | WeatherForecast — Clima | 500×749 | Previsão de 5 dias |
| 14 | `media_1789605426453.png` | TodoListWidget — Compras | 500×749 | Lista de itens com checkboxes |
| 15 | `media_1789605539389.png` | LightDimmerModal — Dimmer | 500×749 | Slider de brilho e presets |
| 16 | `media_1789605611304.png` | `/comodo/sala_de_estar` | 500×749 | Subpágina dedicada do cômodo |
| 17 | `media_1789605683442.png` | `/comodo/quarto` (vazio) | 500×749 | Empty state do cômodo |
| 18 | `media_1789605753444.png` | Standby (`/standby`) | 500×749 | Modo noturno OLED |
| 19 | `media_1789605859479.png` | Standby — Despertar | 500×749 | Transição de saída |

---

## 2. Capturas da Fase 3 — Funcionamento Interativo

| # | Arquivo | Componente Testado | Ação | Descrição |
|:---:|:---|:---|:---|:---|
| 20 | `click_feedback_1789607487299.png` | RoomCard — Sala | Toque no ícone | Toggle mestre com aura âmbar |
| 21 | `click_feedback_1789607523707.png` | RoomCard — Cozinha | Toque no corpo | Abertura do RoomPopup |
| 22 | `click_feedback_1789607563446.png` | QuickScenesPanel — Cinema | Toque na cena | Feedback visual de ativação |
| 23 | `click_feedback_1789607607348.png` | HeaderQuickActions — Tema | Toque no seletor | Comutação Dark → Light |
| 24 | `click_feedback_1789607675645.png` | Botão "Apagar Casa" | Press-and-hold | Anel SVG de progresso |
| 25 | `click_feedback_1789607724045.png` | Barra Panorâmica — TV | Toque no widget | Abertura do MediaHubModal |
| 26 | `click_feedback_1789607751159.png` | MediaHubModal — D-Pad | Toque em direcional | Feedback de botão ativo |
| 27 | `click_feedback_1789607806064.png` | EnergyWidget — Scrubbing | Deslizar no gráfico | Tooltip flutuante 60fps |
| 28 | `click_feedback_1789607861984.png` | VacuumWidget — Sucção | Toque em preset | Seletor de modo ativo |
| 29 | `click_feedback_1789607917966.png` | TodoListWidget — Checkbox | Toque no item | Risco tachado no texto |
| 30 | `click_feedback_1789607948140.png` | TodoListWidget — Input | Digitação | Campo de texto ativo |
| 31 | `click_feedback_1789608003914.png` | LightDimmerModal — Slider | Arrasto | Ajuste de brilho contínuo |
| 32 | `click_feedback_1789608054392.png` | `/comodo/[id]` — Tabs | Toque em aba | Navegação entre cômodos |
| 33 | `click_feedback_1789608105833.png` | FanControlCard | Toque em velocidade | Seletor de ventilador |
| 34 | `click_feedback_1789608179864.png` | Standby — Toque | Toque na tela | Despertar tátil instantâneo |
| 35 | `click_feedback_1789608228224.png` | Modais — Escape | Tecla Escape | Fechamento de modal |
| 36 | `click_feedback_1789608276625.png` | Modais — Backdrop | Toque fora | Fechamento por backdrop |
| 37 | `click_feedback_1789608327944.png` | HeaderAlertPill — Segurança | Toque na pílula | Abertura do modal de alertas |
| 38 | `click_feedback_1789608379166.png` | HeaderAlertPill — Baterias | Toque na pílula | Abertura do monitor de baterias |
| 39 | `click_feedback_1789608430241.png` | Login — Teclado físico | Tecla numérica | Input via teclado |
| 40 | `click_feedback_1789608479818.png` | Tema Light | Ciclo completo | Interface em modo claro |

---

## 3. Capturas da Fase 5 — Responsividade

| # | Arquivo | Viewport | Descrição |
|:---:|:---|:---:|:---|
| 41 | `media_1789606082498.png` | 320×568 | iPhone SE — Grade comprimida |
| 42 | `media_1789606266038.png` | 1024×768 | Wall mount — Zero-scroll violado |
| 43 | `media_1789606336335.png` | 1440×900 | MacBook Pro — Layout ideal |
| 44 | `media_1789606412383.png` | 2560×1440 | QHD — Centralização ultrawide |
| 45 | `media_1789606624379.png` | 3440×1440 | Ultrawide — Container contido |
| 46 | `click_feedback_1789608740220.png` | 768×1024 | Tablet retrato — 3 colunas |

---

## 4. Capturas da Fase 6 — Acessibilidade

| # | Arquivo | Teste | Descrição |
|:---:|:---|:---|:---|
| 47 | `click_feedback_1789609140273.png` | Tab navigation | Foco invisível nos botões |
| 48 | `media_1789609137911.png` | Tema Light contraste | Acento âmbar ilegível |
| 49 | `media_1789609144383.png` | Focus trap | Foco vazando do modal |
| 50 | `media_1789609164180.png` | Zoom 200% | Overflow de texto em cards |
| 51 | `media_1789609173590.png` | Zoom 200% — energia | Widget com texto cortado |
| 52 | `media_1789609183226.png` | Zoom 200% — compras | Itens com overflow |
| 53 | `media_1789609204259.png` | Reduced motion | Animações neutralizadas |
| 54 | `media_1789609221566.png` | Heading hierarchy | Salto h1→h3 indevido |
| 55 | `media_1789609255651.png` | unavailable state | Card idêntico a off |
| 56 | `media_1789609293218.png` | TV power 34px | Alvo tátil insuficiente |
| 57 | `media_1789609302904.png` | Micro-pill 36px | Cascata CSS sobrescrita |
| 58 | `media_1789609321772.png` | Focus return | Foco no body após Escape |
| 59 | `media_1789609333463.png` | ARIA slider | Range sem valuetext |
| 60 | `media_1789608666126.png` | Standby true black | Verificação de fundo #000 |
| 61 | `media_1789608797166.png` | Burn-in protection | Deslocamento randômico |

---

## 5. Gravações de Browser (Vídeo WebP)

| # | Recording Name | Fase | Conteúdo |
|:---:|:---|:---:|:---|
| 1 | `login_flow_test` | 2 | Fluxo completo de login e erro |
| 2 | `dashboard_navigation` | 2 | Navegação pela Home e modais |
| 3 | `interactive_elements_test` | 3 | Teste de cliques em todos os elementos |
| 4 | `responsive_viewport_sweep` | 5 | Varredura de 17 viewports |
| 5 | `accessibility_keyboard_test` | 6 | Navegação por teclado e foco |

---

> [!NOTE]
> Todas as capturas foram coletadas durante inspeções laboratoriais em browser via subagente automatizado. Nenhum dispositivo físico foi acionado.
