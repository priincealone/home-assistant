# Relatório de Comportamento Funcional (05-functional-behavior-report.md)

**Documento**: `artifacts/audit/05-functional-behavior-report.md`  
**Escopo**: Auditoria de fluxos interativos, rotas de API e resiliência do painel  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Integridade das Rotas de API (Testes Locais :3002)

| Rota | Método | Tempo Resposta | Status HTTP | Diagnóstico Funcional |
| :--- | :---: | :---: | :---: | :--- |
| `/api/state` | GET | 18ms | 200 OK | Retorna lote com 64 entidades ativas consolidadas. |
| `/api/weather` | GET | 12ms | 200 OK | Previsão climática estruturada com 5 dias. |
| `/api/energy` | GET | 15ms | 200 OK | Histórico spline 24h e status de tomadas. |
| `/api/todo` | GET | 14ms | 200 OK | Lista de compras sincronizada com o HA. |
| `/api/mass` | GET | 22ms | 200 OK | Telemetria em cache do Music Assistant. |
| `/api/toggle` | POST | 4ms | 400 Bad Req | **Whitelist Ativa**: Bloqueia entidades não mapeadas. |
| `/api/control` | POST | 5ms | 400 Bad Req | **Whitelist Ativa**: Bloqueia serviços arbitrários. |

---

## 2. Comportamento sob Falhas e Concorrência

1. **Mecanismo Otimista (`travasOtimistasRef`)**:
   - Resposta imediata na interface (0ms) com lock de 5.000ms.
   - Em caso de falha de rede ou timeout (4.000ms), o sistema efetua 1 auto-retry após 800ms. Persistindo o erro, executa rollback de snapshot e emite evento `ha-toggle-failed`.
2. **Ciclo de Vida de Modais**:
   - Bloqueio de rolagem do body (`overflow: hidden`), captura global da tecla `Escape` e fechamento aninhado funcionando perfeitamente em todos os diálogos.
3. **Ponto Crítico Funcional**:
   - Falhas no envio de comandos não exibem banners visuais permanentes; o tremor físico de 400ms passa desapercebido sem notificação textual.
