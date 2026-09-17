# Inventário Visual de Componentes (02-visual-component-inventory.md)

**Documento**: `artifacts/audit/02-visual-component-inventory.md`  
**Escopo**: Catálogo visual detalhado de todos os 24 componentes da interface  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Tabela Geral de Componentes e Tratamento de Estados

A matriz abaixo audita o suporte nativo no código a estados fundamentais de interface:

| Componente | Localização | Linhas | Loading | Erro | Vazio | Offline | Indisp. | Disabled | Focus-Vis |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `MediaHubModal` | `components/MediaHubModal.tsx` | 1156 | ✅ Sim | ❌ Não | ✅ Sim | ❌ Não | ❌ Não | ✅ Sim | ❌ Não |
| `EnergyWidget` | `components/EnergyWidget.tsx` | 839 | ❌ Não | ❌ Não | ✅ Sim | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `VacuumWidget` | `components/VacuumWidget.tsx` | 622 | ✅ Sim | ✅ Sim | ❌ Não | ✅ Sim | ✅ Sim | ✅ Sim | ❌ Não |
| `RoomPopup` | `components/RoomPopup.tsx` | 418 | ❌ Não | ❌ Não | ✅ Sim | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `AmbientNightMode` | `components/AmbientNightMode.tsx` | 377 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `RoomCard` | `components/RoomCard.tsx` | 375 | ❌ Não | ❌ Não | ✅ Sim | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `LightDimmerModal`| `components/LightDimmerModal.tsx`| 375 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `TvAppLogos` | `components/TvAppLogos.tsx` | 335 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `WeatherForecastModal`| `components/WeatherForecastModal.tsx`| 306 | ✅ Sim | ❌ Não | ✅ Sim | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `HeaderQuickActions` | `components/HeaderQuickActions.tsx`| 303 | ✅ Sim | ❌ Não | ❌ Não | ✅ Sim | ❌ Não | ❌ Não | ❌ Não |
| `DeviceTile` | `components/DeviceTile.tsx` | 283 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ✅ Sim | ✅ Sim | ❌ Não |
| `TodoListWidget` | `components/TodoListWidget.tsx` | 281 | ✅ Sim | ❌ Não | ✅ Sim | ❌ Não | ❌ Não | ✅ Sim | ✅ Sim |
| `BatteryAlertsBar` | `components/BatteryAlertsBar.tsx`| 260 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| `WeatherWidget` | `components/WeatherWidget.tsx` | 244 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `TvRemoteWidget` | `components/TvRemoteWidget.tsx` | 220 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `SmartTruncateText`| `components/SmartTruncateText.tsx`| 180 | — | — | — | — | — | — | — |
| `SecurityAlertsBar`| `components/SecurityAlertsBar.tsx`| 172 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `FanControlCard` | `components/FanControlCard.tsx` | 147 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ✅ Sim | ❌ Não |
| `QuickScenesPanel`| `components/QuickScenesPanel.tsx`| 124 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `HealthWidget` | `components/HealthWidget.tsx` | 62 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `Clock` | `components/Clock.tsx` | 43 | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `DeviceButton` | `components/DeviceButton.tsx` | 35 | ✅ Sim | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ✅ Sim | ❌ Não |
| `MusicAssistantAudioSink`| `components/MusicAssistantAudioSink.tsx`| 32 | — | — | — | — | — | — | — |
| `icons` | `components/icons.tsx` | 297 | — | — | — | — | — | — | — |

---

## 2. Inconsistências Estruturais Identificadas no Inventário

1. **Ausência Universal de Feedback de Erro**: Apenas o `VacuumWidget` trata estados visuais de erro com mensagem legível. 23 dos 24 componentes falham silenciosamente perante a interface do usuário em caso de quebra de rede.
2. **Duplicação Estrita**: `SecurityAlertsBar` e `BatteryAlertsBar` são o mesmo componente duplicado em dois arquivos físicos com 432 linhas somadas.
3. **Componente Descontinuado**: `DeviceButton.tsx` (35 linhas) é uma variante órfã que não é importada em nenhuma tela ativa do App Router.
