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
   aparelhos e "Apagar tudo" por cômodo · coluna **Segurança** (câmeras ao vivo + aviso de clipes).
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

## Rodada 3 — modo parede e Ambientes no celular (21/10/2026)
- **Modo parede** (botão "Modo parede", ou `?modo=parede`; só ≥ 900 px de largura): a página não rola. Hero compacto numa linha, 5 cenas, grade 3×3 de **cartões de cômodo** (nome, "x de y ligados", interruptor geral e um botão de 44 px por aparelho) e as 2 câmeras empilhadas à direita. Tocar no nome do cômodo abre o detalhe dele. Abaixo de ~720 px de altura a grade de cômodos rola por dentro (a página continua fixa).
- **Ambientes no celular** viram um seletor recolhível (mostra o ambiente atual e a contagem); ao escolher um, fecha.
- Offline/carregando valem também no modo parede (controles desabilitados, esqueletos).

## Critérios de aceite
- Sem rolagem horizontal de 320 a 1920 px; 3 colunas ≥ 1180 px, 2 colunas 768–1179, 1 coluna + abas < 768.
- Texto a 150 % sem corte ou sobreposição.
- Nenhuma requisição de rede para o HA (verificável na aba Rede).
