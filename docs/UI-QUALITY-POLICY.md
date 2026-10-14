# UI-QUALITY-POLICY — regra obrigatória de qualidade visual do painel

Instituída pelo André em 14/10/2026. **Obrigatória** para qualquer agente ou pessoa que altere a interface do painel
(`dashboard-app/app/**`, `dashboard-app/components/**`, `globals.css`, `DESIGN.md`). Vale junto com o `CLAUDE.md`, que
tem precedência em segurança (§10 segredos, §11 comandos físicos, §12 estado offline).

Toda mudança visual passa pelo agente **`visual-gatekeeper`** (`.claude/agents/visual-gatekeeper.md`), que aplica esta
regra ponto a ponto e devolve **APROVADO** ou **RECUSADO**. Sem APROVADO, a tarefa não está pronta.

---

## 0. Postura

Atue como engenheiro frontend sênior, arquiteto de UI e especialista em design systems responsivos, acessibilidade, CSS
moderno e qualidade de interfaces. O painel está **em produção**: não pode acumular regressões visuais nem funcionais.
Toda alteração preserva ou eleva o padrão atual.

**Nunca remova, oculte, simplifique ou substitua funcionalidade existente para resolver um problema visual.** Corrija a
causa raiz preservando todas as capacidades do painel.

## 1. Regra principal — não entregue erros

Antes de considerar qualquer tarefa concluída:

1. Audite visualmente **toda** a área afetada.
2. Audite telas, componentes, estados e fluxos **adjacentes** que possam ter sido impactados.
3. Verifique em múltiplos viewports, resoluções, densidades e orientações (§5).
4. Corrija todas as regressões encontradas antes de finalizar.
5. Execute validação funcional, visual e de responsividade.
6. Só declare concluída quando não houver erro visual, quebra de layout, sobreposição, truncamento indesejado,
   desalinhamento, rolagem inesperada ou perda de conteúdo.

Não peça revisão manual para o que você consegue detectar e corrigir sozinho. A revisão humana é a última camada de
confirmação, não uma etapa de correção.

## 2. Padrão de interface — proibido (corrigir imediatamente)

- Texto cortado, truncado sem necessidade, sobreposto ou fora do contêiner.
- Botões, cartões, ícones, rótulos e valores desalinhados.
- Largura ou altura fixa que quebra quando o conteúdo muda.
- Rolagem horizontal não intencional.
- Conteúdo cortado embaixo ou na lateral da tela.
- Espaçamento inconsistente entre componentes semelhantes.
- Cartões com alturas diferentes quando deveriam seguir o mesmo padrão.
- Layout que depende de quantidade fixa de itens, de texto curto ou de dados conhecidos.
- Quebra quando título, nome de dispositivo, valor, estado, unidade ou rótulo fica mais longo.
- Sobreposição de elementos em telas pequenas.
- Componente que não se reorganiza ao girar o aparelho.
- Estados vazio, carregando, erro, offline, indisponível ou sem dados mal formatados.

## 3. Responsividade e adaptação dinâmica

O layout se adapta ao conteúdo e ao espaço disponível, com:

- Flexbox e/ou CSS Grid; `@container` quando a adaptação depende do espaço do componente (ver `docs/UI-RESPONSIVE.md`).
- Unidades relativas: `rem`, `%`, `fr`, `min()`, `max()`, `clamp()`; colunas com `minmax(0, 1fr)` em vez de `1fr` puro
  quando o conteúdo pode ser maior que a coluna.
- Larguras mínimas e máximas controladas; `min-width: 0` em filhos de flex/grid que precisam encolher.
- Quebra de linha inteligente.
- **Truncamento só quando intencional**: com reticências ou rolagem (`SmartTruncateText`), sempre com o texto completo
  acessível (`title`, dica ou expansão). Corte seco é defeito.
- Grade que se reorganiza conforme o viewport; tipografia fluida e legível.
- Espaçamento por tokens do design system (`DESIGN.md`, variáveis do `globals.css`).
- Componentes e classes reutilizáveis em vez de CSS duplicado ou estilo pontual.

## 4. Conteúdo dinâmico

Nenhum componente assume tamanho fixo de conteúdo. Todo componente suporta: textos curtos e longos; nomes de
dispositivo longos; muitos itens; poucos itens; nenhum item; dados indisponíveis; atualização em tempo real; estados
diferentes para o mesmo tipo de entidade. Quando o Home Assistant traz conteúdo novo ou alterado, o layout se reorganiza
sozinho, sem sobrepor e sem exigir ajuste manual de CSS.

## 5. Matriz obrigatória de verificação

**Larguras**: 320, 375, 390, 430, 768, 820, 1024, 1280, 1440 e 1920 px.

**Alturas de referência** (retrato / paisagem):

| Largura | Retrato | Paisagem |
| :--- | :--- | :--- |
| 320 | 320×568 | 568×320 |
| 375 | 375×812 | 812×375 |
| 390 | 390×844 | 844×390 |
| 430 | 430×932 | 932×430 |
| 768 | 768×1024 | 1024×768 |
| 820 | 820×1180 | 1180×820 |
| 1024 | 1024×1366 | 1366×1024 |
| 1280 / 1440 / 1920 | — | 1280×800 · 1440×900 · 1920×1080 |

**Também**: teclado virtual aberto (simular com altura reduzida, ex. 375×400); texto grande (raiz a 125% e 150%);
zoom do navegador por teclado (125%/150%) no desktop; modo claro e escuro **se aplicável**; estados carregando, erro,
offline e reconexão; conteúdo dinâmico (rótulos longos, valores alterados, itens a mais e a menos).

> Zoom por pinça no celular e no tablet está **bloqueado por decisão do André** (`user-scalable=no`). Não propor
> liberar; a acessibilidade de tamanho se valida por texto grande.

## 6. Fluxo obrigatório para cada alteração

1. **Diagnóstico** — objetivo; componentes, arquivos, estados e telas afetados; impactos colaterais possíveis.
2. **Planejamento** — a solução mais simples, limpa e sustentável; causa raiz em vez de remendo visual. Evite
   `!important`, valor mágico, posicionamento absoluto desnecessário e largura fixa. (O `globals.css` já tem muitos
   `!important` herdados; código novo só usa quando for a única forma de vencer um `!important` existente, e diz isso
   em comentário.)
3. **Implementação** — com o design system e os componentes existentes; consistência de espaçamento, tipografia, cor,
   raio, sombra, ícone e hierarquia. Sem mudar identidade, funcionalidade ou comportamento sem necessidade.
4. **Auditoria automática** — matriz do §5; conteúdo curto, longo, vazio, carregando e com erro; alinhamento,
   truncamento, overflow, rolagem, toque (alvo ≥ 44 px), foco e interações; nenhuma funcionalidade removida ou
   degradada.
5. **Correção severa** — qualquer problema é corrigido na hora e a auditoria se repete. Nada é entregue com regressão
   conhecida.
6. **Revisão do `visual-gatekeeper`** — só segue com **APROVADO**. RECUSADO volta ao passo 5.
7. **Relatório final** — o que mudou; problemas encontrados e como foram corrigidos; testes feitos; e a frase
   explícita: **"Nenhuma regressão visual ou funcional conhecida permanece."** — dita só quando for verdade.

## 7. Definição de pronto (visual)

- Layout íntegro em todos os viewports testados.
- Nenhum texto cortado ou sobreposto indevidamente.
- Nenhum componente quebra com conteúdo longo, curto, vazio ou dinâmico.
- Nenhuma rolagem horizontal indesejada.
- Reorganização correta ao girar o aparelho.
- Todas as funcionalidades anteriores continuam funcionando.
- Código limpo, reutilizável, sem duplicação desnecessária.
- Nenhum problema novo em outras telas.
- `visual-gatekeeper`: **APROVADO**.

Se algum cenário não puder ser validado automaticamente, **declare isso** no relatório e diga qual verificação manual
mínima falta. **Não finja que um teste foi feito.**

## 8. Limites de segurança durante a auditoria (do `CLAUDE.md`)

- **Nunca acione a casa para auditar.** Abrir modal e rolar é permitido; tocar em luz, tomada, TV, ventilador, cena,
  aspirador ou qualquer botão que mande comando é proibido. Para ver um estado (aceso, indisponível, texto longo),
  simule o dado na página (`javascript_tool`) ou use o servidor de desenvolvimento.
- Auditoria de desenvolvimento na porta **3010** (`.claude/launch.json`, `painel-dev-3010`); a 3002 é produção.
- Estado desconhecido nunca aparece como desligado (§12).
