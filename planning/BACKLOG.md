# BACKLOG

Trabalho identificado e não iniciado. O que depende de ação exclusiva do André está em `BLOCKED.md`.
Ordenado por valor, não por esforço.

---

## Alto valor

### B-01 · Autenticar o painel (porta 3002)
Hoje qualquer aparelho da LAN ou da tailnet controla a casa sem se identificar. Não há middleware nem
verificação nas 10 rotas. → `docs/SECURITY.md` A-01
**Esforço**: médio · **Executor**: Antigravity + André (decisão do método)

### B-02 · Corrigir as 4 entidades inexistentes no contrato do painel
`binary_sensor.sensor_banheiro_movimento`, `binary_sensor.sensor_closet_movimento`, o id de bateria do
aspirador e `todo.tarefas`. Nenhuma quebra o build; todas chegam à tela como estado nulo.
→ `docs/SYSTEM-MAP.md`
**Esforço**: baixo · **Executor**: Antigravity
❓ Antes: decidir se os dois sensores de movimento devem existir fisicamente.

### B-03 · Teste de contrato entidades × Home Assistant
Um teste que compara `lib/rooms.ts` com `GET /api/states` teria barrado B-02 e a inversão
Cozinha/Lavanderia no dia em que entraram. → `artifacts/claude/test-gap-analysis.md` L-01, L-02
**Esforço**: baixo · **Executor**: Antigravity

### B-04 · Resolver a cena "gamer" × automação da ventilação do PS5
A cena dá `toggle` cego em `switch.ventilacao_ps5`, que tem dono. Com o console ligado, ela desliga a
ventilação. → `docs/AUTOMATION-POLICY.md` R8
**Esforço**: baixo · **Executor**: ambos

### B-05 · Sair do servidor de desenvolvimento
O painel de produção roda `npm run dev` sob watchdog. ⚠️ Containerizar quebra a leitura de
`C:\HomeAssistant\config\.storage\core.config_entries` feita por `app/api/mass/route.ts`.
**Esforço**: médio · **Executor**: ambos

---

## Médio valor

### B-06 · Investigar a ausência da integração `music_assistant`
A entrada sumiu de `core.config_entries`; o container segue no ar e o painel funciona pelo token do
`.env.local`. ❓ Não se sabe quando nem por quê.
**Esforço**: baixo · **Executor**: Claude Code

### B-07 · Instalar e configurar ESLint
Não existe dependência nem configuração; `npm run lint` não funciona.
**Esforço**: baixo · **Executor**: Antigravity

### B-08 · Reaplicar o patch do Glances automaticamente
Some toda vez que o container é recriado do zero.
**Esforço**: baixo · **Executor**: Claude Code

### B-09 · Levar as quatro cenas do painel para o Home Assistant
Hoje existem só em TypeScript: invisíveis ao HA, inacessíveis por voz ou automação, e somem se o
painel cair. `config/scenes.yaml` está vazio.
**Esforço**: médio · **Executor**: ambos

### B-10 · Interruptor por automação no painel
Poder suspender cada rotina sem editar YAML. Automação de movimento sem desligamento fácil vira
incômodo no dia em que se quer a luz apagada.
**Esforço**: médio · **Executor**: ambos

### B-11 · Automações propostas e ainda não feitas
Saiu de casa → apaga tudo; chegando à noite → luz de acolhimento; aspirador quando a casa esvazia.
Detalhe e ressalvas em `CASA.md`.
**Esforço**: baixo cada · **Executor**: Claude Code
⚠️ A primeira só é segura enquanto houver uma pessoa cadastrada.

### B-12 · Apontar o gerador do manifesto para outra fonte
`tools/gerar_manifesto.py` lia a dashboard Lovelace, que não existe mais. Enquanto isso, correções
manuais no `manifesto-comodos.json` se perdem se alguém rodar o gerador.
**Esforço**: baixo · **Executor**: Antigravity

---

## Baixo valor / higiene

### B-13 · Limpar os títulos das entradas `switch_as_x`
Ainda trazem os rótulos antigos e invertidos. Não afetam comportamento, mas enganam quem audita — foi
o que induziu a auditoria do Antigravity ao erro.
**Esforço**: baixo · **Executor**: Claude Code (exige parada do HA)

### B-14 · Arquivar resíduos de desenvolvimento no `dashboard-app`
`test_err.log`, `test_out.log` (vazios), `scratch/` com roteiros exploratórios e `.cache` com snapshot
de 07/09 já desatualizado — este último quase causou uma correção invertida.
**Esforço**: baixo · **Executor**: Antigravity

### B-15 · Testes de lógica pura
`getEnergyHistory`, `getWeatherForecast` e o mesclador de travas otimistas são determinísticos e
testáveis sem rede. → `test-gap-analysis.md` L-04
**Esforço**: baixo · **Executor**: Antigravity

### B-16 · Rever peças do aspirador
O robô informa vida útil zerada em escovas e filtro.
❓ Não se sabe se as peças foram trocadas sem zerar o contador.
**Esforço**: trivial · **Executor**: André
