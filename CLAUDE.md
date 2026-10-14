# CLAUDE.md — regras permanentes

Casa automatizada do André. Tudo aqui foi confirmado no repositório; o que não foi está marcado como
**TODO**. Responder sempre em português do Brasil.

Documentos de apoio: `CASA.md` (estado da casa), `docs/` (governança), `planning/` (trabalho),
`artifacts/` (auditorias), `ESTADO_DASHBOARD.md` (diário).

---

## 1. Objetivo do sistema

Automatizar a casa e operá-la por um painel próprio. Duas peças:

- **A base** — Home Assistant 2026.9 em container, com integrações, dispositivos, áreas, automações e
  sensores derivados. Funciona sozinha.
- **O painel** — `dashboard-app/`, Next.js 16 + React 19, consome a API do HA. É a interface desde
  15/09/2026; a dashboard Lovelace foi retirada e **não deve ser recriada**.

**Automação nunca depende do painel.** Se a interface cair, a casa continua automatizada.

---

## 2. Comandos de desenvolvimento

```bash
# Painel (porta 3002): o watchdog roda PRODUÇÃO (build automático quando o código muda)
cd dashboard-app && npm run build && npm run start   # manual, se precisar
npx next dev -p 3010                     # desenvolvimento com recarga a quente: porta livre, nunca a 3002

# Home Assistant
docker ps --format '{{.Names}} | {{.Status}}'
docker logs --tail 50 homeassistant
docker restart homeassistant             # só para YAML; NUNCA para editar .storage

# Python: o do Windows falha com frequência. Use o do container:
docker exec -i homeassistant python - < script.py
docker exec -i homeassistant python - --validar < script.py
```

Para editar `.storage` com o HA parado, use a própria imagem do HA:

```bash
docker run --rm -i -v D:/HomeAssistant/config:/config \
  --entrypoint python ghcr.io/home-assistant/home-assistant:stable - < script.py
```

---

## 3. Comandos de teste

**Não existe framework de testes** (zero Vitest, Jest ou Playwright), mas desde 13/10/2026 há uma suíte
mínima em `dashboard-app/tests/`, em Node puro com `node:assert`:

```bash
cd dashboard-app && npm test      # 81 verificações; leva ~1 s; não aciona a casa nem fala com o HA
```

- `tests/rede.test.mjs` — lógica pura do campo "Rede" (`lib/rede.ts`) com estados simulados.
- `tests/resumo-casa.test.mjs` — resumo de uma linha do celular e `lerNumero`/`lerWatts` (sem leitura nunca vira 0).
- `tests/logica-pura.test.mjs` — **B-15**: histórico de energia (`lib/energiaHistorico.ts`), escolha da previsão do tempo e
  fusão de estados com travas otimistas (`lib/estadosOtimistas.ts`); houve também um teste diferencial, feito uma vez
  contra o código antigo (500 casos).
- `tests/contrato-entidades.test.mjs` — **B-03**: toda entidade de `lib/rooms.ts` existe no
  `core.entity_registry`, não está desativada, tem o domínio declarado e está na área do cômodo (L-01/L-02).
  Lê `../config/.storage` (ou `HA_STORAGE`); sem a pasta, **pula com código 3**, nunca passa em silêncio.
  Rode-o sempre que mexer em `lib/rooms.ts` ou nas áreas/entidades do HA.

**Automações** (L-05): um teste estrutural, somente leitura, confere em `config/automations.yaml` as regras da
`docs/AUTOMATION-POLICY.md` (R1 descrição, R2 desligar TV só por estado, R3 janela de horário, R4 sol só no acender,
R5 sem `delay`, R8 um atuador/um dono, também contra `scripts.yaml`, R10 `mode`, R11 `id` e `alias` únicos):

```bash
docker exec -i homeassistant python - < scripts/testes/invariantes_automacoes.py   # 0 ok, 1 violação nova
```

Exceção conhecida só entra em `EXCECOES`, com o motivo. **Não** substitui o `check_config` (sintaxe).

Os roteiros `dashboard-app/scratch/test_*.mjs` foram **removidos** em 13/10/2026 (liam o token e não afirmavam nada).

O que existe hoje como verificação real:

```bash
# Sintaxe e validade da configuração do HA (verificado: sai com código 0)
docker exec -i homeassistant python -m homeassistant --script check_config -c /config

# Integridade de um registro JSON
docker exec -i homeassistant python -c "import json,io;json.load(io.open('/config/.storage/core.entity_registry',encoding='utf-8'));print('ok')"
```

**TODO** — ampliar a suíte (`artifacts/claude/test-gap-analysis.md`): teste de rota com dublê do HA e fumaça ponta a ponta
(L-06). Teste de escrita **nunca** contra a casa.

---

## 4. Lint, typecheck e build

```bash
cd dashboard-app
npx tsc --noEmit     # ✅ ou `npm run typecheck`
npm run lint         # ✅ ESLint 9 + eslint-config-next (desde 13/10/2026): 0 erros, teto de 58 avisos
npm run build        # ✅ passa (verificado em 25/09). Se falhar com "Module not found" em next/dist/compiled,
                     #    faltam arquivos em node_modules/next (Google Drive): reinstalar o Next
```

`npm run lint` é `eslint . --max-warnings 58`: **erro novo ou aviso novo derruba** (provado com defeitos plantados).
As regras "estilo React Compiler" (`set-state-in-effect`, `refs`, `purity`, `static-components`) e `no-explicit-any` ficam
como **aviso** em `eslint.config.mjs`, porque o padrão que condenam é o do código inteiro; as que pegam defeito de verdade
(`rules-of-hooks`, `exhaustive-deps`) valem. Ao limpar avisos, **baixe o teto** no `package.json`.

⚠️ O `node_modules` mora no Google Drive e pode perder arquivos (já aconteceu com `next` e com `@babel/*`: "Cannot find
module ./generated/index.js"). Sintoma no ESLint: "Oops! Something went wrong". Conserto: apagar a pasta do pacote
citada (ex.: `rm -rf node_modules/@babel`) e rodar `npm install`.

---

## 5. Arquitetura real

```
FÍSICO / AUTOMAÇÃO          BORDA / TRANSPORTE        INTERFACE
Home Assistant :8123        Next.js :3002             navegador / tablet
config/*.yaml               app/api/*/route.ts        app/page.tsx
config/.storage/core.*      lib/ha.ts (HA_TOKEN)      app/components/*
                                    │
                             lib/rooms.ts  ← contrato canônico
```

| Serviço | Porta | Papel |
| :--- | :--- | :--- |
| `homeassistant` | 8123 | Núcleo da automação |
| `anisette` | 6969 | Autenticação Apple (FindMy) |
| Painel Next.js | 3002 | Interface, sob watchdog PowerShell |
| Glances | 61208 | Telemetria do PC |

**Rede**: Docker Desktop sobre WSL2 em NAT. Unicast passa; **multicast não** — sem mDNS, descoberta,
AirPlay ou Chromecast. Dentro de um container, `127.0.0.1` é o próprio container.

**Fluxos**: leitura por espelho WebSocket servidor → HA (`lib/haStream.ts`), entregue ao navegador por SSE
(`/api/stream`), com o polling HTTP de 5 s como reserva; comandos por `POST /api/services/...`. Não há
WebSocket no navegador. Música/áudio: o Music Assistant foi **removido em 09/10/2026**.

Detalhe completo em `docs/ARCHITECTURE.md`.

---

## 6. Frontend — território do Antigravity

`dashboard-app/app/` (páginas, layout, `globals.css`), `dashboard-app/app/components/` (23
componentes), `dashboard-app/components/ui/`, `dashboard-app/DESIGN.md` e `PRODUCT.md`.

⚠️ A biblioteca de componentes está em **`app/components/`**, não em `components/`.

**Claude Code não edita nada disso sem pedido inequívoco do André.**

---

## 7. Backend / borda — compartilhado, com revisão

`dashboard-app/app/api/*/route.ts` (10 rotas), `dashboard-app/lib/ha.ts`,
`dashboard-app/lib/rooms.ts`, `dashboard-app/manifesto-comodos.json`.

`lib/rooms.ts` é o **contrato canônico**: descreve a casa e serve de lista de permissão das rotas
`toggle` e `control`. Mudança aqui exige conferir as entidades no HA — foi a falta disso que deixou
entrar uma inversão de cômodo e quatro entidades inexistentes.

---

## 8. Automações — território do Claude Code

`config/automations.yaml`, `config/template_sensors.yaml`, `config/configuration.yaml`,
`config/scenes.yaml`, `config/scripts.yaml`, `config/.storage/core.*`, `scripts/`.

Regras completas em `docs/AUTOMATION-POLICY.md`. As obrigatórias:

- Justificativa na `description` de toda automação
- Decidir por **estado atual**, não pelo gatilho
- Janela noturna com `after` > `before` para atravessar a meia-noite
- Condição de sol guarda **só o acender**
- Temporizador é `for:` no gatilho, não `delay`
- **Um atuador, um dono** — verifique se já existe automação sobre o alvo
- Verifique a nuvem Tuya antes de automatizar presença

---

## 9. Arquivos proibidos

| Caminho | Regra |
| :--- | :--- |
| `config/secrets.yaml` | Só o André |
| `dashboard-app/.env.local` | Só o André |
| `config/.storage/auth*` | Ninguém edita |
| `config/.storage/core.config_entries` | Contém tokens; não versionado, não editar |
| `config/home-assistant_v2.db*` | Só leitura, e em `mode=ro` |
| `anisette/data` | Dados de container |
| `dashboard-app/` | Só com pedido inequívoco do André |
| `.git/` | Só comandos git normais |

`config/.storage/core.*_registry`, `core.area_registry` e `core.config`: **o HA reescreve no
desligamento**. Editar exige validar → `docker stop` → editar → `docker start`. **Nunca `docker
restart`.** Backup em `backups/` antes, validação **antes** de parar o container.

---

## 10. Secrets

1. **Nenhum agente busca, preenche ou transporta** senha, cookie de sessão ou token do André — **mesmo
   quando ele pede**. Levar o fluxo até a borda e dizer em uma frase o que falta.
2. Credencial que já existe em arquivo pode ir **de arquivo para arquivo**, sem passar pela conversa.
3. Nenhum segredo em log, commit, documento ou mensagem.
4. CAPTCHA e chave de acesso são do dono.
5. Fora do versionamento: `secrets.yaml`, `.env.local`, `.storage/auth*`, `core.config_entries`,
   `.storage/sonoff/`, os tokens e a chave da Xiaomi (`.storage/xiaomi_miot/auth-*`, `.storage/xiaomi_home/cert/`,
   `miot_config/`, `miot_devices/`), dados do anisette e `backups/` (guarda os dados removidos do Music Assistant,
com credenciais do YouTube Music).
6. Remotes: GitHub **privado** — `priincealone/home-assistant` e `priincealone/casa-dashboard`. Antes de
   qualquer push, conferir que nenhum segredo entrou no que vai subir.

⚠️ `C:\HomeAssistant` é sincronizada pelo Google Drive. Os segredos estão fora do git e **dentro do
Drive**. Ver `docs/SECURITY.md`.

---

## 11. Comandos físicos

1. **Não acione a casa para demonstrar.** Se precisar provar que algo funciona, renderize o template,
   avalie a condição ou leia o histórico.
2. **Se um teste exigir mudar o estado real**, faça curto, **devolva o estado anterior** e avise o
   André do que foi acionado.
3. **Comando de desligar não é idempotente.** Na TV Samsung, `turn_off` é a tecla POWER, que alterna:
   com a TV apagada, liga. Condicione ao estado e use **um caminho de cada vez**.
4. **Nunca** automatize tranca, portão, aquecedor ou carga de risco sem autorização explícita.
5. **Estados iguais escondem inversões** — para conferir mapeamento, ligue um ponto de cada vez.
6. Ação irreversível ou fora de hora: pergunte antes.

---

## 12. Estado offline

Comportamento atual do painel (`app/page.tsx`), confirmado no código:

- Três estados: `online`, `sincronizando`, `offline`
- **Duas falhas consecutivas** de polling, ou `navigator.onLine` falso → `offline`
- Uma falha isolada → `sincronizando` (não alarma por engano)
- Eventos `online`/`offline` da janela alternam o estado; ao voltar, busca imediatamente
- Polling suspenso com a aba oculta (`visibilitychange`)
- `/api/state` responde **502** com `{ erro }` quando o HA não responde

Regras: **nunca** apresente estado desconhecido como desligado — `unavailable` e `unknown` são estados
próprios. Falha de leitura não deve limpar a tela nem disparar comando de correção automática.

**TODO** — comportamento das rotas de escrita com o HA fora do ar: se a interface deve enfileirar,
recusar ou apenas reverter a trava otimista. Não confirmado no código.

---

## 13. Reconexão WebSocket

Conforme `specs/features/painel-tempo-real.md` (implementado em 08/10/2026): **um único WebSocket**, Node →
HA, em `lib/haStream.ts`, assinando `state_changed`. O WebSocket para o Music Assistant (`app/api/mass`) foi
removido junto com o MA em 09/10/2026.

- Conexão persistente que **só lê**: nunca envia comando, nem ao reconectar
- Reconexão com backoff exponencial de 1 s a 30 s; `ping` a cada 20 s e queda se não houver `pong` em 10 s
- Ao reconectar, `get_states` ressincroniza tudo; enquanto não sincroniza, `/api/state` cai para o REST

Regras: não introduza WebSocket no navegador sem discutir — o navegador recebe SSE. Qualquer conexão nova
precisa de backoff exponencial com teto e de não disparar comando ao reconectar.

---

## 14. Testes

A suíte (§3) cobre só a leitura; para o resto vale o mínimo:

| Mudança | Verificação obrigatória |
| :--- | :--- |
| YAML do HA | `check_config` antes de recarregar |
| Registro `.storage` | Validar **antes** do `docker stop`; script aborta se o mundo não estiver como espera |
| Painel | `npx tsc --noEmit` e `npm test` |
| Contrato de entidades (`lib/rooms.ts`, áreas, entidades do HA) | `npm test` (confere cada `entity_id` e a área contra `core.entity_registry`) |
| Automação nova ou alterada | `check_config`, `invariantes_automacoes.py` (§3), confirmar que carregou (`on`) e que nenhuma outra governa o mesmo atuador |

Todo teste de escrita precisa de dublê do HA — a casa não é ambiente de teste.
Teste que só verifica "respondeu 200" passa com a luz errada acesa.

---

## 15. Definição de pronto

Uma tarefa está pronta quando:

1. Funciona, e isso foi **verificado com evidência** — não presumido
2. A verificação apropriada da §14 passou
3. O que foi feito está registrado em `ESTADO_DASHBOARD.md`, com o porquê e as armadilhas
4. `CASA.md` atualizado se mudou dispositivo, automação ou pendência
5. `planning/` atualizado: o item saiu de `IN_PROGRESS.md` para `DONE.md`, ou foi para `BLOCKED.md`
   com o que destrava
6. Commit feito no repositório certo — **`dashboard-app/` tem git próprio e é do André**
7. O que ficou incompleto foi dito **explicitamente**, não omitido

Não está pronto se a verificação foi pulada "porque obviamente funciona".

---

## 16. Especificação antes da implementação

Antes de implementar funcionalidade nova, **leia a especificação** em `specs/`:

| Pasta | Para quê |
| :--- | :--- |
| `specs/features/` | Funcionalidades |
| `specs/widgets/` | Widgets do painel |
| `specs/automations/` | Automações físicas |

**Se não houver especificação, escreva-a primeiro** — cada `.gitkeep` descreve o conteúdo mínimo. Para
automação isso não é burocracia: é onde se declara o dono de cada atuador e o que acontece se o HA
reiniciar no meio, que são exatamente os erros que já aconteceram aqui.

Correção de defeito e diagnóstico não exigem especificação.

---

## Armadilhas conhecidas

- **Nuvem Tuya age sozinha.** O app Smart Life tem rotinas próprias; desativar a entidade `scene.*` no
  HA não para a rotina de lá. Diagnóstico: `scripts/diagnostico/quem_acendeu.py`
- **Cache velho mente.** `dashboard-app/.cache/estados-snapshot.json` é de 07/09 e traz o mapa anterior
  à correção dos cômodos. A fonte de verdade é o registro do HA, lido na hora
- **Glances**: o patch de timeout some quando o container é recriado do zero:
  ```bash
  docker exec homeassistant sed -i "s/client.get(url)/client.get(url, timeout=15)/g" /usr/local/lib/python3.14/site-packages/glances_api/__init__.py
  ```
- **Publicar o painel é derrubar a porta, não subir servidor à mão.** O watchdog
  (`dashboard-app/iniciar_servidor_background.ps1`, tarefa agendada `CasaDashboardAutoStart`) só recompila
  quando a 3002 está livre. Para publicar: matar o processo **dono da porta 3002** (pela porta, nunca por
  `CommandLine`) e esperar ~20–60 s. Nunca rodar `npm run build`/`npm run start` pelo shell do agente: o
  servidor morre com a sessão, e um build manual apaga o `BUILD_ID` e faz o watchdog cair para `dev` na 3002
  (foi assim que o painel ficou fora em 27–29/09)
- **IP do PC é DHCP** (`192.168.31.22`); já não está fixo no painel (saiu com o `app/api/mass/route.ts`), mas
  segue sendo o destino do webhook de saúde (`planning/BLOCKED.md`)
- **O painel não tem autenticação, por decisão** (05/10/2026, D-011) — quem alcança a porta 3002 (LAN e tailnet)
  comanda a casa. Não recriar o PIN sem pedido do André
- **Google Drive** injeta `desktop.ini` em toda pasta nova (ignorados desde 15/09)

## Alçadas

| Nível | O que é | Quem decide |
| :--- | :--- | :--- |
| 1 | Diagnóstico somente leitura; recarregar automação existente | Agente, com validação |
| 2 | Criar ou alterar automação; editar `.storage`; mudar contrato; rota nova | Plano prévio e aprovação do André |
| 3 | Segredos, tokens, nuvem Tuya, rede e roteador, pareamento físico | Só o André |
