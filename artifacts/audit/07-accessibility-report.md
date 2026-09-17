# Relatório de Acessibilidade Digital WCAG 2.1 (07-accessibility-report.md)

**Documento**: `artifacts/audit/07-accessibility-report.md`  
**Escopo**: Conformidade com WCAG 2.1 (Níveis AA / AAA) e WAI-ARIA 1.2  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Scorecard de Conformidade WCAG 2.1

| Critério | Nível | Resultado | Diagnóstico |
| :--- | :---: | :---: | :--- |
| **1.4.3 Contraste Mínimo** | AA | ❌ **Reprovado** | Tema claro: `--on-accent: #d97706` sobre `#e2e8f4` possui contraste de **2.59:1** (mínimo de 4.5:1). |
| **2.4.7 Foco Visível** | AA | ❌ **Reprovado** | Apenas 1 regra de `:focus-visible` em todo o CSS; navegação assistiva por teclado é invisível. |
| **2.5.5 Tamanho do Alvo de Toque**| AAA | ❌ **Reprovado** | 3 botões medidos entre 34px e 36px, violando o mínimo de 44px para painéis táteis. |
| **2.4.3 Ordem do Foco** | A | ⚠️ Parcial | Modais carecem de Focus Trap; a tecla Tab vaza para elementos atrás do backdrop. |
| **1.3.1 Informações e Relações**| A | ⚠️ Parcial | Salto de `h1` diretamente para `h3` em `BatteryAlertsBar` e `SecurityAlertsBar`. |
| **1.1.1 Conteúdo Não Textual** | A | ✅ Aprovado | SVGs decorativos protegidos por `aria-hidden="true"`. |
| **2.3.3 Movimento Reduzido** | AAA | ✅ Aprovado | Suporte completo a `@media (prefers-reduced-motion: reduce)`. |

---

## 2. Testes de Teclado e Navegação sem Mouse

* **Tecla `Escape`**: 100% dos modais escutam o evento e fecham graciosamente.
* **Tecla `Enter` e `Space`**: Tratam corretamente acionamento de cômodos e itens de lista.
* **Teclas `Tab` e `Shift+Tab`**: Navegam logicamente pelos elementos, porém a ausência de anel visual torna a experiência inviável para pessoas com baixa visão ou sem mouse.
