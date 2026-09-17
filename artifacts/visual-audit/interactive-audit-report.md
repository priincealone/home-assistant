# Relatório de Auditoria Interativa & Comportamental (interactive-audit-report.md)

**Documento**: `artifacts/visual-audit/interactive-audit-report.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído (Fase 3)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Design System**: *Nocturnal Observatory* (Liquid Glass, 60fps, Zero-Scroll Wall Mount)  
**Metodologia**: Bateria de testes end-to-end automatizados via browser subagent, medições de eventos de DOM, teclado, mouse, gestos touch e verificação dos 15 critérios canônicos de usabilidade.

---

## 1. Matriz Consolidada de Elementos Interativos Testados

A interface foi exaustivamente testada em todos os seus elementos interativos, cobrindo os 15 critérios fundamentais de usabilidade e resposta de sistema:

| Categoria de Elemento | Componentes / Locais Testados | Responde Clique | Responde Toque | Feedback Imediato (0ms) | Impede Duplo Clique | Permite Cancelar | Preserva Estado | Foco Visual Mantido |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Botões de Ação Rápida** | `Apagar (N)` (Hold 800ms) | ✅ Sim | ✅ Sim | ✅ Sim (Ring SVG) | ✅ Sim | ✅ Sim (Soltar) | ✅ Sim | ⚠️ Perde foco |
| **Botões de Ícone** | Tema, Kiosk, Standby, Fechar (`✕`) | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim (Storage)| ✅ Sim |
| **Pílulas & Chips (Badges)**| `2 alertas`, `Baterias 50%`, `Ao vivo` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| **Cards Clicáveis** | Cards de Cenas Rápidas (Cinema, Gamer)| ✅ Sim | ✅ Sim | ✅ Sim (Aura) | ✅ Sim | ❌ Não | ✅ Sim | ⚠️ Sem outline |
| **Cards de Cômodos** | Corpo do card (`RoomCard`) | ✅ Sim | ✅ Sim | ✅ Sim (Elevação)| ✅ Sim | ✅ Sim (Modal) | ✅ Sim | ✅ Sim |
| **Interruptores Mestres** | Ícone circular do cômodo (Dual Affordance)| ✅ Sim | ✅ Sim | ✅ Sim (0ms Otimista)| ✅ Sim (Trava 3.5s)| ❌ Não | ✅ Sim | ⚠️ Sem outline |
| **Modais & Sheets** | `RoomPopup`, `MediaHub`, `EnergyWidget`| ✅ Sim | ✅ Sim | ✅ Sim (Fade/Slide)| ✅ Sim | ✅ Sim (Esc/✕) | ✅ Sim | ⚠️ Foco vaza |
| **Sliders Contínuos** | Slider de Brilho (`LightDimmerModal`) | ✅ Sim | ✅ Sim | ✅ Sim (60fps) | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| **Tabs & Navegação** | Abas do MediaHub (TV/Música/Jogos) | ✅ Sim | ✅ Sim | ✅ Sim (Linha ativa)| ✅ Sim | N/A | ✅ Sim | ✅ Sim |
| **Carrossel de Cômodos** | Navegação `<` e `>` em `/comodo/[id]` | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | N/A | ✅ Sim | ✅ Sim |
| **Checkboxes Táteis** | Lista de Compras (`TodoListWidget`) | ✅ Sim | ✅ Sim | ✅ Sim (Tachado) | ✅ Sim | ✅ Sim | ✅ Sim (HA sync)| ✅ Sim |
| **Campos de Texto (Input)**| Input "Adicionar à lista..." | ✅ Sim | ✅ Sim | ✅ Sim (Digitação)| ✅ Sim | ✅ Sim (Backspace)| N/A | ✅ Sim |
| **Seletores de Presets** | Níveis de Sucção do Aspirador Dreame | ✅ Sim | ✅ Sim | ✅ Sim (Borda ativa)| ✅ Sim | N/A | ✅ Sim | ✅ Sim |
| **Controle de Climatização**| Velocidades 1, 2, 3 e reversão ventilador | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |

---

## 2. Auditoria Detalhada dos 15 Critérios por Componente

---

### 1. Botão de Salvaguarda "Apagar Casa (N)"
* **Critério 1 (Parece interativo)**: ✅ Sim. Botão vermelho translúcido com borda especular e texto em alto contraste.
* **Critério 2 e 3 (Responde a clique e toque)**: ✅ Sim.
* **Critério 4 (Feedback imediato)**: ✅ Sim. Clique simples exibe instantaneamente a dica instrutiva *"Pressione e segure para confirmar"*. Pressionar e segurar preenche suavemente o anel SVG circular de progresso.
* **Critério 5 (Estado de processamento)**: ✅ Sim. Anel de progresso preenchendo durante 800ms.
* **Critério 6 (Impede cliques duplicados)**: ✅ Sim. Requer gesto sustentado contínuo.
* **Critério 7 (Mostra sucesso)**: ✅ Sim. Vibração háptica firme e zeramento imediato do contador de lâmpadas.
* **Critério 8 (Mostra erro)**: ⚠️ Parcial. Caso a chamada de API falhe em segundo plano, reverte o contador em 3.5s sem toast textual explicativo.
* **Critério 9 (Permite cancelar)**: ✅ Sim. Soltar o botão antes dos 800ms cancela imediatamente a ação e reseta o anel para 0%.
* **Critério 10 (Preserva estado)**: ✅ Sim.
* **Critério 11 (Respeita permissões)**: ✅ Sim. Bloqueado em páginas não autenticadas.
* **Critério 12 e 13 (Confirmação backend)**: ✅ Sim. Protegido pela trava otimista centralizada.
* **Critério 14 (Não fica bloqueado)**: ✅ Sim.
* **Critério 15 (Foco após interação)**: ⚠️ O foco visual de teclado desaparece após a liberação do botão.

---

### 2. Seletor Cíclico de Temas (Dark / Light / Auto)
* **Critério 1 a 4**: ✅ Sim. Ícone circular no cabeçalho com hover suave, cursor pointer e comutação instantânea em 0ms.
* **Critério 5**: ✅ N/A (operação síncrona no cliente).
* **Critério 6**: ✅ Sim. Previne saltos de ciclo por debouncing interno.
* **Critério 7**: ✅ Sim. Ícone e estilos de superfície mudam imediatamente (Sol ☀️ -> Monitor 🖥️ -> Lua 🌙).
* **Critério 8 e 9**: N/A.
* **Critério 10 (Preserva estado após recarregar)**: ✅ Sim. O valor é persistido no `localStorage` sob a chave `dashboard_theme`.
* **Critério 15 (Foco mantido)**: ✅ Sim. O anel de foco permanece no botão após a alternância por teclado.

---

### 3. Pílulas de Alerta e Baterias (`HeaderAlertPill.tsx`)
* **Critério 1 a 4**: ✅ Sim. Badges dinâmicas no cabeçalho (`2 alertas` em vermelho e `Baterias 50%` em âmbar) expandem seus respectivos modais imediatamente ao toque.
* **Critério 9 (Permite cancelar / fechar)**: ✅ Sim. Fechamento suave através do botão `✕`, clique no backdrop escuro ou tecla `Escape`.
* **Critério 15 (Foco pós-fechamento)**: ⚠️ Ao fechar o modal com `Escape`, o foco do teclado vaza para o topo do documento em vez de retornar à pílula de origem.

---

### 4. Barra Panorâmica de Widgets Diários
* **WeatherWidget**:
  - Clique abre `WeatherForecastModal` exibindo 5 dias de previsão e métricas térmicas;
  - Scroll interno suave quando necessário;
  - Fechamento imediato com botão `✕` e `Escape`.
* **EnergyWidget**:
  - Clique abre a central de controle de energia com gráfico spline SVG 24h;
  - **Scrubbing Interativo**: Ao deslizar o cursor/dedo pelo gráfico, o tooltip flutuante acompanha o traçado em 60fps exibindo o horário e potência com `tabular-nums`;
  - Interruptores de tomadas inteligentes acionáveis individualmente com trava otimista.
* **MediaHubModal (TV & Mídia)**:
  - Navegação fluida entre as abas *Vídeo & TV*, *Música & Som* e *Console PS5*;
  - **D-Pad**: Botões direcionais perfeitamente circulares com resposta imediata;
  - **Launcher de Apps**: 12 logos de streaming com feedback de toque;
  - **TV Desligada**: Controles direcionais atenuados mantendo apenas o botão Power destacado.
* **VacuumWidget (Aspirador Dreame)**:
  - 4 seletores de potência acústica (*Silencioso*, *Padrão*, *Forte*, *Turbo 🚀*);
  - Borda ativa e ícones refletindo o estado atual em tempo real;
  - Botão *🔊 Localizar* dispara comando de localização sonoro.
* **TodoListWidget (Lista de Compras)**:
  - Campo de texto aceita digitação fluida;
  - Botão `+` e tecla `Enter` inserem itens em 0ms;
  - Checkboxes circulares com alvo tátil de 44px aplicam risco tachado no texto ao marcar;
  - Seção recolhível de itens concluídos expande e recolhe com micro-animação.

---

### 5. Grade de Cômodos e Dual Touch Affordance (`RoomCard.tsx`)
* **Toque no Ícone Circular (Ação Mestre)**:
  - Resposta visual instantânea em 0ms: o card inteiro ganha luminescência âmbar `#fbbf24` ao ligar ou apaga suavemente;
  - Trava otimista de 3.5s impede o efeito de "ricochete" provocado pela latência de resposta do Home Assistant.
* **Toque no Corpo do Card**:
  - Abre o `RoomPopup` correspondente sem acionar as lâmpadas acidentalmente;
  - Subcards com botões individuais para cada ponto de luz e interruptor.

---

### 6. Dimerizador e Temperatura de Cor (`LightDimmerModal.tsx`)
* **Slider Contínuo de Brilho**:
  - Arrasto contínuo em 60fps sem engasgos de renderização;
  - O mockup do bulbo de luz irradia luminescência proporcional ao percentual de brilho;
  - Numerais tabulares sem salto ou tremor de layout.
* **Presets Táteis de Potência**:
  - Botões rápidos `Off` (0%), `Noite` (25%), `Ambiente` (50%), `Leitura` (75%) e `Foco` (100%) atualizam o slider e o valor instantaneamente ao clique.
* **Temperatura de Cor (Kelvin)**:
  - Presets térmicos (`Leitura 2700K`, `Foco 4000K`, `Relaxar 2400K`, `Noite 2200K`) aplicam o gradiente cromático correto no bulbo e despacham requisição `/api/control`.

---

### 7. Subpáginas de Cômodo (`/comodo/[id]`)
* **Navegação Lateral / Abas de Cômodos**:
  - Botões de alternância `<` e `>` e carrossel de ambientes com rolagem horizontal suave;
  - Alternância imediata entre cômodos complexos (`Sala de Estar`) e cômodos com empty state (`Quarto`);
* **Botão de Retorno (`← Casa`)**:
  - Retorna imediatamente ao dashboard principal sem forçar reload de página e preservando a posição anterior.

---

### 8. Sentinela Noturno OLED (`/standby`)
* **Superfície True Black**: Fundo preto puro (`#000000`, 0 nits) sem vazamento de backlight;
* **Proteção Burn-In**: Deslocamento automático de subpixel a cada 75s;
* **Despertar Tátil**: Toque na tela ou teclas `Escape`/`Enter`/`Space` despertam a interface em menos de 260ms com feedback háptico.

---

## 3. Registro Sistemático de Não-Conformidades e Anomalias Encontradas

Durante a bateria de testes de interação, foram catalogados os seguintes problemas e desvios comportamentais:

| Código | Componente Afetado | Tipo de Anomalia | Descrição do Comportamento Observado | Severidade |
| :---: | :--- | :--- | :--- | :---: |
| **INT-01** | `MediaHubModal` / Modais em Geral | **Ausência de Focus Trap** | Ao navegar com a tecla `Tab` dentro de um modal aberto, o foco não fica aprisionado no diálogo e vaza para os botões do dashboard de fundo. | Média |
| **INT-02** | `RoomPopup` / `ModalAlerts` | **Perda de Retorno de Foco** | Ao fechar o modal via tecla `Escape` ou botão `✕`, o foco do teclado é transferido para o topo do `<body>` em vez de retornar ao elemento gatilho de origem. | Média |
| **INT-03** | `HeaderQuickActions` (`Ao vivo`) | **Feedback Ausente / Ação Nula** | O badge de conexão "Ao vivo" / "Offline" possui estilo visual de botão interativo com cursor pointer, mas o clique não executa nenhuma ação (ex: forçar sincronização imediata). | Baixa |
| **INT-04** | Cenas Rápidas (`QuickScenesPanel`) | **Ação Impossível de Desfazer** | Tocar em um card de cena (ex: `Cinema`) despacha a cena imediatamente sem confirmação e sem botão de "Desfazer" caso o toque tenha sido acidental. | Média |
| **INT-05** | Falhas de Comunicação REST | **Silêncio de Erro (Ausência de Toast)**| Quando uma chamada de API intermediária falha (ex: timeout de 4500ms), a interface apenas reverte a trava otimista em silêncio, sem apresentar um toast explicativo visível. | Alta |
| **INT-06** | `TvRemoteWidget` (TV Compacta) | **Alvo Tátil Reduzido** | O botão de energia compacto da TV mede `34px × 34px`, ficando abaixo do mínimo de acessibilidade e ergonomia touch WCAG AAA (44px × 44px). | Média |
| **INT-07** | `LightDimmerModal` em Mobile | **Slider Tátil em Telas Estreitas** | Em telas com largura de 320px (iPhone SE), a área do slider contínuo tem margem estreita de toque que pode colidir com o gesto de fechar o bottom-sheet. | Baixa |

---

## 4. Recomendações Técnicas Implementáveis (Sem Aplicação Nesta Fase)

1. **Implementação de Focus Trap Nativo**: Integrar `@base-ui/react/dialog` ou hook de aprisionamento de foco para garantir conformidade estrita WCAG 2.4.3 (Focus Order) em todos os 10 modais.
2. **Sistema Global de Notificações / Toasts**: Integrar container de toasts flutuantes na base da tela (`ToastContainer.tsx`) para notificar o morador em caso de falha de comunicação ou rejeição de comando físico pelo Home Assistant.
3. **Ação no Badge "Ao vivo"**: Associar o clique na pílula de conexão a uma chamada forçada de sincronização imediata (`buscar()`), com micro-animação de rotação no ícone de atualização.
4. **Elevação do Alvo Tátil do Botão Power**: Ajustar as dimensões do `.tv-compact-power` de 34px para no mínimo 44px × 44px no CSS.
