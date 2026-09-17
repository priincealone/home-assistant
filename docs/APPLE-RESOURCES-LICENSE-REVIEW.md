# Revisão de licenciamento — recursos de design da Apple

Data: 16/09/2026. Autor: Claude Code, a pedido do André.

## Por que este documento existe

O painel (`dashboard-app/`) tem estética inspirada no design da Apple (cantos arredondados,
vidro fosco, tipografia densa, hierarquia por peso). Antes de considerar usar qualquer
recurso oficial da Apple para reforçar essa estética — ícone, fonte, template, referência
visual — é preciso saber o que a licença de cada recurso realmente permite. Esta é uma
revisão de licenciamento, não uma implementação: **nada foi baixado, instalado ou
incorporado ao projeto nesta etapa.**

A fonte primária usada aqui é o texto integral do contrato de licença que a própria Apple
distribui — `Apple-Design-Resources-License-20230621-English.pdf`, obtido em
`developer.apple.com/support/downloads/terms/apple-design-resources/` — e não resumos de
terceiros. Onde a informação vem de fórum ou página secundária, isso está marcado
explicitamente e tratado como corroboração, não como fonte.

---

## 1. SF Symbols

**Finalidade.** Biblioteca de ~6.000 ícones vetoriais alinhados à tipografia SF, com pesos e
escalas combináveis. Seria usado, em tese, como fonte de referência visual para os ícones do
painel (hoje o painel usa outro conjunto — não confirmado nesta revisão qual).

**Origem.** App "SF Symbols" distribuído pela Apple para macOS, ligado à mesma licença dos
Apple Design Resources (a licença do PDF trata "Apple Design Resources" como o pacote
guarda-chuva que inclui símbolos e templates; a fonte SF em si tem licença própria, ver §2).

**Licença aplicável.** Mesmo contrato do §5 abaixo (Apple Inc. License Agreement for Apple
Design Resources, 21/06/2023), mais uma camada adicional específica de SF Symbols citada em
fóruns de desenvolvedor da Apple (não obtive o PDF dessa camada nesta sessão — tratar como
não verificada em texto primário): uso restrito à criação de interfaces para software que
roda em iOS, iPadOS, macOS, tvOS ou watchOS, proibição de uso em logotipo ou marca, e
proibição de símbolos "confusingly similar" fora desse escopo.

**Uso comercial.** Permitido — mas só dentro do escopo de Mock-Up definido pela licença (ver
§5.1): interface de software para as plataformas Apple. Não há licença de uso comercial
irrestrito.

**Uso em aplicação web.** **Não permitido.** O texto do contrato (§2.B) é explícito: os
recursos não podem ser instalados, usados ou executados "for the purpose of creating
mock-ups of user interfaces to be used in software products running on any non-Apple
operating system software", e não podem ser usados para "create, develop, display or
otherwise distribute any documentation, artwork, **website content** or any other work
product". Um painel Next.js servido num navegador é conteúdo de website rodando fora do
runtime de um app nativo Apple — fora do escopo permitido, mesmo que o dispositivo final
exibindo a tela seja um Mac ou iPad.

**Redistribuição.** Proibida. §2.B veta aluguel, empréstimo, venda, sublicenciamento ou
redistribuição não autorizada; §2.C proíbe extrair, copiar, modificar ou reempacotar o
"Template Content" como clip art ou ativo de estoque.

**Limitações.** Símbolos que representam produtos ou recursos Apple são protegidos por
direito autoral à parte e não podem ser customizados. Apple se reserva o direito de exigir
que o uso pare, a seu critério exclusivo (linguagem citada em fórum de desenvolvedor —
corroboração secundária).

**Risco jurídico.** Médio-alto se usado no painel web tal como está hoje. O contrato é
específico sobre excluir justamente esse caso de uso (website content, non-Apple software
context). Risco baixo se usado apenas como referência visual offline (por exemplo, abrir o
app SF Symbols para *olhar* proporções e pesos, sem extrair ou embutir o arquivo).

**Alternativa autoral.** Bibliotecas de ícones com licença permissiva e compatível com uso
web comercial: Lucide (ISC), Phosphor Icons (MIT), Tabler Icons (MIT) — todas com estilo de
traço fino compatível com a estética buscada, sem depender de ativos protegidos.

**Recomendação.** Não incorporar SF Symbols ao painel. Usar como referência visual mental
(abrir o catálogo, observar proporção e peso de traço) é aceitável; extrair arquivos SVG do
app e embuti-los no bundle do Next.js não é.

---

## 2. SF Fonts (SF Pro, SF Compact, SF Mono, New York)

**Finalidade.** Tipografia do sistema Apple — seria a fonte "óbvia" para replicar a aparência
nativa do painel.

**Origem.** `developer.apple.com/fonts/`, distribuída como pacote de instalação separado dos
outros Apple Design Resources.

**Licença aplicável.** Contrato próprio, distinto do contrato geral de Design Resources — o
próprio PDF revisado nesta análise diz isso no §1.B: "The Apple San Francisco font is subject
to a separate license agreement. If you want to install and use the Apple San Francisco
font, you must first accept the separate license agreement that accompanies the font." Não
obtive o texto desse contrato específico nesta sessão; a linguagem reportada de forma
consistente em múltiplos fóruns de desenvolvedor da Apple (corroboração secundária, não
texto primário) repete o mesmo padrão do contrato geral: uso restrito à criação de mock-ups
de interface para software que roda em iOS, macOS ou tvOS.

**Uso comercial.** Só dentro do escopo de mock-up para plataformas Apple — não uma licença
de fonte comercial geral como se compra de uma fundição tipográfica.

**Uso em aplicação web.** **Não permitido.** A restrição relatada de forma consistente é
explícita quanto a isso: a fonte não pode ser embutida em software ou usada para gerar
conteúdo de site. `@font-face` servindo `SF-Pro.woff2` num site público violaria a licença
mesmo que o site seja usado só por quem tem hardware Apple.

**Redistribuição.** Proibida — mesmo padrão do §2.B do contrato geral: não embutir em
produtos de software, não redistribuir.

**Limitações.** Restrita a maquetes (mock-ups), não a produto final rodando fora do runtime
nativo Apple.

**Risco jurídico.** Alto se embutida em `dashboard-app/`. É o recurso com restrição mais
direta e mais fácil de violar sem perceber, porque tecnicamente é trivial hospedar um
arquivo de fonte — a barreira é inteiramente contratual, não técnica.

**Alternativa autoral.** Inter, IBM Plex Sans, ou Geist (Vercel) reproduzem bem a legibilidade
e a neutralidade geométrica do estilo San Francisco sob licença SIL Open Font License,
compatível com uso web comercial e redistribuição. `-apple-system` como `font-family` CSS
*não* baixa nem distribui a fonte — apenas invoca a SF já instalada no sistema operacional do
visitante, quando existir, com fallback controlado pelo desenvolvedor; isso não está sujeito à
licença de distribuição de fonte porque nenhum arquivo de fonte é transferido pelo painel.

**Recomendação.** Não hospedar arquivos SF no painel. Usar `-apple-system, BlinkMacSystemFont`
na pilha de `font-family` é seguro (é só uma referência de nome de fonte do sistema, sem
distribuição) e já produz o efeito visual desejado em dispositivos Apple, com Inter como
fallback explícito para os demais.

---

## 3. Apple Design Resources (templates Figma/Sketch, UI kits, ícones de produto)

**Finalidade.** Templates oficiais de componentes de interface (botões, controles, barras de
navegação) para iOS/iPadOS/macOS/watchOS/tvOS/visionOS, usados por quem projeta apps nativos.

**Origem.** `developer.apple.com/design/resources/`, distribuído como arquivos Sketch/Figma.

**Licença aplicável.** O contrato lido integralmente nesta revisão: *Apple Inc. License
Agreement for Apple Design Resources*, versão de 21/06/2023 (identificador interno "LYL142").
Termos centrais, citados diretamente do texto:

- §2.A: licença "limited, non-transferable, non-exclusive" para "creating mock-ups of user
  interfaces designed for use in software products that run only on Apple's macOS, iOS,
  watchOS, tvOS, and/or visionOS operating system software" — essa é a definição contratual
  de "Mock-Ups".
- §2.B: proíbe expressamente instalar, usar ou executar os recursos para software que roda em
  sistema operacional não-Apple; proíbe embutir os recursos em qualquer produto de software;
  proíbe usá-los para "create, develop, display or otherwise distribute any documentation,
  artwork, **website content** or any other work product", exceto o uso de Mock-Up já
  descrito.
- §2.C: o "Template Content" (interfaces, gráficos, artes, imagens) não pode ser extraído,
  copiado, modificado, distribuído ou reempacotado como clip art, animação de estoque ou
  ativo similar.
- §3: os componentes vêm como pacote e não podem ser separados e redistribuídos
  isoladamente; a licença em si não é transferível sem consentimento escrito da Apple.
- §4: o descumprimento de qualquer termo encerra a licença automaticamente e exige destruir
  todas as cópias.

**Uso comercial.** Sim, dentro do escopo de Mock-Up — é o uso normal esperado (times de
produto desenhando apps que vão para a App Store). Não é uma licença de "use como quiser
comercialmente".

**Uso em aplicação web.** **Explicitamente fora de escopo.** "Website content" é citado
nominalmente como uso proibido no §2.B. Isso cobre tanto extrair componentes visuais do
Figma para reimplementar em CSS/React quanto capturar telas e publicá-las.

**Redistribuição.** Proibida por §2.B e §3 — inclusive separar peças do pacote.

**Limitações.** Título e propriedade intelectual de qualquer conteúdo acessado através dos
recursos pertence ao respectivo dono (§1.C) — a licença não garante nem transfere direitos
sobre esse conteúdo.

**Risco jurídico.** Alto para qualquer uso que vá além de "abrir o arquivo Figma para estudar
como a Apple resolve um componente, e depois desenhar algo próprio do zero". Recriar um
componente pixel-a-pixel a partir do template e publicá-lo num site é o cenário que o
contrato nomeia como proibido.

**Alternativa autoral.** Construir os componentes do painel observando o comportamento
publicado na HIG (ver §4) — que descreve *padrões*, não fornece *ativos* — e implementando em
CSS/React com valores de espaçamento, raio e movimento próprios, sem copiar arquivo de
template algum.

**Recomendação.** Usar os UI kits só para inspeção visual/educacional em ambiente de design,
nunca como origem de ativos reaproveitados no `dashboard-app/`.

---

## 4. Human Interface Guidelines (HIG)

**Finalidade.** Documentação de padrões de interação, hierarquia visual, acessibilidade e
convenções de plataforma. É o recurso mais seguro da lista, porque é documentação de
*princípios*, não um ativo redistribuível.

**Origem.** `developer.apple.com/design/human-interface-guidelines/`.

**Licença aplicável.** Não há um contrato de licença dedicado equivalente ao dos Design
Resources — a página de termos legais da Apple (`developer.apple.com/support/terms/`) lista a
HIG separadamente dos acordos de licença de software, com copyright padrão da Apple ("All
rights reserved") e, para uso de marca, remete às *Guidelines for Using Apple Trademarks and
Copyrights* (`apple.com/legal/intellectual-property/guidelinesfor3rdparties.html`), não
verificadas em texto integral nesta sessão.

**Uso comercial.** Ler, entender e aplicar os *princípios* de design descritos (por exemplo:
alvo de toque mínimo, contraste, uso de peso tipográfico para hierarquia) é uso normal de
documentação pública e não está sujeito a restrição de licença de software — é a forma como
qualquer equipe de produto usa a HIG.

**Uso em aplicação web.** Sem restrição adicional além do direito autoral padrão sobre o
texto e as imagens *da própria documentação* — não se aplica ao produto que você constrói
seguindo os princípios.

**Redistribuição.** **Do texto e das imagens da HIG em si**: proibida sem permissão (é
material protegido por direito autoral, "All rights reserved", não domínio público — daí a
regra do André de não tratar documentação pública como domínio público). **Da ideia ou do
padrão de design descrito**: livre — padrões de interação não são protegidos por direito
autoral, só a expressão específica do texto/imagem da Apple.

**Limitações.** A HIG descreve convenções pensadas para o ecossistema de apps nativos da
Apple; aplicá-las literalmente a um painel web doméstico exige adaptação (por exemplo, a HIG
assume gestos e affordances de touch/trackpad nativos que um navegador não replica de forma
idêntica).

**Risco jurídico.** Baixo, desde que o uso seja "ler e aplicar o padrão com implementação
própria", nunca "copiar o texto ou capturar e reproduzir as imagens da documentação".

**Alternativa autoral.** Nenhuma necessária — este é o recurso que já é seguro de se estudar
livremente; a "alternativa" é simplesmente não citar nem reproduzir trechos longos do texto
ao documentar decisões de design no próprio projeto (por exemplo em `DESIGN.md`), preferindo
parafrasear o princípio com palavras próprias.

**Recomendação.** Uso livre como referência de estudo e critério de design. Ao citar a HIG em
documentação interna do projeto, resumir com palavras próprias — nunca colar parágrafos.

---

## 5. Vídeos e documentação (WWDC, developer.apple.com)

**Finalidade.** Sessões de WWDC sobre design de interface, motion, tipografia — contexto e
raciocínio por trás dos padrões da HIG.

**Origem.** `developer.apple.com/videos/`, YouTube oficial da Apple Developer.

**Licença aplicável.** Direito autoral padrão da Apple sobre o conteúdo audiovisual; os
termos de uso do site da Apple Developer (`developer.apple.com/support/terms/`) regem o
acesso, mas o conteúdo em si segue a legislação geral de direito autoral — assistir e citar
trechos curtos com atribuição (fair use / citação, dependendo da jurisdição) é diferente de
hospedar cópia do vídeo.

**Uso comercial.** Assistir e se informar: sem restrição. Reproduzir o vídeo ou capturas de
tela substanciais dele em material próprio: não coberto por licença alguma vista aqui.

**Uso em aplicação web.** Incorporar (embed) um vídeo oficial via player oficial (ex. iframe
do YouTube) é tecnicamente diferente de baixar e hospedar o arquivo — mas nada nesta revisão
confirma que a Apple autorize embed em produto comercial de terceiros; não presumir permissão.

**Redistribuição.** Não coberta — não presumir permissão de redistribuir cópias.

**Limitações.** Conteúdo desatualiza (versões de OS mudam); referência apenas.

**Risco jurídico.** Baixo para consumo e aprendizado; sobe para médio se houver reprodução de
trechos (captura de tela de slide, transcrição extensa) em material do projeto.

**Alternativa autoral.** Nenhuma — não há necessidade de reproduzir o material; documentar a
*conclusão* de design tirada do vídeo, com palavras próprias, resolve o mesmo objetivo sem
tocar em direito autoral.

**Recomendação.** Consumir livremente como fonte de aprendizado; não incorporar trechos ao
projeto.

---

## 6. Templates (Keynote, Pages, ícone de produto, PSD/Sketch de marketing)

**Finalidade.** Não identificado um caso de uso concreto para o painel — incluído na lista por
completude, caso surja necessidade futura de material de apresentação.

**Origem.** `developer.apple.com/design/resources/` (mesma origem do item 3) e
`apple.com/legal/intellectual-property/` para templates de marketing/badge.

**Licença aplicável.** Mesmo contrato do §3 quando o template vem do canal de design
resources; badges de marketing (ex. "Baixar na App Store") têm contrato próprio e regras de
uso de marca à parte, não revisadas em detalhe aqui por não haver caso de uso identificado.

**Uso comercial / web / redistribuição.** Mesmas restrições do item 3 quando aplicável —
escopo de Mock-Up, proibição de conteúdo de site, proibição de redistribuição isolada.

**Limitações / risco jurídico.** Mesmo perfil do item 3.

**Alternativa autoral.** Templates próprios, sem uso de ativo Apple.

**Recomendação.** Não há necessidade identificada de uso agora; se surgir (por exemplo, gerar
um material de apresentação do projeto), tratar como extensão do item 3 e repetir a mesma
cautela.

---

## 7. Exemplos visuais (screenshots de apps Apple, capturas de referência)

**Finalidade.** Referência de "como a Apple resolveu isso visualmente" ao desenhar uma tela
nova do painel.

**Origem.** Capturas de tela de apps do sistema (Ajustes, Home, Música) tiradas pelo próprio
usuário em seu hardware.

**Licença aplicável.** Direito autoral da Apple sobre a interface capturada; não há licença
que autorize reprodução ou distribuição da captura em si.

**Uso comercial.** Olhar a própria tela do seu iPhone/Mac para se inspirar: sem restrição —
não é um ato de cópia, é observação. Publicar a captura de tela, ou usar a imagem como asset
importado no projeto: fora de qualquer licença vista aqui.

**Uso em aplicação web.** Não incorporar a captura como imagem no painel.

**Redistribuição.** Não aplicável — a recomendação é não redistribuir a captura, ponto.

**Limitações.** A inspiração visual sem cópia de pixels é a única forma seguramente coberta.

**Risco jurídico.** Baixo enquanto for observação e reimplementação própria; sobe imediato se
a captura virar arquivo dentro do repositório.

**Alternativa autoral.** Descrever em palavras o padrão observado (proporção, espaçamento,
peso) e implementar do zero com valores próprios — é exatamente o método que já gerou o
design atual do painel, mantendo consistência com a prática existente do projeto.

**Recomendação.** Manter a prática atual: estudar visualmente, nunca importar a captura como
arquivo do projeto.

---

## Quadro-resumo

| Recurso | Uso comercial | Uso web | Redistribuição | Risco | Recomendação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SF Symbols | Só em Mock-Up Apple | Não | Não | Médio-alto | Não incorporar; usar Lucide/Phosphor/Tabler |
| SF Fonts | Só em Mock-Up Apple | Não | Não | Alto | `-apple-system` no CSS sim; arquivo de fonte não |
| Apple Design Resources | Só em Mock-Up Apple | Não | Não | Alto | Só inspeção, nunca extração de ativo |
| Human Interface Guidelines | Sim, como princípio | Sim, como princípio | Não (do texto/imagem) | Baixo | Uso livre, parafrasear sempre |
| Vídeos/documentação WWDC | Sim, para aprendizado | Não presumir embed | Não | Baixo–médio | Consumir, não reproduzir |
| Templates de marketing | Mesmo perfil dos Design Resources | Não | Não | Alto | Sem caso de uso hoje |
| Exemplos visuais (screenshots) | Só observação | Não (não importar arquivo) | Não | Baixo–alto conforme uso | Observar e reimplementar, nunca importar |

---

## Regras já seguidas nesta revisão (confirmação)

- Nenhum arquivo foi baixado nem incorporado ao repositório — o único PDF obtido foi lido
  para extrair o texto da licença e citado aqui, não copiado para dentro do projeto.
- Documentação pública (HIG, termos de desenvolvedor) tratada como protegida por direito
  autoral, não como domínio público.
- Nenhum trecho longo foi copiado; as citações do contrato de licença são frases curtas,
  entre aspas, com atribuição à fonte.
- Nenhum símbolo, ícone ou tipografia Apple recomendado para uso em logotipo ou identidade de
  marca do projeto.
- Nenhuma menção a reproduzir hardware ou produto Apple.
- Nenhuma recomendação cria interface que sugira ser oficial da Apple — todas as alternativas
  autorais apontam para bibliotecas de terceiros com licença própria e implementação
  independente.

## Próximo passo, se houver

Este documento é só análise. Se o André decidir seguir com alguma adoção (por exemplo, trocar
o conjunto de ícones atual por Lucide, ou adicionar `-apple-system` à pilha de fontes), isso é
mudança em `dashboard-app/` — território dele no Antigravity — e exige pedido inequívoco antes
de qualquer edição, conforme §6 do `CLAUDE.md`.
