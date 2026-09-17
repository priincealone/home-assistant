# Backlog Técnico Priorizado (11-prioritized-backlog.md)

**Documento**: `artifacts/audit/11-prioritized-backlog.md`  
**Escopo**: Matriz consolidada de problemas e tarefas priorizadas da auditoria  
**Data**: 16/09/2026 · **Status**: Concluído (Inventário de Auditoria — Modo Somente Leitura)

---

## 1. Tabela de Backlog Priorizado

| ID | Problema | Categoria | Severidade | Prioridade | Esforço | Dependências | Responsável | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Acesso irrestrito e ausência de autenticação na porta 3002 (A-01) | Segurança | Crítica | P1 | Médio | Decisão do método de autenticação | Antigravity + André | Aberto |
| **A11Y-001** | Inexistência de anel de foco visual para navegação assistiva por teclado | Acessibilidade | Crítica | P1 | Baixo | Nenhuma | Antigravity | Aberto |
| **A11Y-002** | Falha grave de contraste no acento ativo do Tema Claro (`#d97706` com 2.59:1) | Acessibilidade | Crítica | P1 | Muito Baixo | Nenhuma | Antigravity | Aberto |
| **UX-001** | Falha silenciosa de comandos físicos sem feedback de erro ao usuário | UX | Alta | P1 | Baixo | Nenhuma | Antigravity | Aberto |
| **RSP-001** | Alvo de toque de micro-pílulas anulado por ordem de cascata CSS (F-01) | Responsividade | Alta | P1 | Baixo | Nenhuma | Antigravity | Aberto |
| **RSP-002** | Dimensão de alvo tátil insuficiente no botão power compacto da TV (34px) | Responsividade | Alta | P1 | Baixo | Nenhuma | Antigravity | Aberto |
| **SEC-002** | Risco de superaquecimento: alternância cega da ventilação do PS5 pela Cena Gamer | Segurança | Alta | P1 | Muito Baixo | Nenhuma | Antigravity | Aberto |
| **FUN-001** | Mascaramento de falha física: dispositivos indisponíveis exibidos como desligados | Funcional | Média | P2 | Baixo | Nenhuma | Antigravity | Aberto |
| **FUN-002** | Conflito de concorrência e ricochete no seletor de modo do robô aspirador | Funcional | Média | P2 | Baixo | Nenhuma | Antigravity | Aberto |
| **UX-002** | Efeito de "Sticky Hover" persistente em telas de toque e painéis de parede | UX | Média | P2 | Baixo | Nenhuma | Antigravity | Aberto |
| **A11Y-003** | Ausência de contenção de foco (*Focus Trap*) em modais abertos via portal | Acessibilidade | Alta | P2 | Baixo | Nenhuma | Antigravity | Aberto |
| **TECH-001** | Componentes gigantes monolíticos com excesso de responsabilidades (`MediaHubModal` / `EnergyWidget`) | Código | Média | P2 | Médio | Nenhuma | Antigravity | Aberto |
| **TECH-002** | Scripts de linting quebrados e ausência de ESLint no Next 16 | Código | Média | P2 | Baixo | Nenhuma | Antigravity | Aberto |
| **VIS-001** | Dispersão descontrolada de valores de `box-shadow` fora do Design System (124 sombras) | Visual | Baixa | P3 | Baixo | Nenhuma | Antigravity | Aberto |
| **VIS-002** | Incoerência tipográfica com valor fracionário (`11.5px`) em pílula de alerta | Visual | Baixa | P3 | Muito Baixo | Nenhuma | Antigravity | Aberto |

---

## 2. Legenda de Classificação

* **Prioridade P1 (Crítica / Bloqueador)**: Correções de segurança perimetral, acessibilidade normativa e ergonomia física essenciais para a estabilidade da residência.
* **Prioridade P2 (Média / Qualidade)**: Consistência de comportamento, manutenibilidade de código e eliminação de artefatos visuais espúrios em telas táteis.
* **Prioridade P3 (Baixa / Higiene)**: Ajustes estéticos finos, padronização de sombras e limpeza de resíduos técnicos legados.
