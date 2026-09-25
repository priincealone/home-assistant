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
# Painel (porta 3002)
cd dashboard-app && npm run dev          # predev limpa desktop.ini do .next
npm run start                            # produção, exige build antes

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

**Não existe suíte de testes.** Confirmado: zero arquivos `*.test.*` / `*.spec.*`, zero configuração de
Vitest, Jest ou Playwright, zero dependências de teste, sem script `npm test`.

Os arquivos `dashboard-app/scratch/test_*.mjs` **não são testes** — imprimem no console e não afirmam
nada.

O que existe hoje como verificação real:

```bash
# Sintaxe e validade da configuração do HA (verificado: sai com código 0)
docker exec -i homeassistant python -m homeassistant --script check_config -c /config

# Integridade de um registro JSON
docker exec -i homeassistant python -c "import json,io;json.load(io.open('/config/.storage/core.entity_registry',encoding='utf-8'));print('ok')"
```

**TODO** — definir a suíte. Prioridade em `artifacts/claude/test-gap-analysis.md`: contrato de
entidades (L-01) e coerência cômodo × área (L-02) antes de qualquer outra coisa.

---

## 4. Lint, typecheck e build

```bash
cd dashboard-app
npx tsc --noEmit     # ✅ funciona (verificado em 15/09, saída 0)
npm run build        # ✅ passa (verificado em 25/09). Se falhar com "Module not found" em next/dist/compiled,
                     #    faltam arquivos em node_modules/next (Google Drive): reinstalar o Next
npm run lint         # ❌ NÃO FUNCIONA
```

`npm run lint` chama `next lint`, removido no Next 16 — e **não há ESLint instalado** no projeto
(nenhuma dependência, nenhuma configuração). Não existe análise estática. Enquanto isso não mudar,
`npx tsc --noEmit` é a única verificação disponível para o painel.

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
| `music-assistant` | 8095 | Áudio |
| `bgutil-provider` | 4416 | Token do YouTube (só para o MA) |
| `anisette` | 6969 | Autenticação Apple (FindMy) |
| Painel Next.js | 3002 | Interface, sob watchdog PowerShell |
| Glances | 61208 | Telemetria do PC |

**Rede**: Docker Desktop sobre WSL2 em NAT. Unicast passa; **multicast não** — sem mDNS, descoberta,
AirPlay ou Chromecast. Dentro de um container, `127.0.0.1` é o próprio container.

**Fluxos medidos**: leitura por polling HTTP de 5 s (uma chamada a `/api/states`, filtrada em memória);
comandos por `POST /api/services/...`; WebSocket **apenas** servidor → Music Assistant. Não há
WebSocket no navegador.

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
| `music-assistant/data`, `anisette/data` | Dados de container |
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
   `.storage/sonoff/`, dados do Music Assistant e do anisette.

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

Confirmado: **há um único WebSocket**, servidor → Music Assistant, em `app/api/mass/route.ts`.

- Aberto **sob demanda**, uma conexão por requisição, fechado ao fim
- **Timeout de 12 s**; ao estourar, fecha o socket e rejeita com erro
- `onerror` rejeita a promessa
- **Não há laço de reconexão**, nem backoff, nem conexão persistente — cada requisição nova abre a sua

Regras: não introduza WebSocket no cliente sem discutir — o padrão atual é polling, e misturar os dois
cria duas fontes de verdade. Se um dia houver conexão persistente, ela precisa de backoff exponencial
com teto e de não disparar comando ao reconectar.

**TODO** — decidir se o Music Assistant merece conexão persistente (hoje o custo é abrir e fechar a
cada ação).

---

## 14. Testes

Enquanto não existir suíte (§3), vale o mínimo:

| Mudança | Verificação obrigatória |
| :--- | :--- |
| YAML do HA | `check_config` antes de recarregar |
| Registro `.storage` | Validar **antes** do `docker stop`; script aborta se o mundo não estiver como espera |
| Painel | `npx tsc --noEmit` |
| Contrato de entidades | Conferir cada `entity_id` contra `core.entity_registry` |
| Automação nova | Confirmar que carregou (`on`) e que nenhuma outra governa o mesmo atuador |

Quando a suíte existir: todo teste de escrita precisa de dublê do HA — a casa não é ambiente de teste.
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
- **IP do PC é DHCP** (`192.168.31.22`) e está escrito fixo em `app/api/mass/route.ts`
- **O painel não tem autenticação** — quem alcança a porta 3002 comanda a casa
- **Google Drive** injeta `desktop.ini` em toda pasta nova (ignorados desde 15/09)

## Alçadas

| Nível | O que é | Quem decide |
| :--- | :--- | :--- |
| 1 | Diagnóstico somente leitura; recarregar automação existente | Agente, com validação |
| 2 | Criar ou alterar automação; editar `.storage`; mudar contrato; rota nova | Plano prévio e aprovação do André |
| 3 | Segredos, tokens, nuvem Tuya, rede e roteador, pareamento físico | Só o André |
