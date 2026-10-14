# BACKLOG

Trabalho identificado e não iniciado. O que depende de ação exclusiva do André está em `BLOCKED.md`.
Ordenado por valor, não por esforço.

---

## Alto valor

### B-09 · Levar as quatro cenas do painel para o Home Assistant
Hoje existem só em TypeScript: invisíveis ao HA, inacessíveis por voz ou automação, e somem se o
painel cair. `config/scenes.yaml` está vazio.
**Esforço**: médio · **Executor**: ambos

### B-10 · Interruptor por automação no painel
Poder suspender cada rotina sem editar YAML. Automação de movimento sem desligamento fácil vira
incômodo no dia em que se quer a luz apagada.
**Esforço**: médio · **Executor**: ambos

### B-13 · Limpar os títulos das entradas `switch_as_x`
Ainda trazem os rótulos antigos e invertidos. Não afetam comportamento, mas enganam quem audita — foi
o que induziu a auditoria do Antigravity ao erro.
**Esforço**: baixo · **Executor**: Claude Code (exige parada do HA)

### B-16 · Rever peças do aspirador
O robô informa vida útil zerada em escovas e filtro.
❓ Não se sabe se as peças foram trocadas sem zerar o contador.
**Esforço**: trivial · **Executor**: André
