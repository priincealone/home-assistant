# Inventário Completo de Fluxos de Usuário (user-flow-inventory.md)

**Documento**: `artifacts/visual-audit/user-flow-inventory.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído (Fase 2)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Design System**: *Nocturnal Observatory* (Liquid Glass, 60fps, Zero-Scroll Wall Mount)  
**Metodologia**: Validação ponta a ponta via subagente de navegação no browser, medição de tempos de resposta, transições de estado e acessibilidade.

---

## 1. Visão Geral dos Fluxos da Experiência Residencial

A arquitetura de navegação do `dashboard-app` divide a experiência do usuário em três camadas fundamentais:
1. **Camada Perimétrica (Acesso e Sentinela)**: Controle de acesso ergonômico (`/login`) e proteção noturna de tela (`/standby`).
2. **Camada Tática de 1º Nível (Glanceability & Ações Rápidas)**: Leitura de telemetria, acionamento de cenas de um toque e controle de ambientes sem rolagem no painel de parede (`/`).
3. **Camada Operacional de 2º Nível (Modais, Detalhes e Ajustes Finos)**: Gestão aprofundada de cômodos, multimídia, aspiração robótica, energia e subpáginas dedicadas (`/comodo/[id]`).

---

## 2. Catálogo Detalhado de Fluxos de Usuário

---

### FLUXO 01: Autenticação, Desbloqueio e Recuperação de Erro
* **Ponto de Partida**: Qualquer tentativa de acesso ao painel sem cookie válido (redirecionado para `/login`).
* **Objetivo**: Garantir acesso seguro e imediato ao morador em ambiente físico residencial.
* **Passo a Passo de Interação**:
  1. O usuário visualiza o card de vidro com o visor de 4 dots circulares vazios e o teclado numérico touch;
  2. O morador digita os 4 dígitos do PIN (`1`, `2`, `3`, `4`) utilizando o keypad touch, cliques de mouse ou teclado físico;
  3. A cada dígito inserido, o respectivo dot é preenchido instantaneamente com brilho âmbar e pulso háptico suave (`12ms`);
  4. Ao preencher o 4º dígito, a interface entra em estado transitório de validação (`carregando = true`), desativando o teclado para prevenir duplo clique;
  5. **Cenário de Sucesso**: O backend valida o PIN via `/api/auth/login`, grava o cookie de sessão `casa_auth_session`, emite vibração háptica de confirmação `[20, 40]` e executa transição suave em 0ms para a Home (`/`);
  6. **Cenário de Erro**: Se inserido PIN incorreto (ex: `9999`), o sistema dispara vibração háptica de recusa `[45, 60, 45]`, aplica a animação elástica de rejeição (`.shake-fail`), tinge os dots de vermelho alerta (`.is-error`), exibe a mensagem textual "PIN incorreto. Tente novamente." e esvazia automaticamente os dígitos;
  7. **Cenário de Correção**: O usuário pode a qualquer momento tocar em `⌫` para retroceder um dígito ou em `C` para reiniciar o preenchimento.
* **Comportamento por Dispositivo**:
  - *Touch*: Teclas de 60px de diâmetro com alvo tátil confortável para polegar;
  - *Teclado*: Suporte total a teclas numéricas 0-9, `Backspace`, `Escape` e navegação via `Tab`.
* **Tempo de Execução**: ~1.2 segundos para desbloqueio completo.

---

### FLUXO 02: Leitura Passiva de Parede (Glanceability no 1º Viewport)
* **Ponto de Partida**: Dashboard Principal (`/`) em tablet montado na parede (1024×768 landscape).
* **Objetivo**: Apreender o estado completo da residência com um simples bater de olhos a passos de distância, sem tocar na tela e sem rolagem vertical.
* **Passo a Passo de Interação**:
  1. O morador caminha em direção à cozinha/sala e avista o painel;
  2. O relógio digital de grande formato com numerais tabulares (`Clock.tsx`) informa hora e data com alta nitidez;
  3. O cabeçalho exibe o resumo global: "7 luzes acesas", badge de rede verde "Ao vivo", badge de alertas de segurança e integridade de bateria;
  4. A barra panorâmica sintetiza: clima atual (24°C, Noite limpa), consumo de energia (124W, 4 tomadas), som ambiente (Apple Music Standby), status do aspirador (Pronto) e pendências de compras (3 itens);
  5. A grade espacial dos 10 cômodos indica instantaneamente quais ambientes possuem lâmpadas ligadas através da luminescência âmbar viva nos cards e contadores numéricos (ex: Sala `2/2`, Lavanderia `1/1`);
  6. **Critério Zero-Scroll**: A tela permanece rigorosamente contida em `100dvh`, sem qualquer barra de rolagem horizontal ou vertical.
* **Tempo de Execução**: 0 segundos (leitura puramente passiva em menos de 1.5s de atenção visual).

---

### FLUXO 03: Acionamento Imediato de Cenas Residenciais
* **Ponto de Partida**: Dashboard Principal (`/`), seção "Cenas da Casa" (`QuickScenesPanel.tsx`).
* **Objetivo**: Modificar a atmosfera global da casa com um único toque em rotinas predefinidas.
* **Passo a Passo de Interação**:
  1. O usuário identifica os 4 cards de atmosfera: `Cinema`, `Chegar`, `Dormir` e `Gamer`;
  2. O usuário toca no card desejado (ex: `Cinema`);
  3. **Resposta Visual em 0ms**: O card exibe pulso visual imediato e realce de borda com luminescência âmbar dedicada;
  4. O painel despacha requisição POST para `/api/scene` com o identificador da rotina;
  5. O Home Assistant executa em lote os comandos físicos (desliga luzes de teto da sala, acende o painel dimerizado, liga a Smart TV na fonte principal);
  6. O polling do painel sincroniza os novos estados das entidades refletindo a nova iluminação em todos os cards.
* **Salvaguardas**: O botão `Gamer` aciona explicitamente a ventilação forçada do rack sem alternância cega, prevenindo superaquecimento térmico.

---

### FLUXO 04: Acionamento Mestre Rápido por Cômodo (Dual Touch Affordance)
* **Ponto de Partida**: Grade de cômodos na Home (`/`).
* **Objetivo**: Ligar ou desligar todas as lâmpadas de um cômodo específico com a máxima agilidade de passagem.
* **Passo a Passo de Interação**:
  1. O usuário visualiza o card do cômodo (ex: `Área Gourmet`);
  2. Em vez de tocar no corpo do card, o usuário toca especificamente no **ícone circular** localizado à esquerda do título;
  3. **Comutação Otimista em 0ms**: O ícone e o card transitam visualmente de imediato (se estava apagado, acende com aura âmbar viva `#fbbf24`; se estava aceso, apaga);
  4. O sistema registra trava otimista (`travasOtimistasRef`) de 3.5 segundos para a entidade mestre;
  5. A requisição HTTP despacha o comando para o Home Assistant em segundo plano;
  6. Caso haja falha de rede ou timeout, a interface reverte suavemente o estado visual após o término da trava sem ricochete abrupto de layout.

---

### FLUXO 05: Inspeção e Controle Granular por Cômodo (RoomPopup)
* **Ponto de Partida**: Grade de cômodos na Home (`/`).
* **Objetivo**: Controlar lâmpadas individuais, tomadas ou verificar sensores de um cômodo sem sair da tela principal.
* **Passo a Passo de Interação**:
  1. O usuário toca no **corpo** do card do cômodo (área neutra ou texto);
  2. O modal `RoomPopup.tsx` abre suavemente em animação de fade e elevação sobre o backdrop fosco (`backdrop-filter: blur(28px)`);
  3. O cabeçalho do popup exibe o nome do ambiente, botão "Apagar todos / Acender todos", botão de expandir para página dedicada (`↗`) e botão fechar (`✕`);
  4. O usuário visualiza os subcards organizados em grid:
     - Cada lâmpada possui seu interruptor tátil independente;
     - Lâmpadas dimerizáveis apresentam o botão "Ajustar";
     - Ambientes com ventilador exibem o card com velocidades 1, 2, 3 e sentido de rotação;
     - Sensores perimétricos exibem status em tempo real (Porta fechada/aberta, Movimento detectado);
  5. O usuário toca em um interruptor específico: o subcard atualiza seu estado em 0ms com pulso luminoso;
  6. O usuário encerra o modal clicando no `✕`, tocando fora do diálogo no backdrop ou pressionando a tecla `Escape`.

---

### FLUXO 06: Dimerização e Calibração Térmica de Luz (LightDimmerModal)
* **Ponto de Partida**: Botão "Ajustar" em qualquer lâmpada inteligente (no `RoomPopup` ou na subpágina `/comodo/[id]`).
* **Objetivo**: Ajustar milimetricamente o nível de brilho, temperatura Kelvin (luz quente a fria) ou cor RGB.
* **Passo a Passo de Interação**:
  1. O usuário toca em "Ajustar" no card da lâmpada (ex: `Painel` na Sala de Estar);
  2. O modal `LightDimmerModal.tsx` sobrepõe a tela com foco no bulbo óptico central iluminado;
  3. **Ajuste de Brilho**: O morador desliza o dedo ou cursor pelo slider horizontal contínuo (0 a 100%). A luminescência em torno do bulbo e o valor numérico tabular acompanham o arrasto em 60fps;
  4. **Atalhos Rápidos de Intensidade**: O usuário pode selecionar presets instantâneos: `Off` (0%), `Noite` (25%), `Ambiente` (50%), `Leitura` (75%) e `Foco` (100%);
  5. **Temperatura de Cor (Kelvin)**: Para lâmpadas CCT, o usuário escolhe entre cenas térmicas: `Leitura` (2700K âmbar aconchegante), `Relaxar & Jantar` (2400K), `Luz Noturna` (2200K) ou `Foco / Trabalho` (4000K neutro);
  6. **Seletor de Cores RGB**: Para lâmpadas com espectro colorido (ex: fita Sonoff ou Yeelight), uma paleta táctil permite trocar a matiz;
  7. O usuário fecha o modal pressionando a tecla `Escape` ou tocando fora; o ajuste é sincronizado com a lâmpada física via `/api/control`.

---

### FLUXO 07: Central Multimídia, TV Samsung e Streaming (MediaHubModal)
* **Ponto de Partida**: Mini-widget de TV/Mídia na barra panorâmica da Home.
* **Objetivo**: Navegar nos menus da Smart TV Samsung, alternar fontes, controlar áudio e abrir streamings diretamente do tablet.
* **Passo a Passo de Interação**:
  1. O usuário toca no card de Mídia;
  2. O modal `MediaHubModal.tsx` expande o controle remoto em tela cheia com efeito Liquid Glass;
  3. **Identificação de Estado da TV**:
     - Se a TV estiver desligada, os direcionais D-pad e controles de volume apresentam opacidade atenuada com indicação "Standby", mantendo em destaque o botão Power;
     - Se a TV estiver ligada, exibe o aplicativo/canal em reprodução e tempo ativo;
  4. **Navegação D-Pad**: O usuário utiliza os direcionais circulares (▲, ▼, ◀, ▶) e botão central OK com feedback tátil de clique sem ricochete de tela;
  5. **Ajuste de Volume**: Botões dedicados de Volume +, Volume - e tecla Mudo;
  6. **Abertura de Streaming**: O usuário toca no logo de um dos 12 streamings integrados (Netflix, YouTube, Prime Video, Max, Disney+, Spotify, etc.), despachando o deep link de abertura para o Tizen OS da TV;
  7. **Música Multiroom**: Ao alternar para a aba secundária "Música", o usuário acessa a fila do Music Assistant, capa do álbum atual e controles de reprodução;
  8. O modal é encerrado via `Escape` ou toque no botão fechar.

---

### FLUXO 08: Gestão Energética e Histórico 24h (EnergyWidget)
* **Ponto de Partida**: Mini-widget de Energia na barra panorâmica da Home.
* **Objetivo**: Diagnosticar o consumo de energia da casa, identificar horários de pico e desligar cargas pesadas ociosas.
* **Passo a Passo de Interação**:
  1. O usuário toca no card de Energia (exibindo potência instantânea, ex: `124 W`);
  2. O modal `EnergyWidget.tsx` é aberto exibindo a telemetria consolidada;
  3. O topo do modal exibe o consumo acumulado em Watts e o custo horário estimado em Reais (R$/h);
  4. O usuário observa a faixa semântica de potência: Verde (<120W - Econômico), Âmbar (120-350W - Moderado) ou Vermelho (>350W - Pico);
  5. **Scrubbing Interativo no Gráfico 24h**: O usuário desliza o dedo/cursor sobre a curva spline SVG, inspecionando o consumo exato em cada hora do dia e identificando picos de chuveiro ou ar condicionado;
  6. **Controle de Tomadas**: Na base do modal, o usuário visualiza as tomadas inteligentes monitoradas (Tomadas Luca, PC Escritório, Banheiro) e pode desligar qualquer carga individualmente para economia de energia;
  7. Fechamento via tecla `Escape` ou botão fechar.

---

### FLUXO 09: Aspiração Robótica e Manutenção (VacuumWidget)
* **Ponto de Partida**: Mini-widget de Aspirador na barra panorâmica da Home.
* **Objetivo**: Controlar o robô Dreame, selecionar potência de sucção e checar desgaste de filtros e escovas.
* **Passo a Passo de Interação**:
  1. O usuário toca no card do aspirador na barra diária;
  2. O modal `VacuumWidget.tsx` exibe a animação do robô, status operacional ("Pronto na base", "Limpando", "Carregando") e nível de bateria;
  3. **Seleção de Potência**: O morador toca em um dos 4 modos acústicos:
     - `Silencioso` (55 dB - Ideal para a noite);
     - `Padrão` (62 dB - Limpeza diária);
     - `Forte` (68 dB - Carpetes e poeira densa);
     - `Turbo 🚀` (74 dB - Sucção máxima);
  4. **Comandos Operacionais**: Botões táteis para "Iniciar Limpeza", "Pausar" ou "Retornar à Base";
  5. **Auditoria de Consumíveis**: O usuário rola até a seção de manutenção para inspecionar a porcentagem de vida útil do filtro HEPA, escova central rotativa, escovas laterais e sensores ópticos de colisão;
  6. Fechamento via `Escape` ou botão fechar.

---

### FLUXO 10: Lista de Suprimentos e Compras (TodoListWidget)
* **Ponto de Partida**: Mini-widget de Compras na barra panorâmica da Home.
* **Objetivo**: Adicionar itens em falta e marcar suprimentos comprados no supermercado com sincronização em tempo real.
* **Passo a Passo de Interação**:
  1. O usuário toca no card "Compras" (ex: "3 itens a comprar");
  2. O modal `TodoListWidget.tsx` exibe a lista de itens sincronizada com o Home Assistant;
  3. **Adicionar Item**: O usuário digita no campo "Adicionar à lista..." (ex: "pilhas AAA") e pressiona `Enter` ou toca no botão `+`. O item surge imediatamente no topo com resposta em 0ms;
  4. **Marcar como Concluído**: O usuário toca no checkbox circular ao lado de um item existente (ex: "café nespresso"). O texto recebe efeito tachado suave e é movido para a seção recolhível de itens concluídos;
  5. Fechamento via `Escape` ou toque fora do modal.

---

### FLUXO 11: Consulta Meteorológica Expandida (WeatherForecastModal)
* **Ponto de Partida**: Mini-widget de Clima na barra panorâmica da Home.
* **Objetivo**: Consultar detalhes atmosféricos da residência e planejar os próximos 5 dias da semana.
* **Passo a Passo de Interação**:
  1. O usuário toca no card de temperatura (`24 °C`);
  2. O modal `WeatherForecastModal.tsx` é exibido em layout de alta legibilidade;
  3. O painel superior exibe sensação térmica precisa, umidade relativa (89%), velocidade e direção do vento (14 km/h), pressão barométrica e visibilidade;
  4. O painel inferior divide a previsão dos próximos 5 dias em colunas verticais com ícones meteorológicos SVG (sol, nuvens, chuva), temperaturas mínimas/máximas e probabilidade de precipitação;
  5. Fechamento via `Escape` ou clique no botão fechar.

---

### FLUXO 12: Auditoria Perimétrica de Segurança e Baterias
* **Ponto de Partida**: Badges de alerta no cabeçalho superior (`2 alertas` ou `Baterias 50%`).
* **Objetivo**: Identificar imediatamente portas abertas na residência ou sensores sem fio necessitando de troca de bateria.
* **Passo a Passo de Interação**:
  1. O usuário identifica a pílula vermelha destacada no topo ("2 alertas");
  2. Ao clicar na badge, a gaveta modal de segurança abre listando os avisos críticos (ex: "Porta do Quarto: Aberta" e "Sensor Sala: Offline");
  3. O morador identifica a anomalia sem precisar inspecionar a casa fisicamente;
  4. Ao clicar na badge "Baterias 50%", abre-se a lista de diagnóstico ordenando os sensores do menor para o maior nível de carga com indicadores de cor (Verde, Âmbar, Vermelho crítico);
  5. Fechamento rápido via toque no backdrop ou tecla `Escape`.

---

### FLUXO 13: Navegação Dedicada de Ambientes (/comodo/[id])
* **Ponto de Partida**: Ícone de expansão em tela cheia (`↗`) no `RoomPopup` ou navegação por URL.
* **Objetivo**: Operar em modo imersivo dentro de um cômodo específico com visão detalhada de todos os seus atuadores.
* **Passo a Passo de Interação**:
  1. No `RoomPopup` da Sala de Estar, o usuário toca no botão `↗`;
  2. A aplicação executa transição de rota suave para `/comodo/sala_de_estar`;
  3. O cabeçalho dedicado exibe o botão de retorno "← Casa", o título do ambiente e resumo de lâmpadas ativas;
  4. A barra superior oferece carrossel de abas horizontais permitindo alternar diretamente para qualquer outro cômodo (Cozinha, Copa, Lavanderia, etc.) com um único toque;
  5. Os dispositivos do ambiente são dispostos em seções temáticas (Iluminação, Climatização, Mídia, Tomadas, Sensores);
  6. Para cômodos vazios (ex: `/comodo/quarto`), um empty state informativo comunica com clareza a ausência de atuadores físicos cadastrados;
  7. O usuário toca no botão "← Casa" para retornar à Home com seu estado anterior preservado.

---

### FLUXO 14: Salvaguarda Global de Desligamento ("Apagar Casa")
* **Ponto de Partida**: Botão mestre "Apagar Casa (N)" no cabeçalho da Home.
* **Objetivo**: Desligar todas as lâmpadas acesas da residência com proteção absoluta contra acionamentos acidentais em telas de passagem.
* **Passo a Passo de Interação**:
  1. O usuário visualiza o botão com a contagem de luzes ativas (ex: "Apagar (7)");
  2. **Tentativa de Toque Simples Acidental**: O usuário encosta a mão rapidamente no botão sem intenção deliberada. O sistema descarta a ação de desligamento, emite pulso háptico e exibe a dica flutuante instrutiva: "Pressione e segure para confirmar";
  3. **Acionamento Deliberado (Hold to Confirm)**:
     - O morador pressiona e mantém o dedo/cursor sobre o botão;
     - O anel circular de progresso SVG preenche suavemente de 0% a 100% durante **800 milissegundos** estritos;
     - Se o usuário soltar o dedo antes dos 800ms, a operação é imediatamente cancelada e o anel retorna a zero;
     - Ao completar os 800ms, o sistema confirma o acionamento com vibração háptica firme, aciona a rota de desligamento em lote e atualiza o contador do cabeçalho para zero em 0ms.

---

### FLUXO 15: Comutação de Tema & Modo de Alto Contraste
* **Ponto de Partida**: Botão circular de tema no cabeçalho da Home.
* **Objetivo**: Alternar a paleta visual entre o modo noturno imersivo e modo claro de alta visibilidade diurna.
* **Passo a Passo de Interação**:
  1. O usuário toca no botão de tema;
  2. O tema comuta ciclicamente na ordem: `Dark` (Obsidian) -> `Light` (Claro) -> `Auto` (Seguir sistema operacional);
  3. A transição aplica os atributos `data-theme` e classes `.theme-dark` ou `.theme-light` no elemento raiz do documento;
  4. O painel adapta as cores de superfície, tipografia e auras luminosas sem recarregar a página;
  5. A preferência é gravada no `localStorage` sob a chave `dashboard_theme`.

---

### FLUXO 16: Modo Kiosk (Fullscreen & Screen Wake Lock)
* **Ponto de Partida**: Botão circular de tela cheia no cabeçalho da Home.
* **Objetivo**: Travar o painel em modo totem/display contínuo de parede, ocultando a barra de navegação do navegador e impedindo o desligamento da tela por inatividade.
* **Passo a Passo de Interação**:
  1. O usuário toca no botão Kiosk;
  2. A aplicação dispara `document.documentElement.requestFullscreen()`, expandindo a interface para preencher 100% dos pixels físicos do display;
  3. Simultaneamente, o módulo `lib/wakeLock.ts` solicita a trava de tela via `navigator.wakeLock.request("screen")`;
  4. O ícone do botão reflete o estado ativo (`.is-active`);
  5. Caso a aba perca a visibilidade e retorne, o listener reconecta automaticamente o Wake Lock;
  6. Um novo toque no botão ou a tecla `Escape` desativa o modo Kiosk e libera a tela para o descanso normal do sistema operacional.

---

### FLUXO 17: Sentinela Noturno (Standby OLED) e Despertar Tátil
* **Ponto de Partida**: Botão de Lua/Screensaver no cabeçalho da Home ou navegação para `/standby`.
* **Objetivo**: Proteger o display contra burn-in e extinguir a luz ambiente durante a madrugada, mantendo telemetria essencial visível.
* **Passo a Passo de Interação**:
  1. O morador vai dormir e toca no ícone de Lua no cabeçalho;
  2. A interface transiciona para a superfície True Black absoluta (`#000000`, 0 nits) do modo Sentinela;
  3. O relógio noturno minimalista assume o centro visual acompanhado de data completa e pílulas atenuadas de clima, lâmpadas ativas e segurança perimétrica;
  4. **Proteção Anti-Burn-In**: A cada 75 segundos, a tela executa translação randômica de subpixel para não desgastar emissores estáticos de LED/OLED;
  5. **Guard-Time**: Toques involuntários nos primeiros 650ms de ativação são filtrados e descartados;
  6. **Despertar Tátil Instantâneo**: Ao acordar, o usuário toca em qualquer ponto da tela ou pressiona `Escape`/`Enter`. O modo sentinela é desativado em menos de 260ms e o dashboard principal reaparece pronto para o uso.

---

### FLUXO 18: Resiliência a Falhas de Rede, Latência e Reconexão
* **Ponto de Partida**: Instabilidade momentânea no roteador Wi-Fi ou reinicialização do container Docker do Home Assistant.
* **Objetivo**: Manter a estabilidade visual da interface sem congelar o navegador do usuário e retomar a sincronização assim que o sinal for restabelecido.
* **Passo a Passo de Interação**:
  1. O painel executa polling periódico adaptativo a cada 5 segundos através da rota `/api/state`;
  2. Na primeira falha de comunicação, o status comuta para `sincronizando` (pílula âmbar) e preserva integralmente os últimos dados válidos em cache;
  3. Se houver 2 falhas consecutivas ou perda de conectividade do sistema (`navigator.onLine === false`), o status comuta para `offline` (pílula vermelha);
  4. As travas otimistas continuam ativas para garantir que toques recentes do usuário não sejam revertidos abruptamente por leituras em branco;
  5. Quando a rede e o Home Assistant se restabelecem, o polling detecta a resposta HTTP 200 na próxima iteração, zera o contador de falhas e comuta a pílula do cabeçalho de volta para "Ao vivo" em verde brilhante, sem exigir recarregamento da página (`F5`).
