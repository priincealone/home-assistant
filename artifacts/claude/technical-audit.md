# Auditoria Técnica Independente — Antigravity × Código Real

Data: 15/09/2026 · Auditor: Claude Code · Escopo: `artifacts/antigravity/*` confrontado com o repositório
Método: leitura dos seis artefatos, depois verificação de cada afirmação contra o código-fonte,
`config/.storage/core.*`, o banco SQLite e os containers em execução. **Nenhum arquivo foi corrigido.**

---

## 1. Veredito geral

O inventário do Antigravity é **substancialmente correto na infraestrutura** e **impreciso no contrato
de dados**. Tudo que descreve containers, portas, protocolos e banco confere com a realidade medida.
As divergências se concentram onde mais importa: o mapeamento entidade → cômodo, que é o contrato entre
o painel e a casa.

| Área | Veredito |
| :--- | :--- |
| Infraestrutura, portas, containers | ✅ Confere |
| Stack e versões | ✅ Confere |
| Fluxos REST | ✅ Confere |
| Fluxos WebSocket | ⚠️ Parcialmente incorreto |
| Módulos e caminhos de arquivo | ⚠️ Dois erros de caminho |
| Contrato de entidades (`lib/rooms.ts`) | ❌ 4 entidades inexistentes + 1 inversão física |
| Separação automação × interface | ❌ Interface contém lógica de automação, com conflito real |
| Testes descritos | ❌ Não existem |
| Matriz de propriedade | ⚠️ Contradiz-se entre dois documentos |
| Roadmap | ⚠️ Três itens incompatíveis com o estado atual |

---

## 2. Confirmado como correto (verificado item a item)

| Afirmação do Antigravity | Evidência |
| :--- | :--- |
| HA Core 2026.9 em Docker, porta 8123 | container `homeassistant` ativo |
| Music Assistant 2.10.2 (`music-assistant`), BGUtil, Anisette | containers ativos |
| SQLite em modo WAL, ~70 MB | `journal_mode=wal`; 70.701.056 bytes |
| Glances no host, porta 61208 | entrada `glances`: `host 192.168.31.22, port 61208` |
| `paho-mqtt` usado internamente pelo `xiaomi_home`, sem broker externo | presente em `manifest.json`, `miot/common.py` |
| `scenes.yaml` e `scripts.yaml` vazios | 0 bytes ambos |
| 10 áreas cadastradas | `core.area_registry`: 10 |
| 5 automações com os IDs citados | `config/automations.yaml` confere |
| Proteção da TV Samsung (POWER alternador) | `choose` presente e correto |
| 11 instâncias de `switch_as_x` | confere |
| `next lint` inadequado no Next 16 (RSK-09) | confere — **e é pior**, ver §4 |
| Ausência de suíte de testes (RSK-10) | confere — ver `test-gap-analysis.md` |
| Comando de validação `check_config` | executado: sai com código 0 |

---

## 3. Divergências entre a documentação e o código

### D-01 · Inversão Cozinha ↔ Lavanderia no painel — **Crítica**

O RSK-03 acerta que existe divergência, mas **erra o lado**. As quatro fontes:

| Fonte | switch_1 | switch_2 | switch_3 |
| :--- | :--- | :--- | :--- |
| `core.entity_registry` (nome e área) | **Cozinha** | Copa | **Lavanderia** |
| `config/template_sensors.yaml` | `luzes_cozinha` | `luzes_copa` | `luzes_lavanderia` |
| `config/automations.yaml` (movimento Lavanderia) | — | — | **Lavanderia** ✔ |
| `dashboard-app/lib/rooms.ts` | **Lavanderia** ❌ | Copa | **Cozinha** ❌ |
| Títulos das entradas `switch_as_x` | "Lavanderia" | "Copa" | "Cozinha" |

Três fontes concordam entre si (registro, sensores, automações). **Quem diverge é `lib/rooms.ts`**
(linhas 115 e 145) — e os títulos das entradas `switch_as_x`, que são rótulos históricos anteriores à
correção de 09/09 e não influenciam o comportamento, já que o nome do registro prevalece.

**Consequência hoje**: tocar em "Cozinha" no painel acende a luz da Lavanderia, e vice-versa.

**Perigo maior**: o roadmap (F1.2) manda "padronizar" as quatro fontes e atribui a tarefa ao Claude Code,
cujos arquivos são exatamente os três que já estão certos. Executada ao pé da letra, a tarefa
inverteria as automações e os sensores para acompanhar o erro do painel. **A correção pertence a
`lib/rooms.ts`** — arquivo de propriedade Antigravity/compartilhada.

### D-02 · Quatro entidades inexistentes no contrato — **Alta**

Extraí todos os `entity_id` citados pelo painel (68) e confrontei com o registro do HA:

| Entidade citada | Onde | Realidade |
| :--- | :--- | :--- |
| `binary_sensor.sensor_banheiro_movimento` | `lib/rooms.ts:270`, `AmbientNightMode.tsx:20`, `SecurityAlertsBar.tsx:16` | **não existe** |
| `binary_sensor.sensor_closet_movimento` | `lib/rooms.ts:352`, `AmbientNightMode.tsx:21`, `SecurityAlertsBar.tsx:17` | **não existe** |
| `sensor.dreame_us_415783444_mc1808_battery_battery_level` | `lib/rooms.ts:469` | id errado; o real é `..._battery_level_p_2_1` |
| `todo.tarefas` | `lib/rooms.ts:477` | o real é `todo.lista_de_compras` |

O `current-architecture.md` (§3, Banheiro) **documenta o sensor do banheiro como existente**, o que
propaga o erro. As rotas de API usam os ids corretos (`app/api/todo/route.ts:4` aponta para
`todo.lista_de_compras`) — a inconsistência está no contrato e nos componentes.

### D-03 · A integração `music_assistant` não existe mais no HA — **Alta**

Os documentos listam `music_assistant` como parte da stack e a arquitetura descreve a leitura do token
a partir de `core.config_entries`. Medição de hoje: **não há nenhuma entrada `music_assistant`** em
`core.config_entries` (o container segue no ar). O código `app/api/mass/route.ts:11` ainda tenta ler
esse arquivo e, não achando, depende do `MASS_TOKEN` do `.env.local`.

Efeito: o caminho documentado está morto; o painel só fala com o Music Assistant porque existe um
segundo caminho. Vale confirmar quando e por que a entrada saiu.

### D-04 · Fluxo WebSocket descrito a mais — **Média**

O diagrama mostra `TABLET <-->|HTTP / WebSocket Polling| DASH_SRV`. **Não há WebSocket no cliente**:
busca por `new WebSocket` em `app/`, `lib/` e `app/components/` não retorna nada. O cliente usa
*polling* HTTP a cada 5 s (`app/page.tsx:104-108`). O único WebSocket real é servidor → Music Assistant
(`app/api/mass/route.ts:37`), sob demanda, como descrito. A afirmação sobre a API WebSocket nativa do HA
para o Lovelace administrativo também perdeu objeto: a dashboard Lovelace foi retirada em 15/09.

### D-05 · Caminho da biblioteca de componentes — **Baixa**

`multi-agent-governance.md` (§2) atribui `dashboard-app/components/` como a biblioteca (`RoomCard`,
`DeviceTile`). O real: `dashboard-app/app/components/` tem os 23 componentes; `components/` contém
apenas `ui/button.tsx` e `ui/card.tsx`. O `file-ownership.md` acerta (`app/components/*`). Os dois
documentos se contradizem.

### D-06 · Trava otimista: 3,5 s documentado, 5 s no código — **Baixa**

`governance §4` e `current-architecture §2` dizem TTL 3.5 s. O código usa 5000 ms
(`app/page.tsx:182`, `expiraEm: Date.now() + 5000`).

### D-07 · Numeração de risco duplicada — **Baixa**

No `risk-register.md`, **RSK-08 tem dois significados**: na tabela é "IP sem reserva de DHCP"; no
detalhamento §2 é "Risco de Quebra do Servidor Dev". O `multi-agent-governance.md` adota a segunda
definição. Rastreabilidade quebrada: "mitigar RSK-08" é ambíguo.

### D-08 · Referências pontuais desatualizadas — **Baixa**

Commit citado (`6da6f66`) não é o HEAD do `dashboard-app` (`fd6b495`, branch `chore/ai-governance`
confere). `current-architecture §3` dá a Cozinha `..._switch_3` e à Lavanderia
`..._switch_1 (switch_as_x) / _3 (automations)` na mesma linha — a própria tabela registra a
contradição sem resolvê-la.

---

## 4. O que a documentação subestima

### S-01 · Não há ESLint instalado — RSK-09 é maior do que descrito

O risco fala em "sintaxe de lint do Next 16". Na verdade `package.json` **não tem nenhuma dependência
de ESLint** nem arquivo de configuração. `npm run lint` (`next lint`) falharia mesmo com a sintaxe
ajustada. Não existe análise estática alguma no projeto — apenas `tsc` via `next build`.

### S-02 · O painel não tem autenticação — **não consta em nenhum risco**

Não há `middleware.ts` nem verificação de credencial em nenhuma das 10 rotas. O servidor Next escuta na
porta 3002 e o `HA_TOKEN` fica protegido no servidor — mas **qualquer dispositivo que alcance a porta
3002 (LAN inteira e toda a tailnet) controla luzes, TV, ventiladores, aspirador e cenas sem
autenticar**. O modelo de segurança hoje é "quem chega à porta, manda".

### S-03 · Segredos dentro de pasta sincronizada com a nuvem — **não consta**

`C:\HomeAssistant` é sincronizada pelo cliente do Google Drive (o próprio RSK-07 usa esse fato). Dentro
dela: `dashboard-app/.env.local` (`HA_TOKEN`, `MASS_TOKEN`), `config/secrets.yaml` e
`config/.storage/auth*`. Estão fora do **git**, mas não fora do **Drive**. Tokens de longa duração do HA
e credenciais da casa saem do computador para a nuvem pessoal.

### S-04 · Parâmetros repassados sem lista de permissão — **não consta**

As rotas `toggle` e `control` validam o `entityId` contra `todasEntidades` — proteção correta. Mas:
- `app/api/tv/route.ts:29` repassa `body.comando` (string livre) direto a `remote.send_command`;
- `app/api/vacuum/route.ts:14` repassa `body.modo` direto a `select.select_option`.

Sem autenticação (S-02), qualquer cliente da rede envia comando arbitrário a esses dois serviços.

---

## 5. Arquivos de produção misturados ao desenvolvimento

| Item | Tamanho | Observação |
| :--- | :--- | :--- |
| `dashboard-app/.next/` | **129 MB** | build de desenvolvimento dentro de pasta sincronizada pelo Drive — causa raiz do RSK-07 |
| `servidor_dev.log` | 171 KB | log de runtime no repositório (ignorado pelo git, sincronizado pelo Drive) |
| `test_err.log`, `test_out.log` | 0 B | resíduos vazios |
| `tsconfig.tsbuildinfo` | 112 KB | cache de compilação |
| `scratch/` | 7 arquivos | `test_*.mjs`, geradores de ícone, registro de tarefa do Windows |
| `ha-addon/` | `Dockerfile`, `config.yaml`, `DOCS.md` | empacotamento como add-on do HA, caminho **não usado** hoje |
| `node_modules/` | — | presente, como esperado |

O ponto sério não é a bagunça: é **o painel de produção rodar `npm run dev`**. O watchdog
(`iniciar_servidor_background.ps1:52`) executa `npm run dev`, não `next start`. A casa depende de um
servidor de desenvolvimento, com recompilação em tempo real, dentro de uma pasta que um cliente de
sincronização escreve por baixo.

---

## 6. Compatibilidade do roadmap com o estado atual

| Item | Situação | Parecer |
| :--- | :--- | :--- |
| **F1.1** desativar cenas Tuya | Válido | Confirmado por evidência forense própria. Só o proprietário executa |
| **F1.2** alinhar Cozinha/Lavanderia | ⚠️ **Executor errado** | A correção é em `lib/rooms.ts` (Antigravity). Atribuída ao Claude Code, cujos arquivos já estão corretos — risco de inverter o lado certo |
| **F1.3** reserva de DHCP | Válido | `192.168.31.22` está em DHCP e é usado como endereço fixo em `app/api/mass/route.ts:4-5` |
| **F1.4** ajustar lint | Incompleto | Não basta ajustar o script: **não há ESLint instalado** |
| **F2.1** painel em produção (container) | ⚠️ **Quebra dependências** | Containerizar quebra a leitura de `C:\HomeAssistant\config\.storage\core.config_entries` (`app/api/mass/route.ts:11`) e exige revisar `HA_URL`. O `ha-addon/` já existe e não é citado |
| **F2.2** patch do Glances | Válido | — |
| **F2.3** testes (Vitest/Playwright) | Válido, do zero | Nenhuma infraestrutura existe. Ver `test-gap-analysis.md` |
| **F2.4** expurgo de `desktop.ini` | Já implementado | Existe em `package.json` (`predev`) e no watchdog. É item concluído, não pendente |
| **F3.1** YouTube Music | Válido | Script existe; falta cookie do proprietário |
| **F3.2** Alexa TOTP | Válido | Diagnóstico de passkey confirmado |
| **F3.3** Atalho Apple Saúde | Válido | Sensores existem, alimentados por webhook |
| **F3.4** chaves AirTags | Válido | Depende de um Mac |
| **F4.1** hardware dedicado | Válido | Resolve a raiz do RSK-05 |
| **F4.2** floorplan 3D com LiDAR | ❌ **Contradiz decisão do proprietário** | Em 15/09 o André declarou: "por hora não irei usar nenhum modelo 3D ou 2D". Os arquivos da planta foram removidos nesse dia |

Ausente do roadmap, e mais urgente que metade da Fase 3: **autenticação do painel** (S-02) e **entidades
fantasma no contrato** (D-02).

---

## 7. Resumo por severidade

| # | Achado | Severidade |
| :--- | :--- | :--- |
| D-01 | Inversão Cozinha/Lavanderia em `lib/rooms.ts`, com roadmap apontando a correção para o lado errado | **Crítica** |
| S-02 | Painel sem autenticação controla a casa inteira | **Crítica** |
| A-01 | Cena "gamer" conflita com a automação da ventilação do PS5 (ver `automation-safety-audit.md`) | **Alta** |
| D-02 | 4 entidades inexistentes no contrato do painel | **Alta** |
| D-03 | Integração `music_assistant` ausente do HA; caminho de token documentado está morto | **Alta** |
| S-03 | Tokens e segredos em pasta sincronizada com o Google Drive | **Alta** |
| S-04 | `comando` e `modo` repassados sem lista de permissão | **Média** |
| P-01 | Produção rodando `npm run dev` sob watchdog | **Média** |
| S-01 | Nenhuma análise estática instalada | **Média** |
| D-04 | Fluxo WebSocket cliente descrito e inexistente | **Média** |
| D-05 a D-08 | Caminhos, TTL, numeração de risco e commit desatualizados | **Baixa** |
