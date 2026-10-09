# IN PROGRESS

Trabalho começado e não concluído. Cada item traz **onde parou** e **o próximo passo concreto** — quem
retomar não precisa reconstruir o contexto.

Regra: um item aqui tem dono e próximo passo. Sem isso, volta para `BACKLOG.md` ou vai para
`BLOCKED.md`.

---

## P-01 · Governança e documentação do repositório

**Dono**: Claude Code · **Iniciado**: 15/09/2026

Auditoria independente dos artefatos do Antigravity concluída (4 relatórios em `artifacts/claude/`) e
estrutura de governança criada (`docs/`, `planning/`, `specs/`).

**Onde parou**: documentos escritos, refletindo o estado medido em 15/09.
**Próximo passo**: manter atualizado conforme o backlog avança. `specs/` está vazio de propósito — a
primeira especificação entra quando houver funcionalidade nova a descrever.

---

## P-02 · Som ambiente

**Dono**: André (compra) + Claude Code (integração) · **Iniciado**: 11/09/2026

O Music Assistant foi **removido em 09/10/2026** (D-012); não há camada de música. O ponto de som atual é o
navegador via `browser_mod` — funciona, mas só com a página aberta e depois de um toque na tela, por causa
da política de autoplay.

**Onde parou**: o desenho original (caixas embutidas para música, Echos para voz e avisos) depende de uma
nova camada de música, ainda não escolhida.
**Próximo passo**: decidir se a camada de música volta, e com quê, antes de comprar o equipamento.
Multiroom sincronizado depende do multicast, que este hospedeiro não entrega (ver Fase 4 do roadmap).

---

## P-03 · Limpeza de contrato do painel

**Dono**: Antigravity · **Iniciado**: 15/09/2026

A inversão Cozinha/Lavanderia foi corrigida em `lib/rooms.ts`, `manifesto-comodos.json` e nos nomes
`switch.*` do HA.

**Onde parou**: inversão encerrada nas seis frentes; B-02 (4 entidades inexistentes) implementada em 06/10/2026 pelo Claude Code, na fase 3 do painel.
**Próximo passo**: só a confirmação abaixo.
**Confirmação pendente**: acender a Cozinha pelo painel e verificar qual lâmpada acende. Toda a
correção se apoia no registro do HA, não em observação da luz.

