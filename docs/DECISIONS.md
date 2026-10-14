# DECISIONS — decisões que moldaram o sistema

Registro curto de decisões arquiteturais. Uma entrada por decisão, com o contexto que a motivou e o
que ela custa. O raciocínio longo e cronológico fica em `ESTADO_DASHBOARD.md`.

Formato: **contexto → decisão → consequência**. Decisão revogada não é apagada, é marcada.

---

## D-001 · O painel principal é o `dashboard-app` — 15/09/2026

**Contexto.** Durante 12 dias foram mantidas duas interfaces: a dashboard Lovelace "Casa" (11 páginas,
tema próprio, 60 scripts de edição) e o `dashboard-app` em Next.js, desenvolvido em paralelo no
Antigravity.

**Decisão.** O `dashboard-app` passa a ser a interface da casa. A dashboard Lovelace foi retirada,
junto com dez itens do HACS, temas e cards que só ela usava.

**Consequência.** Uma interface para manter em vez de duas. O histórico do Lovelace continua no git.
A regeneração do `manifesto-comodos.json` ficou quebrada, porque o gerador lia a dashboard removida.
**Resolvido em 13/10/2026 (B-12)**: o gerador (`tools/gerar_manifesto.py`) e o snapshot de estados foram aposentados; o
manifesto virou histórico e `lib/rooms.ts` é o contrato.

---

## D-002 · Automação não depende da interface — desde o início, reafirmado em 15/09/2026

**Contexto.** É tentador colocar lógica onde é mais fácil escrever: no painel.

**Decisão.** Toda automação física mora em `config/automations.yaml`. O painel comanda, não decide.

**Consequência.** A casa sobrevive à queda do painel. Em compensação, cenas criadas no painel (as
quatro atuais) ficam invisíveis para o HA e somem com ele — dívida conhecida e aceita por ora.

---

## D-003 · Sem planta 2D ou 3D — 15/09/2026

**Contexto.** Havia um modelo 3D gerado do arquivo IFC da casa, com pisos nomeados por cômodo, e uma
planta 2D, feitos para o `floor3d-card`.

**Decisão.** André: "por hora não irei usar nenhum modelo 3D ou 2D". Os arquivos foram removidos.

**Consequência.** O item de floorplan 3D no roadmap do Antigravity contraria esta decisão e está
marcado como tal. Reverter exige regenerar o modelo a partir do IFC original.

---

## D-004 · Divisão de trabalho entre agentes — 15/09/2026

**Contexto.** Dois agentes atuam no mesmo repositório: Antigravity (interface) e Claude Code
(infraestrutura e automação).

**Decisão.** Claude Code opera em `config/`, `scripts/` e infraestrutura; Antigravity opera em
`dashboard-app/`. `lib/rooms.ts` e `app/api/*` são fronteira compartilhada (o `manifesto-comodos.json` é histórico desde 13/10/2026).
Segredos, nuvem Tuya e rede são exclusivos do André.

**Consequência.** Correção de contrato pode exigir o agente "errado" para o arquivo — foi o caso da
inversão Cozinha/Lavanderia, cuja correção estava no lado do painel. Pedido explícito do dono resolve.

---

## D-005 · O registro do HA é a fonte de verdade do mapeamento — 15/09/2026

**Contexto.** Seis fontes descreviam o interruptor de três teclas e discordavam entre si. A auditoria
do Antigravity concluiu que o erro estava no Home Assistant.

**Decisão.** A camada `light.*` do registro (nome e área), confirmada por sensores de template e
automações, é a referência. O painel é que estava invertido.

**Consequência.** Corrigido em `lib/rooms.ts`, `manifesto-comodos.json` e nos nomes `switch.*`.
**Lição**: o `.cache/estados-snapshot.json` do painel, de 07/09, ainda tinha o mapa pré-correção e
quase inverteu a correção para o lado errado. Cache velho mente com a segurança de um arquivo atual.

---

## D-006 · Comando físico se condiciona ao estado — 11/09/2026

**Contexto.** A automação da porta desligava a TV por dois caminhos, sempre, com o argumento de que
desligar o que já está desligado não custa nada.

**Decisão.** Custa: nesta Samsung o desligar é a tecla POWER, que alterna. O comando passa a ser
enviado só com a TV ligada, e por um caminho de cada vez.

**Consequência.** Regra geral R2 da política de automação. Idempotência é hipótese a verificar, não
propriedade a assumir.

---

## D-007 · Som ambiente: Music Assistant como cérebro — 11/09/2026 (substituída por D-012)

**Contexto.** A casa não tinha nenhum dispositivo de áudio; os media players existentes não ofereciam
nem biblioteca nem agrupamento.

**Decisão.** Music Assistant como camada de música, com papéis separados: caixas embutidas para
música sincronizada, Echos para voz e avisos. Os dois mundos não sincronizam entre si.

**Consequência.** Multiroom real depende de resolver o multicast, o que este hospedeiro não permite —
é uma das razões da migração para hardware dedicado.

---

## D-008 · Credenciais são do dono, sem exceção — recorrente

**Contexto.** Vários fluxos (Xiaomi, Alexa, YouTube Music, Apple ID) pedem senha, código ou cookie.

**Decisão.** Nenhum agente busca, preenche ou transporta credencial do André, mesmo quando ele pede
explicitamente. O fluxo é levado até a borda e o que falta é dito em uma frase.

**Consequência.** Alguns itens ficam parados esperando ação humana — e é o resultado correto. Foi
assim que a passkey da Amazon virou diagnóstico em vez de tentativa repetida.

---

## D-009 · Editar registro exige parar o Home Assistant — recorrente

**Contexto.** `core.entity_registry`, `core.device_registry`, `core.area_registry` e `core.config` são
reescritos pelo HA no desligamento.

**Decisão.** Validar → `docker stop` → editar → `docker start`. Nunca `docker restart`. Validação
sempre **antes** de parar, para não deixar a casa fora do ar por causa de um erro de script.

**Consequência.** Toda alteração de registro é um script versionado em `scripts/manutencao/`, com
backup em `backups/`.

---

## D-010 · Ocultar não é desativar, e apagar tem efeito colateral — recorrente

**Contexto.** Limpeza de entidades ruidosas e de dispositivos duplicados.

**Decisão.** `hidden_by` para tirar da vista mantendo estado e API; `disabled_by` para remover de tudo.
O que uma integração viva ainda enxerga **não se apaga, se desativa** — apagar um dispositivo reativa
os filhos que ele havia desativado.

**Consequência.** 151 de 383 entidades ocultas, sem perda de função.

---

## D-011 · O painel não pede PIN — 05/10/2026

**Contexto.** Um login por PIN entrou no painel em 24/09 (`middleware.ts`, `lib/auth.ts`, `/login`). A
auditoria de 05/10 (`artifacts/claude/auditoria-painel-05-10.md`) achou que ele protegia pouco: o PIN em uso
era o padrão escrito no código, o cookie de sessão não era validado (qualquer valor passava) e
`/api/state` e `/api/camera/*` já ficavam de fora.

**Decisão.** O André escolheu acesso livre: o PIN, a tela `/login` e a rota `/api/auth/login` foram
removidos. `/login` redireciona para `/`.

**Consequência.** Risco aceito: quem alcança a porta 3002 (toda a LAN e toda a tailnet, `100.74.130.30`)
comanda a casa e vê as câmeras, sem se identificar. Se a rede deixar de ser confiável, a saída é restringir a
3002 no firewall ou num proxy autenticado, não voltar ao PIN de antes.

---

## D-012 · Music Assistant removido da casa e do painel — 09/10/2026

**Contexto.** O Music Assistant (D-007) nunca chegou a entregar música confiável: a integração sumiu do HA
sem explicação, o player só existia com o navegador do MA aberto, o YouTube Music ficou sem cookie e o
multiroom depende de multicast, que este hospedeiro não entrega. O André também quer liberar recursos do PC
para o Jarvis (IA local).

**Decisão.** Pedido do André, com o painel incluído: container `music-assistant` e `bgutil-provider`
removidos (com as imagens); dados do MA **movidos** para `backups/music-assistant-20261009/`, não apagados (têm
credenciais do YouTube Music); aba "Música & Som", `app/api/mass`, o sink de áudio e o CSS `mass-*` saíram do
painel (commit `e34178f`); `scripts/music_assistant/` e a linha do `.gitignore` saíram do repositório da casa.

**Consequência.** Não há mais camada de música. Ganho de RAM pequeno (~100 MB). Os 6 registros órfãos em
`deleted_entities` e `deleted_devices` não foram editados: o HA os descarta sozinho (~11/10), e parar o HA só
para isso seria downtime por algo cosmético. Pendência do André: apagar `MASS_TOKEN` de `dashboard-app/.env.local`
e decidir quando apagar o backup.

---

## D-013 · Automações do B-11 não serão feitas — 13/10/2026

**Contexto.** O backlog propunha três automações novas: "saiu de casa → apagar tudo", luz de acolhimento ao
chegar à noite e aspirador quando a casa esvazia. A primeira só seria segura enquanto houvesse uma pessoa
cadastrada para a presença.

**Decisão.** O André respondeu "B-11 não precisa". O item saiu do backlog; as oito automações atuais ficam como estão.

**Consequência.** Nenhuma especificação em `specs/automations/` será escrita para esses três casos. Se algum voltar a
fazer falta, entra como item novo, com a especificação antes (CLAUDE.md §16) e, para presença, a verificação da nuvem
Tuya (R9) e do cadastro de pessoas.

## D-014 · Regra obrigatória de qualidade visual e porteiro visual — 14/10/2026

**Decisão** (André): toda mudança visual do painel segue `docs/UI-QUALITY-POLICY.md` e só fica pronta com APROVADO do
agente `visual-gatekeeper`. Nunca remover, ocultar, simplificar ou substituir funcionalidade para resolver problema visual.

**Por quê**: correções pontuais deixavam regressões em telas vizinhas (texto vazando, corte seco, desalinhamento) que o
André achava no uso. A revisão humana passa a ser a última camada de confirmação, não a etapa de correção.

**Como**: CLAUDE.md §17; agente `.claude/agents/visual-gatekeeper.md` (somente leitura, nunca aciona a casa); gancho
`.claude/settings.json` → `scripts/hooks/lembrete_revisao_visual.mjs` lembra a regra a cada edição de arquivo visual;
`dashboard-app/AGENTS.md` §3 para o Antigravity.

---

## Decisões pendentes

| Assunto | Quem decide |
| :--- | :--- |
| Mover o painel para container ou serviço do Windows (hoje roda em produção sob watchdog) | André |
| Qual hardware dedicado, e quando migrar | André |
| Manter cenas no painel ou levá-las para o HA | André |
