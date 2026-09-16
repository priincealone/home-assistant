# Auditoria de Segurança das Automações Físicas

Data: 15/09/2026 · Auditor: Claude Code
Escopo: separação entre automação física e interface, comandos perigosos, propriedade de arquivos.
**Nenhuma correção foi aplicada.** Cada achado traz a evidência e o modo de falha, não o conserto.

---

## 1. As cinco automações físicas — revisão individual

Todas em `config/automations.yaml`, carregadas e ativas (verificado no registro de estados).

| # | Automação | Gatilho | Avaliação de segurança |
| :--- | :--- | :--- | :--- |
| 1 | Ventilação do PS5 | estado do console, partida do HA, a cada 5 min | ✅ Decide por estado atual, não pelo gatilho. Reconcilia sozinha. Desliga com 2 min de atraso — protege o console |
| 2 | Porta fechada à noite apaga a casa | porta `on→off`, 22h–6h | ✅ Janela atravessa a meia-noite corretamente. TV condicionada ao estado (protege do POWER alternador). ⚠️ Apaga também a luz do próprio quarto — comportamento documentado e intencional |
| 3 | Porta aberta à noite acende o painel | porta `off→on`, 22h–6h | ✅ Efeito único e reversível |
| 4 | Movimento na Lavanderia | movimento, sol abaixo do horizonte | ✅ Condição de sol só no acender; o apagar funciona a qualquer hora. ⚠️ Concorre com rotina da nuvem Tuya (§4) |
| 5 | Movimento na Área Gourmet | idem, 4 circuitos | ✅ Mesma estrutura. ⚠️ Mesma concorrência |

Nenhuma automação aciona tomada de carga crítica, tranca, portão ou aquecedor. O pior efeito possível
no conjunto atual é luz acesa ou apagada na hora errada e a TV ligando sozinha — este último já
protegido.

**Ponto forte confirmado**: nenhuma automação depende do painel. Se o Next.js cair, a casa continua
automatizada. A inversão do painel (D-01) **não contamina** as automações, porque elas usam os
`entity_id` diretamente.

---

## 2. Onde a interface invade a automação — **Alta**

### A-01 · A cena "gamer" disputa a tomada com a automação nº 1

`app/api/scene/route.ts` (cena `gamer`) executa:

```ts
alternar("switch.ventilacao_ps5")   // toggle cego
```

`switch.ventilacao_ps5` é **propriedade da automação nº 1**, que a reconcilia pelo estado do PS5 a cada
5 minutos. Modos de falha reais:

| Situação | O que a cena faz | O que a automação faz depois |
| :--- | :--- | :--- |
| PS5 desligado, usuário aciona "gamer" | liga a ventilação | desliga em até 5 min — a cena "não pega" |
| PS5 ligado, ventilação já ligada | **desliga** a ventilação | religa em até 5 min — o console fica sem ventilação nesse intervalo |

É um `toggle` sobre um recurso com dono. O segundo caso é o que interessa: a cena tira a ventilação de
um console em uso e a automação só corrige na próxima reconciliação.

### A-02 · A cena "boa_noite" duplica a automação nº 2

A mesma intenção existe em dois lugares com listas diferentes: a automação nº 2 resolve as luzes por
*template* (pega luz nova automaticamente, exclui luzes de fundo e LEDs de rede); a cena `boa_noite`
carrega **11 `entity_id` fixos** em `app/api/scene/route.ts:23-34`. Divergem hoje: a cena não inclui
`light.quarto_luca_switch_1`, `light.luz_quarto`, o LED do escritório nem a luminária Yeelink.

Não é perigoso — é dívida de duplicação: uma luz nova entra na automação sozinha e **nunca** na cena.

### A-03 · Cenas vivem no painel, e `scenes.yaml` está vazio

As quatro cenas ("cinema", "boa_noite", "boas_vindas", "gamer") existem só em TypeScript. Consequência:
não aparecem no HA, não podem ser chamadas por automação, por voz ou pelo app do HA, e somem se o
painel sair do ar. `config/scenes.yaml` tem 0 byte.

---

## 3. Comandos e scripts perigosos

| Script | Trecho | Risco |
| :--- | :--- | :--- |
| `parar_servidor.bat:16` | `taskkill /PID $conn.OwningProcess /T /F` sobre **quem estiver escutando a 3002** | **Médio-alto**. Mata em árvore, à força, sem confirmar identidade. Se outro processo ocupar a 3002, ele morre |
| `instalar_servico_agendado.bat:16` | `schtasks /create ... /rl highest /f` | **Médio**. Registra servidor de desenvolvimento para rodar **com privilégio máximo** no logon. `/f` sobrescreve tarefa homônima sem avisar |
| `instalar_e_rodar.bat:6` | `rmdir /s /q node_modules` | Baixo, destrutivo e local |
| `iniciar_servidor_background.ps1:26` | `Remove-Item -Force` recursivo em `.next` | Baixo — filtra `desktop.ini`, escopo correto |
| `abrir_dashboard.ps1`, `iniciar_servidor.bat` | `Invoke-CimMethod Win32_Process Create` + `-ExecutionPolicy Bypass` | Baixo-médio. Cria processo desacoplado por WMI e ignora política de execução |
| `scripts/manutencao/retira_dashboard_casa.py` | apaga diretórios em `config/` | Já executado, com validação prévia e backups. Deveria ficar arquivado, não reexecutado |
| `scripts/diagnostico/*` | SQLite aberto em `mode=ro` | ✅ Somente leitura, seguro |

Nada apaga dados do Home Assistant nem toca no banco de forma destrutiva. O risco concentra-se no
`taskkill` por porta e no agendamento privilegiado.

### Ponto estrutural: o painel roda em modo de desenvolvimento

`iniciar_servidor_background.ps1:52` executa `npm run dev`. A casa depende de um servidor de
desenvolvimento, com recompilação em tempo real, dentro de uma pasta que o Google Drive escreve por
baixo (é a causa do RSK-07). `next build` + `next start` existem no `package.json` e não são usados.

---

## 4. Concorrência com a nuvem Tuya — confirmada

Corroborei o RSK-02 com evidência própria (`scripts/diagnostico/quem_acendeu.py`): em 48 h, 244
acendimentos reais, a maioria **sem contexto do HA** — ou seja, originados fora dele. Cenas registradas
do app Smart Life: `scene.lavanderia_em_uso`, `scene.lavanderia_vazia`, `scene.acender_apagar`
(ativas) e `scene.banheiro_em_uso`, `scene.banheiro_vazio` (desativadas **no HA**, mas a rotina
continua na nuvem).

A automação nº 4 (Lavanderia) e a cena `lavanderia_em_uso` disputam a mesma lâmpada, com regras
diferentes: a da nuvem acende a qualquer hora, a do HA apaga após 10 minutos. Só o proprietário
resolve, no aplicativo — nível 3 de alçada.

---

## 5. O mapeamento de propriedade é seguro?

**Em parte.** A intenção está certa e três pontos precisam de ajuste.

### P-01 · Contradição entre os dois documentos sobre `.storage`

| Documento | Classificação de `config/.storage/core.*_registry` |
| :--- | :--- |
| `file-ownership.md` §2 | "**Proibida para Alteração** — Proibido em Execução" |
| `multi-agent-governance.md` §2 | "Proibida para Alteração **Automática** — Claude Code (com protocolo)" |

A primeira leitura proíbe a edição; a segunda permite sob protocolo. Como a edição de registro é
justamente a operação que já foi necessária várias vezes (renomear aparelho, ocultar entidade), a
ambiguidade tende a ser resolvida pelo agente, não pelo dono. O protocolo em si (backup → `docker stop`
→ editar → `docker start`) está correto e é o que a prática confirma.

### P-02 · `app/api/*` classificado como fronteira neutra

A matriz trata `app/api/*` como "Compartilhada com Revisão", presumindo transporte. Mas `scene` e
`vacuum` contêm **decisões físicas** (quais luzes apagam, qual tomada alterna, qual modo de sucção).
Enquanto a cena "gamer" morar ali, um agente de UX altera comportamento elétrico dentro do seu próprio
território declarado.

### P-03 · O contrato tem dois donos e nenhum validador

`lib/rooms.ts` é "Compartilhada com Revisão", mas nada no processo verifica se as entidades existem —
e é assim que quatro entidades fantasma e uma inversão entraram. A regra do roadmap ("alterações em
`lib/rooms.ts` requerem validação prévia via `GET /api/states`") é boa e hoje é manual; não há teste,
nem script, nem passo de build que a imponha.

### P-04 · O que está corretamente protegido

`secrets.yaml`, `.env.local`, `auth*`, banco SQLite e dados dos containers estão classificados como
exclusivos do proprietário ou do sistema — coerente com o que se verificou na prática. Ressalva de
`technical-audit.md` (S-03): estão protegidos do **git**, não do **Google Drive**.

---

## 6. Resumo

| # | Achado | Severidade |
| :--- | :--- | :--- |
| A-01 | Cena "gamer" alterna a tomada que a automação nº 1 controla | **Alta** |
| — | Painel sem autenticação pode acionar tudo isso (S-02) | **Crítica** |
| A-02 | Cena "boa_noite" duplica a automação nº 2 com lista divergente | Média |
| A-03 | Cenas fora do HA; `scenes.yaml` vazio | Média |
| — | `taskkill /T /F` pelo dono da porta 3002 | Média |
| — | Tarefa agendada com privilégio máximo para servidor de desenvolvimento | Média |
| P-01 | Regra de `.storage` contraditória entre documentos | Média |
| P-02 | `app/api/*` tratado como neutro, mas contém decisão física | Média |
| P-03 | Contrato canônico sem validação automática | Média |
| — | Concorrência com a nuvem Tuya | Alta (ação do proprietário) |

As cinco automações, isoladamente, estão bem construídas — cada uma resiste a reinício, a estado
intermediário e a comando não idempotente. O risco do conjunto hoje não vem delas: vem de a interface
poder agir sobre os mesmos atuadores sem conhecer as regras que os governam.
