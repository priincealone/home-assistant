# ROADMAP

Última revisão: 15/09/2026 · Base: `artifacts/antigravity/recommended-roadmap.md`, **com as correções
apontadas em `artifacts/claude/technical-audit.md` §6**.

Sem datas fixas: o projeto é de uma casa, não de um contrato. A ordem vale mais que o calendário.

## Fase 1 — Estabilizar o que já está errado

Nada aqui é funcionalidade nova. É parar de sangrar.

| # | Item | Executor | Situação |
| :--- | :--- | :--- | :--- |
| 1.1 | Desativar as rotinas de presença no app Smart Life (Lavanderia e Banheiro) | **André** | 🔴 Bloqueado nele |
| 1.2 | ~~Alinhar Cozinha × Lavanderia~~ | — | ✅ **Feito em 15/09** |
| 1.3 | Reserva de DHCP para o PC (`192.168.31.22`) e o PS5 | **André** | 🔴 Bloqueado nele |
| 1.4 | Corrigir as 4 entidades inexistentes no contrato do painel | Antigravity | ⚪ A fazer |
| 1.5 | Decidir o destino da integração `music_assistant`, ausente do HA | André + Claude Code | ⚪ A investigar |

> **Correção ao roadmap original.** O item 1.2 atribuía a correção ao Claude Code, mas os arquivos do
> HA já estavam certos — o erro estava no painel. Executado ao pé da letra, teria invertido o lado
> correto. Ver `docs/DECISIONS.md` D-005.

## Fase 2 — Deixar de depender de sorte

| # | Item | Executor | Observação |
| :--- | :--- | :--- | :--- |
| 2.1 | ~~Autenticar o painel na porta 3002~~ | André | **Decidido em 05/10/2026: sem autenticação**, risco aceito (D-011 em `docs/DECISIONS.md`) |
| 2.2 | Sair de `npm run dev` para execução de produção | Claude Code + Antigravity | ⚠️ Containerizar **quebra** a leitura de `C:\HomeAssistant\config\...` em `app/api/mass/route.ts` e exige rever `HA_URL`. O diretório `ha-addon/` já existe e nunca foi usado |
| 2.3 | Testes de contrato: entidades do painel × HA | Ambos | Ver `artifacts/claude/test-gap-analysis.md` L-01 e L-02. Barato e impede a classe de defeito que já aconteceu |
| 2.4 | Instalar e configurar ESLint | Antigravity | O roadmap original falava em "ajustar o script"; não há ESLint instalado |
| 2.5 | Reaplicar o patch do Glances automaticamente | Claude Code | — |
| 2.6 | Resolver a cena "gamer" × automação da ventilação do PS5 | Ambos | Conflito de dono do atuador |
| 2.7 | ~~Expurgo de `desktop.ini`~~ | — | ✅ Já implementado no `predev` e no watchdog |

## Fase 3 — Completar o que está pela metade

| # | Item | Executor | Depende de |
| :--- | :--- | :--- | :--- |
| 3.1 | YouTube Music no Music Assistant | André + Claude Code | Cookie de sessão do Google |
| 3.2 | Alexa Media Player | André | Trocar chave de acesso por senha + autenticador |
| 3.3 | Atalho do Apple Saúde em produção | André | Montar o atalho no iPhone |
| 3.4 | Chaves dos AirTags (FindMy) | André | Um Mac emprestado |
| 3.5 | Larissa como usuária | André + Claude Code | Acesso remoto fora da tailnet |
| 3.6 | Som ambiente: caixas embutidas e Echos | André | Compra de equipamento |

## Fase 4 — Tirar a casa de cima do PC

| # | Item | Executor | Observação |
| :--- | :--- | :--- | :--- |
| 4.1 | Migrar para hardware dedicado com HA OS | André + Claude Code | Resolve de uma vez: multicast, queda quando o PC dorme, e a pasta sincronizada pelo Drive |
| 4.2 | ~~Floorplan 3D com LiDAR~~ | — | ❌ **Contraria decisão do André** de 15/09 (D-003). Mantido aqui só para registrar que foi avaliado e descartado |

## Fora de ordem, quando fizer sentido

- Termostato e calendário — nenhum existe como entidade hoje
- Levar as quatro cenas do painel para o HA
- Interruptor por automação no painel, para suspender cada rotina
- Automações propostas e não feitas (ver `CASA.md`)
