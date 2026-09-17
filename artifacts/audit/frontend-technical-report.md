# Relatório de Auditoria Técnica de Frontend (Fase 8)

**Documento**: `artifacts/audit/frontend-technical-report.md`  
**Escopo**: Código fonte de `dashboard-app` (Next.js 16 App Router + React 19 + Tailwind v4)  
**Data**: 16/09/2026 · **Status**: Concluído (Modo Somente Leitura — sem alteração de arquivos)

---

## 1. Visão Geral da Auditoria Técnica

Esta auditoria realizou uma varredura forense estática em busca de fragilidades arquiteturais, potenciais *memory leaks*, anti-padrões de renderização no React 19, tratamento de promessas assíncronas, higiene de dependências e segurança do cliente.

---

## 2. Diagnóstico por Área Técnica

### 2.1. Componentes Gigantes e Acoplamento de Responsabilidades
* **`MediaHubModal.tsx` (1.156 linhas)**:
  - *Problema*: Concentra em um único arquivo a renderização do controle remoto físico da TV Samsung, o discador tático do PS5, a lista de 12 aplicativos de streaming com gradientes inline, o reprodutor de mídia do Music Assistant com WebSocket sob demanda, sliders de volume e atalhos da cena gamer.
  - *Impacto*: Dificulta a manutenção, aumenta o custo de re-renderização e impede testes unitários isolados.
* **`EnergyWidget.tsx` (839 linhas)**:
  - *Problema*: Combina a matemática vetorial de cálculo de splines SVG, manipulação de toque e arraste (*scrubbing* temporal de 24h), cálculo de custo em Reais (`R$ 0,85/kWh`) e o gerenciamento de modais das 5 tomadas físicas.
* **`VacuumWidget.tsx` (622 linhas)**:
  - *Problema*: Combina modos de sucção, catálogo de zonas da casa, cálculo de vida útil de peças e interface compacta de cabeçalho.

### 2.2. Lógica e Componentes Duplicados
* **`SecurityAlertsBar.tsx` (172 linhas) × `BatteryAlertsBar.tsx` (260 linhas)**:
  - Compartilham 90% da estrutura JSX: micro-pílula de status, manipulação de `createPortal`, fechamento por timeout de 200ms e lista de cards internos. O próprio CSS já agrupa os seletores.
* **`DeviceButton.tsx` (35 linhas) vs. `DeviceTile.tsx` (283 linhas)**:
  - `DeviceButton` é um resíduo sem uso que não trata indisponibilidade.
* **Rotinas de Fechamento de Modais**:
  - A lógica `document.body.style.overflow = "hidden"` e escuta da tecla `Escape` é implementada repetidamente de forma manual em 6 modais distintos em vez de encapsulada em um hook canônico (ex.: `useModalDismiss`).

### 2.3. Requisições, Polling e Falta de AbortController Centralizado
* **Polling Concorrente**:
  - `app/page.tsx` executa polling a cada 5s chamando `/api/state` (com `AbortController` e timeout de 4.5s);
  - Simultaneamente, `TodoListWidget` roda polling próprio a cada 15s (`/api/todo`);
  - `TvRemoteWidget` roda polling a cada 6s (`/api/mass`);
  - `EnergyWidget` roda polling a cada 30s (`/api/energy`).
  - *Diagnóstico*: Embora pausados via `visibilityState`, a ausência de um barramento unificado faz com que múltiplos componentes disparem requisições simultâneas em intervalos desencontrados.
* **Falta de AbortController em Ações Pontuais**:
  - Os comandos em `TvRemoteWidget` (`comando(cmd)`), `TodoListWidget` (`alternarStatus`), e `VacuumWidget` (`enviarComando`) disparam `fetch()` direto sem cancelamento caso o componente seja desmontado durante o voo da requisição.

### 2.4. Race Conditions e Travas Otimistas
* **Ponto Positivo**: O `travasOtimistasRef` com TTL de 5.000ms e rollback automático em 2 ciclos com recusa háptica (`dispararHaptico([45, 60, 45])`) em `page.tsx` é uma solução engenhosa contra a latência dos relés Tuya.
* **Ponto Fraco**: A mesma proteção de travas otimistas **não está presente** no `VacuumWidget` nem no `TodoListWidget`. No aspirador, se o usuário alternar o modo de sucção e o polling responder antes da confirmação do robô na nuvem, o seletor sofre ricochete momentâneo.

### 2.5. Memory Leaks e Higiene de Event Listeners
* **Varredura de Listeners**:
  - Foram auditados os pares de `addEventListener` e `removeEventListener` em todos os componentes.
  - `app/page.tsx`, `AmbientNightMode.tsx`, `HeaderQuickActions.tsx` e os modais limpam corretamente seus listeners de janela (`online`, `offline`, `visibilitychange`, `fullscreenchange`, `keydown`).
* **Timer Residual em `HeaderQuickActions`**:
  - Os timers do hold de segurança de 800ms (`timerRef`, `intervaloRef`, `dicaTimerRef`) são limpos no `useEffect` de desmontagem. Aprovado.

### 2.6. Erros Silenciosos e Falta de Observabilidade
* **Blocos `catch {}` Vazios**:
  - Em `TvRemoteWidget.tsx:65`: o polling do Music Assistant engole qualquer erro silenciosamente (`catch { // Silencioso }`).
  - Em `WeatherForecastModal.tsx:86`: falhas no endpoint `/api/weather` caem em `catch { // Silencioso em caso de falha de rede }` sem notificar a interface.
  - Em `lib/wakeLock.ts`: falhas ao obter o wake lock são ignoradas sem log ou aviso visual.
* **Impacto**: Falhas de integração na rede local deixam a interface congelada com dados velhos sem indicar a causa da desconexão.

### 2.7. Qualidade de Código, Lint e Testes
* **Inexistência de Análise Estática**: Não há ESLint configurado nem dependência instalada. O comando `npm run lint` falha imediatamente por conta da remoção do `next lint` no Next 16.
* **Ausência Total de Testes**: Não existem testes unitários (`vitest`/`jest`) para funções puras determinísticas como `calcularSplineSvg` ou `resolverChips`, nem testes de contrato de entidade.

### 2.8. Dependências, Assets e Performance
* **Dependências Ociosas**: O pacote `lucide-react` está instalado no `package.json`, mas a maior parte dos ícones utilizados no projeto é implementada artesanalmente em SVG puro dentro de `app/components/icons.tsx`.
* **Tokens Zumbis**: 32 variáveis CSS em `oklch` legadas de scaffolds de shadcn poluem o `:root` de `globals.css`.
* **Acesso Seguro ao `localStorage`**: O `ThemeContext.tsx` encapsula as chamadas a `localStorage.getItem` e `setItem` dentro de blocos `try / catch`, prevenindo crashes no Safari / iOS em modo anônimo.

---

## 3. Matriz Consolidada de Riscos Técnicos

| ID | Categoria | Achado | Causa Raiz | Severidade |
| :--- | :--- | :--- | :--- | :---: |
| **TEC-01** | Testes | Zero testes automatizados no projeto | Sem framework de teste configurado | **Alta** |
| **TEC-02** | Linting | `npm run lint` quebrado | Falta de ESLint instalado no Next 16 | **Alta** |
| **TEC-03** | Arquitetura | Monólitos `MediaHubModal` e `EnergyWidget` | Apresentação, SVG e rede no mesmo arquivo | **Média** |
| **TEC-04** | Rede | Múltiplos pollings assíncronos desordenados | Falta de SWR / React Query ou Context unificado | **Média** |
| **TEC-05** | Resiliência | Blocos `catch {}` silenciosos em 4 widgets | Falta de barramento global de notificações | **Média** |
| **TEC-06** | Duplicação | Código idêntico entre Security e Battery Bars | Duplicação de arquivos e classes | Baixa |
| **TEC-07** | Bundle | `lucide-react` instalado sem adoção consistente | Dependência concorrente com `icons.tsx` | Baixa |
