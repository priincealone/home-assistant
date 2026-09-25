# Melhorias de visual e uso — rodada de 24/09/2026

- **Pedido do André**: itens 1, 2, 3, 5, 7, 9 e 10 da análise de 24/09 (4, 6 e 8 fora; 6 pulado a pedido)
- **Status**: aprovado; front em `dashboard-app/app`, rota nova em `app/api` (alçada 2, aprovada com este pedido)

| # | Item | Definição de pronto |
| :--- | :--- | :--- |
| 1 | Modo parede | Cada widget da barra decide o que mostrar pela **sua** largura (`container queries`); nada de texto cortado a meio entre 768 e 1600px |
| 2 | Cards de cômodo | Problema visível de relance: cômodo com ponto indisponível ganha destaque próprio; cabeçalho do card resume luzes acesas/total |
| 3 | Faixa de alertas | Uma faixa única sob o cabeçalho, só quando há algo a dizer: porta aberta, bateria baixa, dispositivo indisponível, câmera fora. Cada chip abre o detalhe já existente. Some com a casa em ordem |
| 5 | Cenas no HA | Ver `specs/automations/cenas-como-scripts-no-ha.md` |
| 7 | Histórico por cômodo | `GET /api/historico?comodo=<id>` (só leitura, lista de permissão pelo contrato `rooms.ts`) devolve as últimas mudanças de estado das luzes/tomadas do cômodo nas últimas 24 h, máx. 12. Aparece como "Atividade recente" na página do cômodo. Sem segredo no retorno |
| 9 | Saúde do sistema | Chip no cabeçalho: Home Assistant (a partir do polling), quantos dispositivos do contrato estão `unavailable` e câmeras. Estado desconhecido nunca é apresentado como desligado (CLAUDE.md §12) |
| 10 | PWA completa | Service worker que **só** guarda casca estática e uma página `/offline`; **nunca** `/api/*` nem respostas autenticadas. Navegação sem rede mostra a página offline em vez do erro do navegador |

## Riscos e armadilhas

- O painel é servido em `next dev`: o service worker não pode cachear `/_next/*` dinâmico. Só ícones e `/offline`.
- `middleware.ts` redireciona para `/login`: `/sw.js` e `/offline` precisam ser públicos, senão o registro falha.
- Nenhum item aciona dispositivo. Testes visuais só observam.
