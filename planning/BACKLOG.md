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

### B-14 · Resíduos de desenvolvimento no `dashboard-app` (parte 1 feita em 13/10/2026)
Feito: removidos `scratch/test_*.mjs` (3, liam o token direto) e os logs vazios `test_err.log`/`test_out.log`.
Falta: `.cache/estados-snapshot.json` (snapshot de 07/09, quase causou uma correção invertida). Só o `tools/gerar_manifesto.py`
o lê; sai junto com a decisão do B-12.
**Esforço**: trivial · **Executor**: Antigravity

### B-16 · Rever peças do aspirador
O robô informa vida útil zerada em escovas e filtro.
❓ Não se sabe se as peças foram trocadas sem zerar o contador.
**Esforço**: trivial · **Executor**: André
