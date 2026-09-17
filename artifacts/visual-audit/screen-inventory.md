# Inventário Visual Completo de Telas e Superfícies (screen-inventory.md)

**Documento**: `artifacts/visual-audit/screen-inventory.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído (Fase 2)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Design System**: *Nocturnal Observatory* (Liquid Glass, 60fps, Zero-Scroll Wall Mount)  
**Metodologia**: Inspeção direta em tempo real no navegador via subagente de browser, medições de DOM, injeção de estados, inspeção de tokens CSS e análise de código-fonte.

---

## 1. Matriz Consolidada de Telas e Superfícies Auditadas

O ecossistema visual do `dashboard-app` é composto por **4 rotas principais**, **10 modais/sheets em portais**, e **múltiplos estados de transição e erro**:

| Código | Superfície / Tela | Rota / Localização Física | Tipo de Renderização | Nível de Acesso / Permissão |
| :---: | :--- | :--- | :--- | :--- |
| **SCR-01** | **Tela de Login / Desbloqueio** | `/login` (`app/login/page.tsx`) | Client Component | Pública (pré-autenticação por PIN) |
| **SCR-02** | **Dashboard Principal (Home)** | `/` (`app/page.tsx`) | Client Component | Autenticado (Cookie `casa_auth_session`) |
| **SCR-03** | **Visão Dedicada de Ambiente** | `/comodo/[id]` (`app/comodo/[id]/page.tsx`) | Client Component | Autenticado (Cookie `casa_auth_session`) |
| **SCR-04** | **Sentinela Noturno OLED (Standby)** | `/standby` (`app/standby/page.tsx`) | Client Component | Autenticado (Cookie `casa_auth_session`) |
| **MOD-01** | **Detalhes do Cômodo (Sheet)** | `RoomPopup.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-02** | **Dimerizador & Cor de Luz** | `LightDimmerModal.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-03** | **Central de Mídia & TV** | `MediaHubModal.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-04** | **Gestão de Energia 24h** | `EnergyWidget.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-05** | **Central do Robô Aspirador** | `VacuumWidget.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-06** | **Previsão Meteorológica 5 Dias** | `WeatherForecastModal.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-07** | **Lista de Compras & Tarefas** | `TodoListWidget.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-08** | **Central de Alertas de Segurança** | `HeaderAlertPill.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-09** | **Monitor de Baterias Globais** | `HeaderAlertPill.tsx` (`app/components/`) | Portal (`createPortal`) | Autenticado |
| **MOD-10** | **Controle de Ventilador & Exaustão** | `FanControlCard.tsx` (`app/components/`) | Subcomponente / Modal | Autenticado |

---

## 2. Fichas Técnicas Individuais por Tela

---

### SCR-01: Tela de Login e Desbloqueio Tátil
* **URL / Rota**: `http://localhost:3002/login`
* **Arquivo Fonte**: [`dashboard-app/app/login/page.tsx`](file:///c:/HomeAssistant/dashboard-app/app/login/page.tsx)
* **Função**: Prover barreira de controle de acesso perimétrico à interface residencial, operável ergonomicamente tanto em smartphones quanto em telas de parede montadas em altura de passagem.
* **Componentes Principais**:
  - `login-screen-enclosure`: Container com centralização vertical e horizontal absoluta e fundo escuro fosco.
  - `login-card`: Card Liquid Glass com borda especular e suporte a animação de vibração elástica (`.shake-fail`).
  - `login-pin-display`: 4 marcadores circulares (dots) com transição de preenchimento (`.is-filled`) e estado de alerta (`.is-error`).
  - `login-keypad`: Teclado numérico touch em grid 3×4 contendo os dígitos `1` a `9`, botão limpar (`C`), dígito `0` e backspace (`⌫`).
  - `login-error-text`: Mensagem inline de feedback em vermelho coral `#ef4444`.
* **Ações Disponíveis**:
  - Toque/clique nos botões numéricos (0 a 9);
  - Toque no botão `C` para esvaziar todos os dígitos preenchidos;
  - Toque no botão `⌫` para remover o dígito precedente;
  - Inserção via teclado físico (números 0-9, Backspace, Escape, Delete).
* **Dados Exibidos**:
  - Título institucional: "Controle Residencial";
  - Subtítulo instrutivo: "Digite o PIN de 4 dígitos para acessar o painel";
  - Quantidade de dígitos preenchidos (0 a 4) com acessibilidade `aria-label="Dígitos preenchidos: X de 4"`.
* **Estados Visíveis Auditados**:
  - **Carregamento Inicial**: Renderização imediata sem flash; keypad pronto para interação.
  - **Conteúdo Carregado**: Foco visual pronto, dots vazios com contorno sutil.
  - **Ação em Andamento**: Ao atingir o 4º dígito, `carregando = true` desativa os botões do keypad evitando duplicidade de requisição.
  - **Ação Concluída (Sucesso)**: Validação com resposta HTTP 200 via `/api/auth/login`, disparo háptico `[20, 40]`, transição suave e redirecionamento para `/`.
  - **Ação Falhou (Erro de PIN)**: Validação incorreta (ex: `9999`), disparo háptico de rejeição `[45, 60, 45]`, animação `.shake-fail`, dots vermelhos e mensagem "PIN incorreto. Tente novamente.".
  - **Cancelamento / Limpeza**: Botões `C` e `⌫` limpam os estados de erro e restauram os dots neutros.
* **Dependências**: API intermediária `app/api/auth/login/route.ts`, biblioteca de haptic `lib/utils.ts`, cookie `casa_auth_session`.
* **Permissões**: Aberta ao público da LAN/Tailscale até autenticação com sucesso.
* **Comportamento por Dispositivo de Entrada**:
  - **Touch**: Alvos de toque com dimensão superior a 60px de diâmetro, feedback háptico por vibração nativa da Web API (`navigator.vibrate`), eliminação de atraso de 300ms com `touch-action: manipulation`.
  - **Mouse**: Micro-elevação suave em hover (`surface-hover: #1f293d`), cursor pointer.
  - **Teclado**: Foco navegável por Tab; botões numéricos acionáveis via tecla Enter ou barra de espaço.

---

### SCR-02: Dashboard Tático Principal (Home)
* **URL / Rota**: `http://localhost:3002/`
* **Arquivo Fonte**: [`dashboard-app/app/page.tsx`](file:///c:/HomeAssistant/dashboard-app/app/page.tsx)
* **Função**: Centro de comando residencial com visualização e controle imediato da residência, otimizado para o princípio **Zero-Scroll Wall Mount** em painéis de parede landscape e navegação em coluna única em smartphones.
* **Componentes Principais**:
  - **Header Bar**:
    - Relógio de precisão (`Clock.tsx`) com tipografia `tabular-nums` e data em português brasileiro;
    - Indicador de status de rede: Pílula verde pulsante (`online`), âmbar (`sincronizando`) ou vermelha (`offline`);
    - Badges de alerta perimétrico (`ModalAlerts`): alerta de portas abertas e dispositivos offline;
    - Badges de saúde de bateria (`ModalBatteries`): porcentagem global e lista de sensores com bateria baixa;
    - Botões rápidos de controle (`HeaderQuickActions.tsx`): Seletor cíclico de temas, botão Kiosk fullscreen, atalho para Standby e botão mestre "Apagar Casa (N)".
  - **Deck de Cenas Rápidas (`QuickScenesPanel.tsx`)**:
    - 4 rotinas de iluminação e ambientação com acionamento em 1-toque: `Cinema` (Sala escura + TV), `Chegar` (Acolhimento), `Dormir` (Apagar tudo + Standby) e `Gamer` (PS5 + ventilação ativa).
  - **Barra Panorâmica Diária (Daily Panorama Bar)**:
    - Widget Clima (`WeatherWidget.tsx`): temperatura, sensação, umidade, vento e badge de conforto térmico;
    - Widget Energia (`EnergyWidget.tsx`): potência instantânea em Watts, badge de faixa de consumo e indicador de tomadas inteligentes;
    - Widget Mídia / Som (`TvRemoteWidget.tsx` / `MediaHubModal.tsx`): status da Apple Music / Smart TV com controles de play/pause;
    - Widget Aspirador (`VacuumWidget.tsx`): robô Dreame, porcentagem de bateria, modo de sucção e atalho de retorno à base;
    - Widget Compras (`TodoListWidget.tsx`): contador de itens pendentes na lista de suprimentos da casa.
  - **Grade Espacial dos 10 Cômodos (`.rooms-section` / `.room-grid`)**:
    - Cards dos cômodos da residência: `Sala de Estar`, `Cozinha`, `Copa`, `Lavanderia`, `Área Gourmet`, `Quarto Luca`, `Banheiro`, `Circulação`, `Closet` e `Quarto`.
* **Ações Disponíveis**:
  - Toque no ícone de cada cômodo: Acionamento mestre rápido de iluminação (acende ou apaga todas as lâmpadas do ambiente com trava otimista de 3.5s);
  - Toque no corpo do card do cômodo: Abertura do modal de subcards detalhados (`RoomPopup.tsx`);
  - Toque em qualquer mini-widget da barra diária: Expansão do modal completo da respectiva função;
  - Toque no botão de tema: Comutação cíclica Dark Obsidian -> Light Mode -> Auto;
  - Toque no botão Kiosk: Solicitação de Fullscreen e ativação de Wake Lock de tela;
  - Toque no botão "Apagar Casa": Toque simples gera aviso instrutivo "Pressione e segure"; segurar por 800ms completa o anel circular SVG e dispara o desligamento geral;
  - Toque nos chips de alerta do cabeçalho: Expansão das gavetas de segurança e auditoria de baterias.
* **Dados Exibidos**:
  - Hora e data em tempo real atualizadas a cada segundo sem repintura do layout;
  - Contagem exata de lâmpadas acesas no momento (ex: "7 luzes acesas");
  - Estado individual de iluminação por cômodo com contadores relacionais (ex: "2/2", "1/4");
  - Sensores ambientais nos cômodos: Temperatura (°C), Umidade (%), Presença/Movimento e Estado de Portas;
  - Potência da rede em Watts (ex: "124 W") e telemetria meteorológica ("24 °C, Noite limpa").
* **Estados Visíveis Auditados**:
  - **Carregamento Inicial**: Esqueleto com opacidade sutil e sincronização em background em ~120ms.
  - **Conteúdo Carregado**: Visualização com renderização Liquid Glass e iluminação âmbar ativa nos ambientes ligados.
  - **Entidade Offline / Indisponível**: Dispositivos com sensor de porta ou lâmpada offline recebem badge de alerta "Offline" com realce âmbar/vermelho.
  - **Perda de Conexão**: Ao interromper o polling (ex: 2 falhas consecutivas da API), o cabeçalho exibe pílula vermelha "Offline" e cessa novas requisições agressivas.
  - **Reconexão**: Retorno automático do polling a cada 5s restaurando o badge "Ao vivo" em verde.
  - **Ação em Andamento / Otimista**: Ao tocar em um cômodo, o estado visual responde em 0ms (`travasOtimistasRef`) enquanto a chamada REST para o Home Assistant é processada em segundo plano.
* **Dependências**: Rota de API `/api/state`, modelos em `lib/rooms.ts`, `lib/ha.ts`, `lib/wakeLock.ts`, `ThemeContext.tsx`.
* **Permissões**: Requer sessão autenticada com cookie `casa_auth_session`.
* **Comportamento por Dispositivo de Entrada**:
  - **Touch**: Alvos com dimensão superior a 44px; suporte a gesto de press-and-hold de 800ms com anel SVG no botão "Apagar Casa"; ausência de sticky-hover em elementos estáticos.
  - **Mouse**: Micro-elevação óptica de 3px em cards nos estados de hover em desktops (`@media (hover: hover)`); cursor pointer em todas as superfícies acionáveis.
  - **Teclado**: Foco assistivo navegável por Tab; acionamento de modais via Enter/Espaço; fechamento de overlays ativos via Escape.

---

### SCR-03: Visão Dedicada de Ambiente
* **URL / Rota**: `http://localhost:3002/comodo/[id]` (ex: `/comodo/sala_de_estar`, `/comodo/quarto`, `/comodo/quarto_luca`)
* **Arquivo Fonte**: [`dashboard-app/app/comodo/[id]/page.tsx`](file:///c:/HomeAssistant/dashboard-app/app/comodo/%5Bid%5D/page.tsx)
* **Função**: Apresentar um painel aprofundado e isolado de um ambiente específico, permitindo controle minucioso de cada atuador, tomada inteligente, velocidade de ventilador e sensores perimétricos locais.
* **Componentes Principais**:
  - **Header do Cômodo**: Botão de retorno à tela inicial ("← Casa"), nome do ambiente, resumo de lâmpadas ativas e botão mestre de liga/desliga local.
  - **Barra de Navegação entre Cômodos**: Carrossel horizontal de pílulas táteis permitindo alternar instantaneamente para os outros 9 ambientes da residência.
  - **Grade de Dispositivos por Categoria**:
    - Seção Iluminação: Cards `DeviceTile.tsx` com slider de intensidade e botão "Ajustar";
    - Seção Climatização: Card de ventilador `FanControlCard.tsx` com 3 velocidades e modo reversão;
    - Seção Tomadas & Energia: Medição de consumo instantâneo (W) e chave de bloqueio infantil;
    - Seção Sensores & Segurança: Sensores de contato magnético de porta e detecção de movimento infravermelho.
  - **Empty State**: Renderização para cômodos sem atuadores cadastrados (ex: `/comodo/quarto`), exibindo placeholder informativo sóbrio.
* **Ações Disponíveis**:
  - Retorno imediato ao painel principal (`/`);
  - Navegação entre cômodos através do seletor horizontal;
  - Alternância individual de cada lâmpada e tomada;
  - Abertura do modal de dimmer para lâmpadas compatíveis;
  - Troca de velocidade de ventilação (Off, 1, 2, 3) e inversão exaustor/ventilador.
* **Dados Exibidos**:
  - Título do cômodo e contagem de cargas ligadas;
  - Potência instantânea por tomada em Watts;
  - Temperatura, umidade e nível de bateria de sensores perimétricos;
  - Alerta de portas abertas em tempo real.
* **Estados Visíveis Auditados**:
  - **Carregamento**: Skeleton sutil durante o carregamento de parâmetros do App Router;
  - **Sucesso**: Dispositivos agrupados em cards de vidro fosco com badges de status ativas;
  - **Cômodo Vazio**: Mensagem elegante informando que o ambiente não possui atuadores físicos sem quebrar o layout;
  - **Retorno**: Navegação instantânea de volta à Home sem recarregar o bundle da aplicação.
* **Dependências**: `comodosCompletos` de `lib/rooms.ts`, rotas `/api/state`, `/api/toggle`, `/api/control`.
* **Permissões**: Autenticado.
* **Comportamento por Dispositivo de Entrada**:
  - **Touch**: Barra de navegação com rolagem horizontal livre (`overflow-x: auto`) com inércia nativa (`-webkit-overflow-scrolling: touch`);
  - **Mouse**: Controles de clique e botões de incremento;
  - **Teclado**: Foco sequencial pelos dispositivos do cômodo.

---

### SCR-04: Sentinela Noturno OLED (Standby)
* **URL / Rota**: `http://localhost:3002/standby`
* **Arquivo Fonte**: [`dashboard-app/app/standby/page.tsx`](file:///c:/HomeAssistant/dashboard-app/app/standby/page.tsx) e [`AmbientNightMode.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/AmbientNightMode.tsx)
* **Função**: Proteger o painel de parede durante a noite e períodos de repouso, eliminando a poluição luminosa no ambiente residencial via **True Black OLED (#000000)** e prevenindo burn-in em painéis LED/OLED.
* **Componentes Principais**:
  - `ambient-night-overlay`: Superfície preta pura com emissão zero de luz em pixels não utilizados.
  - Relógio Noturno Minimalista: Hora e minutos em tipografia de precisão suíça de alto contraste noturno.
  - Data Completa: Dia da semana e data por extenso em português formal.
  - Pílulas Flutuantes de Sentinela:
    - Chip de Clima: Temperatura externa vs temperatura interna;
    - Chip de Iluminação: Contador de lâmpadas que ainda permanecem acesas na residência;
    - Chip de Segurança: Status consolidado do perímetro (ex: "Porta Quarto: Aberta").
  - Barra de Despertar: Indicador inferior pulsante com instrução visual "TOQUE PARA ACORDAR".
* **Ações Disponíveis**:
  - Toque ou clique em qualquer ponto da tela para despertar e restaurar a Home;
  - Pressionamento de teclas físicas (`Escape`, `Enter`, `Space`);
  - Proteção de toques involuntários com descarte nos primeiros 650ms de ativação (*guard time*).
* **Dados Exibidos**:
  - Horário exato com precisão milimétrica e atualização contínua;
  - Temperatura interna e externa;
  - Resumo de lâmpadas acesas e alertas de segurança perimétrica.
* **Estados Visíveis Auditados**:
  - **Prevenção Anti-Burn-In**: Deslocamento automático de subpixel a cada 75 segundos, movendo o centro de renderização do relógio e dos chips para evitar retenção residual de imagem.
  - **Transição de Saída**: Despertar ultra fluído em 260ms com feedback háptico.
* **Dependências**: Polling silencioso da API `/api/state`, `AmbientNightMode.tsx`.
* **Permissões**: Autenticado.
* **Comportamento por Dispositivo de Entrada**:
  - **Touch**: Toque simples em qualquer área da superfície desperta o painel;
  - **Mouse**: Clique do mouse restaura o painel;
  - **Teclado**: Escape, Enter ou barra de espaço cancelam o modo standby.

---

## 3. Fichas Técnicas dos Modais e Diálogos de Sobreposição

---

### MOD-01: Detalhes do Cômodo (RoomPopup)
* **Componente**: [`dashboard-app/app/components/RoomPopup.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/RoomPopup.tsx)
* **Gatilho de Abertura**: Toque no corpo de qualquer card de cômodo na tela inicial.
* **Função**: Oferecer controle direto dos interruptores e lâmpadas do ambiente sem transferir o usuário para outra página.
* **Elementos Contidos**:
  - Cabeçalho: Nome do cômodo, botão mestre "Apagar todos / Acender todos", botão de tela cheia (`↗`) para navegar para `/comodo/[id]` e botão fechar (`✕`).
  - Subcards de Iluminação: Grid de switches e lâmpadas, com botão "Ajustar" nas lâmpadas dimerizáveis.
  - Seção Climatização: Controle de ventilador de teto com seletor de velocidades e sentido de rotação.
  - Seção Sensores: Indicadores de presença, status de portas e sensores ambientais.
* **Estados e Ações**:
  - Alternância individual de cada ponto;
  - Fechamento por botão `✕`, clique no backdrop escuro ou tecla `Escape`;
  - Abertura encadeada do `LightDimmerModal` ao tocar em "Ajustar".

---

### MOD-02: Dimerizador e Cor de Luz (LightDimmerModal)
* **Componente**: [`dashboard-app/app/components/LightDimmerModal.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/LightDimmerModal.tsx)
* **Gatilho de Abertura**: Toque no botão "Ajustar" em lâmpadas dimerizáveis ou inteligentes nos subcards e subpáginas.
* **Função**: Controle fino de parâmetros de iluminação (brilho, temperatura Kelvin e paleta RGB).
* **Elementos Contidos**:
  - Bulbo Visual: Representação óptica centralizada que brilha na cor e intensidade em tempo real.
  - Slider Contínuo de Brilho: Barra de arrasto tátil de 0% a 100% com indicador numérico tabular.
  - Presets Rápidos de Potência: Botões táteis `Off` (0%), `Noite` (25%), `Ambiente` (50%), `Leitura` (75%) e `Foco` (100%).
  - Presets de Temperatura de Cor: Cenas rápidas `Leitura` (2700K), `Foco / Trabalho` (4000K), `Luz Noturna` (2200K) e `Relaxar & Jantar` (2400K).
  - Seletor de Cores RGB: Grade com paleta de cores para fitas de LED e lâmpadas Yeelight.
* **Estados e Ações**:
  - Arrasto contínuo em 60fps;
  - Fechamento imediato com persistência do valor selecionado no Home Assistant.

---

### MOD-03: Central de Mídia & TV (MediaHubModal)
* **Componente**: [`dashboard-app/app/components/MediaHubModal.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/MediaHubModal.tsx)
* **Gatilho de Abertura**: Toque no mini-card de TV/Mídia na barra panorâmica da Home.
* **Função**: Servir como controle remoto universal touch para a Smart TV Samsung 65", reprodutor do Music Assistant e console PS5.
* **Elementos Contidos**:
  - Status da TV: Fonte atual (HDMI1, TV Aberta), canal e tempo em execução.
  - Teclado D-Pad Ergonômico: Botões direcionais (▲, ▼, ◀, ▶), botão OK central, Voltar, Home e Menu.
  - Controles de Volume: Botões de Volume +, Volume -, Mudo e seletor numérico de canais.
  - Launcher de Aplicativos: Grid com 12 logos autênticos de streaming (Netflix, YouTube, Prime Video, Max, Disney+, Spotify, Globoplay, Apple TV+, etc.).
  - Abas Secundárias: Alternância para reprodução de áudio multiroom do Music Assistant e status do PlayStation 5.
* **Estados e Ações**:
  - Modo TV Desligada: D-pad e controles atenuados com opacidade suave, mantendo apenas o botão Power em destaque para evitar comandos cegos;
  - Fechamento via botão `✕`, backdrop ou tecla `Escape`.

---

### MOD-04: Gestão de Energia 24h (EnergyWidget)
* **Componente**: [`dashboard-app/app/components/EnergyWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/EnergyWidget.tsx)
* **Gatilho de Abertura**: Toque no mini-card de energia da barra panorâmica da Home.
* **Função**: Monitoramento da carga elétrica residencial, identificação de consumo fantasma e gestão de tomadas de alta potência.
* **Elementos Contidos**:
  - Telemetria de Potência: Medição instantânea em Watts (`tabular-nums`) e custo horário estimado em R$/h.
  - Gráfico Spline SVG 24h: Curva horária com scrubbing interativo ao deslizar o ponteiro para leitura de horários de pico.
  - Subcards de Tomadas Inteligentes: Interruptores individuais com medição de potência dedicada (PC do André, Tomadas do Quarto Luca e Banheiro).
* **Estados e Ações**:
  - Faixas de consumo com mudança de cor semântica: Verde (<120W), Âmbar (120-350W) e Vermelho (>350W);
  - Alternância direta das tomadas conectadas.

---

### MOD-05: Central do Robô Aspirador (VacuumWidget)
* **Componente**: [`dashboard-app/app/components/VacuumWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/VacuumWidget.tsx)
* **Gatilho de Abertura**: Toque no mini-card do aspirador na barra panorâmica da Home.
* **Função**: Controle operacional e monitoramento de saúde do robô aspirador Dreame.
* **Elementos Contidos**:
  - Resumo de Status: Status operacional ("Carregando", "Pronto", "Limpando", "Pausado", "Retornando à base") e bateria em porcentagem com barra visual.
  - Seletor de Nível de Sucção: 4 modos acústicos/potência: `Silencioso` (55 dB), `Padrão` (62 dB), `Forte` (68 dB) e `Turbo 🚀` (74 dB).
  - Ações Primárias: Botões táteis para Iniciar Limpeza, Pausar, Retornar à Base e Localizar Robô (bip sonoro).
  - Vida Útil de Peças & Consumíveis: Indicadores em porcentagem do filtro HEPA, escova principal, escovas laterais e sensores.
* **Estados e Ações**:
  - Suporte visual completo aos estados `charging`, `cleaning`, `docked`, `idle`, `error` e `offline`.

---

### MOD-06: Previsão Meteorológica 5 Dias (WeatherForecastModal)
* **Componente**: [`dashboard-app/app/components/WeatherForecastModal.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/WeatherForecastModal.tsx)
* **Gatilho de Abertura**: Toque no mini-card de clima na barra panorâmica da Home.
* **Função**: Consulta detalhada das condições atmosféricas e previsão estendida para a residência.
* **Elementos Contidos**:
  - Card Térmico Atual: Temperatura, sensação térmica real, porcentagem de umidade, velocidade e direção do vento, índice UV e visibilidade em km.
  - Previsão em Colunas para 5 Dias: Exibição do dia da semana, ícone meteorológico SVG condizente (sol, nuvens, chuva, tempestade), temperaturas mínima e máxima e probabilidade de precipitação.
* **Estados e Ações**:
  - Suporte a ícones dinâmicos de dia e noite;
  - Fechamento com `Escape` ou clique externo.

---

### MOD-07: Lista de Compras & Tarefas (TodoListWidget)
* **Componente**: [`dashboard-app/app/components/TodoListWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/TodoListWidget.tsx)
* **Gatilho de Abertura**: Toque no mini-card de compras da barra panorâmica da Home.
* **Função**: Consulta e gerenciamento rápido de suprimentos e compras da casa sincronizado com o Home Assistant.
* **Elementos Contidos**:
  - Campo de Entrada: Input de texto com botão de ação "+" para adicionar novo suprimento;
  - Lista de Pendências: Itens pendentes com checkboxes táteis circulares (mínimo 44px de área de clique);
  - Seção de Concluídos: Lista recolhível de itens já comprados com estilo riscado e opacidade atenuada.
* **Estados e Ações**:
  - Marcar item: Transição imediata com tachado do texto;
  - Adição de novos itens com resposta instantânea em 0ms.

---

### MOD-08 e MOD-09: Central de Alertas de Segurança e Baterias
* **Componente**: [`dashboard-app/app/components/HeaderAlertPill.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/HeaderAlertPill.tsx)
* **Gatilho de Abertura**: Clique nos chips de alerta do cabeçalho da Home (`2 alertas` ou `Baterias 50%`).
* **Função**: Auditoria rápida de segurança residencial e diagnóstico proativo de dispositivos sem fio.
* **Elementos Contidos**:
  - Modal de Segurança: Lista de sensores perimétricos violados ou abertos (ex: Porta do Quarto aberta) e dispositivos com comunicação perdida.
  - Modal de Baterias: Lista ordenada de todos os sensores alimentados por bateria com porcentagem e classificação visual (Verde >50%, Âmbar 20-50%, Vermelho crítico <=20%).
* **Estados e Ações**:
  - Exibição de contadores dinâmicos;
  - Fechamento rápido por toque no backdrop ou tecla Escape.

---

## 4. Matriz de Verificação de Estados e Resiliência

A tabela abaixo documenta o comportamento observado em cada uma das superfícies frente aos estados críticos de sistema exigidos na auditoria:

| Estado do Sistema | SCR-01 (Login) | SCR-02 (Home) | SCR-03 (Cômodo) | SCR-04 (Standby) | Modais e Sheets |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Carregamento Inicial** | Imediato (~60ms) | Skeleton sutil (~120ms) | Skeleton sutil (~100ms) | Fundo preto imediato | Animação fade/slide |
| **Conteúdo Carregado** | Keypad ativo | 10 cômodos e 5 widgets | Lista de atuadores | Relógio e chips ativos | Conteúdo preenchido |
| **Ausência de Dados** | N/A | Exibe 0 luzes acesas | Empty state elegante | Traço nos dados | Empty state com ícone |
| **Dados Incompletos** | N/A | Omite chips vazios | Exibe dados parciais | Omite chips sem leitura| Trata null com "—" |
| **Erro na API** | Mensagem inline | Mantém tela anterior | Mantém tela anterior | Mantém último estado | Mantém estado atual |
| **Perda de Conexão** | Bloqueia envio | Badge vermelho "Offline"| Pausa novos updates | Mantém relógio local | Sem disparo de toasts |
| **Reconexão** | Restaura keypad | Badge verde "Ao vivo" | Restaura polling | Atualiza chips | Atualiza dados |
| **Sessão Expirada** | Permanece no login | Redireciona para /login| Redireciona para /login | Redireciona para /login | Fecha modal e redireciona |
| **Entidade Offline** | N/A | Badge "Offline" no card| Badge "Offline" no tile | Sinalizado na segurança | Badge de indisponível |
| **Ação em Andamento** | Keypad travado | Resposta 0ms (otimista)| Resposta 0ms (otimista)| N/A | Spinner de loading |
| **Ação Concluída** | Redireciona | Confirmação no card | Confirmação no tile | N/A | Estado atualizado |
| **Ação Falhou** | Shake-fail + erro | Reversão em 3.5s | Reversão em 3.5s | N/A | Shake visual no card |
| **Cancelamento** | Botões C e ⌫ | N/A | N/A | N/A | Fechamento via Escape |
| **Retorno de Tela** | N/A | N/A | Botão "← Casa" | Toque desperta p/ Home | Botão ✕ ou backdrop |
| **Update sem Reload** | N/A | Polling a cada 5s | Polling a cada 5s | Polling a cada 5s | Polling concorrente |
