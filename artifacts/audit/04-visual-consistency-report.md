# Relatório de Consistência Visual (04-visual-consistency-report.md)

**Documento**: `artifacts/audit/04-visual-consistency-report.md`  
**Escopo**: Comparação de anatomia e componentes equivalentes  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Principais Inconsistências Mapeadas

1. **Botões de Fechar Modal (`Close Button`)**:
   - `RoomPopup`, `BatteryAlertsBar` e `EnergyWidget` utilizam ícone vetorial SVG com traço `2.5px`;
   - `MediaHubModal`, `TodoListWidget`, `VacuumWidget` e `WeatherForecastModal` utilizam o caractere tipográfico cru `"✕"` (unicode U+2715);
   - Tamanhos variam de 32px a 36px.
   - *Padrão Correto*: Botão com ícone SVG intrínseco e alvo tátil de **44px × 44px**.

2. **Micro-Pílulas do Cabeçalho (`SecurityAlertsBar` vs. `BatteryAlertsBar`)**:
   - Componentes duplicados que sofrem a anulação por cascata CSS (**F-01**), operando a 36px em vez dos 44px necessários.
   - Tipografia fracionária no Security (`11.5px`) contra inteira no Battery (`12px`).
   - *Padrão Correto*: Unificação no componente `HeaderAlertPill` com `--font-caption` (`12px`).

3. **Cards Compactos da Barra Diária (`daily-panorama-bar`)**:
   - `WeatherWidget` e `VacuumWidget` fixam altura em 84px com box circular de ícone; `TodoListWidget` usa altura variável e cantos de 10px; `EnergyWidget` desenha sparkline SVG dinâmica na base.
   - *Padrão Correto*: Layout estrutural de **88px** (desktop) e **76px** (mobile) com anatomia padronizada `.daily-widget-card`.

4. **Hierarquia de Elevação e Sombras**:
   - Presença de 124 sombras distintas declaradas ad-hoc.
   - *Padrão Correto*: Consolidação em 4 níveis físicos de radiação e elevação do Liquid Glass.
