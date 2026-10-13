# BACKLOG

Trabalho identificado e não iniciado. O que depende de ação exclusiva do André está em `BLOCKED.md`.
Ordenado por valor, não por esforço.

---

## Alto valor

### B-07 · Instalar e configurar ESLint
Não existe dependência nem configuração; `npm run lint` não funciona.
**Esforço**: baixo · **Executor**: Antigravity

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
