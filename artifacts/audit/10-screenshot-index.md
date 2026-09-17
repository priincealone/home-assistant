# Índice de Evidências Visuais e Estados (10-screenshot-index.md)

**Documento**: `artifacts/audit/10-screenshot-index.md`  
**Escopo**: Mapeamento de telas renderizadas, matriz de evidências visuais e registros numéricos  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Mapeamento de Telas e Evidências Registradas

| Tela / Estado | Viewport / Orientação | Rota / Componente | Evidência / Registro Forense | Status |
| :--- | :---: | :--- | :--- | :---: |
| **Painel Principal (Desktop 1080p)** | 1920 × 1080 Landscape | `app/page.tsx` | HTTP 200 (65.577 bytes renderizados). Grade de 10 cômodos (5x2), cabeçalho com relógio e 5 widgets em panorama. Zero-scroll ativo. | ✅ Confirmado |
| **Painel de Parede (Tablet 10")** | 1024 × 768 Landscape | `app/page.tsx` | HTTP 200. Regra do 1º Viewport confirmada (`scrollHeight <= innerHeight`). Cards com 189px de altura útil. | ✅ Confirmado |
| **Mobile Padrão (iPhone Retrato)** | 390 × 844 Portrait | `app/page.tsx` | HTTP 200. Grade de 2 colunas com cards de 182px; zero transbordo lateral (`overflow-x: 0px`). Alvos táteis com 36px registrados no cabeçalho. | ⚠️ Alerta F-01 |
| **Subpágina Cômodo (Sala)** | 1920 × 1080 Landscape | `app/comodo/sala_de_estar` | HTTP 200 (26.584 bytes). Cabeçalho com liquid glass ativo, navegação lateral e listagem completa dos 8 dispositivos da sala. | ✅ Confirmado |
| **Standby Noturno (OLED)** | 1024 × 768 Landscape | `app/standby/page.tsx` | HTTP 200 (16.163 bytes). Relógio digital atenuado em `#07090e`, métricas de segurança e resumo térmico em baixa emissão. | ✅ Confirmado |
| **Modal Central de Mídia** | 1024 × 768 Landscape | `MediaHubModal.tsx` | Diálogo centralizado via portal com abas TV/Streaming, D-Pad tátil e controle de volume. Fechamento via Escape testado. | ✅ Confirmado |
| **Modal Controle de Energia** | 1024 × 768 Landscape | `EnergyWidget.tsx` | Spline SVG contínua com gradiente proporcional e controle individual das 5 tomadas inteligentes. | ✅ Confirmado |
| **Central do Aspirador** | 1024 × 768 Landscape | `VacuumWidget.tsx` | Seletor de modos de sucção por decibéis, botão de localização sonora e métricas de vida útil de escovas/filtro. | ✅ Confirmado |

---

## 2. Registro de Medições Numéricas de Não-Conformidade

1. **Evidência F-01 (Alvo Tátil Anulado)**:
   - Medição computada no seletor `.security-micro-pill`: **36px** (mesmo sob `@media (max-width: 640px)`).
2. **Evidência A-01 (Contraste no Tema Claro)**:
   - Medição de luminância no par `#d97706` sobre `#e2e8f4`: **2.59:1** (Reprovado perante o mínimo WCAG de 4.5:1).
3. **Evidência A-02 (Invisibilidade de Foco)**:
   - Varredura de CSS: apenas 1 regra `:focus-visible` em 10.430 linhas de estilos.
