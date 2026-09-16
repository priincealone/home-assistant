# Retrato do projeto — 15/09/2026, 22:10

Auditoria somente leitura. Nenhum arquivo do projeto foi alterado; nada foi acionado na casa.

⚠️ **Nota de execução**: o agente `project-monitor` foi criado nesta sessão e ainda **não está
registrado** — agentes são carregados na inicialização da sessão. A auditoria foi feita seguindo a
definição dele (somente leitura, mesmo formato). O agente ficará disponível numa sessão nova.

---

## Serviços

| Container | Situação |
| :--- | :--- |
| `homeassistant` | Up 31 min |
| `music-assistant` | Up ~1 h |
| `bgutil-provider` | Up ~1 h |
| `anisette` | Up ~1 h |

Outros containers no host (`metabase`, `firefly-*`) não pertencem a este projeto.

- **Automações**: 5 carregadas, **5 ativas**
- **Painel na 3002**: responde — `GET /api/state` → **HTTP 200**
- **Log do HA**: sem erro novo além do ruído conhecido. Aparecem `metno` (timeout de previsão) e
  `xiaomi_home` reconectando o MIoT a cada ~20 min — recorrentes e sem efeito observado nas entidades.

---

## Repositórios

São **dois**, com git independente.

### Casa — `C:\HomeAssistant` · branch `main`

```
3db95ae  docs(spec): especificação formal da tarefa B-02 (entidades de contrato)
a2a8f20  chore: cria dez subagentes com escopo fechado
cdbf7c8  docs: reescreve CLAUDE.md com as regras permanentes
810093d  docs: define regras operacionais do Antigravity em .antigravity/rules.md
ba6224d  docs: establish ai project governance
6049ba0  chore: ignora os desktop.ini criados pelo Google Drive
de64a7d  Acerta os nomes das entidades switch do interruptor triplo
```

**Modificados, não commitados**:

| Arquivo | Classificação |
| :--- | :--- |
| `config/.storage/core.device_registry` | Reescrita do Home Assistant — **não é trabalho pendente** |
| `config/.storage/core.entity_registry` | Idem |

Fora isso, árvore limpa.

### Painel — `dashboard-app` · branch `chore/ai-governance`

```
fd6b495  docs: expand agent guidelines with UI craft and contract rules
8ed2615  fix(gourmet): rename Plafon Área Gourmet and add startup scripts
6da6f66  chore: initial project checkpoint
```

**Modificados, não commitados** — ⚠️ **trabalho real esperando commit**:

| Arquivo | O que é |
| :--- | :--- |
| `lib/rooms.ts` | Correção da inversão Cozinha ↔ Lavanderia (15/09) |
| `manifesto-comodos.json` | Mesma correção no manifesto |
| `tsconfig.tsbuildinfo` | Cache de compilação — ruído |

---

## Em andamento

De `planning/IN_PROGRESS.md`:

| # | Item | Dono | Próximo passo |
| :--- | :--- | :--- | :--- |
| P-01 | Governança e documentação | Claude Code | Manter conforme o backlog avança |
| P-02 | Som ambiente | André (compra) + Claude Code | Compra do equipamento |
| P-03 | Limpeza de contrato do painel | Antigravity | Aguardar aprovação do André para implementar B-02 |

**Novidade desde o último ciclo**: o Antigravity formalizou a especificação de **B-02** em
`specs/features/B-02-correcao-entidades-contrato.md` (12,6 KB, commit `3db95ae`) e atualizou o P-03.
A especificação cobre as quatro entidades inexistentes: id de bateria do aspirador, `todo.tarefas` e os
dois sensores de movimento fictícios. Status: **especificado, aguardando aprovação**.

---

## Travado

De `planning/BLOCKED.md`, agrupado por quem destrava:

**André — credenciais e contas (5)**: rotinas de presença na nuvem Tuya · Alexa Media Player (passkey)
· YouTube Music (cookie) · chaves dos AirTags (exige um Mac) · Atalho do Apple Saúde.

**André — rede e equipamento (5)**: reserva de DHCP · som ambiente (compra) · Larissa como usuária ·
migração para hardware dedicado · termostato e calendário.

**Decisão, não acesso (2)**: autenticação do painel (método a escolher) · como sair do servidor de
desenvolvimento.

Nenhum bloqueio novo. Nenhum destravou.

---

## Testes, lint, typecheck

| Verificação | Situação |
| :--- | :--- |
| **Suíte de testes** | ❌ **Não existe.** Zero `*.test.*` / `*.spec.*`, zero configuração de framework, zero dependências de teste, sem script `npm test` |
| **Lint** | ❌ **Não executável.** `"lint": "next lint"` — removido no Next 16, e não há ESLint instalado nem arquivo de configuração |
| **Typecheck** | ✅ `npx tsc --noEmit` → **sai com código 0** |

O typecheck cobre o estado atual do painel, incluindo as duas correções não commitadas.

---

## Documentação

`docs/` (6 arquivos) e `planning/` (5) existem e estão coerentes com o histórico. O
`ESTADO_DASHBOARD.md` registra as mudanças do dia. Nenhuma divergência entre o que os quadros afirmam e
o que os commits mostram.

---

## Divergências entre o quadro e a realidade

| # | Divergência |
| :--- | :--- |
| 1 | **`lib/rooms.ts` e `manifesto-comodos.json` corrigidos e não commitados** no repositório do painel. O `IN_PROGRESS.md` trata a inversão como "encerrada nas seis frentes", mas duas delas só existem no diretório de trabalho — some se alguém descartar as mudanças |
| 2 | **`planning/` não registra a criação dos dez subagentes** (`a2a8f20`) nem a reescrita do `CLAUDE.md` (`cdbf7c8`). Trabalho commitado que não aparece em `DONE.md` |
| 3 | **Dois donos para `planning/`**. O `.antigravity/rules.md` designa o Antigravity como mantenedor dos quadros; o `CLAUDE.md` §15 manda o Claude Code atualizá-los ao concluir. Sem combinação, os dois reescrevem o mesmo arquivo em ciclos diferentes |

---

## Riscos de segurança

Do `docs/SECURITY.md`, sem reprodução de qualquer valor de segredo. **Nenhum foi corrigido; todos
seguem abertos.**

| # | Risco | Severidade |
| :--- | :--- | :--- |
| A-01 | Painel na 3002 **sem autenticação** — quem alcança a porta comanda a casa | Crítico |
| A-02 | Segredos em pasta sincronizada pelo Google Drive (`.env.local`, `secrets.yaml`, `auth*`) | Alto |
| A-03 | `comando` e `modo` repassados sem lista de permissão em `/api/tv` e `/api/vacuum` | Médio |
| A-04 | Sem análise estática (confirmado hoje: ESLint ausente) | Médio |
| A-05 | Scripts com poder desproporcional (`taskkill` por porta, tarefa agendada com privilégio máximo) | Médio |

Confirmado nesta auditoria que **A-01 permanece**: `/api/state` respondeu HTTP 200 sem qualquer
credencial.

---

## Atenção

1. **Commitar as duas correções no `dashboard-app`** — é o único trabalho real desprotegido agora.
2. **B-02 aguarda sua aprovação**; a especificação está pronta e o escopo é baixo risco.
3. **Definir quem mantém `planning/`** antes que os dois agentes comecem a se sobrescrever.
4. A **confirmação física da inversão** continua pendente: acender a Cozinha pelo painel e verificar
   qual lâmpada acende. Toda a correção se apoia no registro do HA, não em observação.
