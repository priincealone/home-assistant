# Relatório de Acessibilidade Visual, Interação & WCAG (accessibility-visual-report.md)

**Documento**: `artifacts/visual-audit/accessibility-visual-report.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído (Fase 6)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Referência Normativa**: WCAG 2.1 (Níveis A, AA e AAA) e WAI-ARIA 1.2  
**Metodologia**: Análise heurística e laboratorial de contraste cromático, inspeção de árvore de acessibilidade (Accessibility Tree), testes de navegação por teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`), simulação de leitores de tela e verificação do princípio de redundância sensorial (não depender apenas de cor).

---

## 1. Scorecard Consolidado de Conformidade WCAG 2.1

A tabela a seguir sumariza os vereditos laboratoriais frente às diretrizes canônicas de acessibilidade da W3C:

| Critério de Sucesso | Nível | Resultado | Diagnóstico Técnico |
| :--- | :---: | :---: | :--- |
| **1.1.1 Conteúdo Não Textual** | A | ✅ **Aprovado** | SVGs decorativos protegidos por `aria-hidden="true"`; botões de ícone possuem `aria-label` descritivo. |
| **1.3.1 Informações e Relações** | A | ⚠️ **Parcial** | Salto indevido de heading: de `h1` diretamente para `h3` nos modais de bateria e segurança. |
| **1.4.1 Uso da Cor** | A | ⚠️ **Parcial** | Falha no estado `unavailable` (indisponível), que compartilha o mesmo cinza e opacidade do estado desligado (`off`). |
| **1.4.3 Contraste Mínimo (Texto)**| AA | ❌ **Reprovado** | Tema claro: acento âmbar ativo `#d97706` sobre fundo `#e2e8f4` produz razão de **2.59:1** (mínimo exigido: 4.5:1). |
| **1.4.11 Contraste Não Textual** | AA | ❌ **Reprovado** | Alertas de erro no tema claro `#dc2626` sobre `#e2e8f4` produzem **3.93:1**; bordas translúcidas operam com 1.28:1. |
| **2.1.1 Teclado Universal** | A | ⚠️ **Parcial** | Acionamentos via Enter/Space e cancelamentos via Escape funcionam, mas modais carecem de *Focus Trap*. |
| **2.3.3 Movimento Reduzido** | AAA | ✅ **Aprovado** | Regras `@media (prefers-reduced-motion: reduce)` neutralizam giros de ventilador e auras pulsantes. |
| **2.4.3 Ordem do Foco** | A | ⚠️ **Parcial** | Abertura de modais não transfere o foco de Tab programaticamente para o diálogo ativo; foco vaza para o fundo. |
| **2.4.7 Foco Visível** | AA | ❌ **Reprovado** | Ausência quase total de regras `:focus-visible` em 10.000+ linhas de CSS; foco por teclado é invisível. |
| **2.5.5 Tamanho do Alvo de Toque** | AAA | ❌ **Reprovado** | 3 botões medidos entre 34px e 36px (`.tv-compact-power`, `.security-micro-pill`, `.battery-micro-pill`), violando o piso de 44px. |
| **4.1.2 Nome, Função, Valor** | A | ⚠️ **Parcial** | Sliders de dimmer e interruptores nos subcards carecem de atributos dinâmicos `aria-valuenow` e `aria-checked`. |

---

## 2. Auditoria de Redundância Sensorial de Estados (Além da Cor Pura)

A norma WCAG (Critério 1.4.1) estipula que a cor **nunca deve ser o único meio visual** de transmitir informação, indicar uma ação, solicitar uma resposta ou distinguir um elemento visual. A matriz abaixo audita a presença de pistas redundantes (texto, ícones, números, padrões, posições e micro-animações):

| Estado do Sistema | Indicador Cromático | Pista Não-Cromática (Texto / Ícone / Padrão / Posição) | Acessibilidade / ARIA | Status de Conformidade |
| :--- | :--- | :--- | :--- | :---: |
| **Ligado (`on`)** | Aura âmbar viva (`#fbbf24`) | Badge numérico `"X/Y"` (ex: "2/2"), pílula ativa e texto explícito "Ligado" / "80%". | `aria-label="Sala, 2 de 2 luzes acesas"` | ✅ **Aprovado** |
| **Desligado (`off`)** | Cinza escuro translúcido | Badge `"0/Y"`, ausência de aura, texto "Desligado", switch na posição neutra. | `aria-label="Sala, 0 de 2 luzes acesas"` | ✅ **Aprovado** |
| **Alerta Perimétrico** | Vermelho / Âmbar | Ícone de triângulo com exclamação (`AlertTriangle`), contador textual `"2 alertas"`. | Modal lista nominalmente as portas abertas | ✅ **Aprovado** |
| **Erro de Autenticação**| Vermelho nos dots (`.is-error`)| Animação elástica de vibração (`.shake-fail`) e mensagem textual explícita de erro. | `aria-live="polite"` no texto de erro | ✅ **Aprovado** |
| **Erro de Rede (API)** | Reversão de cor silenciosa | **Nenhuma pista adicional**: não há toast, banner textual ou ícone de exclamação no card. | Nenhuma notificação para leitor de tela | ❌ **Reprovado** |
| **Rede Offline** | Pílula vermelha | Texto explícito `"Offline"`, ponto estático sem animação de pulso. | Texto visível no cabeçalho | ✅ **Aprovado** |
| **Hardware Indisponível**| Cinza translúcido | **Identidade visual idêntica ao estado desligado (`off`)**: mesmo ícone e opacidade. | Leitor de tela anuncia como apenas desligado | ❌ **Reprovado Crítico** |
| **Elemento Selecionado**| Borda iluminada ciano/âmbar| Texto em negrito, sublinhado ativo nas tabs, decibéis destacados nos modos de sucção. | `aria-selected="true"` nas tabs do MediaHub | ✅ **Aprovado** |
| **Elemento Desabilitado**| Opacidade atenuada (0.4) | Cursor desativado (`not-allowed`), atributo HTML `disabled`, texto explicativo "Standby". | `disabled` em botões de formulário | ⚠️ **Parcial** |

---

## 3. Registro Sistemático de Problemas de Acessibilidade

| ID | Componente | Condição Testada | Resultado | Evidência | Impacto | Correção Sugerida | Prioridade |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **A11Y-01** | Todos os botões e cards | Navegação assistiva via tecla `Tab` | ❌ **Reprovado** | Ao pressionar `Tab` na Home, o foco percorre o DOM mas nenhum contorno ou anel visual surge na tela (`outline: none`). | Usuários com deficiência motora ou baixa visão que dependem de teclado físico não conseguem saber onde o foco está. | Adicionar regra global `*:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }`. | **Crítica** |
| **A11Y-02** | Tema Claro (Geral) | Contraste de acento de iluminação | ❌ **Reprovado** | Medição matemática: `#d97706` sobre canvas `#e2e8f4` produz razão de **2.59:1** (violando o piso de 4.5:1 da WCAG AA). | Morador em ambiente iluminado pelo sol tem extrema dificuldade para enxergar contadores e lâmpadas ativas. | Comutar a variável do modo claro para `#b45309`, atingindo razão de **4.82:1** ✅. | **Crítica** |
| **A11Y-03** | Grade de Cômodos e Subcards | Dispositivo com queda física de sinal (`unavailable`) | ❌ **Reprovado** | O card mestre e o subcard exibem o mesmo cinza `rgba(255,255,255,0.35)` tanto para lâmpada apagada quanto para lâmpada desemparelhada. | O usuário é induzido a acreditar que o dispositivo está funcionando normalmente e apenas desligado. | Adicionar badge textual "Offline" e ícone com traço diagonal de desconexão (`WifiOff`). | **Alta** |
| **A11Y-04** | Modais em Portais (`MediaHub`, `RoomPopup`, etc.) | Gestão de foco com diálogo aberto | ⚠️ **Parcial** | Ao abrir um modal, a tecla `Tab` continua circulando pelos botões da página principal atrás do backdrop escuro. | O leitor de tela lê elementos invisíveis de fundo e o usuário de teclado perde a ordem lógica de navegação. | Implementar Focus Trap com restrição do tabulador dentro do contêiner `role="dialog"` ativo. | **Alta** |
| **A11Y-05** | Botão Power TV e Pílulas de Alerta | Tamanho do alvo de toque | ❌ **Reprovado** | `.tv-compact-power` mede `34px × 34px` e `.security-micro-pill` mede `36px` de altura. | Toques errôneos, cliques falsos e frustração motora em telas de parede e celulares. | Assegurar `min-width: 44px; min-height: 44px;` com `touch-action: manipulation`. | **Alta** |
| **A11Y-06** | Modais de Alerta e Baterias | Hierarquia semântica de títulos | ⚠️ **Parcial** | `BatteryAlertsBar` e `SecurityAlertsBar` pulam de `<h1>` direto para `<h3>` no cabeçalho do diálogo. | Leitores de tela anunciam quebra na árvore estrutural do documento para usuários cegos. | Padronizar todos os títulos primários de modais como `<h2>`. | **Média** |
| **A11Y-07** | Chamadas REST / Falhas de Comando | Feedback de falha operacional | ❌ **Reprovado** | Ao sofrer timeout ou recusa do relé físico, o painel reverte o botão em silêncio após 3.5s sem emitir aviso textual. | Usuário fica sem saber se a ordem foi recebida, se a lâmpada queimou ou se a rede caiu. | Emitir toast visual flutuante via `ToastContainer.tsx` com `role="alert"` e texto explicativo. | **Alta** |
| **A11Y-08** | Dimmer e Sliders Contínuos | Semântica de valor em tempo real | ⚠️ **Parcial** | O `<input type="range">` do `LightDimmerModal` não declara `aria-valuetext` formatado (ex: "80 por cento de brilho"). | Leitores de tela leem apenas o número cru "80" sem unidade compreensível. | Declarar `aria-valuenow={brilho}` e `aria-valuetext={`${brilho}% de brilho`}`. | **Média** |

---

## 4. Auditoria de Tecnologias Assistivas e Teclado

### A. Ativação e Teclas Especiais
* **`Escape` (100% Homologado)**: Todos os 10 modais escutam o evento `keydown` e fecham imediatamente a sobreposição.
* **`Enter` e `Space` (Homologado)**: Acionam o botão/card em foco com prevenção de rolagem indevida (`e.preventDefault()`).
* **Retorno de Foco Pós-Fechamento (Falha)**: Ao fechar qualquer modal com a tecla `Escape`, o foco do teclado não é devolvido ao elemento gatilho (o card ou pílula que o abriu), caindo no topo do `<body>`.

### B. Ampliação de Fonte e Zoom de 200%
* Sob zoom de 200%, a interface mantém a integridade estrutural básica graças ao uso de `clamp()` e fontes relativas (`rem`).
* No entanto, foram detectadas quebras pontuais de texto em 12 cards sem reticências (`text-overflow: ellipsis`), exigindo adoção universal do componente `SmartTruncateText`.

### C. Redução de Movimento (`prefers-reduced-motion: reduce`)
* O arquivo `globals.css` possui tratamento completo nas linhas 4520 e 4610. Usuários com preferência por redução de movimento têm animações contínuas de rotação de hélice de ventilador e pulso de radar desligadas automaticamente, prevenindo desconforto vestibular.
