# Inventário de Telas e Navegação (01-screen-inventory.md)

**Documento**: `artifacts/audit/01-screen-inventory.md`  
**Escopo**: Mapeamento de rotas, layouts e fluxos de navegação do `dashboard-app`  
**Data**: 16/09/2026 · **Status**: Concluído

---

## 1. Mapeamento de Rotas do Next.js App Router

| Rota | Arquivo Físico | Tipo de Renderização | Finalidade e Conteúdo |
| :--- | :--- | :--- | :--- |
| `/` | `app/page.tsx` | Client Component (`"use client"`) | Painel tático principal: cabeçalho com relógio e status, deck de cenas, barra panorâmica de 5 widgets e grade de 10 cômodos. |
| `/comodo/[id]` | `app/comodo/[id]/page.tsx` | Client Component (`"use client"`) | Subpágina dedicada do ambiente selecionado: navegação lateral entre cômodos, lista completa de atuadores, dimmer e sensores. |
| `/standby` | `app/standby/page.tsx` | Client Component (`"use client"`) | Tela de repouso noturno OLED em tela cheia com proteção contra burn-in (pixel shift horário), relógio atenuado e resumo de segurança. |
| `/api/state` | `app/api/state/route.ts` | Route Handler (Edge/Node) | Retorna em lote o snapshot das 64 entidades ativas consumidas pela interface. |
| `/api/toggle` | `app/api/toggle/route.ts` | Route Handler (Edge/Node) | Alterna dispositivos validados contra a whitelist de `lib/rooms.ts`. |
| `/api/control` | `app/api/control/route.ts` | Route Handler (Edge/Node) | Controle fino de atributos (brilho, Kelvin, RGB, velocidade de ventilador). |
| `/api/scene` | `app/api/scene/route.ts` | Route Handler (Edge/Node) | Executa as 4 cenas nativas da residência (Cinema, Boa Noite, Boas-Vindas, Gamer). |
| `/api/vacuum` | `app/api/vacuum/route.ts` | Route Handler (Edge/Node) | Comandos de sucção, pausa, retorno à base e limpeza por zona do robô Dreame. |
| `/api/tv` | `app/api/tv/route.ts` | Route Handler (Edge/Node) | Despacho de teclas remotas virtuais para a Smart TV Samsung 65". |
| `/api/todo` | `app/api/todo/route.ts` | Route Handler (Edge/Node) | Leitura e inserção de itens na lista de compras do Home Assistant. |
| `/api/energy` | `app/api/energy/route.ts` | Route Handler (Edge/Node) | Retorna o histórico spline de consumo elétrico das últimas 24 horas. |
| `/api/weather`| `app/api/weather/route.ts`| Route Handler (Edge/Node) | Previsão meteorológica horária e de 5 dias do sensor da casa. |
| `/api/mass` | `app/api/mass/route.ts` | Route Handler (Edge/Node) | Ponte WebSocket sob demanda para controle e telemetria do Music Assistant. |

---

## 2. Inventário de Modais e Diálogos em Portais (`createPortal`)

| Modal | Componente Responsável | Gatilho de Abertura | Elementos Contidos |
| :--- | :--- | :--- | :--- |
| **Detalhes do Cômodo** | `RoomPopup.tsx` | Toque no card de cômodo na grade principal | Lista de subcards de iluminação, interruptores, chips de sensores de porta/movimento e atalho para subpágina. |
| **Central de Mídia & TV** | `MediaHubModal.tsx` | Toque no mini-card de TV da barra diária | Controle de volume, navegação D-Pad, seletor de 12 apps de streaming, atalhos do PS5 e player do Music Assistant. |
| **Controle de Energia** | `EnergyWidget.tsx` | Toque no mini-card de energia da barra diária | Gráfico de consumo 24h interativo (scrubbing), custo estimado em R$/h e controle de 5 tomadas inteligentes. |
| **Central do Aspirador**| `VacuumWidget.tsx` | Toque no mini-card do aspirador da barra diária | 4 modos de sucção (dB/ícone), limpeza por cômodo, vida útil de consumíveis e botão de localizar robô. |
| **Lista de Compras** | `TodoListWidget.tsx` | Toque no mini-card de compras da barra diária | Lista de tarefas com checkboxes táteis, input de adicionar novo item e badge de pendências. |
| **Previsão Estendida** | `WeatherForecastModal.tsx`| Toque no mini-card de clima da barra diária | Card de sensação térmica atual, umidade, velocidade do vento e previsão em colunas para os próximos 5 dias. |
| **Ajuste de Luz / Cor**| `LightDimmerModal.tsx` | Toque no ícone de ajuste fino de lâmpadas dimerizáveis | Slider de brilho contínuo (0-100%), seletor de temperatura de cor (Kelvin) e paleta de cores RGB. |
| **Saúde de Baterias** | `BatteryAlertsBar.tsx` | Toque no chip de bateria do cabeçalho | Listagem de todos os sensores com bateria crítica (<=20%), nível em porcentagem e ícones por categoria. |
| **Perímetro de Segurança**| `SecurityAlertsBar.tsx` | Toque no chip de segurança do cabeçalho | Status em tempo real dos sensores de porta e presença da casa (aberto/fechado/movimento). |
