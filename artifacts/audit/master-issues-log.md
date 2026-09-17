# Registro Mestre de Problemas e Anomalias Catalogadas

**Documento**: `artifacts/audit/master-issues-log.md`  
**Escopo**: Painel Residencial Integrado (`dashboard-app`)  
**Data**: 16/09/2026 · **Status**: Concluído (Inventário de Auditoria — Sem alterações no código)  
**Metodologia**: Catalogação unificada com identificadores exclusivos e formato obrigatório de 26 campos.

---

## [VIS-001] Dispersão descontrolada de valores de box-shadow fora do Design System

- Categoria: Visual
- Severidade: Baixa
- Prioridade: P3
- Status: Aberto
- Tela: Todas
- Componente: Múltiplos (`RoomCard`, `QuickScenesPanel`, `MediaHubModal`, `EnergyWidget`)
- Arquivo: `dashboard-app/app/globals.css`
- Linha ou seletor: Múltiplos seletores (`.room-card`, `.scene-card-btn`, `.daily-widget-compact`, etc.)
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos (320px a 3440px)
- Tema: Ambos (Dark e Light)
- Orientação: Ambas
- Pré-condições: Carregar qualquer tela da aplicação
- Passos para reproduzir:
  1. Inspecionar as declarações de `box-shadow` no arquivo `globals.css`;
  2. Filtrar ocorrências de sombras.
- Resultado esperado: Utilização de uma escala concisa e consistente de 3 ou 4 tokens semânticos de elevação física do modelo Liquid Glass.
- Resultado observado: Presença de 124 sombras distintas declaradas ad-hoc em 157 regras CSS.
- Evidência: Extração algorítmica comprovou 124 strings únicas de sombra no CSS (`globals.css`).
- Impacto para o usuário: Quebra da sensação de hierarquia visual e profundidade espacial entre componentes irmãos.
- Impacto técnico: Dificuldade extrema de manutenção e aumento desnecessário do tamanho da folha de estilos.
- Causa provável: Criação incremental de componentes por diferentes intervenções sem consulta a uma escala centralizada.
- Recomendação: Estabelecer 4 tokens de elevação em `:root` (`--shadow-glass-flat`, `--shadow-glass-elevated`, `--shadow-radiance-amber`, `--shadow-radiance-cyan`) e refatorar os componentes.
- Dependências: Nenhuma.
- Risco da correção: Baixo (ajuste puramente estético de CSS).
- Critério de aceite: Todas as regras de `box-shadow` em `globals.css` referenciam os tokens canônicos.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [VIS-002] Incoerência tipográfica com valor fracionário em pílula de alerta

- Categoria: Visual
- Severidade: Baixa
- Prioridade: P3
- Status: Aberto
- Tela: Principal (`/`)
- Componente: `SecurityAlertsBar`
- Arquivo: `dashboard-app/app/globals.css`
- Linha ou seletor: Linha 4211 (`.security-micro-pill`)
- Ambiente: Produção e Desenvolvimento
- Viewport: Smartphones e Tablets (< 640px)
- Tema: Ambos
- Orientação: Ambas
- Pré-condições: Renderizar a barra de alertas do cabeçalho
- Passos para reproduzir:
  1. Inspecionar o elemento `.security-micro-pill` via DevTools em viewport mobile.
- Resultado esperado: Uso de escala tipográfica modular inteira ou em rem (ex.: `12px` / `0.75rem`).
- Resultado observado: Declaração de `font-size: 11.5px;` hardcoded.
- Evidência: `globals.css:4211: font-size: 11.5px;`.
- Impacto para o usuário: Risco de renderização subpixel borrada em telas de baixa densidade (DPI).
- Impacto técnico: Violação direta da escala tipográfica estabelecida em `DESIGN.md`.
- Causa provável: Ajuste manual ad-hoc para forçar encaixe de texto em espaço reduzido.
- Recomendação: Substituir pelo token semântico `--font-caption` (`0.75rem` / `12px`).
- Dependências: Nenhuma.
- Risco da correção: Muito Baixo.
- Critério de aceite: `font-size` definido via variável de escala tipográfica sem frações.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [UX-001] Falha silenciosa de comandos físicos sem feedback de erro ao usuário

- Categoria: UX
- Severidade: Alta
- Prioridade: P1
- Status: Aberto
- Tela: Todas
- Componente: Todos os acionadores (`RoomCard`, `DeviceTile`, `QuickScenesPanel`, `VacuumWidget`)
- Arquivo: `dashboard-app/app/page.tsx`
- Linha ou seletor: Linhas 223–242 (`alternar`)
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos
- Tema: Todos
- Orientação: Todas
- Pré-condições: Falha temporária de comunicação entre Next.js e Home Assistant Core (ex.: 502 Bad Gateway)
- Passos para reproduzir:
  1. Desconectar o container do HA ou simular erro na rota `/api/toggle`;
  2. Tocar no botão de acender luz de um cômodo.
- Resultado esperado: Exibição de um Toast ou Banner visual claro indicando: "Falha ao enviar comando para [Dispositivo]. Verifique a conexão."
- Resultado observado: O card treme fisicamente por 400ms (`shake-fail`) e reverte o estado em silêncio. Nenhum aviso textual é exibido.
- Evidência: O evento `"ha-toggle-failed"` dispara apenas animação CSS; inexistência de biblioteca de toast ou container de notificação na casca (`layout.tsx`).
- Impacto para o usuário: O usuário não sabe se o relé falhou, se a lâmpada queimou ou se a rede caiu, gerando frustração e múltiplos cliques repetidos.
- Impacto técnico: Falta de canal unificado de observabilidade de erros de interação.
- Causa provável: Foco inicial na latência zero sem construção da camada de retorno de exceção.
- Recomendação: Criar um componente global de Toast/Notificação leve acionado via barramento de eventos ou contexto.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: Notificação visual temporária surge na base da tela sempre que uma requisição POST de comando falhar após os retries.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [UX-002] Efeito de "Sticky Hover" persistente em telas de toque e painéis de parede

- Categoria: UX
- Severidade: Média
- Prioridade: P2
- Status: Aberto
- Tela: Principal e Modais
- Componente: Cards de cômodo e botões de cena (`RoomCard`, `QuickScenesPanel`)
- Arquivo: `dashboard-app/app/globals.css`
- Linha ou seletor: 118 regras `:hover` espalhadas no CSS
- Ambiente: Produção (Tablets Wall-Mount e Smartphones)
- Viewport: Tablets e Mobile (pointer: coarse)
- Tema: Ambos
- Orientação: Ambas
- Pré-condições: Acessar a aplicação em dispositivo com tela tátil
- Passos para reproduzir:
  1. Tocar em um card de cômodo em um tablet;
  2. Retirar o dedo da tela.
- Resultado esperado: O card retorna imediatamente ao estado visual de repouso após a remoção do toque.
- Resultado observado: O estilo `:hover` (elevação, contorno brilhante e sombra acentuada) permanece ativo até que o usuário toque em outro lugar da tela.
- Evidência: Regras `:hover` não estão encapsuladas dentro de `@media (hover: hover) and (pointer: fine)`.
- Impacto para o usuário: Confusão visual; o usuário pensa que o dispositivo está selecionado ou em processamento quando na verdade é apenas o hover congelado.
- Impacto técnico: Poluição de estados visuais na camada de apresentação tátil.
- Causa provável: CSS escrito pensando primariamente em interações desktop com mouse.
- Recomendação: Encapsular todas as regras decorativas de hover em `@media (hover: hover)`.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: Dispositivos de toque não disparam ou fixam estilos de `:hover` após o término do toque físico.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [FUN-001] Mascaramento de falha física: dispositivos indisponíveis exibidos como desligados no RoomCard

- Categoria: Funcional
- Severidade: Média
- Prioridade: P2
- Status: Aberto
- Tela: Principal (`/`)
- Componente: `RoomCard`
- Arquivo: `dashboard-app/app/components/RoomCard.tsx`
- Linha ou seletor: Linha 187 (`quantosLigados`)
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos
- Tema: Todos
- Orientação: Todas
- Pré-condições: Um interruptor físico da Tuya/Xiaomi perder sinal de rede ou energia (estado `unavailable` no HA)
- Passos para reproduzir:
  1. Simular uma entidade com `state: "unavailable"` em um cômodo;
  2. Observar a renderização do `RoomCard`.
- Resultado esperado: O card deve indicar visualmente que há dispositivos desconectados ou fora de alcance (ex.: badge de atenção ou ícone atenuado).
- Resultado observado: O filtro `estados[p.entityId]?.state === "on"` ignora `unavailable` e contabiliza o dispositivo como "desligado normal", omitindo o problema.
- Evidência: `RoomCard.tsx:187: const quantosLigados = comodo.pontos.filter(p => estados[p.entityId]?.state === "on").length;`.
- Impacto para o usuário: O morador acredita que o quarto está simplesmente apagado, quando na verdade o interruptor está fora de operação.
- Impacto técnico: Divergência entre a telemetria real do Home Assistant e a representação sintética da interface.
- Causa provável: Lógica binária simplista que assumiu que o que não é `"on"` é automaticamente `"off"`.
- Recomendação: Adicionar contagem de `unavailable` e renderizar chip ou micro-dot específico de indisponibilidade quando presente.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: `RoomCard` alerta visualmente a presença de entidades `unavailable` no cômodo.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [FUN-002] Conflito de concorrência e ricochete no seletor de modo do robô aspirador

- Categoria: Funcional
- Severidade: Média
- Prioridade: P2
- Status: Aberto
- Tela: Modal do Robô Aspirador
- Componente: `VacuumWidget`
- Arquivo: `dashboard-app/app/components/VacuumWidget.tsx`
- Linha ou seletor: Linhas 204–217 (`alternarModo`)
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos
- Tema: Todos
- Orientação: Todas
- Pré-condições: Abrir o modal do robô aspirador com polling ativo na página
- Passos para reproduzir:
  1. Alterar o modo de sucção de "Padrão" para "Forte";
  2. Coincidir o clique com o ciclo de polling de 5s antes que a nuvem Dreame confirme a transição.
- Resultado esperado: A seleção do usuário permanece fixada pelo TTL otimista.
- Resultado observado: Como o `VacuumWidget` utiliza estado local simples (`setModoOtimista`) sem integração com o `travasOtimistasRef` de `page.tsx`, o polling subsequente reverte o seletor visual temporariamente até a confirmação física.
- Evidência: `estados[ENTITY_MODE]?.state` sobrepõe o estado local no próximo ciclo de renderização caso a resposta remota demore > 1s.
- Impacto para o usuário: Sensação de que o toque não foi registrado ou foi cancelado pelo sistema.
- Impacto técnico: Inconsistência no padrão arquitetural de travas otimistas (adotado no `page.tsx`, esquecido no widget).
- Causa provável: Isolamento da lógica de otimismo dentro de `page.tsx` sem repasse de setter de travas para widgets terceiros.
- Recomendação: Estender o mecanismo de `travasOtimistasRef` para o `ENTITY_MODE` do aspirador.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: O modo selecionado não sofre ricochete visual durante o intervalo de sincronização do robô.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [RSP-001] Alvo de toque de micro-pílulas anulado por ordem de cascata CSS (F-01)

- Categoria: Responsividade / Ergonomia
- Severidade: Alta
- Prioridade: P1
- Status: Aberto
- Tela: Principal (`/`)
- Componente: `SecurityAlertsBar` e `BatteryAlertsBar`
- Arquivo: `dashboard-app/app/globals.css`
- Linha ou seletor: Linhas 4212 e 7201 (`.security-micro-pill`, `.battery-micro-pill`)
- Ambiente: Produção e Desenvolvimento
- Viewport: Smartphones e Tablets (< 640px)
- Tema: Todos
- Orientação: Ambas
- Pré-condições: Carregar em viewport móvel (ex.: iPhone 375px)
- Passos para reproduzir:
  1. Inspecionar computação de CSS do botão `.security-micro-pill` a 375px de largura.
- Resultado esperado: Altura mínima de 44px conforme estabelecido na media query da linha 4212.
- Resultado observado: A regra da linha 7201 (`min-height: 36px`) possui a mesma especificidade de classe simples e, por vir depois no arquivo, anula a media query de 44px.
- Evidência: Medição via DevTools em viewport 375x812: `Computed Height = 36px`.
- Impacto para o usuário: Dificuldade de acionamento em telas de toque; risco de toques imprecisos ou perdidos na barra de alertas críticos.
- Impacto técnico: Violação direta do critério WCAG 2.5.5 (Target Size) e da especificação técnica de responsividade.
- Causa provável: Sobrescrita involuntária causada pelo crescimento desordenado do arquivo `globals.css` (10.430 linhas).
- Recomendação: Mover as regras da media query para o final do arquivo ou remover a declaração tardia de 36px.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: O elemento `.security-micro-pill` mede estritamente `>= 44px` de altura em viewports `<= 640px`.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [RSP-002] Dimensão de alvo tátil insuficiente no botão de ligar/desligar compacto da TV

- Categoria: Responsividade / Ergonomia
- Severidade: Alta
- Prioridade: P1
- Status: Aberto
- Tela: Principal (`/`)
- Componente: `TvRemoteWidget`
- Arquivo: `dashboard-app/app/globals.css`
- Linha ou seletor: Seletor `.tv-compact-power`
- Ambiente: Produção e Desenvolvimento
- Viewport: Smartphones e Tablets
- Tema: Todos
- Orientação: Ambas
- Pré-condições: Exibir o mini-card de TV na barra diária
- Passos para reproduzir:
  1. Inspecionar o botão `.tv-compact-power` no DevTools.
- Resultado esperado: Alvo tátil mínimo de 44px × 44px.
- Resultado observado: Dimensões fixadas em 34px × 34px.
- Evidência: `width: 34px; height: 34px;` computado no CSS.
- Impacto para o usuário: Falhas frequentes ao tentar ligar/desligar a TV por toque direto em smartphones ou tablets de parede.
- Impacto técnico: Violação do padrão de acessibilidade física WCAG AAA.
- Causa provável: Dimensionamento visual apertado para não ocupar espaço no card compacto de 84px.
- Recomendação: Aumentar o padding interno ou adicionar pseudoelemento `::after` invisível expandindo a área de clique para 44px.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: Área clicável do botão power mede no mínimo 44px × 44px.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [A11Y-001] Inexistência de anel de foco visual para navegação assistiva por teclado

- Categoria: Acessibilidade
- Severidade: Crítica
- Prioridade: P1
- Status: Aberto
- Tela: Todas
- Componente: Aplicação inteira (Botões, Cards, Sliders, Toggles)
- Arquivo: `dashboard-app/app/globals.css`
- Linha ou seletor: `:root` / Seletores globais
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos
- Tema: Ambos
- Orientação: Ambas
- Pré-condições: Operar a interface utilizando a tecla `Tab`
- Passos para reproduzir:
  1. Pressionar `Tab` repetidamente a partir da barra de endereços.
- Resultado esperado: Um anel de foco bem definido (`outline: 2px solid #38bdf8`) acompanha o elemento ativo.
- Resultado observado: O cursor lógico percorre os elementos, mas nenhum contorno visual é desenhado na tela (apenas 1 seletor de focus-visible em 10.430 linhas).
- Evidência: Varredura de código encontrou zero regras genéricas de `:focus-visible` para botões e cards interativos.
- Impacto para o usuário: Usuários com deficiência motora que dependem exclusivamente de teclado ou switches assistivos navegam totalmente às cegas.
- Impacto técnico: Reprovação direta no critério WCAG 2.4.7 (Focus Visible - Nível AA).
- Causa provável: Resets agressivos de CSS (`outline: none`) aplicados em frameworks base sem reposição de estilo.
- Recomendação: Adicionar regra canônica global `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }`.
- Dependências: Nenhuma.
- Risco da correção: Muito Baixo.
- Critério de aceite: Todos os elementos focáveis exibem anel nítido de foco ao receber navegação por teclado.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [A11Y-002] Falha grave de contraste no acento ativo do Tema Claro

- Categoria: Acessibilidade
- Severidade: Crítica
- Prioridade: P1
- Status: Aberto
- Tela: Todas
- Componente: Todos os indicadores ativos sob tema claro
- Arquivo: `dashboard-app/app/globals.css`
- Linha ou seletor: Linhas 83–86 (`[data-theme="light"]`)
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos
- Tema: Claro (`light`)
- Orientação: Ambas
- Pré-condições: Ativar o modo claro via seletor no cabeçalho
- Passos para reproduzir:
  1. Alternar a interface para o tema claro;
  2. Inspecionar o contraste entre `--on-accent: #d97706` e o fundo `--bg-color: #e2e8f4`.
- Resultado esperado: Relação de contraste mínima de 4.5:1 para texto normal e 3:1 para componentes de interface (WCAG 1.4.3).
- Resultado observado: Razão de contraste matematicamente calculada em **2.59:1**.
- Evidência: Cálculo de luminância relativa comprovou `2.59:1` (Reprovado em todos os níveis WCAG).
- Impacto para o usuário: Texto e ícones de dispositivos ligados ficam praticamente invisíveis em ambientes iluminados ou ensolarados.
- Impacto técnico: Violação crítica de acessibilidade visual.
- Causa provável: Escolha de tom de âmbar (#d97706) sem validação algorítmica de luminância sobre o fundo cinza-azulado (#e2e8f4).
- Recomendação: Alterar o token de acento no tema claro para `#b45309` (Amber 700) ou `#92400e` (garantindo >= 4.5:1).
- Dependências: Nenhuma.
- Risco da correção: Muito Baixo.
- Critério de aceite: Contraste medido entre texto ativo e fundo no tema claro atinge no mínimo 4.5:1.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [A11Y-003] Ausência de contenção de foco (Focus Trap) em modais abertos via portal

- Categoria: Acessibilidade
- Severidade: Alta
- Prioridade: P2
- Status: Aberto
- Tela: Modais
- Componente: `RoomPopup`, `MediaHubModal`, `EnergyWidget`, `VacuumWidget`
- Arquivo: `dashboard-app/app/components/*Modal.tsx`
- Linha ou seletor: Estruturas de `createPortal`
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos
- Tema: Todos
- Orientação: Todas
- Pré-condições: Abrir qualquer modal da aplicação
- Passos para reproduzir:
  1. Abrir a central do robô aspirador;
  2. Pressionar a tecla `Tab` repetidamente.
- Resultado esperado: O foco de navegação por teclado deve ciclar exclusivamente entre os controles do modal aberto.
- Resultado observado: O foco atravessa os botões do modal e começa a acionar cards e botões da página principal por trás da cortina escura.
- Evidência: Ausência de listener de captura de Tab ou componente de FocusTrap nos diálogos.
- Impacto para o usuário: Usuários de leitores de tela acionam comandos invisíveis em outros cômodos inadvertidamente.
- Impacto técnico: Violação do padrão de diálogo modal WAI-ARIA (WCAG 2.4.3).
- Causa provável: Criação de modais caseiros sem uso de biblioteca de diálogo acessível.
- Recomendação: Implementar hook `useFocusTrap` ou utilizar o componente primitivo de diálogo do `@base-ui/react`.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: A navegação por Tab permanece estritamente confinada dentro do modal ativo até que o mesmo seja fechado.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [TECH-001] Componentes gigantes monolíticos com excesso de responsabilidades

- Categoria: Código / Arquitetura
- Severidade: Média
- Prioridade: P2
- Status: Aberto
- Tela: Modais de Mídia e Energia
- Componente: `MediaHubModal` e `EnergyWidget`
- Arquivo: `dashboard-app/app/components/MediaHubModal.tsx` e `EnergyWidget.tsx`
- Linha ou seletor: Arquivos inteiros (1.156 e 839 linhas)
- Ambiente: Desenvolvimento
- Viewport: Todos
- Tema: Todos
- Orientação: Todas
- Pré-condições: Leitura e manutenção dos arquivos fonte
- Passos para reproduzir:
  1. Abrir `MediaHubModal.tsx` e inspecionar suas atribuições.
- Resultado esperado: Componentes desacoplados, com separação clara entre visualização, cálculo de negócio e comunicação de rede.
- Resultado observado: Um único arquivo gerencia conexão WebSocket com Music Assistant, controle de streaming de 12 apps, controle remoto infravermelho de TV, discador do PS5 e sliders de volume.
- Evidência: Linhas de código contadas no relatório: `MediaHubModal.tsx: 1156 linhas`; `EnergyWidget.tsx: 839 linhas`.
- Impacto para o usuário: Risco de engasgos de renderização durante interações rápidas.
- Impacto técnico: Dificuldade severa de refatoração e impossibilidade de aplicar testes unitários isolados.
- Causa provável: Acúmulo progressivo de funcionalidades sem marcos de refatoração estrutural.
- Recomendação: Quebrar `MediaHubModal` em subcomponentes puros (`TvRemoteControls`, `MassAudioPlayer`, `StreamingAppCatalog`).
- Dependências: Nenhuma.
- Risco da correção: Médio (requer testes de integração após a decomposição).
- Critério de aceite: Nenhum componente ultrapassa 400 linhas de código no projeto.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [TECH-002] Scripts de linting quebrados e ausência de ESLint no Next 16

- Categoria: Código / Qualidade
- Severidade: Média
- Prioridade: P2
- Status: Aberto
- Tela: Não aplicável (Ferramental)
- Componente: Tooling
- Arquivo: `dashboard-app/package.json`
- Linha ou seletor: Linha 10 (`"lint": "next lint"`)
- Ambiente: Desenvolvimento
- Viewport: Não aplicável
- Tema: Não aplicável
- Orientação: Não aplicável
- Pré-condições: Executar verificação de código
- Passos para reproduzir:
  1. Abrir terminal em `dashboard-app/`;
  2. Executar `npm run lint`.
- Resultado esperado: Análise estática do código executada sem erros de configuração.
- Resultado observado: Falha imediata no console; `next lint` foi depreciado/removido no Next 16 e não há pacote `eslint` instalado nas dependências.
- Evidência: `package.json` carece de dependência `eslint` e arquivos `.eslintrc.*`.
- Impacto para o usuário: Nenhum direto.
- Impacto técnico: Ausência total de governança estática contra más práticas no React 19, regras de hooks e vazamento de tipos.
- Causa provável: Atualização do Next.js sem migração correspondente do ecossistema de linting.
- Recomendação: Instalar `eslint` e `@eslint/compat` com configuração flat e atualizar o script `npm run lint`.
- Dependências: Nenhuma.
- Risco da correção: Baixo.
- Critério de aceite: `npm run lint` executa com sucesso e reporta a integridade do código.
- Necessita alteração de backend?: Não.
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [SEC-001] Acesso irrestrito e ausência de autenticação na porta 3002 (A-01)

- Categoria: Segurança
- Severidade: Crítica
- Prioridade: P1
- Status: Aberto
- Tela: Todas
- Componente: Camada de Borda / App Router
- Arquivo: `dashboard-app/app/*` e `dashboard-app/app/api/*`
- Linha ou seletor: Todas as rotas de API e páginas
- Ambiente: Produção e Desenvolvimento
- Viewport: Todos
- Tema: Todos
- Orientação: Todas
- Pré-condições: Qualquer cliente conectado à LAN residencial ou à tailnet
- Passos para reproduzir:
  1. Abrir navegador em dispositivo na rede e navegar para `http://192.168.31.22:3002/`;
  2. Disparar uma chamada `POST /api/toggle` com `{ entityId: "light.luz_sala" }`.
- Resultado esperado: A requisição exige autenticação (PIN, cookie de sessão ou bearer token) antes de prosseguir.
- Resultado observado: A rota aceita a conexão livremente e executa o comando físico no Home Assistant.
- Evidência: Não há arquivo `middleware.ts` no projeto; nenhuma rota em `app/api/` valida sessão ou credencial de usuário.
- Impacto para o usuário: Qualquer pessoa conectada ao Wi-Fi ou com acesso à tailnet pode controlar a casa inteira sem autorização.
- Impacto técnico: Superfície de controle da automação totalmente aberta a acessos não autorizados.
- Causa provável: Implementação inicial voltada apenas para desenvolvimento local rápido.
- Recomendação: Implementar `middleware.ts` com proteção por PIN de tela cheia ou cookie de sessão simples autenticado.
- Dependências: André definir o método de autenticação preferido (PIN para wall-mounts vs sessão para celulares).
- Risco da correção: Médio (pode impedir acesso do tablet se o método não for configurado adequadamente).
- Critério de aceite: Requisições à porta 3002 sem sessão válida são barradas com redirecionamento para tela de desbloqueio.
- Necessita alteração de backend?: Não (o Next.js atua como borda).
- Necessita alteração de automação?: Não.
- Pode ser corrigido isoladamente?: Sim.

---

## [SEC-002] Risco de superaquecimento: alternância cega da ventilação do PS5 pela Cena Gamer (R8)

- Categoria: Segurança / Automação
- Severidade: Alta
- Prioridade: P1
- Status: Aberto
- Tela: Principal (`QuickScenesPanel`)
- Componente: `QuickScenesPanel` / Rota `/api/scene`
- Arquivo: `dashboard-app/app/api/scene/route.ts`
- Linha ou seletor: Linha 60 (`alternar("switch.ventilacao_ps5")`)
- Ambiente: Produção
- Viewport: Todos
- Tema: Todos
- Orientação: Todas
- Pré-condições: PlayStation 5 ligado em jogo pesado e ventilação forçada já acionada pela automação física
- Passos para reproduzir:
  1. Acionar a cena "Gamer" no painel.
- Resultado esperado: A cena deve garantir que a ventilação esteja ligada (`turn_on`), de forma idempotente.
- Resultado observado: A cena executa um comando de alternância (`toggle`). Com o cooler já em funcionamento, a cena **desliga** a refrigeração do console.
- Evidência: `app/api/scene/route.ts:60: alternar("switch.ventilacao_ps5");`.
- Impacto para o usuário: Risco de superaquecimento ou desligamento forçado de emergência do PlayStation 5 por calor excessivo.
- Impacto técnico: Violação da regra canônica de automação R8 (dois controladores disputando o mesmo atuador de forma não idempotente).
- Causa provável: Uso inadvertido do helper genérico `alternar()` em vez do serviço explícito de ativação `turn_on`.
- Recomendação: Substituir por chamada idempotente `controlarDispositivo("switch.ventilacao_ps5", "turn_on")`.
- Dependências: Nenhuma.
- Risco da correção: Muito Baixo.
- Critério de aceite: Disparar a cena Gamer com o ventilador já ligado mantém o ventilador estritamente ligado.
- Necessita alteração de backend?: Sim (ajuste na rota `/api/scene`).
- Necessita alteração de automação?: Não (mantém a automação do HA).
- Pode ser corrigido isoladamente?: Sim.
