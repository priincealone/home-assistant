# Sumário Executivo da Auditoria de Interface & UX (00-executive-summary.md)

**Documento**: `artifacts/audit/00-executive-summary.md`  
**Projeto**: Painel de Automação Residencial (`dashboard-app`)  
**Data**: 16/09/2026 · **Status**: Concluído (Modo Somente Leitura — Sem alterações em produção)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 + Home Assistant Core 2026.9

---

## 1. Resumo do Estado Atual

O painel de automação residencial do André encontra-se em estágio maduro de arquitetura de renderização, com excelente performance em tempo de carregamento inicial (~120ms) e modelo de resposta visual imediata (0ms) governado por travas otimistas (`travasOtimistasRef` com TTL de 5.000ms). A navegação em desktop e tablets de parede cumpre plenamente a **Regra do 1º Viewport (Zero-Scroll Wall Mount)**, exibindo os 10 cômodos e 5 widgets panorâmicos sem rolagem vertical em resoluções como 1024×768 e 1180×820.

No entanto, o projeto acumula passivos técnicos relevantes de governança visual e segurança perimetral: ausência total de autenticação na porta 3002, fragmentação acentuada de estilos (124 sombras, 50 cores hex e 49 tamanhos de fonte no CSS), ausência de anéis de foco para navegação por teclado e falha grave de contraste no tema claro.

---

## 2. Número de Problemas por Categoria

| Categoria | Sigla | Total de Problemas Catalogados |
| :--- | :---: | :---: |
| **Segurança** | `SEC` | 2 |
| **Acessibilidade Digital** | `A11Y` | 3 |
| **Experiência do Usuário** | `UX` | 2 |
| **Responsividade & Ergonomia** | `RSP` | 2 |
| **Comportamento Funcional** | `FUN` | 2 |
| **Qualidade de Código & Tooling** | `TECH` | 2 |
| **Consistência Visual** | `VIS` | 2 |
| **TOTAL CONSOLIDADO** | — | **15 problemas mapeados** |

---

## 3. Número de Bloqueadores e Críticos

* **Número de Bloqueadores (Blockers para Release Externa)**: **3**
  1. `SEC-001` (Ausência de autenticação e proteção na porta 3002);
  2. `A11Y-002` (Contraste reprovado no tema claro com razão de 2.59:1);
  3. `A11Y-001` (Navegação assistiva por teclado invisível por falta de `:focus-visible`).
* **Número de Críticos (Severidade Alta/Crítica)**: **7**
  - `SEC-001` (Crítica - Porta 3002 aberta na rede);
  - `A11Y-001` (Crítica - Invisibilidade de foco assistivo);
  - `A11Y-002` (Crítica - Acento ilegível sob tema claro);
  - `UX-001` (Alta - Comandos com falha silenciosa sem notificação/toast);
  - `RSP-001` (Alta - Alvo tátil de alertas reduzido a 36px por conflito de cascata CSS);
  - `RSP-002` (Alta - Botão power compacto da TV com dimensão de 34px);
  - `SEC-002` (Alta - Alternância cega no cooler do PS5 com risco térmico).

---

## 4. Principais Inconsistências de Cor

1. **Reprovação WCAG no Tema Claro**: A cor de destaque `--on-accent: #d97706` sobre o canvas `#e2e8f4` produz contraste de **2.59:1**, violando o piso obrigatório de 4.5:1 da norma WCAG 1.4.3 (Nível AA).
2. **Dispersão Cromática sem Semântica**: 331 ocorrências hexadecimais no CSS com 50 tons distintos, somadas a 121 ocorrências hardcoded nos componentes TSX (incluindo 7 variações concorrentes de amarelo/âmbar e 7 de vermelho/alerta).
3. **Ambiguidade entre "Desligado" e "Indisponível"**: Dispositivos fora de alcance (`unavailable`) e lâmpadas deliberadamente desligadas compartilham o mesmo cinza translúcido `rgba(255,255,255,0.35)`.
4. **Tokens Zumbis**: Convivência de 32 variáveis CSS em `oklch` legadas de templates do shadcn/ui no `:root` que definem fundo branco puro (`oklch(1 0 0)`), contradizendo o tema Obsidian.

---

## 5. Principais Problemas de Responsividade

1. **Alvos Táteis Abaixo do Padrão WCAG AAA (44px × 44px)**:
   - Micro-pílulas de segurança e bateria medem **36px** devido ao defeito de cascata CSS **F-01** (linha 7201 anula a media query de 44px da linha 4212);
   - Botão power compacto da TV (`.tv-compact-power`) mede **34px × 34px**.
2. **Fenômeno de "Sticky Hover" em Telas Táteis**: 118 regras `:hover` decorativas disparam em painéis de parede e smartphones touch, mantendo cards e botões permanentemente acesos após a retirada do dedo por falta de encapsulamento sob `@media (hover: hover)`.
3. **Dispersão de Breakpoints**: Presença de 32 blocos `@media` com 34 larguras arbitrárias no CSS em vez das 7 faixas canônicas da especificação.

---

## 6. Principais Falhas Funcionais

1. **Ausência de Feedback Visual Permanente em Falhas (Silêncio de Erro)**: Em caso de queda do Home Assistant ou recusa de comando no relé, a aplicação executa apenas um tremor físico de 400ms (`shake-fail`), sem exibir toast ou banner de erro textual explicativo.
2. **Mascaramento de Hardware no RoomCard**: Lâmpadas ou interruptores no estado `unavailable` são somados como se estivessem apenas desligados, ocultando falhas físicas de alimentação elétrica ou queda de rede Zigbee/Wi-Fi.
3. **Ricochete Visual no Aspirador**: O seletor de modo de sucção do `VacuumWidget` não compartilha a trava otimista centralizada, sofrendo recuo visual momentâneo durante o ciclo de polling de 5s.

---

## 7. Riscos de Segurança

1. **Controle Total Irrestrito na Porta 3002 (A-01)**: Inexistência de middleware de autenticação, controle de sessão ou restrição de IP. Qualquer cliente na LAN residencial ou tailnet aciona luzes, TV, aspirador e cenas sem credencial.
2. **Risco de Superaquecimento do Console PS5 (R8)**: A cena Gamer executa `toggle` cego em `switch.ventilacao_ps5`. Com o PlayStation ligado em sessão intensa e cooler ativo, acionar a cena **desliga** a ventilação forçada.
3. **Parâmetros Livres em Rotas de Borda**: Rotas `/api/tv` e `/api/vacuum` aceitam strings livres repassadas diretamente aos serviços do HA sem validação estrita contra schemas de enum permitidos.

---

## 8. Recomendação de Ordem de Correção

A resolução das não-conformidades deve obedecer estritamente a 3 sprints sequenciais:

```
  SPRINT 1: SEGURANÇA E ACESSIBILIDADE CRÍTICA (Bloqueadores)
  1. SEC-001: Implementar middleware.ts com autenticação por PIN / sessão na porta 3002.
  2. A11Y-001: Implementar regra global :focus-visible com anel outline de 2px (#38bdf8).
  3. A11Y-002: Ajustar acento do tema claro para #b45309 (garantindo contraste >= 4.5:1).
  4. RSP-001 / RSP-002: Corrigir ordem da cascata CSS e elevar alvos táteis para >= 44px.
  5. SEC-002: Substituir alternar() por turn_on explícito no cooler do PS5 na cena Gamer.

  SPRINT 2: RESILIÊNCIA E DESIGN SYSTEM
  6. UX-001: Implementar sistema de notificações/toasts globais para falhas de rede.
  7. FUN-001: Sinalizar entidades unavailable com indicador dedicado no RoomCard.
  8. UX-002: Encapsular regras decorativas de hover em @media (hover: hover) and (pointer: fine).
  9. A11Y-003: Adicionar Focus Trap nos modais via portal.
  10. VIS-001 / VIS-002: Consolidar as 124 sombras nos 4 tokens canônicos do Liquid Glass.

  SPRINT 3: QUALIDADE DE CÓDIGO E ARQUITETURA
  11. TECH-002: Instalar e configurar ESLint no Next 16 e restaurar o script npm run lint.
  12. TECH-001: Decompor monólitos MediaHubModal (1.156 linhas) e EnergyWidget (839 linhas).
  13. Higienização: Remover tokens zumbis em oklch e o componente descontinuado DeviceButton.tsx.
```

---

## 9. Funcionalidades que Não Puderam Ser Testadas

Em conformidade estrita com a instrução de não acionar dispositivos reais, as seguintes rotinas foram registradas como **Não Testadas**:

| Funcionalidade / Fluxo | Motivo do Não-Teste |
| :--- | :--- |
| **Disparo Real de Relés Físicos** | Proibido acionar atuadores reais da casa nesta etapa de auditoria. |
| **Comandos Infravermelhos da TV** | Proibido enviar pulsos reais para a Smart TV da sala de estar. |
| **Acionamento Físico do Aspirador** | Proibido ligar o motor de sucção ou deslocar o robô da base. |
| **Envio de Itens Reais na Lista de Compras** | Exigiria escrita no banco de dados de produção do Home Assistant. |
| **Modo Kiosk em Tablet Físico Dedicado** | Exige validação in-loco no hardware de parede sob Fully Kiosk Browser. |
| **Comportamento sob Perda Total de Energia** | Exige simulação física de desligamento de disjuntores da residência. |

---

## 10. Decisão de Prontidão Técnica

> [!WARNING]
> ### DECISÃO: ATENÇÃO (LIBERAÇÃO CONDICIONADA)
> 
> * **Para Uso Doméstico Local (André na Rede Fechada)**: **SAUDÁVEL COM RESSALVAS**. A performance, velocidade de resposta (0ms otimista) e estabilidade de layout são excelentes.
> * **Para Compartilhamento Residencial com Terceiros ou Acesso Externo**: **BLOQUEADO**. A liberação externa está vetada até a implementação dos 3 itens bloqueadores:
>   1. Autenticação na porta 3002 (`SEC-001`);
>   2. Correção de contraste no tema claro (`A11Y-002`);
>   3. Inclusão de foco visível para teclado (`A11Y-001`).
