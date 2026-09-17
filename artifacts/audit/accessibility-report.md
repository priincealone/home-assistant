# Relatório de Auditoria de Acessibilidade Digital (Fase 7)

**Documento**: `artifacts/audit/accessibility-report.md`  
**Escopo**: Painel de Automação Residencial (`dashboard-app`)  
**Data**: 16/09/2026 · **Status**: Concluído (Modo Somente Leitura — sem alteração de código)  
**Referência Normativa**: WCAG 2.1 Nível AA / AAA e WAI-ARIA 1.2

---

## 1. Visão Geral da Auditoria de Acessibilidade

Um painel de automação residencial comanda o ambiente físico da casa (iluminação, portas, climatização e eletrodomésticos). Barreiras de acessibilidade em um sistema doméstico não representam apenas desconforto estético, mas impedimento real de controle do próprio espaço físico por pessoas com deficiência motora, baixa visão ou usuários operando exclusivamente por teclado ou comandos assistivos.

Esta auditoria inspecionou rigorosamente a semântica do DOM, a navegação via teclado (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`), a visibilidade do foco, a árvore de acessibilidade exposta aos leitores de tela e os requisitos de ergonomia física.

---

## 2. Matriz de Avaliação WCAG 2.1

| Critério de Sucesso | Requisito WCAG | Veredito | Diagnóstico Técnico |
| :--- | :--- | :---: | :--- |
| **1.1.1 Conteúdo Não Textual** | Nível A | **Aprovado** | Quase todos os SVGs decorativos possuem `aria-hidden="true"`; botões sem texto explícito possuem `aria-label` ou `title`. |
| **1.3.1 Informações e Relações** | Nível A | ⚠️ **Parcial** | Há saltos injustificados na hierarquia de títulos (ex.: de `h1` direto para `h3` ou `h4` em modais e subcards). |
| **1.4.3 Contraste Mínimo** | Nível AA | ❌ **Reprovado** | O tema claro falha severamente com `--on-accent: #d97706` (2.59:1 contra o canvas `#e2e8f4`, mínimo de 4.5:1). |
| **2.1.1 Teclado Universal** | Nível A | ⚠️ **Parcial** | A maioria das ações abre via `Enter`/`Space` e fecha via `Escape`, mas modais não possuem armadilha de foco (*focus trap*). |
| **2.4.3 Ordem do Foco** | Nível A | ⚠️ **Parcial** | Ao abrir modais em portais, o foco não é transferido programaticamente para a janela ativa. |
| **2.4.7 Foco Visível** | Nível AA | ❌ **Reprovado** | **Apenas 1 seletor de `:focus-visible` em 10.430 linhas de CSS**. A navegação por teclado é invisível na quase totalidade dos cards e botões. |
| **2.5.5 Tamanho do Alvo de Toque** | Nível AAA | ❌ **Reprovado** | Três controles críticos mediram entre **34px e 36px** (`.security-micro-pill`, `.battery-micro-pill`, `.tv-compact-power`), violando o piso de 44px. |
| **4.1.2 Nome, Função, Valor** | Nível A | ⚠️ **Parcial** | Controles customizados (ex.: `RoomCard`) usam `role="button"` e `aria-label` dinâmico, mas sliders e switches nativos precisam de `aria-valuenow` / `aria-checked`. |

---

## 3. Testes Práticos de Navegação Assistiva e Teclado

### 3.1. Navegação com Tecla `Tab` e `Shift + Tab`
* **Resultado**: O tabulador percorre os botões de ação rápida no topo e os cards de cômodo na grade.
* **Problema Crítico**: Como não há contorno visual de foco (`outline: none` padrão em muitos elementos sem substituição de estilo), o usuário que navega sem mouse **não sabe onde o cursor está posicionado**. O foco existe no DOM, mas é imperceptível na tela.

### 3.2. Acionamento via `Enter` e `Space`
* **Resultado**: `RoomCard.tsx` e `TodoListWidget.tsx` tratam explicitamente `onKeyDown`:
  ```tsx
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpenRef.current();
  }
  ```
  Isso garante que um usuário cego ou sem mouse consiga abrir os ambientes e confirmar tarefas pendentes.

### 3.3. Comportamento da Tecla `Escape`
* **Resultado**: **100% dos modais** (`RoomPopup`, `MediaHubModal`, `EnergyWidget`, `VacuumWidget`, `TodoListWidget`, `WeatherForecastModal`, `BatteryAlertsBar`) escutam o evento `keydown` global e fecham a sobreposição graciosamente, restaurando o scroll do documento.
* **Comportamento Aninhado**: No `RoomPopup`, se o submodal do dimmer estiver aberto, o primeiro `Escape` fecha apenas o dimmer e o segundo fecha o cômodo.

### 3.4. Gestão de Foco em Modais (Ausência de Focus Trap)
* **Falha Identificada**: Quando um modal é aberto via `createPortal`, o foco do teclado continua circulando pelos elementos de fundo da página principal (`page.tsx`) que estão atrás do backdrop escuro.
* **Impacto**: Usuários de leitor de tela (NVDA, JAWS, VoiceOver) continuam lendo botões de outros cômodos mesmo com a central do aspirador ou da TV em primeiro plano.

---

## 4. Análise de Hierarquia Semântica de Headings

A auditoria nos arquivos `.tsx` revelou a seguinte distribuição de níveis de título:

```
┌─────────────────────────────────────────────────────────────┐
│ PÁGINA PRINCIPAL (app/page.tsx)                             │
│  ├── <h1> "Casa do André" (dashboard-title)                 │
│  └── <h2> "Ambientes da Casa" (section-title)               │
└─────────────────────────────────────────────────────────────┘
  │
  ├──► MODAIS ABERTOS VIA PORTAL
  │     ├── <RoomPopup>: <h2> "{Nome do Cômodo}" (popup-title)
  │     ├── <WeatherForecastModal>: <h2> "Previsão do Tempo" (popup-title)
  │     ├── <VacuumWidget>: <h2> "Central do Robô Aspirador" (popup-title)
  │     ├── <TodoListWidget>: <h2> "Lista de Compras" (popup-title)
  │     ├── <BatteryAlertsBar>: <h3> "Baterias & Sensores" ⚠️ [Salto hierárquico]
  │     ├── <SecurityAlertsBar>: <h3> "Segurança & Perímetro" ⚠️ [Salto hierárquico]
  │     └── <LightDimmerModal>: <h3> "Ajuste de Luz" ⚠️ [Salto hierárquico]
```

* **Diagnóstico**: `BatteryAlertsBar` e `SecurityAlertsBar` empregam a tag `<h3>` diretamente dentro de seu cabeçalho de modal, pulando o nível semântico `<h2>`. Todos os títulos de modais de nível raiz devem adotar a tag `<h2>`.

---

## 5. Leitores de Tela e Nomes Acessíveis

### 5.1. Boas Práticas Encontradas
* O `RoomCard` sintetiza perfeitamente o estado do ambiente para a árvore de acessibilidade:
  ```tsx
  aria-label={`${comodo.nome}, ${quantosLigados} de ${totalPontos} luzes acesas`}
  ```
* O botão de toggle rápido de cômodo possui labels alternadas claras:
  `"Acender luzes de Sala de Estar"` vs. `"Apagar luzes de Sala de Estar"`.

### 5.2. Omissões de Nomes Acessíveis
* Foram identificados botões secundários com texto dinâmico que não expõem contexto completo para cegos (ex.: botões de velocidade de ventilador que anunciam apenas `"1"`, `"2"`, `"3"` em vez de `"Velocidade 1 do Ventilador da Sala"`).
* O seletor de tema no cabeçalho não possui texto visual, dependendo exclusivamente de SVG. Possui `aria-label`, mas botões de navegação lateral em `comodo/[id]` carecem de rótulo acessível consistente.

---

## 6. Preferência por Movimento Reduzido (`prefers-reduced-motion`)

* O arquivo `globals.css` possui blocos `@media (prefers-reduced-motion: reduce)` (linhas 4520 e 4610) que neutralizam animações pesadas de radar (`.radio-pulse-ring`) e giros contínuos de ventilador (`.ambient-fan-spin`).
* **Diagnóstico**: Aprovado. Respeita usuários propensos a náuseas e vertigens vestibulares.

---

## 7. Matriz de Correções Priorizadas de Acessibilidade

| ID | Área | Requisito WCAG | Diagnóstico | Proposta de Correção | Prioridade |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **A11Y-01** | Foco Teclado | 2.4.7 (AA) | Quase zero visibilidade de foco no CSS | Implementar `:focus-visible` global com anel `#38bdf8` de 2px | **Crítica** |
| **A11Y-02** | Contraste | 1.4.3 (AA) | Cor de acento tema claro `#d97706` com 2.59:1 | Ajustar para tom mais escuro (`#b45309`, 4.08:1 ou escuro 4.5:1) | **Crítica** |
| **A11Y-03** | Alvos Táteis | 2.5.5 (AAA) | 3 botões com dimensão de 34px a 36px | Resolver cascata CSS e fixar `min-height: 44px; min-width: 44px` | **Alta** |
| **A11Y-04** | Modais | 2.4.3 (A) | Ausência de Focus Trap em diálogos | Conter o foco de Tab dentro do modal aberto via hook/portal | **Alta** |
| **A11Y-05** | Headings | 1.3.1 (A) | Saltos para `<h3>` e `<h4>` em modais de topo | Padronizar títulos primários de modais como `<h2>` | Média |
