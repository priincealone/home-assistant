# Matriz de Responsabilidade e Governança de Arquivos (File Ownership)

Data de Definição: 15/09/2026  
Objetivo: Estabelecer fronteiras estritas de governança e segurança entre Antigravity, Claude Code e o Proprietário da residência.

---

## 1. Classificação das Áreas de Governança

Cada componente, diretório e arquivo deste repositório pertence a uma das 4 categorias de permissão:

1. **Antigravity**: Foco em experiência do usuário (UX), componentes visuais, layout responsivo, sistema de design (Liquid Glass), acessibilidade e performance de renderização no painel Next.js.
2. **Claude Code**: Foco em automações físicas, infraestrutura de containers Docker, scripts de diagnóstico forense em Python, registros de hardware do Home Assistant e manutenções no sistema operacional.
3. **Compartilhada com Revisão**: Pontos de contrato e fronteira onde alterações afetam simultaneamente o backend do Home Assistant e o frontend do Dashboard. Exige sincronização e revisão mútua.
4. **Proibida para Alteração Automática**: Arquivos de dados em tempo real, credenciais, segredos, bancos de dados ativos e registros protegidos contra corrupção.

---

## 2. Matriz Detalhada por Arquivo e Diretório

| Caminho / Arquivo | Classificação | Agente Primário | Regras e Justificativa |
| :--- | :--- | :--- | :--- |
| `dashboard-app/app/page.tsx` | **Antigravity** | Antigravity | Tela principal do painel, disposição de widgets, estados visuais e travas otimistas. |
| `dashboard-app/app/layout.tsx` | **Antigravity** | Antigravity | Estrutura de casca HTML, metadados PWA, importação de fontes e contextos. |
| `dashboard-app/app/globals.css` | **Antigravity** | Antigravity | Tokens visuais CSS, temas, efeitos ópticos de reflexo, blur e variáveis de animação. |
| `dashboard-app/app/standby/` | **Antigravity** | Antigravity | Tela de descanso noturno para tablets de parede com proteção OLED e baixa luminosidade. |
| `dashboard-app/app/comodo/` | **Antigravity** | Antigravity | Páginas e rotas dedicadas à navegação detalhada de cada cômodo da residência. |
| `dashboard-app/app/components/*` | **Antigravity** | Antigravity | Biblioteca de componentes modulares (`RoomCard`, `DeviceTile`, `MediaHubModal`, etc.). |
| `dashboard-app/DESIGN.md` | **Antigravity** | Antigravity | Especificação canônica do design system "Nocturnal Observatory". |
| `dashboard-app/PRODUCT.md` | **Antigravity** | Antigravity | Definição de personas, casos de uso e escopo do produto visual. |
| `config/automations.yaml` | **Claude Code** | Claude Code | Regras físicas de acionamento (presença, portas, desligamento seguro da TV, ventiladores). |
| `config/template_sensors.yaml` | **Claude Code** | Claude Code | Sensores sintéticos no HA (contagem de luzes por ambiente, status da sala, Apple Saúde). |
| `config/configuration.yaml` | **Claude Code** | Claude Code | Arquivo de inclusão de módulos e temas nativos do Home Assistant Core. |
| `config/scenes.yaml` & `scripts.yaml` | **Claude Code** | Claude Code | Rotinas e cenas nativas do ecossistema Home Assistant. |
| `scripts/diagnostico/*` | **Claude Code** | Claude Code | Scripts forenses em Python (`quem_acendeu.py`, `rajadas.py`) que auditam o banco SQLite. |
| `scripts/manutencao/*` | **Claude Code** | Claude Code | Utilitários de migração e limpeza de registros legados do Home Assistant. |
| `scripts/music_assistant/*` | **Claude Code** | Claude Code | Scripts utilitários de provisionamento e teste da API do Music Assistant. |
| `scripts/tuya_map.py` | **Claude Code** | Claude Code | Mapeamento e escuta de broadcasts UDP de dispositivos Tuya na rede local. |
| `dashboard-app/lib/rooms.ts` | **Compartilhada com Revisão** | Ambos | **Contrato Canônico**: Mapeia `entity_id` do HA para a interface. Renomear aqui sem alterar o HA (ou vice-versa) quebra o painel. |
| `dashboard-app/lib/ha.ts` | **Compartilhada com Revisão** | Ambos | Cliente de transporte HTTP/REST. Controla os payloads aceitos pelo Home Assistant. |
| `dashboard-app/manifesto-comodos.json` | **Compartilhada com Revisão** | Ambos | Registro estruturado dos 10 cômodos e 16 pontos de luz físicos validados. |
| `dashboard-app/app/api/*` | **Compartilhada com Revisão** | Ambos | Rotas de API que traduzem as requisições da UI em chamadas REST/WebSocket para o HA e MASS. |
| `CASA.md` | **Compartilhada com Revisão** | Ambos | Documento mestre de arquitetura e infraestrutura. Deve ser atualizado a cada mudança relevante. |
| `ESTADO_DASHBOARD.md` | **Compartilhada com Revisão** | Ambos | Diário de bordo cronológico das decisões de design e engenharia da residência. |
| `dashboard-app/package.json` | **Compartilhada com Revisão** | Ambos | Dependências e scripts de automação/build. Alterações requerem validação de tipo e lint. |
| `dashboard-app/iniciar_servidor_*.ps1` | **Compartilhada com Revisão** | Ambos | Scripts do watchdog que mantêm o servidor Next.js ativo na porta 3002. |
| `config/home-assistant_v2.db*` | **Proibida para Alteração** | Ninguém (Sistema) | **Banco SQLite em modo WAL**: Alterações manuais corrompem a integridade dos dados históricos. |
| `config/.storage/core.*_registry` | **Proibida para Alteração** | Proibido em Execução | **Risco de Sobrescrita**: O HA sobrescreve no desligamento. Proibido editar sem o container parado. |
| `config/secrets.yaml` | **Proibida para Alteração** | Usuário Proprietário | Contém tokens e senhas reais de contas (Xiaomi, Apple Saúde, webhooks). Não expor nem versionar. |
| `dashboard-app/.env.local` | **Proibida para Alteração** | Usuário Proprietário | Contém tokens de longa duração de produção (`HA_TOKEN`, `MASS_TOKEN`). |
| `config/.storage/auth*` | **Proibida para Alteração** | Ninguém (Sistema) | Tabelas criptográficas de autenticação e credenciais do Home Assistant. |
| `music-assistant/data` | **Proibida para Alteração** | Ninguém (Sistema) | Banco de dados interno e caches do container do Music Assistant. |
| `anisette/data` | **Proibida para Alteração** | Ninguém (Sistema) | Dados de provisionamento criptográfico da biblioteca Apple Anisette. |
| `.git/` (ambos os repositórios) | **Proibida para Alteração** | Ninguém (Sistema) | Estruturas internas do Git. Apenas comandos Git padrão são permitidos. |

---

## 3. Protocolos de Operação e Segurança

### Regra 1: O Princípio da Imutabilidade do Design pelo Claude Code
O Claude Code opera exclusivamente na base de automações, infraestrutura e scripts (`c:\HomeAssistant`). Ele **não deve alterar** componentes visuais em `dashboard-app/app/components/` ou CSS sem solicitação inequívoca do usuário, respeitando a diretriz explícita de `CLAUDE.md`.

### Regra 2: O Princípio da Não-Degradação Física pelo Antigravity
O Antigravity atua na experiência de usuário do `dashboard-app`. Ao criar novos controles ou widgets, ele deve utilizar as entidades já mapeadas em `lib/rooms.ts`. **É vedado** criar ou editar arquivos dentro de `c:\HomeAssistant\config\` sem planejamento prévio e autorização do usuário.

### Regra 3: Protocolo para Edição de Registros (.storage)
Caso seja imperativo editar algum registro interno (`core.entity_registry`, `core.device_registry` ou `core.area_registry`):
1. Criar snapshot manual do arquivo para a pasta `c:\HomeAssistant\backups\`;
2. Parar o serviço do Home Assistant via comando: `docker stop homeassistant`;
3. Aplicar a edição cirúrgica no arquivo JSON com validação estrita de sintaxe;
4. Reiniciar o serviço: `docker start homeassistant`;
5. Confirmar a persistência do dado lendo o log: `docker logs --tail 50 homeassistant`.
