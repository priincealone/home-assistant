# Especificação Técnica de Funcionalidade: Renovação Visual e Arquitetura AeroGlass

**Documento**: `specs/features/apple-inspired-visual-refresh.md`  
**Autor**: Direção de Design de Produto & Engenharia Frontend  
**Data**: 17 de Setembro de 2026  
**Status**: Pronto para Planejamento e Execução  
**Repositório Alvo**: `c:\HomeAssistant\dashboard-app`  
**Documentos Relacionados**: [`docs/APPLE-INSPIRED-DESIGN-DIRECTION.md`](file:///c:/HomeAssistant/docs/APPLE-INSPIRED-DESIGN-DIRECTION.md), [`docs/OWN-DESIGN-SYSTEM.md`](file:///c:/HomeAssistant/docs/OWN-DESIGN-SYSTEM.md)

---

## 1. Contexto e Motivação

O painel de automação residencial da casa evoluiu para uma aplicação de alta velocidade e baixa latência (com travas otimistas de 3.5s e retorno em 0ms). No entanto, o catálogo de problemas visuais coletado na auditoria visual e o feedback recente de uso real evidenciaram sintomas clássicos de desalinhamento de design system:
1. **Cores confusas e textos ofuscados**: Cards de dispositivos e tomadas ativas sofriam com preenchimentos sólidos alaranjados pesados e texto marrom escuro sobreposto, gerando fadiga visual e quebra de contraste.
2. **Tipografia distorcida e esticada**: O gráfico de telemetria histórica de energia inseria elementos de texto dentro de SVGs com `preserveAspectRatio="none"`, resultando em letras esticadas e borradas horizontalmente.
3. **Falsos alarmes de indisponibilidade ("Offline")**: O card de cômodos sinalizava status "Offline" na tela inicial apenas porque um console de videogame (PS5) estava em repouso programado ou uma luminária secundária estava desligada na tomada.
4. **Aberrações geométricas em animações**: A rotação de retângulos arredondados (`border-radius: 15px`) no card de climatização criava cantos tracejados que se projetavam para fora da caixa.

Esta especificação define o plano de migração cirúrgico e progressivo para implantar o **AeroGlass Home System**, aplicando rigorosamente princípios associados a produtos Apple (clareza, consistência, hierarquia, contenção cromática e materiais com propósito) sem jamais violar propriedade intelectual ou copiar componentes protegidos.

---

## 2. Objetivos e Não-Objetivos

### 2.1 Objetivos Principais
- **Calma e Legibilidade**: Substituir o ruído visual e as cores berrantes por uma paleta restrita e calorosa (Ardósia Profunda, Vidro Líquido Neutro e Ouro Solar).
- **Tipografia Cristalina 1:1**: Desacoplar toda a tipografia de matrizes de escala não-proporcionais, garantindo renderização nítida com numerais tabulares em qualquer resolução.
- **Ergonomia Física Imutável**: Garantir alvos de toque de 44px × 44px em 100% dos controles táteis.
- **Zero-Scroll no Tablet de Parede**: Assegurar que a tela inicial caiba integralmente no primeiro viewport em 1024×768, 1280×800 e 1920×1080.
- **Integridade da Automação**: Manter o tempo de resposta em 0ms perceptível e preservar a segurança física dos relés da residência (sem ricochete visual).

### 2.2 Não-Objetivos (O Que Não Faremos)
- Não alteraremos arquivos de configuração física em `c:\HomeAssistant\config\` (`automations.yaml`, `configuration.yaml`, `.storage/`).
- Não utilizaremos ativos oficiais da Apple (SF Symbols, SF Pro, logotipos ou termos de marca registrada).
- Não faremos reescrita total da base de código; a migração será feita por substituição estruturada de tokens e componentes CSS/TSX no frontend Next.js.

---

## 3. Matriz de Componentes e Arquivos de Código

| Componente / Área | Arquivo no Projeto | Escopo da Renovação |
|:---|:---|:---|
| **Design Tokens Globais** | [`dashboard-app/app/globals.css`](file:///c:/HomeAssistant/dashboard-app/app/globals.css) | Definição dos tokens semânticos de cores, escala modular de tipografia, materiais translúcidos e remoção de regras redundantes. |
| **Card de Cômodo** | [`dashboard-app/app/components/RoomCard.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/RoomCard.tsx) | Refinamento dos chips de status, eliminação de falsos alarmes de "Offline" e aplicação da borda especular refinada. |
| **Widget de Energia & Telemetria** | [`dashboard-app/app/components/EnergyWidget.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/EnergyWidget.tsx) | Desacoplamento dos eixos tipográficos do SVG, eliminação de cards opacos de tomadas e adoção de Liquid Glass. |
| **Tiles de Dispositivos** | [`dashboard-app/app/components/DeviceTile.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/DeviceTile.tsx) | Textos em branco cristalino e dourado legível quando ativo, eliminando cores escuras sobre fundo escuro. |
| **Popup de Cômodos** | [`dashboard-app/app/components/RoomPopup.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/RoomPopup.tsx) | Subcards com preenchimento em vidro translúcido âmbar sutil, botões de fechar vetoriais e foco assistivo preso. |
| **Controle de Climatização** | [`dashboard-app/app/components/FanControlCard.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/FanControlCard.tsx) | Vórtice concêntrico 100% circular (`border-radius: 50%`) e feedback gradual de rotação das pás. |
| **Central de Mídia** | [`dashboard-app/app/components/MediaHubModal.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/MediaHubModal.tsx) | Hierarquia de abas segmentadas, alvo de toque de 44px nos botões de transporte e botão de fechar padronizado. |
| **Ações Rápidas & Cabeçalho** | [`dashboard-app/app/components/HeaderQuickActions.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/HeaderQuickActions.tsx) | Micro-pílulas com altura de 44px, data em português nativo e contraste de tema claro aprimorado. |

---

## 4. Plano de Execução em Fases

### Fase 1: Fundação do Sistema de Design (CSS Core)
1. **Padronização dos Tokens no `:root`**:
   - Consolidar a paleta `Midnight Slate` e `Frosted Day`.
   - Limpar tokens legados e fracionários (substituir todas as ocorrências de `11.5px` por tokens semânticos).
2. **Arquitetura de Materiais Vítreos**:
   - Implementar classes utilitárias de materiais (`.material-glass-card`, `.material-glass-active`, `.material-glass-sheet`, `.material-glass-floating`).
3. **Isolamento de Hover em Telas Táteis**:
   - Consolidar a regra `@media (hover: none) or (pointer: coarse)` para garantir zero sticky hover no tablet de parede.

### Fase 2: Superfície do Dashboard e Layout de Parede (Zero-Scroll)
1. **Grid de Cômodos**:
   - Otimizar proporções de cards para 1024×768 e 1280×800.
   - Refinar a lógica de chips para que "Offline" seja disparado apenas se todas as luzes do cômodo estiverem desconectadas.
2. **Cabeçalho e Ações Rápidas**:
   - Garantir alinhamento óptico perfeito do relógio, data e pílulas de segurança e bateria.

### Fase 3: Telemetria e Widgets de Energia
1. **Gráfico de 24h sem Distorção**:
   - Manter a camada tipográfica dos eixos X e Y em HTML nativo sobreposto (`.energy-chart-x-axis` e `.energy-chart-y-axis`), com `preserveAspectRatio="none"` restrito ao `<path>` vetorial.
2. **Tomadas Conectadas**:
   - Subcards ativos utilizam acabamento Liquid Glass com fundo gradiente suave (`rgba(251, 191, 36, 0.18)`), título branco e status em ouro solar, com badge de cômodo legível.

### Fase 4: Modais, Dispositivos e Controles Hápticos
1. **Subcards e DeviceTiles**:
   - Unificar a experiência visual entre os popups e as páginas completas de cômodo.
   - Adicionar `aria-valuetext` e `tabular-nums` nos seletores contínuos.
2. **Ventilador e Clima**:
   - Assegurar rotação estritamente concêntrica no ícone de ventilador.
3. **Acessibilidade Universal de Modais**:
   - Focus trap ativo com restauração de foco ao fechar via [`ModalCloseButton.tsx`](file:///c:/HomeAssistant/dashboard-app/app/components/ModalCloseButton.tsx) e tecla `Escape`.

---

## 5. Critérios de Aceitação e Testes Obrigatórios

### 5.1 Testes Automatizados de Engenharia
- **TypeScript**: `npx tsc --noEmit` deve retornar **0 erros** em todo o projeto.
- **Integridade da API**: Chamada HTTP `GET http://localhost:3002/api/state` deve retornar status **200 OK** com todas as entidades mapeadas.

### 5.2 Critérios de Aceitação Visual e Ergonômica
1. **Contraste Mínimo**: Nenhuma combinação de texto/fundo pode ter contraste inferior a **4.8:1** (validado via ferramentas de acessibilidade).
2. **Alvo de Toque Mínimo**: Nenhum controle interativo (botão, chip, controle de volume ou energia) pode medir menos de **44px × 44px**.
3. **Resolução Tipográfica em Gráficos**: Os textos "156W", "78W", "08:04", "Agora" devem ser inspecionados no DOM como elementos de texto HTML sem distorção anamórfica ou pixelização.
4. **Ausência de Falsos Alarmes**: Nenhum cômodo pode apresentar a tag "Offline" na tela inicial devido ao repouso normal do PS5 ou de luminárias de apoio desligadas.
5. **Geometria Concêntrica**: Animações de ventilador não devem projetar cantos ou linhas além do perímetro do ícone.
6. **Zero-Scroll no Tablet de Parede**: Na resolução de 1024×768 em orientação paisagem, o conteúdo do dashboard deve caber integralmente no primeiro viewport sem exigir rolagem vertical.
