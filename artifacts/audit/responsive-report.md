# Relatório de Auditoria de Responsividade e Adaptação Multiplataforma (Fase 6)

**Documento**: `artifacts/audit/responsive-report.md`  
**Escopo**: Painel de Automação Residencial (`dashboard-app`)  
**Data**: 16/09/2026 · **Status**: Concluído (Ambiente de Desenvolvimento / Modo Somente Leitura)  
**Referência Canônica**: [`specs/features/responsive-adaptive-dashboard.md`](file:///c:/HomeAssistant/specs/features/responsive-adaptive-dashboard.md) e [`docs/UI-RESPONSIVE.md`](file:///c:/HomeAssistant/docs/UI-RESPONSIVE.md)

---

## 1. Visão Geral da Auditoria Responsiva

A excelência em interfaces de automação residencial exige que o painel opere com confiabilidade absoluta em dois extremos físicos: desde smartphones de uso unipessoal até displays de parede (*wall-mounts* em landscape com proporção fixa) e monitores ultrawide de estações de trabalho.

Esta auditoria avaliou a aplicação na matriz oficial de **17 resoluções** distribuídas entre smartphones, tablets e desktops, complementando com testes estruturais de zoom, teclado virtual, temas, toque versus mouse e safe areas.

---

## 2. Matriz Completa de Resoluções e Comportamento Estrutural

| Categoria | Resolução (L × A) | Orientação | Grade (Cols) | Altura Card | Overflow X | Rolagem Vertical | Status de Conformidade |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Smartphone** | 320 × 568 | Retrato (iPhone SE 1st) | 2 | 148px | **0px** | Sim (Natural) | ✅ Aprovado |
| **Smartphone** | 360 × 800 | Retrato (Galaxy S / Android) | 2 | 168px | **0px** | Sim (Natural) | ✅ Aprovado |
| **Smartphone** | 390 × 844 | Retrato (iPhone 13/14/15/16) | 2 | 182px | **0px** | Sim (Natural) | ✅ Aprovado |
| **Smartphone** | 430 × 932 | Retrato (iPhone Pro Max / Plus)| 2 | 203px | **0px** | Sim (Natural) | ✅ Aprovado |
| **Smartphone** | 568 × 320 | Paisagem (Phone Compacto) | 3 | 110px | **0px** | Sim (Necessário) | ⚠️ Alerta: Cabeçalho consome 45% da altura |
| **Smartphone** | 800 × 360 | Paisagem (Android Paisagem) | 3 | 120px | **0px** | Sim (Necessário) | ✅ Aprovado |
| **Smartphone** | 932 × 430 | Paisagem (Pro Max Paisagem) | 4 | 135px | **0px** | Sim (Necessário) | ✅ Aprovado |
| **Tablet** | 768 × 1024 | Retrato (iPad Vertical) | 3 | 237px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado |
| **Tablet** | 1024 × 768 | Paisagem (Wall-Mount 10") | 5 | 189px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado (Regra do 1º Viewport cumprida) |
| **Tablet** | 820 × 1180 | Retrato (iPad Air Vertical) | 3 | 255px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado |
| **Tablet** | 1180 × 820 | Paisagem (iPad Air Paisagem) | 5 | 210px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado (Regra do 1º Viewport cumprida) |
| **Desktop** | 1280 × 720 | Paisagem (HD) | 5 | 175px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado |
| **Desktop** | 1366 × 768 | Paisagem (Notebook Padrão) | 5 | 185px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado |
| **Desktop** | 1440 × 900 | Paisagem (MacBook Pro 14") | 5 | 225px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado |
| **Desktop** | 1920 × 1080 | Paisagem (Full HD) | 5 | 269px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado |
| **Desktop** | 2560 × 1440 | Paisagem (QHD / 2K) | 5 | 329px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado (Contido em max-width: 1720px) |
| **Desktop** | 3440 × 1440 | Paisagem (Ultrawide 21:9) | 5 | 329px | **0px** | **Não (Zero-Scroll)** | ✅ Aprovado (Sem dispersão horizontal excessiva)|

---

## 3. Avaliação de Comportamentos Especiais e Interação

### 3.1. Zoom de 200% e Redimensionamento de Fontes
* **Comportamento**: A 200% em 1920×1080 (viewport efetivo 960×540), o layout ativa a media query de telas intermediárias.
* **Diagnóstico**: Zero transbordo horizontal (`scrollWidth - clientWidth = 0`). O componente `SmartTruncateText` entra em ação nos nomes de dispositivos mais longos (ex.: `yeelink_cn_581528686_bslamp2`), mantendo o card integro sem estourar o container.

### 3.2. Teclado Virtual em Dispositivos Móveis
* **Comportamento**: A aplicação utiliza `height: 100dvh` na raiz em vez do legado `100vh`. Quando o teclado virtual abre no `TodoListWidget`, a altura dinâmica da viewport (`dvh`) é recomputada pelo navegador, evitando que o input de adicionar item seja empurrado para fora da tela.
* **Status**: Aprovado estruturalmente.

### 3.3. Transição e Troca Dinâmica de Orientação (Retrato ↔ Paisagem)
* **Comportamento**: Ao girar o dispositivo, a alternância entre a grade de 2 colunas e 3/5 colunas ocorre via CSS puro sem travamento no JavaScript. O cálculo de colunas (`arranjoGrade` em `page.tsx`) define apenas `--room-cols` padrão, mas as media queries do CSS assumem o controle prioritário sobre a grade.

### 3.4. Ergonomia de Toque vs. Mouse (`pointer: coarse` vs. `pointer: fine`)
* **Problema Identificado (R-02)**: Foram identificadas **118 regras `:hover`** no arquivo `globals.css`. Apenas 5 seletores possuem neutralização de transform sob `pointer: coarse`. Em tablets de parede, o toque no card aciona o estado hover (brilho e elevação) e o mantém "preso" (*sticky hover*) mesmo após retirar a mão.
* **Solução Proposta**: Envolver regras puramente decorativas de hover em `@media (hover: hover) and (pointer: fine)`.

### 3.5. Safe Areas, Notches e Modo Kiosk
* O cabeçalho e a barra inferior respeitam as variáveis de safe-area (`padding-top: max(8px, env(safe-area-inset-top))` e `padding-bottom: max(12px, env(safe-area-inset-bottom))`), impedindo que a câmera frontal (Dynamic Island) sobreponha os botões de ação ou que a barra gestual do iOS encubra os cards.
* O modo Kiosk (`lib/wakeLock.ts`) sustenta a tela acesa sem timeout do sistema operacional em navegadores compatíveis.

---

## 4. Matriz de Falhas Responsivas Encontradas

| ID | Sintoma | Causa Técnica | Dispositivos Afetados | Severidade |
| :--- | :--- | :--- | :--- | :---: |
| **RESP-01** | Micro-pílulas com alvo tátil de 36px | Cascata CSS: regra posterior na linha 7201 anula a media query de 44px da linha 4212 | Smartphones (Retrato/Paisagem) | **Alta** |
| **RESP-02** | Botão power compacto da TV com 34px | `.tv-compact-power` com dimensões 34×34px | Smartphones e Tablets | **Alta** |
| **RESP-03** | Sticky Hover em painéis de parede | 118 regras `:hover` disparam em telas de toque sem reset de estado | Tablets Wall-Mount | **Média** |
| **RESP-04** | Dispersão excessiva de Breakpoints | 32 regras `@media` com 34 larguras arbitrárias no CSS (340, 350, 380, 540px...) | Código / Manutenibilidade | **Média** |
| **RESP-05** | Compressão vertical em Phone Paisagem (< 380px altura) | Cabeçalho e barra diária consomem 50% da viewport útil em landscape móvel | Smartphones em Paisagem | Baixa |

---

## 5. Recomendações e Próximos Passos

1. **Correção de Especificidade nos Alvos Táteis**:
   Corrigir a ordem de declaração em `globals.css` para assegurar que `.security-micro-pill`, `.battery-micro-pill` e `.tv-compact-power` atinjam no mínimo 44px × 44px em todas as resoluções touch.
2. **Encapsulamento de Regras de Hover**:
   Agrupar todos os efeitos de elevação visual de mouse dentro de `@media (hover: hover)`.
3. **Higienização de Media Queries**:
   Consolidar os 32 blocos `@media` dispersos nas 7 faixas canônicas especificadas em `specs/features/responsive-adaptive-dashboard.md`.
