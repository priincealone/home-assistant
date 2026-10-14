# Diretrizes Gerais de Governança para Agentes (AGENTS.md)

Este repositório abriga o sistema de automação residencial do André, estruturado em **dois projetos integrados com repositórios Git independentes**:
1. **Base do Home Assistant (`d:\HomeAssistant`)**: Containers Docker, configurações YAML, automações físicas, sensores sintéticos e scripts Python.
2. **Painel Visual (`d:\HomeAssistant\dashboard-app`)**: Aplicação web moderna em Next.js 16 + React 19 + Tailwind CSS v4, com git próprio, servindo como painel principal da casa na porta 3002 e integrado nativamente ao Home Assistant via WebComponent (`config/www/casa-panel.js`, `/casa` e `dashboards/casa.yaml`).

---

## 1. Princípio da Separação de Responsabilidades

- **Claude Code**: Opera na base de automações, infraestrutura de containers, scripts forenses em Python e manutenções do sistema operacional. **Não deve editar componentes visuais ou CSS em `dashboard-app/`**.
- **Antigravity**: Opera na experiência de usuário (UX), interface em Next.js, sistema de design Liquid Glass, performance de renderização e acessibilidade. **Não deve alterar configurações físicas em `config/` (`automations.yaml`, `configuration.yaml`, `.storage/`) sem planejamento prévio aprovado**.
- **Contrato Canônico Compartilhado**: O mapeamento entre a casa real e a interface é governado por [`dashboard-app/lib/rooms.ts`](file:///d:/HomeAssistant/dashboard-app/lib/rooms.ts) . O `manifesto-comodos.json` é histórico (instantâneo da V1, aposentado em 13/10/2026). Renomear uma entidade física ou alterar seu `entity_id` sem sincronização quebra o painel.

---

## 2. Regras Críticas de Operação e Segurança

1. **Protocolo RSK-01 para Edição de Registros (.storage)**:
   O Home Assistant Core sobrescreve os arquivos em `config/.storage/` durante o desligamento. É terminantemente proibido editar `core.entity_registry`, `core.device_registry` ou `core.area_registry` com o container em execução. Procedimento obrigatório:
   - Gerar cópia de segurança em `d:\HomeAssistant\backups\`;
   - Parar o serviço: `docker stop homeassistant`;
   - Aplicar a alteração no arquivo JSON com validação estrita de sintaxe;
   - Iniciar o serviço: `docker start homeassistant`;
   - Validar a integridade lendo `docker logs --tail 50 homeassistant`.
2. **Imutabilidade de Segredos e Credenciais**:
   Nunca versionar, expor ou modificar automaticamente arquivos contendo tokens reais: `config/secrets.yaml`, `config/.storage/auth*`, `dashboard-app/.env.local` e credenciais de nuvem.
3. **Comando de Desligar da Smart TV Samsung**:
   Na TV da sala (`media_player.tv_un65du8000gxzd`), o comando `turn_off` alterna estado (tecla POWER). Com a TV desligada, o comando a liga. Qualquer rotina automatizada deve obrigatoriamente validar o estado atual via condicional `choose` antes do despacho.
4. **Respeito às Travas Otimistas no Frontend**:
   O cliente React opera com travas otimistas de 3.5 segundos (`travasOtimistasRef`) para garantir retorno visual em 0ms e feedback háptico sem sofrer ricochete visual provocado pela latência de relés físicos da Tuya/Xiaomi.

---

## 3. Matriz de Testes Obrigatórios

Antes de concluir qualquer tarefa:
- **Infraestrutura / Backend**: Validar configurações YAML via recarga de serviços do HA ou `homeassistant --script check_config`; confirmar que o container sobe limpo sem erros nos logs.
- **Frontend / Interface**: Executar `npm run build` ou `tsc --noEmit` em `dashboard-app/`; confirmar resposta HTTP 200 em `http://localhost:3002/api/state`.

---

## 4. Documentação de Referência Obrigatória

- **Governança Multi-Agente Completa**: [`artifacts/antigravity/multi-agent-governance.md`](file:///d:/HomeAssistant/artifacts/antigravity/multi-agent-governance.md)
- **Infraestrutura e Dispositivos**: [`CASA.md`](file:///d:/HomeAssistant/CASA.md)
- **Instruções do Claude Code**: [`CLAUDE.md`](file:///d:/HomeAssistant/CLAUDE.md)
- **Diário de Decisões e Histórico**: [`ESTADO_DASHBOARD.md`](file:///d:/HomeAssistant/ESTADO_DASHBOARD.md)
- **Matriz de Riscos Técnicos**: [`artifacts/antigravity/risk-register.md`](file:///d:/HomeAssistant/artifacts/antigravity/risk-register.md)
- **Matriz de Propriedade de Arquivos**: [`artifacts/antigravity/file-ownership.md`](file:///d:/HomeAssistant/artifacts/antigravity/file-ownership.md)
