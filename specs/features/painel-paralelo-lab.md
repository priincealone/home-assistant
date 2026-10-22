# Painel paralelo (laboratório) — referência Lovable × Nocturnal Observatory

**Status:** protótipo de estudo, criado em 21/10/2026. **Não substitui nem altera `dashboard-app/`.**

## Objetivo
Estudar a distribuição de layout do protótipo Lovable "Home Assistant Control Center" aplicada à nossa estética
(Nocturnal Observatory, `dashboard-app/DESIGN.md`). Decidir, olhando lado a lado, o que vale levar ao painel real.

## Escopo e isolamento
- Pasta própria: `dashboard-lab/` (HTML/CSS/JS sem dependências, servidor Node de 30 linhas). Sem `npm install`,
  portanto sem risco ao `node_modules` do Google Drive.
- Porta **3011**. Nunca a 3002 (produção) nem a 3010 (dev do painel).
- **Dados 100% simulados.** Nenhuma chamada ao Home Assistant, nenhum token, nenhum comando físico (CLAUDE.md §11).
- Nomes de cômodos e aparelhos vêm do protótipo Lovable (não do `lib/rooms.ts`): é maquete, não contrato.

## O que se herda do Lovable (distribuição)
1. **Hero** no topo, com paisagem ao entardecer, saudação grande ("Boa tarde, André."), data, e uma linha de
   resumo: hora · clima · luzes acesas · aparelhos ativos · portas abertas.
2. **Cenas**: faixa de 5 atalhos, cada um com ícone, nome e descrição curta.
3. **Três colunas** abaixo: lista de **Ambientes** (com contagem de ligados) · **cômodos** com grade de
   aparelhos e "Apagar tudo" por cômodo · coluna **Segurança** (câmeras ao vivo).
4. Aparelho ligado vira cartão luminoso; sensores (porta, movimento) mostram só um ponto de estado.
5. Celular: barra inferior com 3 abas — Casa, Cenas, Câmeras.

## O que se mantém do nosso sistema
- Paleta: fundo `#07090e`, âmbar `#fbbf24` (aceso), ciano `#38bdf8`, esmeralda `#10b981`, carmesim `#ef4444`.
- Liquid Glass: superfícies translúcidas 4–18 %, borda `rgba(255,255,255,.10)`, brilho âmbar no ativo.
- Inter + `tabular-nums` em todo número. Raios 28/24/20 (casca), 24 (cartão), 16 (aparelho), pílula.
- Movimento: só `transform`/`opacity`/cor/sombra, tokens de duração do `DESIGN.md`, `prefers-reduced-motion`.
- Alvos de toque ≥ 44 px; `env(safe-area-inset-*)`; zoom do navegador **continua bloqueado** (decisão do André).
- Estado `unavailable` nunca aparece como "desligado" (reservado; sem dado real neste protótipo).

## Diferenças deliberadas em relação ao Lovable
- Tipografia serifada do Lovable **não** entra (regra: só Inter). O destaque do nome vira âmbar.
- Cartão ligado do Lovable é bege opaco; aqui é vidro âmbar (opacidade ≤ 18 %).
- Sem rolagem horizontal; texto longo quebra em até 2 linhas, nunca corta seco.

## Pontos de decisão para o André
- A coluna de Segurança fixa à direita vale mais que a faixa de energia/clima que o painel real tem hoje?
- Lista de Ambientes lateral (com filtro) substitui a grade de cômodos como porta de entrada?
- Hero com foto real da casa (Lovable usou imagem inventada) ou só o degradê?

## Rodada 2 — acabamento (21/10/2026)
- **Céu do hero reage à hora** (5 fases: madrugada, amanhecer, dia, entardecer, noite): degradê, estrelas, sol/lua num arco e montanhas mudam por variáveis CSS; `?hora=19` força a hora.
- **Raio cônico** giratório (`--ray-angle`, 28 s) e luz âmbar que vaza do aparelho aceso para os vizinhos.
- **Ícones Phosphor** (os mesmos do painel real), gerados em `icons.js` a partir do pacote já instalado em `dashboard-app` (sem `npm install` no lab). Contorno em repouso, preenchido quando ativo.
- **Estados de conexão** (`?net=online|carregando|sincronizando|offline`): esqueletos, selo de sem-conexão, comandos recusados com o controle desabilitado, faixa de aviso e números como "—" (nunca 0) sem leitura. Aparelho `unavailable` tem borda tracejada e texto "Indisponível": nunca parece desligado.
- ~~Painel "Controles de estudo"~~ removido em 21/10/2026 a pedido do André (todos os dispositivos). Os parâmetros de URL `?hora=` e `?net=` continuam para testes.

## Rodada 3 — Ambientes no celular (21/10/2026)
- ~~Seletor recolhível de Ambientes no celular~~ — substituído na Rodada 5.
- **Modo parede: descartado pelo André** (não se faz necessário). Foi implementado, avaliado e removido; não voltar a propor sem pedido.

## Rodada 4 — toque longo e ajustes (21/10/2026)
Tudo simulado em memória (`estado`); nada fala com o HA. Toque curto continua ligando/desligando; **segurar ≈ 450 ms** abre a **folha de ajustes** (bottom sheet < 768 px, diálogo centralizado acima).

**Aparelhos e controles**
- `light`: ligar/desligar + brilho 1–100 % ("Ligado · 60%" no cartão; mexer no brilho de lâmpada apagada liga-a). Vale para todas as lâmpadas, inclusive interruptores (a simulação não distingue dimerizáveis).
- `led` e luminárias (`sala.painel`, `luca.yeelink`, `closet.led`, `gourmet.led`): + temperatura de cor 2700–6500 K; só `led` tem também 5 cores predefinidas (escolher cor liga o aparelho; mexer na temperatura limpa a cor).
- `fan`: velocidade 1–3, oscilar, ligar/desligar (subtítulo "Velocidade 3 · Oscilando").
- `tv`: volume 0–100 (mexer no volume tira do mudo), mudo, entrada Netflix/YouTube/HDMI 1/HDMI 2 (o subtítulo mostra a entrada), ligar/desligar.
- `vacuum`: Iniciar / Pausar / Voltar à base e sucção (silencioso/padrão/forte). Subtítulos "Aspirando · 87%", "Pausado", "Na base · 100%". O cartão deixou de ser só leitura: **toque curto abre a folha**. Iniciar/Pausar fixam 87 %; Voltar à base volta a 100 % (simulação sem tempo).
- Sem folha: tomadas, console, sensores (porta, movimento) e indisponíveis.

**Gestos e atalhos** (Pointer Events)
- Cancela se o ponteiro andar > 8 px (rolagem vertical preservada: `touch-action: pan-y`) ou soltar antes de 450 ms. Após toque longo bem-sucedido o clique que o encerra é suprimido (não alterna o aparelho). Vibração leve em `try/catch`; `-webkit-touch-callout`/`user-select` desligados nesses cartões.
- Teclado e mouse: **Shift+Enter** ou **F10** com o cartão focado, **tecla Menu** (ContextMenu) e **botão direito** (`contextmenu`) abrem a folha.
- Cartões com folha mostram um ícone de sliders discreto no canto e `title`/`aria-description` "Segure para ajustar".
- Offline e carregando: cartões desabilitados, sem indicador e sem gesto.

**Folha**
- `role="dialog" aria-modal="true"`, título = aparelho + cômodo; foco vai para o painel, Tab preso dentro (e `inert` em `.wrap`/barra de abas), Esc e clique no fundo fecham (fundo ignora cliques nos primeiros 300 ms), foco volta ao cartão de origem. Fechar dura `var(--dur-fast)` (o JS lê o token); só `transform`/`opacity`. `body` trava rolagem enquanto aberta.
- Fica em `#folha`, fora de `#secao-casa`: `renderTudo()` não a recria (só chama `atualizaFolha()`), então arrastar o slider não perde foco nem nó. Altura máx. `min(86dvh, 640px)` com rolagem interna.
- Sliders `<input type="range">` com polegar de 44 px, valor em tabular-nums e `aria-valuetext` em português. Se a conexão cair com a folha aberta: controles desabilitados (o botão fechar não), aviso "Sem conexão com a casa…"; ao reconectar volta ao normal.
- Ícones novos no `icons.js`: sliders, X, play, pause, house (base), speaker.

**Verificado (Chrome, `localhost:3011`, iframes de mesma origem, eventos sintéticos)**
- Console sem erros na página limpa.
- Toque longo (PointerEvent) em lâmpada, LED, ventilador, TV e aspirador: abre, não alterna, Esc fecha, foco volta ao cartão; toque curto alterna; move 9 px cancela, 5 px não; soltar aos 200 ms cancela; tomada, console, sensores e indisponível não abrem; Shift+Enter, F10 e contextmenu abrem.
- Folha aberta (LED, TV, aspirador, ventilador, lâmpada) em 320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920 px × 800 e 320×480, texto a 100 % e 150 %: sem rolagem horizontal, nada além da viewport, alvos ≥ 44×44, altura ≤ máximo; rolagem interna só em 320×480 (LED, TV; com 150 % também o aspirador).
- Queda de conexão com a folha aberta, reconexão, "carregando", trava de foco e fundo fecham: ok. Varredura sem folha em 320/390/768/1024/1440/1920, online e offline (e as 3 abas no celular): sem estouro horizontal e sem alvos < 44 px.

**Não verificado**: toque real em celular (iOS/Android: `touch-callout`, vibração, `contextmenu` do Android após o toque longo), arrasto real do slider com dedo, Firefox/Safari (CSS do polegar com prefixo `-moz` escrito, não visto), leitor de tela, paisagem real de celular além de 320×480, `prefers-reduced-motion` na folha (regra escrita, não medida).

## Rodada 6 — cabeçalho enxuto e laterais fixas no tablet (21/10/2026)
- **Cabeçalho reduzido**: sai o rótulo "Casa · André"; o "Sistema online" vai para a lateral direita da linha da saudação (quebra para baixo só se faltar largura); margens e tamanho do título menores (≈ metade da altura anterior).
- **Tablet (768–1179 px)**: Ambientes viram o rail de ícones (mesmo do celular) numa coluna lateral de 56 px e a Segurança numa coluna de 200–260 px. As duas ficam fixas (`position: sticky`) e **sem rolagem própria**; só o centro (cômodos e aparelhos) rola, com a página. As câmeras **continuam as duas**: a altura de cada uma é limitada a `(100dvh − 190 px) / 2`, então encolhem em vez de rolar.
- Exceção conhecida: com altura menor que ~500 px (paisagem muito baixa) o rail ganha rolagem interna, porque 10 alvos de 44 px não cabem.

## Rodada 7 — tablet sem rolagem de página (21/10/2026)
- Causa do "ainda tem scroll": as laterais eram `sticky`, mas a página inteira (3.000+ px) rolava; em tablet paisagem as laterais começavam abaixo da dobra (Segurança até 825 px e rail até 878 px num 1024×768), então era preciso rolar para alcançá-las.
- **Casca de app** entre 768 e 1400 px de largura (altura ≥ 520 px): a página não rola. Saudação, resumo e as 5 cenas ficam fixos no topo (cenas em uma linha, sem o título); abaixo, três colunas ocupam a altura que sobra. **Só a coluna central rola** (barra fina, `overscroll-behavior: contain`). Rail (≤ 1179 px) ou lista de Ambientes (1180–1400 px) e Segurança ficam fixos e se ajustam; as 2 câmeras encolhem mantendo 16:9 até o mínimo de 48 px.
- Exceção: abaixo de ~640 px de altura com rail (ex.: 1024×600) o rail rola por dentro, pois 10 alvos de 44 px não cabem. Acima de 1400 px (desktop) e abaixo de 768 px (celular) nada mudou.

## Rodada 8 — pendências, experiência e testes (21/10/2026)
**Pendências fechadas**
- Interruptores do Banheiro não têm mais slider de brilho (`semDimmer`); o subtítulo deles nunca mostra "%".
- Se a conexão cai com a folha aberta, ao fechar o foco vai para a seção do cômodo (nunca para o `body`).
- **Dica de rolagem** sem barra: máscara de esmaecido (24 px no topo, 28 px na base) só nas bordas que têm mais conteúdo, aplicada apenas a contêineres que rolam (centro no tablet e rail), para não cortar o brilho dos cartões onde não há rolagem.
- O disco do sol/lua fica mais fraco no celular (não compete com o texto do resumo).
- Aspirador: a bateria desce 1 ponto a cada 5 s limpando (volta à base sozinho em ≤ 20 %) e recarrega 1 ponto a cada 5 s na base. Iniciar/Pausar não fixam mais 87 %. **Sem mapa**, por decisão do André.
- Sobre 767/768/1179 px exatos: a falha só aparecia em iframes de teste (largura fracionária pelo zoom do navegador); não é problema de aparelho real. Mantido como nota.

**Experiência**
- **Aviso com Desfazer** (5 s) ao ativar uma cena ou usar "Apagar/Acender tudo"; desfazer restaura o estado anterior exato (inclusive a cena ativa).
- ~~Busca de aparelho ou ambiente~~ **removida a pedido do André** (21/10/2026, "não se faz necessário neste caso"). Não voltar a propor sem pedido.
- **Favoritos**: interruptor "Favorito" na folha de **todos** os aparelhos acionáveis (a folha agora existe também para tomadas e console, com "Ligado" e "Favorito"); seção "Favoritos" no topo de "Todos"; estrela no cartão; persistido em `localStorage` (com `try/catch`).
- **Resumo do cômodo**: temperatura simulada + "x de y ligados".
- **Sensores com tempo**: "Aberta · há 12 min", "Sem movimento · há 41 min" (atualizam sozinhos, sem recriar botões).
- **Deslizar entre ambientes no celular** (só toque, ≥ 64 px e predominantemente horizontal; desligado com busca ativa, folha aberta ou fora da aba Casa); o rail acompanha.

**Testes** (`node --test dashboard-lab/tests/lab.test.mjs`, Node puro, 17 verificações, sem navegador e sem rede): carrega `icons.js` e `app.js` num contexto `vm` com DOM de mentira. Cobrem resumo, estado desconhecido ≠ 0, cenas (só aparelhos existentes; Cinema; Boa noite + Desfazer), "Apagar tudo", offline/carregando recusando comando, subtítulos, indisponível ≠ desligado, busca, favoritos, folha, bateria do aspirador, contrato HTML×JS×ícones e regras do design (sem rede, sem `transition: all`, zoom bloqueado, sem barras). Mutação de teste: quebrar a trava offline e o dimmer faz 2 testes falharem.

## Rodada 10 — hospedado dentro da Home Assistant (22/10/2026)
- O Painel Secundário aparece na barra lateral da HA (`panel_custom` `casa-painel-secundario`, `/painel-secundario`) e roda **inteiro na HA**: `scripts/manutencao/publicar_painel_secundario.mjs` copia `dashboard-lab/{index.html,styles.css,app.js,icons.js}` para `config/www/painel-secundario/` (servido em `/local/painel-secundario/`), com `?v=<hash>` nos arquivos e um `versao.json`. O módulo `config/www/casa-painel-secundario.js` é um carregador estável: lê `versao.json` (com carimbo de tempo) e abre o `index.html?v=…` num iframe de **mesma origem** da HA. Sem porta 3011, sem o PC do Node, sem *mixed content*.
- Os dados continuam **simulados**: o painel não fala com a HA nem aciona a casa. Dados reais são o passo de migração (`specs/features/migracao-painel-lab.md`), com plano próprio.
- Atualizar: editar `dashboard-lab/`, rodar os testes e o script de publicação; não reinicia a HA.

## Critérios de aceite
- Sem rolagem horizontal de 320 a 1920 px; 3 colunas ≥ 1180 px, 2 colunas 768–1179, 1 coluna + abas < 768.
- Texto a 150 % sem corte ou sobreposição.
- Nenhuma requisição de rede para o HA (verificável na aba Rede).

## Rodada 5 — rail de ambientes no celular (21/10/2026)
- **Decisão:** o seletor recolhível de Ambientes (`#amb-toggle`, `ambAberto`) foi removido e, abaixo de 768 px, entrou um **rail vertical fixo de ícones** (um por ambiente, sempre visível, sem abrir/fechar). **Razão:** a faixa horizontal de chips quebrava linha ou rolava. **Custo:** ~52 px de largura (gutter do celular cai para 12 px abaixo de 400 px para manter 2 colunas de aparelhos a partir de 360 px).
- Itens: "Todos" (grade) + 9 ambientes, só ícone Phosphor, sem contador nem rótulo: Sala de estar = Couch, Quarto = Bed, Quarto Luca = Baby, Closet = TShirt, Cozinha & Copa = CookingPot, Lavanderia = WashingMachine, Área Gourmet = Fire, Circulação = Footprints, Banheiro = Bathtub. (Hanger não existe no pacote.)
- Cada botão 44×44 px, `aria-label`/`title` com o nome, `aria-current="true"` no selecionado (âmbar suave, ícone preenchido; os demais em contorno). Tocar aplica `S.filtro`, como a lista de ≥ 768 px.
- `position: sticky` abaixo do topo, `max-height` = viewport − topo − barra de abas − safe-area; se os 10 itens não couberem (ex.: 320×480) o rail rola por dentro (vertical, scrollbar fina), nunca na horizontal.
- O rail é criado uma vez; `renderTudo` só atualiza `aria-current` e o ícone, então rolagem e foco do rail não se perdem. Aparece só na aba Casa; em Cenas e Câmeras o conteúdo usa a largura toda.
- Aparelhos: 2 colunas de 360 a 767 px (cartão ≥ 132 px), 1 coluna abaixo de 360 px. ≥ 768 px nada mudou (lista lateral/chips).

## Rodada 9 — Manutenção (21/10/2026)
**O que é**: campo só de leitura para ver de relance o índice de baterias e os aparelhos offline/indisponíveis, com o que fazer. A automação nunca depende dele; nenhum controle de comando na folha.
- **Entrada**: chip "Manutenção" no resumo do hero (botão persistente `#manut-chip`, 44 px, todos os tamanhos e abas). Ponto carmesim (crítico: bateria ≤ 15 % ou algo offline) ou âmbar (atenção: baixa ≤ 30 % ou sem leitura) + contagem de pendências; sem pendência, sem ponto. Carregando: "—". Só o conteúdo do chip é atualizado (a cada `tickSimulacao` e a cada 30 s), o botão não é recriado.
- **Folha** `#manutencao`: mesmo mecanismo e CSS da folha de ajustes (bottom sheet < 768 px, diálogo centralizado acima, `role="dialog" aria-modal`, foco preso por `prendeTab` compartilhado, Esc/fundo fecham, foco volta ao chip, fechar em `--dur-fast`, `.wrap`/`.tabbar` inert, página não rola). Exclusão mútua com a folha de ajustes. Conteúdo: resumo (média e contagens crítica/baixa/ok/sem leitura; "Offline: N"), "Tudo em ordem" sem pendências, lista de baterias (menor primeiro, barra com `scaleX`, % em tabular-nums, frase de ação), lista offline ("Fora do ar há 3 h", "Sem resposta há 12 min", com `tempoDesde`). Atualiza ao vivo (barras no lugar, sem recriar).
- **Dados simulados**: baterias Porta do Quarto 82, Porta da Lavanderia 14, Movimento da Lavanderia 37, Movimento da Área Gourmet 9, Aspirador (acompanha a simulação), Controle da TV sem leitura (`MANUT_EXTRA`, `bat: null`). Offline: Tomada 1 (`luca.t1`, 25 min), Câmera Rua · Canal 4 (3 h), Roteador do quarto (12 min), os dois últimos só em `MANUT_EXTRA`.
- **Regras**: faixas crítica ≤ 15, baixa ≤ 30, ok acima; sem leitura é faixa própria, mostra "—"/"Sem leitura de bateria", nunca 0 % e fica fora da média; indisponível/sem resposta nunca aparenta "desligado". `?net=offline`: aviso "último estado conhecido" e dados mantidos; `?net=carregando`: esqueletos, sem números.
- **Cartão**: sensor/aparelho com bateria ≤ 15 % ganha ícone BatteryLow carmesim no topo (title "Bateria crítica · 9 %"), sem mudar altura.
- **Verificado**: `node --test` 28/28 (12 novos: ordenação, faixas, média/contagens, sem leitura ≠ 0, offline com extras, vazio, chip, carregando/offline, aspirador após tick, indicador no cartão, inert/exclusão mútua/sem controles, ícones). Chrome (iframes mesma origem): folha em 320×640, 320×480, 390×800, 770×900, 1024×768, 1280×800, 1920×1000, texto 100 % e 150 %: sem rolagem horizontal, dentro da viewport, alturas ≤ min(86dvh, 640), botões ≥ 44, sem texto cortado, Esc fecha, foco volta ao chip, inert correto; rolagem interna presente em todos (conteúdo ~800 px). Chip com 6 pendências sem estouro a 320 px. Casca de tablet 1024×768 e 1280×800 sem rolagem de página/laterais; rail 44×44 (tablet e celular). Folha de ajustes (lâmpada por toque longo, aspirador por toque curto) segue abrindo e fechando. Offline e carregando ok. Console sem erros; `lab.favoritos` limpo.
- **Não verificado**: toque real em celular, leitor de tela, arrasto/rolagem por dedo dentro da folha, aparência a 1440/ paisagem além de 320×480, Firefox/Safari, comparação numérica da altura do hero antes/depois (127–132 px agora).
