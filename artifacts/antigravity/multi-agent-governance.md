# Arquitetura Coordenada e Governança Multi-Agente — Home Assistant & Dashboard Casa

Data de Vigência: 15/09/2026  
Status: Canônico e Homologado  
Escopo: Governança Coordenada entre Antigravity, Claude Code e o Proprietário André

---

## 1. Visão Geral da Arquitetura

O ecossistema residencial opera sob um modelo híbrido local-nuvem com divisão estrita de responsabilidades entre infraestrutura de automação e interface visual.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PROPRIETÁRIO (ANDRÉ)                                  │
│                 Decisões Estratégicas · Credenciais · Regras de Negócio                 │
└───────────────────────────┬────────────────────────────────┬───────────────────────────┘
                            │                                │
            ┌───────────────┴───────────────┐┌───────────────┴───────────────┐
            ▼                               ▼▼                               ▼
┌────────────────────────────────────────┐     ┌────────────────────────────────────────┐
│              CLAUDE CODE               │     │              ANTIGRAVITY               │
│   Guardião da Infraestrutura Física    │     │      Guardião da Experiência (UX)      │
│ ────────────────────────────────────── │     │ ────────────────────────────────────── │
│ • Docker Desktop (WSL2) & Containers   │     │ • Next.js 16 (App Router) + React 19   │
│ • Home Assistant Core 2026.9 (:8123)   │     │ • Design System "Nocturnal Observatory"│
│ • config/automations.yaml              │     │ • Liquid Glass (60fps, backdrop-blur)  │
│ • config/template_sensors.yaml         │     │ • Travas Otimistas (TTL 3.5s, 0ms lag) │
│ • Scripts Python forenses e rede       │     │ • Componentes UI modulares & Modais    │
│ • Banco de Dados SQLite (WAL)          │     │ • Tablets de parede, Mobile e Desktop  │
└──────────────────┬─────────────────────┘     └─────────────────────┬──────────────────┘
                   │                                                 │
                   │           ┌─────────────────────────┐           │
                   └──────────►│    CONTRATO CANÔNICO    │◄──────────┘
                               │ ─────────────────────── │
                               │  lib/rooms.ts           │
                               │  manifesto-comodos.json │
                               │  app/api/state & toggle │
                               └─────────────────────────┘
```

### Stack Tecnológica Consolidada
- **Frontend**: Next.js 16.3.3 (App Router), React 19.2.0, Tailwind CSS v4, Base-UI, ícones Lucide.
- **Backend / Borda**: Next.js Route Handlers (`app/api/*`) com proxy autenticado e isolamento de tokens.
- **Gateway de Automação**: Home Assistant Core 2026.9 em container Docker (`homeassistant`) sobre rede `casa-net`.
- **Áudio Multiroom**: Music Assistant Server 2.10.2 (`music-assistant`), BGUtil (`bgutil-provider`) e Anisette (`anisette`).
- **Banco de Dados**: SQLite 3 com WAL ativo (`config/home-assistant_v2.db`).
- **Telemetria de Host**: Glances Web Server (:61208) no Windows 11.
- **Supervisão 24/7**: Watchdog PowerShell (`iniciar_servidor_background.ps1`) via Tarefa Agendada no Windows (`CasaDashboardAutoStart`).
- **Integração Nativa no HA**: Bridge WebComponent (`config/www/casa-panel.js`) e Painel Custom (`panel_custom` em `/casa`) com resolução dinâmica de host (`window.location.hostname` para localhost, LAN ou Tailscale) e dashboard Lovelace integrado (`dashboards/casa.yaml`).
- **Sincronização Imediata em Tempo Real (0ms)**: O servidor de desenvolvimento no Windows (`D:\HomeAssistant\dashboard-app`) mantém Fast Refresh (HMR) ativo; alterações aprovadas em código são exibidas instantaneamente no Home Assistant sem necessidade de compilação de imagem Docker ou reinício de serviços.

---

## 2. Matriz de Propriedade de Arquivos (File Ownership)

Cada arquivo, pasta e recurso deste repositório pertence a uma de 4 categorias rígidas:

| Área / Arquivo | Classificação | Agente Primário | Diretriz de Operação |
| :--- | :--- | :--- | :--- |
| `dashboard-app/app/` (páginas e layouts) | **Antigravity** | Antigravity | Construção visual, modais, temas, fontes e roteamento. Claude Code não edita. |
| `dashboard-app/components/` | **Antigravity** | Antigravity | Biblioteca de componentes modulares (`RoomCard`, `DeviceTile`, etc.). Claude Code não edita. |
| `dashboard-app/app/globals.css` | **Antigravity** | Antigravity | Tokens visuais CSS, temas ópticos e animações 60fps. Claude Code não edita. |
| `dashboard-app/DESIGN.md` & `PRODUCT.md` | **Antigravity** | Antigravity | Especificações de design e regras de produto. Claude Code não edita. |
| `config/automations.yaml` | **Claude Code** | Claude Code | Automações físicas reais da casa. Antigravity não edita sem aprovação prévia. |
| `config/template_sensors.yaml` | **Claude Code** | Claude Code | Sensores sintéticos que o painel consome. Antigravity não edita sem aprovação prévia. |
| `config/configuration.yaml` | **Claude Code** | Claude Code | Configuração principal do HA Core. Antigravity não edita sem aprovação prévia. |
| `scripts/diagnostico/*` | **Claude Code** | Claude Code | Scripts Python de auditoria do SQLite (`quem_acendeu.py`, `rajadas.py`). |
| `scripts/tuya_map.py` | **Claude Code** | Claude Code | Descoberta UDP broadcast de dispositivos Tuya na LAN. |
| `dashboard-app/lib/rooms.ts` | **Compartilhada com Revisão** | Ambos | **Contrato Canônico**: Mapeamento de entidades para a interface. Alteração exige sincronia mútua. |
| `dashboard-app/manifesto-comodos.json` | **Compartilhada com Revisão** | Ambos | Registro estruturado dos 10 cômodos e 16 pontos físicos validados. |
| `dashboard-app/app/api/*` | **Compartilhada com Revisão** | Ambos | Rotas de API que convertem comandos da UI em chamadas REST/WebSocket para HA e MASS. |
| `CASA.md` & `ESTADO_DASHBOARD.md` | **Compartilhada com Revisão** | Ambos | Documentação mestre e diário histórico de bordo. Ambos devem manter atualizado. |
| `config/.storage/core.*_registry` | **Proibida para Alteração Automática** | Claude Code (com protocolo) | **Risco Crítico RSK-01**: Exige backup prévio, `docker stop`, edição manual e `docker start`. |
| `config/secrets.yaml` & `.env.local` | **Proibida para Alteração Automática** | Usuário Proprietário | Credenciais reais de contas, webhooks e tokens de longa duração (`HA_TOKEN`, `MASS_TOKEN`). |
| `config/home-assistant_v2.db*` | **Proibida para Alteração Automática** | Ninguém (Sistema) | Banco de dados transacional SQLite em modo WAL. Proibida qualquer escrita externa direta. |

---

## 3. Matriz de Riscos Críticos e Protocolos de Contingência

| ID | Risco Identificado | Severidade | Protocolo Obrigatório de Mitigação |
| :--- | :--- | :--- | :--- |
| **RSK-01** | Sobrescrita de Registros JSON no Desligamento | Crítica | Proibir edição com o container ativo. Protocolo: 1) Backup em `backups/`; 2) `docker stop homeassistant`; 3) Edição cirúrgica; 4) `docker start homeassistant`; 5) Validação nos logs. |
| **RSK-02** | Conflito Nuvem Tuya (Smart Life) vs HA | Alta | Desativar cenas nativas no app móvel Smart Life (`scene.lavanderia_*`, `scene.banheiro_*`) para evitar que a nuvem execute ações concorrentes fora do HA. |
| **RSK-03** | Inversão Cozinha vs Lavanderia | Alta | Padronização canônica estabelecida: Tecla 1 = Cozinha (`switch_1`), Tecla 2 = Copa (`switch_2`), Tecla 3 = Lavanderia (`switch_3`). Não alterar sem testar um interruptor por vez. |
| **RSK-04** | TV Samsung — Tecla POWER Alternadora | Alta | `media_player.turn_off` alterna estado na TV Samsung. Condicionar sempre a ação a `choose` verificando se o estado é diferente de `['off', 'standby', 'unavailable']`. |
| **RSK-05** | Restrição de Multicast no Docker WSL2 | Média | Docker NAT impede mDNS/SSDP. Comunicação deve priorizar unicast IP direto. Planejada migração para hardware dedicado bare-metal no médio prazo. |
| **RSK-06** | Volatilidade do Patch Glances API | Média | Container recriado perde timeout de 15s. Manter script de reaplicação: `docker exec homeassistant sed -i "s/client.get(url)/client.get(url, timeout=15)/g" ...`. |
| **RSK-07** | Injeção de `desktop.ini` pelo Google Drive | Média | Google Drive injeta arquivos de sistema em pastas ocultas do Next.js. O script `iniciar_servidor_background.ps1` expurga `desktop.ini` antes do build/start. |
| **RSK-08** | Falha de Execução do Servidor Dev | Média | Painel registrado como Tarefa Agendada no Windows (`CasaDashboardAutoStart`) e atalho no Startup, rodando watchdog silencioso com Mutex de sistema. |
| **RSK-09** | Falhas de Lint no Next.js 16 | Baixa | Utilizar validação estática via `npm run build` ou `tsc --noEmit` para conformidade de tipos e regras modernas do React 19. |
| **RSK-10** | Regressões Silenciosas no Painel | Média | Implementar testes de integração nas rotas de API `/api/state` e `/api/toggle` para blindar contratos contra quebras de schema. |

---

## 4. Perfis, Papéis e Fronteiras dos Agentes

### Perfil A: Claude Code (Backend, Infraestrutura e Automações)
- **Papel**: Guardião da estabilidade física da residência, integridade de dados e infraestrutura de rede/serviços.
- **Ambiente de Execução**: PowerShell do host Windows e comandos `docker exec` dentro dos containers da rede `casa-net`.
- **Diretrizes Estritas**:
  1. Opera exclusivamente dentro de `c:\HomeAssistant` (infraestrutura, configurações e scripts).
  2. Nunca edita código, estilos ou componentes visuais dentro de `dashboard-app/`.
  3. Ao criar ou modificar automações em `config/automations.yaml`, inclui obrigatoriamente a justificativa e armadilhas identificadas na chave `description`.
  4. Para recarregar automações ou templates, utiliza os serviços do HA (`automation.reload`, `template.reload`) via API ou interface administrativa, evitando reinicializações desnecessárias.
  5. Ao concluir qualquer alteração de infraestrutura, registra o raciocínio em `ESTADO_DASHBOARD.md`, atualiza `CASA.md` e realiza commit git local.

### Perfil B: Antigravity (Frontend, Interface Visual e UX)
- **Papel**: Guardião da experiência do usuário, design system "Nocturnal Observatory", responsividade e fluidez tátil.
- **Ambiente de Execução**: Workspace do `dashboard-app/`, Node.js, Next.js 16, React 19 e testes de navegador.
- **Diretrizes Estritas**:
  1. Opera exclusivamente no projeto `dashboard-app/` (rotas, páginas, componentes, estilos e utilitários).
  2. Nunca edita arquivos de configuração física em `config/` (`automations.yaml`, `configuration.yaml`, `.storage/`).
  3. Utiliza estritamente os `entity_id` mapeados em `lib/rooms.ts`. Nunca assume a existência de uma entidade sem verificar `GET /api/states`.
  4. Preserva os pilares de UX:
     - **Travas Otimistas**: Atualização visual em 0ms no toque, com trava de 3.5s (`travasOtimistasRef`) para evitar ricochete visual de relés lentos.
     - **Glanceability**: Legibilidade imediata de estados a 3 metros de distância no tablet de parede via cor, contraste e ícone.
     - **Performance 60fps**: Animações restritas a `transform` e `opacity`, sem acionar layout reflow. Uso de `tabular-nums` em dados numéricos.
  5. Mantém conformidade com o design tokens de `DESIGN.md` (Liquid Glass, paleta âmbar `#fbbf24`, azul atmosférico `#38bdf8`, esmeralda `#10b981`).

---

## 5. Matriz de Testes e Validação Contínua

Antes de qualquer commit ou finalização de tarefa, o agente responsável deve executar a rotina de validação correspondente:

### A. Testes de Infraestrutura (Claude Code)
1. **Validação de Sintaxe YAML**:
   ```bash
   docker exec homeassistant python -m homeassistant --script check_config -c /config
   ```
2. **Validação de Integridade de Registros JSON**:
   ```bash
   python -c "import json; json.load(open('config/.storage/core.entity_registry', encoding='utf-8'))"
   ```
3. **Auditoria de Logs do Container**:
   ```bash
   docker logs --tail 50 homeassistant
   ```
   *Critério de Aceite*: Nenhuma mensagem `ERROR` ou `FATAL`. Inicialização concluída em menos de 15 segundos.

### B. Testes de Interface e Painel (Antigravity)
1. **Validação de Tipos e Build Next.js**:
   ```bash
   cd dashboard-app && npm run build
   ```
   *Critério de Aceite*: Build concluído com sucesso, zero erros de TypeScript e rotas estáticas/dinâmicas compiladas.
2. **Teste de Resposta do Endpoint de Estados**:
   ```bash
   curl -s http://localhost:3002/api/state | jq '.atualizado_em'
   ```
   *Critério de Aceite*: Código HTTP 200, payload contendo os 10 cômodos e entidades ativas.
3. **Validação Visual de Viewports**:
   - Tablet de Parede: Resolução 1400px / Landscape (grid de cômodos, widget de energia, relógio).
   - Mobile: Resolução 375px (empilhamento vertical nativo, botões com alvo mínimo de 44x44px).
   - Modo Ocioso / Standby: Proteção OLED, luminosidade reduzida e relógio ativado.

---

## 6. Fluxo de Decisão e Alçada de Aprovação

As intervenções no sistema são categorizadas em 3 níveis de governança sob a autoridade do proprietário André:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NÍVEL 1: AUTÔNOMO COM VALIDAÇÃO                                            │
│ • Ajustes de CSS, micro-interações, tokens de cor, padding e tipografia.    │
│ • Correções de lint, refatoração interna de componentes React sem quebra.   │
│ • Criação de scripts de diagnóstico de leitura (read-only) em Python.       │
│ ➔ Protocolo: O agente executa, valida contra a suíte de testes e commita. │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ NÍVEL 2: PROPOSTA COM PLANO PRÉVIO (/plan)                                  │
│ • Criação ou alteração de regras físicas em config/automations.yaml.        │
│ • Alteração de contratos canônicos (lib/rooms.ts, manifesto-comodos.json).  │
│ • Renomeação de entidades ou edição cirúrgica em config/.storage/.          │
│ • Adição de novas rotas de API no dashboard-app.                            │
│ ➔ Protocolo: Exige elaboração de implementation_plan.md e aprovação explícita.│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ NÍVEL 3: EXCLUSIVO DO PROPRIETÁRIO                                         │
│ • Inserção ou alteração de tokens, senhas e chaves em secrets.yaml/.env.    │
│ • Alterações no aplicativo móvel Smart Life / Tuya Cloud.                   │
│ • Configuração de reservas de DHCP e regras no roteador de rede.           │
│ • Desativação ou pareamento físico de novos aparelhos nas tomadas.          │
│ ➔ Protocolo: Apenas o André executa diretamente no hardware/app móvel.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Referência Rápida de Documentos Canônicos

| Documento | Localização | Finalidade Principal |
| :--- | :--- | :--- |
| **CASA.md** | [`c:\HomeAssistant\CASA.md`](file:///c:/HomeAssistant/CASA.md) | Mestre da infraestrutura, cômodos, automações ativas e pendências. |
| **CLAUDE.md** | [`c:\HomeAssistant\CLAUDE.md`](file:///c:/HomeAssistant/CLAUDE.md) | Regras operacionais e fronteiras exclusivas do Claude Code. |
| **AGENTS.md (Raiz)** | [`c:\HomeAssistant\AGENTS.md`](file:///c:/HomeAssistant/AGENTS.md) | Regras gerais de operação e coexistência dos agentes no workspace. |
| **AGENTS.md (App)** | [`c:\HomeAssistant\dashboard-app\AGENTS.md`](file:///c:/HomeAssistant/dashboard-app/AGENTS.md) | Regras do compilador Next.js 16 e padrões React para o Antigravity. |
| **ESTADO_DASHBOARD.md** | [`c:\HomeAssistant\ESTADO_DASHBOARD.md`](file:///c:/HomeAssistant/ESTADO_DASHBOARD.md) | Diário histórico e cronológico de decisões técnicas e lições aprendidas. |
| **DESIGN.md** | [`c:\HomeAssistant\dashboard-app\DESIGN.md`](file:///c:/HomeAssistant/dashboard-app/DESIGN.md) | Especificação canônica do Design System "Nocturnal Observatory". |
| **PRODUCT.md** | [`c:\HomeAssistant\dashboard-app\PRODUCT.md`](file:///c:/HomeAssistant/dashboard-app/PRODUCT.md) | Definição de personas, casos de uso e escopo de produto. |
| **Roadmap** | [`artifacts/antigravity/recommended-roadmap.md`](file:///c:/HomeAssistant/artifacts/antigravity/recommended-roadmap.md) | Planejamento em 4 fases sequenciais de evolução e resiliência. |
| **Inventário** | [`artifacts/antigravity/repository-inventory.md`](file:///c:/HomeAssistant/artifacts/antigravity/repository-inventory.md) | Levantamento exaustivo de stack, ferramentas e integrações. |
| **Arquitetura** | [`artifacts/antigravity/current-architecture.md`](file:///c:/HomeAssistant/artifacts/antigravity/current-architecture.md) | Topologia detalhada, diagrama Mermaid e fluxos de dados. |
| **Riscos** | [`artifacts/antigravity/risk-register.md`](file:///c:/HomeAssistant/artifacts/antigravity/risk-register.md) | Matriz técnica e evidências de riscos operacionais (RSK-01 a RSK-10). |
| **File Ownership** | [`artifacts/antigravity/file-ownership.md`](file:///c:/HomeAssistant/artifacts/antigravity/file-ownership.md) | Matriz formal de permissões e governança por arquivo e diretório. |
