# Revisão Crítica e Consolidação Final da Auditoria (final-review.md)

**Documento**: `artifacts/audit/final-review.md`  
**Escopo**: Avaliação crítica cruzada de todos os 14 artefatos gerados nas Fases 1 a 9  
**Data**: 16/09/2026 · **Status**: Concluído (Modo Somente Leitura — Sem alteração de código)  
**Governança**: `AGENTS.md` (Separação estrita: Antigravity no frontend `dashboard-app/`; Claude Code na automação e infraestrutura `config/`).

---

## 1. Verificação Crítica dos Resultados da Auditoria

### 1.1. Problemas Duplicados ou Concorrentes Detectados
Durante a revisão dos 15 problemas catalogados em `master-issues-log.md`, identificou-se uma sobreposição conceitual entre **`RSP-001`** (Alvo tátil das micro-pílulas em 36px) e **`VIS-002`** (Tipografia fracionária de 11.5px na mesma micro-pílula). 
- *Ajuste Crítico*: Tratam-se de duas manifestações da mesma classe CSS malformada (`.security-micro-pill`). Na fase de implementação, ambas devem ser tratadas em conjunto na mesma tarefa de higienização do componente.

### 1.2. Severidades Reavaliadas e Calibradas
- **`SEC-001` (Acesso sem autenticação na porta 3002)**: Classificado como **Crítico**. A severidade foi reconfirmada como crítica para cenários de compartilhamento externo, porém no contexto atual da residência (onde o painel só roda na LAN do André e sob Tailscale sem portas WAN abertas), o risco é mitigado pelo perímetro de rede. A severidade permanece Crítica porque a adição de novos usuários (ex.: Larissa) é meta imediata do roadmap (`ROADMAP.md` §3.5).
- **`A11Y-002` (Contraste tema claro 2.59:1)**: Reconfirmado como **Crítico/Bloqueador**. Sob incidência de luz natural no tablet da cozinha, o acento âmbar torna-se completamente ilegível.
- **`VIS-001` (124 sombras)**: Mantido como **Baixa/P3**. É um problema de higiene estética e peso de bundle, mas que não impede a utilização física da residência.

### 1.3. Recomendações Incompatíveis com a Arquitetura / Cuidados Especiais
- **Proposta de Middleware no Next.js (`SEC-001`)**: 
  - *Cuidado Arquitetural*: O tablet físico montado na parede (Wall-Mount) não possui teclado físico e opera frequentemente em tela cheia via Wake Lock. Adicionar um login complexo com senha alfanumérica quebraria a premissa de *glanceability* e resposta instantânea da casa. 
  - *Diretriz*: A autenticação para o display fixo de parede deve operar por reconhecimento de IP local/rede interna ou PIN numérico tátil simples de 4 dígitos, reservando tokens/sessões completas apenas para dispositivos móveis fora da residência.
- **Leitura direta de `.storage` em `app/api/mass/route.ts`**:
  - A rota tenta ler `C:\HomeAssistant\config\.storage\core.config_entries`. Conforme a governança de `AGENTS.md` e o roadmap `ROADMAP.md` §2.2, qualquer containerização futura quebra esse caminho estático do Windows. A chave deve ser migrada exclusivamente para variável de ambiente (`.env.local`).

### 1.4. Correções que Podem Quebrar Automações Físicas
- **Cena Gamer vs. Cooler do PS5 (`SEC-002`)**:
  - A automação física em `config/automations.yaml` já possui rotina de reconciliação de temperatura. Se o frontend tentar forçar comandos de ligar/desligar sem verificar o estado real, cria-se o conflito de dono de atuador (**Regra R8** da `AUTOMATION-POLICY.md`).
  - *Diretriz de Segurança*: O frontend deve apenas despachar `turn_on` condicional se a ventilação já não estiver acionada, sem interferir na automação que roda no Core do Home Assistant.

---

## 2. Segregação de Responsabilidades e Fronteiras Técnicas

### 2.1. Problemas que Pertencem ao Frontend (`dashboard-app/`)
* **`A11Y-001`**: Anel de foco `:focus-visible` em `globals.css`.
* **`A11Y-002`**: Ajuste de token `--on-accent` no tema claro em `globals.css`.
* **`RSP-001`**: Correção de cascata CSS F-01 em `globals.css`.
* **`RSP-002`**: Dimensão de 44px em `.tv-compact-power`.
* **`UX-001`**: Componente de Toast/Banner de erro no `layout.tsx`.
* **`UX-002`**: Encapsulamento de regras `:hover` sob `@media (hover: hover)`.
* **`FUN-001`**: Inclusão de indicador de `unavailable` em `RoomCard.tsx`.
* **`FUN-002`**: Travas otimistas no `VacuumWidget.tsx`.
* **`TECH-001`**: Decomposição modular de `MediaHubModal.tsx` e `EnergyWidget.tsx`.
* **`TECH-002`**: Configuração do ESLint em `package.json`.

### 2.2. Problemas que Pertencem à Borda / API (`dashboard-app/app/api/`)
* **`SEC-002`**: Substituição de `alternar()` por serviço explícito `turn_on` em `app/api/scene/route.ts`.
* **Sanitização de Enums**: Validação de parâmetros de string livre em `/api/tv` e `/api/vacuum`.

### 2.3. Problemas que Exigem Decisão de Produto (André)
* **Método de Autenticação da Porta 3002 (`SEC-001`)**: André precisa decidir se prefere PIN numérico de 4 dígitos na tela do tablet ou autenticação por cookie de sessão via senha.
* **Destino das Entidades Fantasma de Banheiro e Closet**: Decidir se os sensores de presença de Banheiro e Closet serão comprados/instalados ou se devem ser expurgados do contrato `lib/rooms.ts` (`docs/SYSTEM-MAP.md`).
* **Vida Útil de Peças do Aspirador**: Decidir se as escovas e filtros do robô Dreame foram substituídos para que o contador seja zerado no Home Assistant.

---

## 3. Matriz de Complexidade de Correção

| Tipo de Intervenção | Problemas Enquadrados | Risco Técnico |
| :--- | :--- | :---: |
| **Resolvidos Apenas com CSS / Tokens** | `A11Y-001` (Foco), `A11Y-002` (Contraste claro), `RSP-001` (Cascata F-01), `RSP-002` (Alvo TV), `UX-002` (Hover), `VIS-001` (Sombras), `VIS-002` (Tipografia) | **Muito Baixo** |
| **Exigem Refatoração de Componentes** | `UX-001` (Toast de erro), `FUN-001` (RoomCard unavailable), `FUN-002` (Travas Aspirador), `TECH-001` (Decomposição Monólitos) | **Baixo / Médio** |
| **Exigem Alteração de Rotas / API** | `SEC-002` (Idempotência Gamer), Validação de Enums em `/api/tv` e `/api/vacuum` | **Baixo** |
| **Exigem Nova Camada de Permissões** | `SEC-001` (Middleware de autenticação na porta 3002) | **Médio** |

---

## 4. Lista Final de Implementação Pré-Aprovada

A lista a seguir estrutura a execução segura dividida em tarefas atômicas e ordenadas:

---

### [TASK-01] Correção do Acento no Tema Claro e Foco Visual Global
- **Objetivo**: Resolver os dois bloqueadores de acessibilidade: adequar a relação de contraste do tema claro para >= 4.5:1 e injetar contorno visual `:focus-visible` em botões, cards e inputs.
- **Arquivos autorizados**: `dashboard-app/app/globals.css`.
- **Arquivos proibidos**: Qualquer arquivo fora de `dashboard-app/`, arquivos em `app/api/*`, `lib/rooms.ts`.
- **Dependências**: Nenhuma.
- **Testes**: Navegar com a tecla `Tab` verificando o anel de foco `#38bdf8` de 2px; medir contraste via script de luminância para `--on-accent: #b45309` sobre `#e2e8f4`.
- **Critério de aceite**: Contraste medido >= 4.5:1; foco visível em 100% dos elementos interativos.
- **Risco**: Muito Baixo (ajuste restrito a variáveis CSS e pseudo-classe de foco).
- **Rollback**: `git checkout dashboard-app/app/globals.css`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-02] Correção de Alvos Táteis e Conflito de Cascata CSS (F-01)
- **Objetivo**: Corrigir a sobreposição de regras em `globals.css` para assegurar que `.security-micro-pill`, `.battery-micro-pill` e `.tv-compact-power` tenham alvo tátil mínimo de 44px × 44px.
- **Arquivos autorizados**: `dashboard-app/app/globals.css`.
- **Arquivos proibidos**: Arquivos TSX, configurações do Home Assistant.
- **Dependências**: Nenhuma.
- **Testes**: Inspecionar os três seletores em viewports móveis (375px e 430px) via DevTools e confirmar altura computada >= 44px.
- **Critério de aceite**: Altura computada de todos os botões do cabeçalho e mini-player >= 44px.
- **Risco**: Baixo.
- **Rollback**: `git checkout dashboard-app/app/globals.css`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-03] Idempotência da Ventilação do PS5 na Cena Gamer
- **Objetivo**: Eliminar o risco de superaquecimento do console garantindo que a cena Gamer execute ativação explícita (`turn_on`) do cooler e nunca desligamento acidental.
- **Arquivos autorizados**: `dashboard-app/app/api/scene/route.ts`.
- **Arquivos proibidos**: `config/automations.yaml`, `config/configuration.yaml`.
- **Dependências**: Nenhuma.
- **Testes**: Simulação de payload de disparo da cena Gamer em ambiente de dev validando chamada ao serviço correto.
- **Critério de aceite**: A rota despacha comando de ativação estrita sem alternância cega.
- **Risco**: Muito Baixo.
- **Rollback**: `git checkout dashboard-app/app/api/scene/route.ts`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-04] Sistema Global de Feedback Visual e Toasts de Erro
- **Objetivo**: Fornecer aviso textual imediato quando uma requisição POST de comando falhar ou sofrer timeout, eliminando o silêncio de erro.
- **Arquivos autorizados**: `dashboard-app/app/layout.tsx`, `dashboard-app/app/page.tsx`, novo componente `dashboard-app/app/components/ToastContainer.tsx`.
- **Arquivos proibidos**: `lib/ha.ts`, arquivos fora de `dashboard-app`.
- **Dependências**: Nenhuma.
- **Testes**: Disparar comando com endpoint indisponível e confirmar exibição de toast na base da viewport por 4 segundos.
- **Critério de aceite**: Banner/Toast visível surge na tela informando falha de comunicação com o Home Assistant.
- **Risco**: Baixo.
- **Rollback**: `git checkout dashboard-app/`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-05] Sinalização de Indisponibilidade Físico-Lógica no RoomCard
- **Objetivo**: Evitar que dispositivos `unavailable` sejam mascarados como desligados no resumo numérico do card de cômodo.
- **Arquivos autorizados**: `dashboard-app/app/components/RoomCard.tsx`, `dashboard-app/app/globals.css`.
- **Arquivos proibidos**: `lib/rooms.ts`, `manifesto-comodos.json`.
- **Dependências**: Nenhuma.
- **Testes**: Injetar estado sintético `unavailable` em uma entidade de cômodo e confirmar renderização de micro-alerta.
- **Critério de aceite**: Cômodo com lâmpada fora de alcance exibe indicador de atenção dedicado.
- **Risco**: Baixo.
- **Rollback**: `git checkout dashboard-app/app/components/RoomCard.tsx`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-06] Encapsulamento de Regras de Hover para Eliminar Sticky Hover
- **Objetivo**: Evitar que cards e botões permaneçam acesos em tablets de parede e smartphones após o toque.
- **Arquivos autorizados**: `dashboard-app/app/globals.css`.
- **Arquivos proibidos**: Componentes `.tsx`.
- **Dependências**: Nenhuma.
- **Testes**: Validar toque tátil em emulador de celular/tablet confirmando retorno visual imediato após o toque.
- **Critério de aceite**: Nenhum efeito visual de `:hover` permanece retido após `touchend` em dispositivos `pointer: coarse`.
- **Risco**: Baixo.
- **Rollback**: `git checkout dashboard-app/app/globals.css`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-07] Unificação de Micro-Pílulas (`SecurityAlertsBar` × `BatteryAlertsBar`)
- **Objetivo**: Eliminar mais de 200 linhas de código duplicado consolidando os dois arquivos em um único componente com variantes.
- **Arquivos autorizados**: `dashboard-app/app/components/HeaderAlertPill.tsx` (novo), `dashboard-app/app/components/SecurityAlertsBar.tsx`, `dashboard-app/app/components/BatteryAlertsBar.tsx`, `dashboard-app/app/page.tsx`.
- **Arquivos proibidos**: Arquivos fora de `dashboard-app`.
- **Dependências**: TASK-02 concluída.
- **Testes**: Abrir modais de segurança e de bateria a partir da nova pílula unificada; validar fechamento e renderização.
- **Critério de aceite**: Redução de duplicação com integridade funcional 100% preservada e `npx tsc --noEmit` código 0.
- **Risco**: Baixo.
- **Rollback**: `git checkout dashboard-app/app/components/`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-08] Instalação e Governança de ESLint no Next 16
- **Objetivo**: Restaurar a análise estática no projeto com configuração compatível para Next 16 e React 19.
- **Arquivos autorizados**: `dashboard-app/package.json`, `dashboard-app/eslint.config.mjs` (novo).
- **Arquivos proibidos**: `config/*`.
- **Dependências**: Nenhuma.
- **Testes**: Executar `npm run lint` e obter saída estruturada sem erros de inicialização de pacote.
- **Critério de aceite**: `npm run lint` executa com sucesso e reporta a integridade do código.
- **Risco**: Baixo.
- **Rollback**: `git checkout dashboard-app/package.json`.
- **Responsável sugerido**: Antigravity.

---

### [TASK-09] Arquitetura de Autenticação Perimetral na Porta 3002
- **Objetivo**: Proteger a superfície de controle contra dispositivos não autorizados na rede Wi-Fi e tailnet.
- **Arquivos autorizados**: `dashboard-app/middleware.ts` (novo), `dashboard-app/app/login/page.tsx` (novo), `dashboard-app/lib/auth.ts` (novo).
- **Arquivos proibidos**: `config/secrets.yaml`, arquivos fora de `dashboard-app`.
- **Dependências**: Decisão prévia do André sobre o método de acesso no tablet de parede (PIN de 4 dígitos vs Cookie).
- **Testes**: Tentar acessar `/` sem credencial e validar interceptação; validar passagem transparente com sessão válida.
- **Critério de aceite**: Nenhuma rota ou página executa comandos sem autorização prévia.
- **Risco**: Médio (deve assegurar que o tablet de parede consiga autenticar sem fricção diária).
- **Rollback**: Remoção do `middleware.ts`.
- **Responsável sugerido**: Antigravity + André.
