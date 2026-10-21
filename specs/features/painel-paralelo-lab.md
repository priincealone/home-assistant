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
- Painel "Controles de estudo" no rodapé alterna conexão e hora sem mexer na URL.

## Rodada 3 — Ambientes no celular (21/10/2026)
- **Ambientes no celular** viram um seletor recolhível (mostra o ambiente atual e a contagem); ao escolher um, fecha.
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

## Critérios de aceite
- Sem rolagem horizontal de 320 a 1920 px; 3 colunas ≥ 1180 px, 2 colunas 768–1179, 1 coluna + abas < 768.
- Texto a 150 % sem corte ou sobreposição.
- Nenhuma requisição de rede para o HA (verificável na aba Rede).
