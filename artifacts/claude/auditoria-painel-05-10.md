# Auditoria do painel e propostas de evolução — 05/10/2026

Escopo: `dashboard-app/` em produção (porta 3002, `next start`), tela principal, popup e página de cômodo,
modais de energia, mídia e câmeras, standby e login. **Nada foi aplicado. Nenhum dispositivo foi acionado**:
só abri telas e modais pelos botões de detalhe, e li estados por `GET`.

**Como foi medido.** Skill `impeccable` (critique + audit) em contexto único; detector determinístico sobre
`app/` (0 achados); navegador embutido com sessão aberta pelo André; medições por script na página
(fontes, raios, animações, alvos de toque, desfoques, rolagem, rede) em 1208×914, 1024×768 (parede),
768×1024 (tablet em pé) e 375×812 (celular); leitura do código; leitura de `/api/state` para cruzar o que a
tela mostra com o que o HA diz.

**Limites.** Viewport emulado, não o tablet físico. Gestos de toque (pressão longa, arrasto) não exercitados.
FPS não medido. O que está marcado "a confirmar" foi deduzido do código e não reproduzido.

---

## Nota

| # | Heurística (Nielsen) | Nota | Achado-chave |
|---|---|---|---|
| 1 | Visibilidade do estado | 2 | "AO VIVO" sem vídeo; TV "ligada" por sensor travado; tomada indisponível vira "Desligada" |
| 2 | Linguagem do mundo real | 3 | "1 fora", "Standby OLED", "Sinalização vermelha", porta listada em "Tomadas & Bloqueios" |
| 3 | Controle e liberdade | 2 | Nenhum "Desfazer" depois de Apagar tudo, Dormir ou cena |
| 4 | Consistência | 2 | "Apagar tudo" (luzes) exige segurar; "Apagar todas" (tomadas, inclui o PC) é um toque |
| 5 | Prevenção de erro | 2 | Botão "Desligar TV" envia `turn_on`; corte do PC sem confirmação |
| 6 | Reconhecer em vez de lembrar | 3 | No celular os chips "Aberta"/"TV" viram pontos de cor sem texto |
| 7 | Flexibilidade | 3 | Camadas cena → casa → cômodo → dispositivo funcionam |
| 8 | Estética e minimalismo | 2 | 57% da tela de parede acima dos cômodos; 3 frases de instrução fixas; 17 animações infinitas |
| 9 | Recuperação de erro | 3 | Toast + tremida + reversão; câmera fica "Conectando…" para sempre |
| 10 | Ajuda | 2 | A ajuda é texto fixo na tela e `title` (não existe passar o mouse na parede) |
| | **Total** | **24/40** | **Aceitável** (igual à crítica de 22/09) |

| # | Dimensão técnica | Nota | Achado-chave |
|---|---|---|---|
| 1 | Acessibilidade | 3 | Velocidade do ventilador sem `aria-pressed`; erro do PIN sem `aria-live`; selo de saúde sem rótulo |
| 2 | Desempenho | 3 | Produção ativa (CSS 47 KB gz, JS 457 KB gz); 9 desfoques; 17 animações infinitas, 11 seguem rodando sob o standby |
| 3 | Responsivo | 3 | Zero rolagem horizontal; parede cabe exato em 1024×768; celular só mostra cômodos a partir de y=666 de 812 |
| 4 | Tematização | 2 | 15.032 linhas de CSS, 175 `!important`, 1.152 `rgba(` literais contra 743 `var(--`, 16 raios distintos |
| 5 | Integridade | 2 | Estados inventados (câmera, TV, tomadas), listas de entidades duplicadas fora do contrato, código morto |
| | **Total** | **13/20** | **Aceitável** (26/09: 14/20) |

## Veredito de especificidade

**Autoral embaixo, genérico em cima.** O motor é de produto: trava otimista com TTL, coalescência de 140 ms,
reversão por snapshot, "segure para confirmar" dimensionado pela consequência, cômodos derivados de um contrato
único. A camada visual, porém, é o painel de IoT de qualquer catálogo: faixa de pílulas, faixa de cenas, faixa
de widgets, grade de cartões com caixa-de-ícone dentro do cartão e seta em cada um. O nome do sistema,
**Nocturnal Observatory**, não aparece em nenhum lugar da tela — é a maior oportunidade de identidade (ver F-01).

---

## 1. Erros encontrados

### P0 — Segurança (alçada 3: só o André decide)

> **Atualização de 05/10/2026, mesmo dia:** o André decidiu **remover o PIN e deixar o acesso livre**
> (D-011 em `docs/DECISIONS.md`). S-01, S-02, S-05 e S-06 deixaram de existir com a remoção; S-03 e S-04
> viraram parte do risco aceito (o painel inteiro é aberto na LAN e na tailnet). Mantidos abaixo como registro.

**S-01 · O painel em produção usa o PIN padrão escrito no código.**
`lib/auth.ts:1` cai no valor padrão quando `DASHBOARD_PIN` não existe — e ele não existe no `.env.local`, no
watchdog nem no ambiente do Windows (verificado por contagem, sem ler valores). Quem lê o repositório sabe o PIN.
Correção: definir `DASHBOARD_PIN` no `.env.local` (só o André) e remover o padrão do código (falhar fechado).

**S-02 · O middleware só verifica se o cookie existe, não se é válido.**
`middleware.ts:28` aceita qualquer valor em `casa_auth_session`. O token gerado em `lib/auth.ts` nunca é
conferido. Correção: assinar o token (HMAC com segredo do servidor) e validar no middleware. **Não testei a
exploração.**

### P1 — Segurança

**S-03 · `/api/state` é público e entrega o token das câmeras.** A rota está liberada no middleware
(`middleware.ts:13`) e devolve o estado de 87 entidades, incluindo `entity_picture` das câmeras com
`?token=` do `camera_proxy` do HA (conferido: presente nas duas câmeras; valor não exibido). Qualquer aparelho
da rede lê a casa inteira sem PIN.

**S-04 · `/api/camera/*` é público.** `middleware.ts:14` libera o prefixo inteiro (HLS e diagnóstico).

**S-05 · Cookie `secure` em produção sobre HTTP da rede local — a confirmar no aparelho.**
`app/api/auth/login/route.ts:24`: com `NODE_ENV=production` (vale desde 26/09) o cookie leva `Secure`, que os
navegadores recusam em `http://192.168.31.22:3002`. Aparelhos já logados seguem pelo cookie antigo de 365 dias;
um aparelho novo provavelmente não consegue entrar. Testar num celular que nunca entrou.

**S-06 · PIN de 4 dígitos sem limite de tentativas.** 10 mil combinações, sem atraso nem bloqueio.

> Documentação desatualizada: `CLAUDE.md` diz "O painel não tem autenticação"; existe PIN desde 24/09.

### P1 — Funcionamento

> **Atualização de 06/10/2026:** E-01 a E-04 corrigidos e publicados, junto com M-07 (Desfazer) e M-08
> (régua de confirmação) — `specs/features/painel-estados-verdadeiros.md` e `ESTADO_DASHBOARD.md` (06/10).

**E-01 · O botão "Desligar TV" envia `turn_on`.**
O rótulo e o selo "LIGADA" vêm de `sensor.tv_sala_estado` (travado em `on` desde 01/10, 21:47), e a ação vem de
`media_player.tv_un65du8000gxzd` (que está `off`). `TvRemoteWidget.tsx:44,219` + `page.tsx:687` + `alternar()`
calcula o oposto do `media_player`. Resultado: a tela diz "TV ligada" no resumo, no chip do cômodo, na central
de mídia e no popup, e o botão "Desligar" ligaria. Fonte única para estado **e** ação; sensor velho deve
aparecer como "sem leitura há 4 dias". (Ver CLAUDE.md §11.3 sobre a tecla POWER da Samsung.)

**E-02 · "AO VIVO" fixo no código, com as câmeras fora do ar.**
`CameraGlanceWidget.tsx:52` e `SurveillanceHubModal.tsx:142` escrevem "AO VIVO" sem condição. Medido: 20+ s em
"Conectando…" com `readyState 0`, enquanto `camera.rua_canal_2/4` estão `unavailable` no HA. Para segurança, é
o pior tipo de mentira: quem olha acredita que está vendo a rua. Correção: selo derivado do player (conectando /
ao vivo / sem sinal desde HH:MM), tempo-limite com "Tentar de novo", último quadro esmaecido com horário.

**E-03 · "Apagar todas" (energia) corta o PC com um toque.**
`EnergyWidget.tsx:260–277`: botão de destaque máximo do modal (âmbar sólido), sem segurar, inclui
`switch.computador_socket_1` (112 W em uso na medição). O "Apagar tudo" das luzes, menos danoso, exige 800 ms.
Correção: mesma régua de segurar, e excluir do lote a tomada do PC (ou exigir confirmação nominal).

**E-04 · Tomada indisponível aparece como "Desligada".**
`EnergyWidget.tsx:152–156` testa só `=== "on"`. `switch.tomada_inteligente_socket_1/2` estão `unavailable` e a
tela diz "Desligada" — viola a regra do CLAUDE.md §12. Também "de 5 tomadas" é fixo no texto.

### P2

> **Atualização de 06/10/2026 (fase 3, lote A):** corrigidos E-05, E-06 (B-02), E-07, E-08, E-10, E-12, E-13,
> E-14, E-15, E-16 (HealthWidget), E-17, E-19 e parte do E-20 (telemetria e contagem de alertas; o escurecimento
> por horário ficou como estava). E-11: o "Ajustar" e as setas já tinham 44 px sob toque; o que faltava era o
> iPad, que relata `pointer: fine` — corrigido com `data-toque`. E-18 deixou de existir com a saída do PIN.

**E-05 · Selo de consumo pisca entre Econômico e Moderado.** Limite seco em 120 W; medi 112 → 121 → 146 → 112 W
em minutos, com troca de cor e texto. Falta histerese (ex.: sobe em 130, desce em 110) ou média móvel.

**E-06 · Entidades pedidas que não existem no HA.** `/api/state` devolve `null` para
`binary_sensor.sensor_banheiro_movimento`, `binary_sensor.sensor_closet_movimento`,
`sensor.dreame_…_battery_level` e `todo.tarefas`. Duas delas estão em `AmbientNightMode.tsx:23–32` para
acordar a tela por presença — nunca disparam. Relaciona-se com B-02.

**E-07 · Alerta vermelho permanente.** Três portas "abertas" desde 04/10 (sala 11:57, quarto 11:35, lavanderia
17:22 UTC). O selo "3 alertas" brilha em vermelho o tempo todo, e o standby mostra só "Porta do Quarto", sem
contagem. Ou as portas estão abertas, ou os sensores travaram — a tela não ajuda a decidir. Mostrar duração
("aberta há 35 h") e marcar suspeita de sensor parado depois de N horas sem mudança.

**E-08 · Selos do cabeçalho não dizem o que significam.**
"Baterias 50%" no bloco "Em ordem" é a **menor** bateria, mas lê-se "baterias pela metade". O selo de saúde mostra
o texto genérico "Requer atenção" (`HealthPill`, sem `aria-label`). "1 fora" não diz o que está fora.

**E-09 · Cenas com resultado inventado no cliente.** `page.tsx:510–596` repete a lista de entidades e até o
brilho (51, 180, 76) dos scripts do HA; se o script mudar, a tela mente por 5 s. Em falha,
`travasOtimistasRef.current.clear()` apaga **todas** as travas, inclusive de comandos sem relação em voo.
`estadosRef` não é atualizado nas cenas Cinema/Chegar/Gamer.

**E-10 · Ventilador: o estado "Desligado" é o elemento mais chamativo do modal.** Gradiente ciano com brilho no
segmento desligado; os segmentos não têm `aria-pressed` (estado só visual).

**E-11 · Alvos abaixo de 44 px.** "Ajustar" no popup do cômodo: 69×30. Setas do controle remoto: 50×40 e 40×50.

**E-12 · Celular: significado só por cor.** Chips "Aberta" (15×11 px) e "TV" (10×6 px) perdem o texto e viram
pontos; os ícones dos selos do cabeçalho somem; "3 alertas" ocupa a largura toda como barra vermelha.

**E-13 · Popup e página do mesmo cômodo falam línguas diferentes.** "Apagada" × "Desligado"; "Acender todos" ×
"Acender Cômodo"; "Ventilação & Clima" × "Climatização & Conforto"; dicas diferentes. Na página, o sensor de
porta está em "Tomadas Inteligentes & Bloqueios".

**E-14 · Compras mostra "Tudo comprado" quando a leitura falha.** `TodoListWidget.tsx:50–58` não trata erro;
lista vazia por falha vira "tudo comprado" (hoje a rota responde 200 com 6 itens — defeito latente).

### P3

- **E-15** Ícones desalinhados na mesma linha quando os chips quebram em duas linhas (Sala e Quarto: ícone a 62 px
  do topo; vizinhos a 37 px, em 1024×768).
- **E-16** Código morto: `WeatherWidget.tsx` e `HealthWidget.tsx` não têm importador.
- **E-17** Documentação divergente: `AGENTS.md` diz TTL de 3,5 s, o código usa 5 s; `PRODUCT.md` ainda diz "V1 só
  light/switch".
- **E-18** Login: não aceita teclado físico, erro sem `aria-live`, "⌫" como caractere em vez de ícone do registro.
- **E-19** Barras de "segure" atualizam por `setInterval` de 20 ms (50 renderizações/s); o relógio renderiza a
  cada segundo mas só mostra minutos; 11 animações seguem rodando por baixo do standby.
- **E-20** Standby: escurecimento profundo só a partir das 23h fixas; telemetria em 13 px sob um relógio de 307 px
  (ilegível a distância).

---

## 2. Melhorias de design e uso

> **Atualização de 06/10/2026 (fase 3, lote B):** feitos M-01/M-12 (ordem), M-02, M-03 e M-10. M-07, M-08 e M-09
> saíram na fase 2. Não feitos de propósito: M-04 e M-06 (contrariam decisões do André de 27 e 25/09), M-05
> (redesenho) e M-11 (dividir o CSS, trabalho à parte).

**M-01 · Os cômodos são a ação principal e recebem 43% da tela.** Em 1024×768 a grade começa em y=436.
Cabeçalho, cenas e resumo comem o resto. Comprimir o resumo numa faixa única e deixar a grade ser o herói.

**M-02 · Tirar as frases de instrução fixas.** "Toque para ativar atmosfera", "Toque num cartão para abrir os
detalhes", "Contador: luzes acesas / total · Toque no cômodo…". Um painel de parede se aprende uma vez; dica
única na primeira vez, depois some.

**M-03 · Dez setas de 48 px competem com os nomes dos cômodos.** Manter o alvo de 48 px, mas com glifo discreto
no canto (ou gesto de arrastar para cima / pressão longa).

**M-04 · Trocar a "sopa de selos" por uma linha de estado.** Quatro pílulas, uma delas com o próprio nome do
bloco. Alternativa: uma frase calma ("Tudo em ordem · 3 portas abertas desde ontem") ou um anel de saúde em
volta do relógio (F-04).

**M-05 · Caixa dentro de caixa.** Ícone dentro de quadrado arredondado dentro do cartão. O estado aceso já está
na cor e no brilho; o quadrado só soma borda.

**M-06 · Excesso de bordas coloridas ao mesmo tempo.** Com 9 luzes acesas, 7 cartões com borda âmbar e 2 com borda
vermelha. Reservar a borda para problema; aceso fala pelo brilho interno.

**M-07 · Desfazer em toda ação em lote.** Os snapshots já existem (`snapshotsAnteriores`): um toast de 8 s com
"Desfazer" depois de Apagar tudo, Dormir e cenas.

**M-08 · Unificar a régua de confirmação.** Toda ação que apaga em lote ou corta energia: segurar 800 ms. Toda
ação aditiva: toque simples.

**M-09 · Uma fonte de verdade por dispositivo.** TV, câmera e tomadas mostram um estado e agem sobre outro. Regra:
o que a tela mostra é o que a ação lê.

**M-10 · Escala de tipo e de raio.** 10 tamanhos em uso (salto de 29 → 123 px) e 16 raios. Fechar em 6 tamanhos e
6 raios do `DESIGN.md`; piso de 13 px para o que precisa ser lido da parede (hoje 29 textos em 11 px).

**M-11 · Dividir o `globals.css`.** 15 mil linhas acumuladas por data ("auditoria de 26/09", "27/09"), 175
`!important`. Separar por área e apagar sobreposições.

**M-12 · Estado do cômodo no celular.** No celular os cômodos começam abaixo da dobra. Abrir com os cômodos e
deixar cenas/resumo numa linha rolável horizontal.

---

## 3. Propostas para um painel futurista, dinâmico e elegante

Ordenadas pelo quanto conversam com esta casa (não com "um painel qualquer"). Cada uma diz o que é, por que
aqui, e o custo.

### Identidade

**F-01 · Modo Observatório (visão noturna vermelha).** Astrônomos usam luz vermelha para não perder a adaptação
ao escuro. À noite (por `sun.sun`, não 23h fixas) o painel inteiro migra para âmbar-vermelho de baixa luminância:
relógio, ícones e brilho. Dá sentido ao nome "Nocturnal Observatory", reduz a luz no quarto e é barato: um conjunto
de tokens trocado por atributo no `<html>`. **Custo: baixo. Impacto: alto.**

**F-02 · Luz real como linguagem.** O brilho de cada cômodo proporcional ao `brightness` real e tingido pela
`color_temp_kelvin` (o Painel vai de 2000 a 6500 K). O cartão vira um espelho da luz da sala, não um "aceso/apagado"
genérico. **Custo: baixo.**

**F-03 · Acender como filamento.** Pendente (otimista) = brilho fraco pulsando; confirmado pelo HA = brilho cheio
com rampa curta de aquecimento (120–200 ms). Mostra a diferença entre "pedi" e "aconteceu" sem texto.
**Custo: baixo.**

### Visão de conjunto

**F-04 · Anel de saúde em volta do relógio.** Quatro segmentos (segurança, energia, rede, baterias), cinza quando
em ordem, colorido só quando pede atenção. Substitui as pílulas. **Custo: médio.**

**F-05 · Planta viva 2.5D (sem esperar o LiDAR).** Planta isométrica em SVG desenhada da planta real: cômodos
acendem com a luz real, portas abrem, movimento aparece como onda no ponto do sensor. Vira a tela do modo
passivo. Quando o LiDAR vier, troca para modelo `.glb` (a comunidade do HA já tem cartões 3D com luz física e
zonas por cômodo). **Custo: alto. Impacto: o mais alto de todos.** Exige especificação em `specs/widgets/`.

**F-06 · Linha do tempo do dia ("rebobinar a casa").** Faixa arrastável com portas, luzes e movimento de hoje,
usando `/api/historico` (já existe). Responde "quem acendeu?" e "a porta ficou aberta quanto tempo?" — o que hoje
exige `scripts/diagnostico/quem_acendeu.py`. **Custo: médio.**

**F-07 · Casa em uma frase.** Resumo em linguagem natural gerado por regras locais, sem nuvem: "Tudo calmo. Cozinha
e Área Gourmet acesas. Porta da sala aberta há 35 h." **Custo: baixo.**

### Dinâmica

**F-08 · Dois modos que se transformam um no outro.** Parado, o painel é ambiente (relógio, frase, planta); ao toque,
os elementos se reorganizam em modo de controle com View Transitions — API presente em Chrome, Firefox e Safari
18+, inclusive no iPad. É exatamente a "Dualidade Passivo / Ativo" do `PRODUCT.md`, hoje feita por troca seca.
**Custo: médio.**

**F-09 · Céu como fundo.** Gradiente do plano de fundo seguindo a elevação do sol e o tempo (nublado, chuva) a partir
de `sun.sun` e `weather.forecast_casa`, em CSS (sem WebGL no tablet). **Custo: baixo.**

**F-10 · Energia como fluxo.** Linhas animadas da rede para cada circuito, velocidade proporcional aos watts;
alertas de anomalia ("PC ligado há 9 h"). **Custo: médio.**

**F-11 · Prévia da cena.** Ao pressionar uma cena, os cômodos afetados mostram em fantasma o que vai mudar antes de
confirmar. **Custo: médio.**

### Funcional

**F-12 · Tempo real por eventos.** Em vez de polling de 5 s, o servidor Next assina `subscribe_entities` no WebSocket
do HA e repassa ao navegador por SSE. Interruptor físico refletido em menos de meio segundo, token continua no
servidor, uma fonte de verdade. **Atenção ao CLAUDE.md §13**: exige discussão; reconexão com backoff exponencial
com teto e nunca disparar comando ao reconectar. **Custo: médio. Alçada 2.**

**F-13 · Câmera que aparece quando importa.** Movimento no portão à noite → miniatura flutuante por 20 s. Câmera
fora do ar → último quadro esmaecido com "sem sinal desde 19:22" e "Tentar de novo". **Custo: médio.**

**F-14 · Acordar por presença de verdade.** Hoje dois dos quatro sensores usados nem existem (E-06). Usar só
sensores reais e, se o tablet for Android, Fully Kiosk (tela, brilho e câmera frontal como sensor de aproximação);
no iPad, Acesso Guiado + sensores do HA. **Custo: baixo a médio.**

**F-15 · Voz local.** Botão de microfone para o Assist do próprio HA, em português, sem nuvem. **Custo: médio.**

**F-16 · Tipografia de mostrador.** Inter tem eixo de tamanho óptico (`opsz`): usar o corte de display no relógio e
no número de watts, mantendo a família. **Custo: baixo.**

---

## 4. O que está bom (manter)

1. **Modelo otimista de padrão de produto**: trava com TTL, coalescência de 140 ms, fila por alvo, reversão com
   snapshot, confirmação em 1,2 s, tremida e vibração na falha.
2. **Higiene de modal**: foco vai para o fechar, Esc fecha, foco volta ao botão de origem (verificado ao vivo).
3. **Encaixe sem rolagem**: tela principal cabe exata em 1024×768 e 1208×914; zero rolagem horizontal em todos os
   tamanhos.
4. **Standby elegante**: relógio arquitetônico, proteção contra marcação de tela, despertar com trava de 650 ms.
5. **Indisponível ≠ desligado** nos cômodos e no PS5 (ícone esmaecido + selo) — só falta estender ao resto (E-04).

---

## 5. Ordem recomendada

| Ordem | Item | Quem | Alçada |
|---|---|---|---|
| 1 | S-01, S-02, S-06 (PIN, token assinado, limite de tentativas) | André decide; backend implementa | 3 |
| 2 | S-03, S-04, S-05 (rotas públicas, cookie) | backend | 2 |
| 3 | E-01, E-02, E-03, E-04 (estados mentirosos e corte do PC) | frontend + backend | 2 |
| 4 | E-05 a E-14 + M-07, M-08, M-09 | frontend | pedido do André |
| 5 | F-01, F-02, F-03, F-07, F-09, F-16 (identidade, baratos) | frontend | pedido do André |
| 6 | M-01 a M-06, M-10, M-12 (hierarquia) + F-04, F-08 | frontend | pedido do André |
| 7 | F-05, F-06, F-10 a F-15 (grandes, exigem spec) | spec antes | 2 |
| 8 | M-11 (dividir CSS), E-15 a E-20 | frontend | — |

---

## Fontes da pesquisa

- [Ready-Made 3D Floorplan for Home Assistant — Physics-Based Lighting](https://community.home-assistant.io/t/ready-made-3d-floorplan-for-home-assistant-physics-based-lighting-fully-offline-no-extra-tools/1012715)
- [Interactive Floorplan Card](https://community.home-assistant.io/t/interactive-floorplan-card/999710)
- [home-assistant-js-websocket (subscribeEntities)](https://github.com/home-assistant/home-assistant-js-websocket)
- [Home Assistant — Frontend Architecture](https://developers.home-assistant.io/docs/frontend/architecture)
- [CSS View Transitions & Scroll Animations 2026](https://blog.codercops.com/blog/css-view-transitions-scroll-animations-2026)
- [Principles of Calm Technology](https://principles.design/examples/principles-of-calm-technology)
- [Calm Technology Is Replacing Notification-Heavy Smart Displays](https://divoom.com/blogs/industry-trends/calm-technology-replacing-notification-heavy-smart-displays)
- [iOS 26 — Liquid Glass no app Casa](https://bgr.com/2176790/)
- [Smart home IoT dashboard mobile UI](https://vp0.com/blogs/smart-home-iot-dashboard-mobile-ui)
