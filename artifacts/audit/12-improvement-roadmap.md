# Roadmap de Melhorias Estruturais (12-improvement-roadmap.md)

**Documento**: `artifacts/audit/12-improvement-roadmap.md`  
**Escopo**: Planejamento e organização de implementação para estabilização do `dashboard-app`  
**Data**: 16/09/2026 · **Status**: Concluído (Modo Somente Leitura — Sem alterações em produção)

---

## 1. Correções Bloqueadoras

Itens mandatórios que impedem a liberação externa e o compartilhamento residencial seguro do painel:

1. **[SEC-001] Autenticação na Porta 3002**:
   - Implementar camada de `middleware.ts` no Next.js com barreira por PIN numérico para tablets de parede e cookie de sessão autenticada para smartphones na tailnet.
   - *Impacto*: Impede controle indevido da residência por qualquer dispositivo conectado ao Wi-Fi.
2. **[A11Y-002] Correção do Contraste no Tema Claro**:
   - Substituir o token `--on-accent: #d97706` por `#b45309` (Amber 700), elevando a razão de contraste sobre `#e2e8f4` de 2.59:1 para **4.08:1** (ou tom `#92400e` para atingir 4.5:1 estrito).
   - *Impacto*: Elimina ilegibilidade sob luz solar ou ambientes claros.
3. **[A11Y-001] Anel de Foco Visível Global (`:focus-visible`)**:
   - Definir estilo universal de foco no CSS (`outline: 2px solid #38bdf8; outline-offset: 2px;`) para botões, cards e links.
   - *Impacto*: Permite que usuários navegando por teclado enxerguem o cursor lógico na interface.

---

## 2. Correções de Segurança

1. **[SEC-002] Idempotência da Ventilação do PS5 na Cena Gamer**:
   - Modificar a rota `app/api/scene/route.ts` para despachar `turn_on` explícito em vez de `alternar("switch.ventilacao_ps5")`.
   - *Impacto*: Elimina o risco de desligar a refrigeração forçada enquanto o PlayStation 5 estiver em jogo pesado.
2. **Sanitização e Validação de Enums nas Rotas de Borda**:
   - Implementar validação com lista restrita de comandos em `app/api/tv/route.ts` e de modos em `app/api/vacuum/route.ts`.
   - *Impacto*: Bloqueia envio de strings arbitrárias ou comandos espúrios para o Home Assistant.

---

## 3. Correções Funcionais

1. **[UX-001] Sistema de Feedback Visual Permanente (Toasts / Notificações)**:
   - Criar componente leve de notificação global na casca (`layout.tsx`) acionado pelo evento `"ha-toggle-failed"` ou rejeição de promessas de API.
   - *Impacto*: O usuário é informado textualmente de falhas de hardware ou quedas de sinal.
2. **[FUN-001] Sinalização Visual de Dispositivos Indisponíveis no `RoomCard`**:
   - Ajustar o cálculo do `RoomCard.tsx` para detectar entidades com `state === "unavailable"`, renderizando chip ou micro-dot específico de atenção em vez de contabilizá-las como "desligadas".
   - *Impacto*: O morador identifica imediatamente lâmpadas sem energia ou relés fora da rede Zigbee/Wi-Fi.
3. **[FUN-002] Compartilhamento de Travas Otimistas no Robô Aspirador**:
   - Integrar o seletor de sucção do `VacuumWidget.tsx` ao mecanismo centralizado `travasOtimistasRef`.
   - *Impacto*: Elimina o ricochete visual provocado pela latência de confirmação da nuvem Dreame.

---

## 4. Correções de Responsividade

1. **[RSP-001] Resolução do Conflito de Cascata CSS F-01 nas Pílulas do Cabeçalho**:
   - Inverter ou harmonizar a especificidade das linhas 4212 e 7201 em `globals.css`, assegurando que `.security-micro-pill` e `.battery-micro-pill` tenham `min-height: 44px` real em viewports móveis.
   - *Impacto*: Atende ao critério de alvo tátil mínimo WCAG 2.5.5.
2. **[RSP-002] Ampliação da Área de Toque do Botão Power da TV**:
   - Adicionar padding ou pseudoelemento no seletor `.tv-compact-power`, expandindo a área clicável de 34px para **44px × 44px**.
   - *Impacto*: Acionamento confortável em telas táteis e tablets de parede.
3. **Consolidação de Media Queries**:
   - Agrupar os 32 blocos `@media` dispersos no CSS nas 7 faixas de viewport canônicas de `specs/features/responsive-adaptive-dashboard.md`.
   - *Impacto*: Previne futuras sobrescritas acidentais de regras responsivas.

---

## 5. Unificação de Cores e Tokens

1. **Eliminação de Cores Hardcoded Inline**:
   - Mapear as 121 ocorrências de cores hexadecimais em arquivos `.tsx` para os tokens semânticos de `:root`.
2. **Purga de Tokens Zumbis**:
   - Remover as 32 variáveis CSS em `oklch` legadas de templates do shadcn/ui que colidem com a paleta noturna real.
3. **Harmonização das Famílias Cromáticas**:
   - Reduzir as 7 variantes de amarelo/âmbar para o token canônico `--color-device-on` (`#fbbf24`) e as 7 variantes de vermelho para `--color-action-danger` (`#ef4444`).
4. **Diferenciação Estrita de Desligado × Indisponível**:
   - Adotar tom ardósia específico (`#64748b`) para entidades `unavailable`, reservando `rgba(255,255,255,0.35)` exclusivamente para dispositivos desligados normais.

---

## 6. Unificação de Componentes

1. **Consolidação de `SecurityAlertsBar` e `BatteryAlertsBar`**:
   - Unificar os dois arquivos em um único componente `HeaderAlertPill.tsx` com propriedade de variante (`variant="security" | "battery"`), eliminando mais de 200 linhas de código duplicado.
2. **Componente Base de Fechamento de Diálogos (`ModalCloseButton`)**:
   - Substituir o caractere tipográfico cru `"✕"` por um componente padronizado com ícone SVG vetorial e dimensões mínimas de 44px.
3. **Descontinuação e Remoção de Componentes Órfãos**:
   - Excluir o arquivo residual `DeviceButton.tsx` (35 linhas) sem uso ativo.

---

## 7. Melhorias de Acessibilidade

1. **[A11Y-003] Implementação de Contenção de Foco (*Focus Trap*) em Modais**:
   - Assegurar que ao abrir qualquer diálogo em portal, a navegação com a tecla `Tab` fique restrita ao interior da janela modal.
2. **Harmonização da Hierarquia Semântica de Headings**:
   - Ajustar títulos em `BatteryAlertsBar` e `SecurityAlertsBar` de `<h3>` para `<h2>`, mantendo a ordem semântica contínua a partir do `<h1>` da página.
3. **Rótulos ARIA Contextuais em Controles Secundários**:
   - Enriquecer botões de velocidade do ventilador com labels dinâmicos completos (ex.: `"Velocidade 2 do Ventilador da Sala"`).

---

## 8. Melhorias de Performance

1. **Barramento de Polling Unificado**:
   - Centralizar as requisições assíncronas concorrentes de `page.tsx` (5s), `TodoListWidget` (15s), `TvRemoteWidget` (6s) e `EnergyWidget` (30s) sob uma única rotina de polling ou hook SWR/React Query.
   - *Impacto*: Redução drástica de concorrência de rede e alívio de conexões no Home Assistant Core.
2. **Decomposição dos Componentes Monolíticos**:
   - Desmembrar `MediaHubModal.tsx` (1.156 linhas) em `TvRemoteControls`, `MassAudioPlayer` e `StreamingCatalog`.
   - Desmembrar `EnergyWidget.tsx` (839 linhas), isolando o cálculo de splines SVG em hook desacoplado.
   - *Impacto*: Menor tempo de compilação, renders menores e facilidade de testes unitários.
3. **Instalação do ESLint e Tooling**:
   - Adicionar dependência de ESLint com suporte a flat config no Next 16 e restaurar o script `npm run lint`.

---

## 9. Melhorias Cosméticas

1. **Consolidação de Sombras de Elevação**:
   - Substituir as 124 sombras arbitrárias pelos 4 níveis canônicos do modelo Liquid Glass (`--shadow-glass-flat`, `--shadow-glass-elevated`, `--shadow-radiance-amber`, `--shadow-radiance-cyan`).
2. **Padronização de Alturas na Barra Diária**:
   - Uniformizar todos os cards compactos em **88px** no desktop e **76px** no mobile com cantos consistentes de 12px.
3. **Eliminação de Tipografia Fracionária**:
   - Substituir a regra `font-size: 11.5px;` por `font-size: var(--font-caption);` (`12px`).

---

## 10. Melhorias Futuras

Iniciativas de longo prazo alinhadas com o planejamento mestre da infraestrutura (`planning/ROADMAP.md`):

1. **Migração para Hardware Dedicado (HA OS)**:
   - Superar as limitações de rede Docker NAT do WSL2 no Windows, habilitando suporte nativo a mDNS, multicast e AirPlay.
2. **Áudio Multiroom com Apple Music e Music Assistant**:
   - Ampliar o suporte a caixas de som inteligentes embutidas e sincronização de zonas de áudio.
3. **Suíte Completa de Testes Automatizados de Contrato**:
   - Implementar testes com Vitest comparando `lib/rooms.ts` contra o retorno do Home Assistant (`GET /api/states`), barrando automaticamente regressões de nomes de entidades físicas.
4. **Integração com Fully Kiosk Browser API**:
   - Suporte a comandos remotos de brilho de tela e sensor de movimento nativo da câmera do tablet de parede.
