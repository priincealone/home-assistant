# Registro de Riscos Técnicos e Operacionais (Risk Register)

Data da Auditoria: 15/09/2026  
Escopo: Infraestrutura Home Assistant, Automações Físicas e Aplicação Web do Painel

---

## 1. Matriz de Riscos Críticos

| ID | Risco Identificado | Severidade | Probabilidade | Impacto no Sistema | Estratégia de Mitigação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Sobrescrita de Registros JSON no Desligamento** | Crítica | Alta | Perda de configurações e corrupção de dispositivos em `config/.storage/` | Proibir edição com o container ativo; exigir backup prévio em `backups/`, `docker stop`, edição e `docker start`. |
| **RSK-02** | **Conflito de Acionamento Nuvem Tuya vs HA** | Alta | Alta | Lâmpadas acendendo/apagando sozinhas por rotinas no Smart Life | Identificar e desligar cenas no app Smart Life (`scene.lavanderia_*`, `scene.banheiro_*`). |
| **RSK-03** | **Inversão de Entidades Cozinha vs Lavanderia** | Alta | Média | Disparo de automações no cômodo errado ou estados invertidos no painel | Padronizar chaveamento entre `CASA.md`, `switch_as_x`, `automations.yaml` e `lib/rooms.ts`. |
| **RSK-04** | **Comando de Desligar da Smart TV Não-Idempotente** | Alta | Alta | TV Samsung liga no meio da noite quando a porta do quarto é fechada | Manter condição estrita de verificação de estado (`choose` validando `media_player` ligado antes do envio). |
| **RSK-05** | **Bloqueio de Multicast / mDNS no Docker WSL2** | Média | Alta | Inoperância de descoberta automática, AirPlay e Chromecast no Music Assistant | Planejar migração futura para host Linux dedicado / Bare Metal com HAOS. |
| **RSK-06** | **Perda do Patch do Glances ao Recriar Container** | Média | Média | Queda dos sensores de temperatura/uso de CPU do PC no Home Assistant | Script pós-build ou inicialização automatizada aplicando o patch de timeout no Python do HA. |
| **RSK-07** | **Injeção de `desktop.ini` pelo Google Drive na pasta `.next`** | Média | Alta | Quebra do servidor Next.js e falha de inicialização da porta 3002 | Manter rotina `Clean-DesktopIni` no script watchdog e adicionar exclusão nas regras do Google Drive. |
| **RSK-08** | **IP do Host Sem Reserva de DHCP (`192.168.31.22`)** | Média | Média | Quebra das conexões do Music Assistant e webhooks de saúde se o IP mudar | Configurar reserva estática de DHCP (MAC address) no roteador da residência. |
| **RSK-09** | **Falha no Script `npm run lint` do Next.js 16** | Baixa | Alta | Falha de validação de código em pipelines de automação e agentes de IA | Atualizar `package.json` para executar `eslint .` ou sintaxe moderna de lint do Next 16. |
| **RSK-10** | **Ausência de Suíte Automatizada de Testes no Painel** | Média | Alta | Regressões visuais e lógicas silenciosas ao alterar rotas de API e componentes | Implementar testes de integração de API e testes de ponta a ponta com Playwright. |

---

## 2. Detalhamento dos Riscos e Evidências Técnicas

### RSK-01: Sobrescrita de Registros JSON (`core.*_registry`)
- **Evidência**: O Home Assistant Core mantém os registros de dispositivos, entidades e áreas em memória cache durante a execução. Ao receber o sinal de parada (`SIGTERM`), ele despeja o estado da memória sobre os arquivos em `config/.storage/`.
- **Perigo**: Se um agente (Claude Code ou Antigravity) editar `core.entity_registry` com o container em execução, o Home Assistant sobrescreverá o arquivo apagando as modificações assim que for reiniciado via `docker restart`.
- **Protocolo Obrigatório**:
  1. Gerar cópia de segurança em `backups/core.<arquivo>.bak_<data>`;
  2. Executar `docker stop homeassistant`;
  3. Modificar o arquivo JSON;
  4. Executar `docker start homeassistant`.

### RSK-02: Conflito Nuvem Tuya (Smart Life) vs Automações Locais
- **Evidência**: O script forense `scripts/diagnostico/quem_acendeu.py` constatou múltiplos acendimentos noturnos sem `context_user_id` e sem `context_parent_id`.
- **Causa Raiz**: O aplicativo Smart Life possui rotinas automáticas de presença vinculadas aos mesmos sensores e interruptores (`scene.lavanderia_em_uso`, `scene.lavanderia_vazia`). Desativar a entidade `scene.*` no Home Assistant apenas impede o HA de dispará-la, mas **não cancela** a execução configurada nos servidores da nuvem Tuya.
- **Ação Necessária**: Intervenção manual do proprietário (André) diretamente no aplicativo Smart Life para desativar as rotinas na nuvem.

### RSK-03: Divergência Crítica de Mapeamento: Cozinha vs Lavanderia
- **Evidência**:
  - Em `CASA.md` (linhas 59-69): A tecla 1 é descrita como Cozinha (`switch_1`), a tecla 2 como Copa (`switch_2`) e a tecla 3 como Lavanderia (`switch_3`).
  - Em `config/.storage/core.config_entries` (no `switch_as_x`): A entrada intitulada `"Lavanderia"` aponta para `switch.cozinha_copa_varanda_switch_1`, e a entrada intitulada `"Cozinha"` aponta para `switch.cozinha_copa_varanda_switch_3`.
  - Em `config/automations.yaml`: A automação de presença acende `light.cozinha_copa_varanda_switch_3`.
  - Em `config/template_sensors.yaml`: O sensor `sensor.luzes_cozinha` soma `switch_1`, e `sensor.luzes_lavanderia` soma `switch_3`.
  - Em `dashboard-app/lib/rooms.ts`: A Cozinha está associada a `light.cozinha_copa_varanda_switch_3` e a Lavanderia a `light.cozinha_copa_varanda_switch_1`.
- **Impacto**: Estados iguais escondem a inversão, mas qualquer renomeação ou sincronização descuidada causará o acionamento da luz da Cozinha quando houver movimento na Lavanderia.

### RSK-04: Smart TV Samsung — Tecla POWER Alternadora
- **Evidência**: A integração SamsungTV envia o comando de infravermelho/rede correspondente à tecla "POWER" do controle remoto físico. Essa instrução atua como toggle (`turn_off` quando a TV já está desligada resulta em ligá-la).
- **Perigo**: Na automação de fechamento de porta noturna (`Porta do quarto fechada à noite apaga a casa`), se a TV já estiver em standby, enviar `media_player.turn_off` acenderá a tela da sala no meio da madrugada.
- **Proteção Vigente**: A automação em `config/automations.yaml` possui uma condicional estrita `choose` que valida se o status é diferente de `['off', 'standby', 'unavailable', 'unknown']` antes de despachar o sinal, primeiro na integração local e com fallback na nuvem.

### RSK-05: Limitações de Rede WSL2 / Docker Desktop
- **Evidência**: O Docker Desktop no Windows opera sobre uma máquina virtual WSL2 em modo NAT.
- **Impacto**: O tráfego unicast (TCP/UDP ponto a ponto) flui normalmente, permitindo o funcionamento de lâmpadas Tuya e TV. Contudo, **pacotes multicast (mDNS, SSDP)** não atravessam a camada de tradução de endereços.
- **Sintomas**: Descoberta automática de aparelhos quebrada, Google Cast e Apple AirPlay inoperantes para o container do Music Assistant.

### RSK-06: Patch Volátil do Glances API
- **Evidência**: A biblioteca Python `glances_api` dentro do container `homeassistant` possui um bug de timeout rígido insuficiente para a resposta do PC. Foi aplicado um patch via `sed`:
  ```bash
  docker exec homeassistant sed -i "s/client.get(url)/client.get(url, timeout=15)/g" /usr/local/lib/python3.14/site-packages/glances_api/__init__.py
  ```
- **Risco**: Esse patch é volátil e desaparece sempre que o container do Home Assistant for destruído e recriado a partir da imagem Docker.

### RSK-07: Incompatibilidade entre Google Drive Sync e Next.js
- **Evidência**: O diretório `c:\HomeAssistant` é monitorado e sincronizado pelo cliente Google Drive para desktop. Durante a sincronização de pastas ocultas, o Google Drive injeta arquivos de metadados `desktop.ini` dentro de `.next/` ou subdiretórios de compilação do Next.js.
- **Impacto**: O Turbopack ou o compilador do Next.js travam ao encontrar o arquivo `desktop.ini` inesperado.
- **Mitigação Vigente**: O script PowerShell `iniciar_servidor_background.ps1` e o `package.json` contêm comandos defensivos para expurgar `desktop.ini` antes de subir o servidor.

### RSK-08: Risco de Quebra do Servidor Dev Next.js
- **Evidência**: O dashboard depende da execução contínua de um processo Node.js na porta 3002 via `npm run dev`. Se a máquina reiniciar ou a janela do terminal for fechada sem o script PowerShell em background, o painel sai do ar.
- **Mitigação Recomendada**: Transformar a inicialização do Next.js em um serviço gerenciado do Windows (via NSSM ou Tarefa Agendada no logon do Windows) ou containerizar a versão compilada em produção (`next start`).
