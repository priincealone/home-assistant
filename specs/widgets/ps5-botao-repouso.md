# Widget Spec · Botão de repouso do PS5 (Console Gamer)

- **ID**: PS5-03
- **Autor**: Claude Code (a pedido do André, 25/09/2026, que autorizou mexer no `dashboard-app`)
- **Depende de**: `specs/features/ps5-desligar-remote-play.md` (PS5-02). A entidade já aceita `turn_off`
- **Onde**: `dashboard-app/app/components/MediaHubModal.tsx`, aba "Console Gamer"; borda em `lib/ha.ts`

## 1. Ponto de partida

O botão "Colocar em Repouso" já existia, mas ligado ao `alternar()` genérico da página, que faz toggle
otimista de 5 s. Com o `turn_off` real isso dá três defeitos:

| Defeito | Efeito |
| :--- | :--- |
| Trava otimista de 5 s; o repouso leva ~10 s de comando e ~50 s de oscilação `unavailable`↔`off` | O painel volta a "Ligado" com o console já entrando em repouso |
| Toque durante a oscilação lê `unavailable` como "não está ligado" e manda `turn_on` | **Religa** o console |
| Sem confirmação, e o mesmo caminho serve ao tile do cômodo | Um toque acidental no meio da partida desliga o console |

## 2. Comportamento

Três estados de leitura, nunca confundidos (CLAUDE.md §12):

| Estado HA | Chip | Botão |
| :--- | :--- | :--- |
| `on`, `playing` | Console Ligado | "Colocar em Repouso" (pede confirmação) |
| `off`, `standby`, `idle` | Modo Repouso | "Ligar Console PS5" |
| `unavailable`, `unknown`, ausente | Sem resposta | Desabilitado |

- **Confirmação em dois toques**: o primeiro arma ("Toque de novo para confirmar", 4 s); o segundo envia.
- **Pendente**: após enviar, o chip mostra "Entrando em repouso…" (ou "Ligando…") e o botão fica desabilitado
  até o console chegar ao estado pedido, com teto de 90 s. No teto, avisa "Sem confirmação do console" (não
  reverte nada por conta própria e não reenvia comando).
- **Erro**: resposta de erro da rota aparece no card; nada de engolir falha.

## 3. Borda (`lib/ha.ts`)

- `controlarPs5` lê o estado antes de agir: `turn_off` só com `on`/`playing`; `turn_on` só com `off`/`standby`/
  `idle`; com `unavailable`/`unknown` recusa com mensagem clara. Comando de desligar não é idempotente
  (CLAUDE.md §11.3).
- O caminho genérico (`executarComandoDispositivos`, usado por `/api/toggle` e pelos tiles) **recusa repouso**
  do PS5 e ignora comandos com o console sem resposta. O repouso só sai da rota `/api/tv` (`ps5_power: false`),
  ou seja, do botão com confirmação.
- Sem mudança em `lib/rooms.ts`: `media_player.sala_de_estar_ps5` já é entidade do contrato.

## 4. Fora do escopo

Botão de repouso no tile do cômodo; ligar a TV junto; qualquer automação que desligue o console.
Bug antigo observado, não tratado: `enviarComandoTv({ fonte: "HDMI", ps5_power: true })` (aba de fonte) nunca
liga o console, porque a rota `/api/tv` retorna depois de tratar `fonte`, antes de chegar em `ps5_power`.

## 5. Verificação

- [ ] `npx tsc --noEmit` sem erros
- [ ] Leitura do estado real: chip e botão corretos para `on`, `off` e `unavailable` (sem acionar o console)
- [ ] `/api/toggle` com `turn_off` no PS5 ligado é recusado; com `unavailable` não faz nada
- [ ] Um ciclo físico único, com o André, via botão: confirmação → repouso → chip volta a "Modo Repouso";
      estado anterior devolvido
