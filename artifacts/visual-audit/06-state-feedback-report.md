# 06 — Relatório de Estados, Feedback e Transições

**Documento**: `artifacts/visual-audit/06-state-feedback-report.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Design System**: *Nocturnal Observatory* (Liquid Glass, 60fps, Zero-Scroll Wall Mount)

---

## 1. Matriz de Estados e Feedback por Componente

| Componente | Estado | Indicador Visual | Feedback Tátil/Sonoro | Feedback Textual | ARIA | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| **RoomCard** | Ligado (`on`) | Aura âmbar `#fbbf24`, badge `X/Y` | Háptico `[12]` | "X luzes acesas" | `aria-label` | ✅ |
| **RoomCard** | Desligado (`off`) | Cinza translúcido, badge `0/Y` | — | "0 luzes acesas" | `aria-label` | ✅ |
| **RoomCard** | **Indisponível (`unavailable`)** | **Mesmo visual de `off`** | — | **Nenhum** | **Nenhum** | ❌ **STA-002** |
| **RoomCard** | Trava Otimista Ativa | Aura pulsante 3.5s | Háptico imediato | — | — | ✅ |
| **Todos** | **Falha de API** | Shake 400ms + reversão silenciosa | Háptico rejeição | **Nenhum toast** | **Nenhum** | ❌ **STA-001** |
| **Login** | Erro de PIN | Dots vermelhos, shake elástico | `[45, 60, 45]` | "PIN incorreto" | `aria-live` | ✅ |
| **Login** | Autenticando | Teclas desabilitadas | — | — | — | ✅ |
| **Login** | Sucesso | Transição suave para `/` | `[20, 40]` | — | — | ✅ |
| **Cabeçalho** | Online | Pílula verde pulsante | — | "Ao vivo" | — | ✅ |
| **Cabeçalho** | Sincronizando | Pílula âmbar | — | "Sincronizando" | — | ✅ |
| **Cabeçalho** | Offline | Pílula vermelha estática | — | "Offline" | — | ✅ |
| **VacuumWidget** | **Seleção de modo** | Borda ativa no preset | — | Texto do modo | — | ⚠️ **FUN-001** |
| **Cenas Rápidas** | **Acionamento** | Pulso visual imediato | — | **Sem undo** | — | ⚠️ **UX-002** |
| **Modais** | Abertura | Fade + Slide | — | — | — | ✅ |
| **Modais** | Fechamento | Fade out | — | — | — | ✅ |
| **Standby** | Ativação | True Black #000 | Guard time 650ms | — | — | ✅ |
| **Standby** | Despertar | Transição ≤260ms | Háptico | — | — | ✅ |

---

## 2. Análise Detalhada dos Problemas de Estado

### STA-001 — Falha Silenciosa de Comandos Físicos

**Fluxo Afetado**: Acionamento de qualquer dispositivo (lâmpada, tomada, cena).

**Comportamento Atual**:
1. Usuário toca no ícone do cômodo para acender as luzes;
2. O card muda instantaneamente de estado (otimismo em 0ms);
3. A requisição POST para `/api/toggle` falha (timeout, 502, dispositivo offline);
4. Após 3.5s (expiração da trava otimista), o card reverte visualmente para o estado anterior;
5. **Nenhum texto, toast, banner ou notificação é exibido**.

**Impacto**: O morador não sabe se a lâmpada queimou, se o Wi-Fi caiu ou se o relé da Tuya falhou. Resulta em múltiplos cliques frustrados e confusão sobre o estado real da casa.

**Diagnóstico Técnico**: O evento `"ha-toggle-failed"` dispara apenas animação CSS (`shake-fail` de 400ms). Não existe componente `ToastContainer` ou equivalente no `layout.tsx`. O `page.tsx` não possui barramento de notificações de erro.

**Correção**: Criar componente global `<ToastContainer />` na casca do layout, acionado por eventos de falha, exibindo mensagem como: *"Falha ao comunicar com Luz Sala. Verifique a conexão."* com `role="alert"` e auto-dismiss em 5s.

---

### STA-002 — Dispositivos Indisponíveis Mascarados como Desligados

**Fluxo Afetado**: Visualização do status de cômodos na grade principal.

**Comportamento Atual**:
1. Um interruptor Tuya/Xiaomi perde sinal de rede (estado `unavailable` no HA);
2. O `RoomCard` contabiliza `quantosLigados` com `filter(p => estados[p.entityId]?.state === "on")`;
3. A entidade `unavailable` não é `"on"`, portanto é contada como desligada normal;
4. O card exibe "0/2 luzes" com o mesmo cinza translúcido de um cômodo propositalmente apagado.

**Impacto**: O morador acredita que o quarto está simplesmente apagado quando na realidade um interruptor caiu da rede Zigbee/Wi-Fi e precisa de atenção.

**Diagnóstico Técnico**: Lógica binária simplista em `RoomCard.tsx:187` que assume que tudo que não é `"on"` é `"off"`. Não existe contagem de `unavailable` nem indicação visual específica.

**Correção**: Adicionar contagem separada de entidades com `state === "unavailable"`. Quando presente, renderizar micro-badge com ícone `WifiOff` e texto "Offline" no card do cômodo, usando tom `#64748b` (slate) distinto do cinza de `off`.

---

## 3. Análise de Transições e Micro-Animações

| Transição | Duração | Easing | Status |
|:---|:---:|:---|:---:|
| Login → Home | ~200ms | `ease-out` | ✅ Suave |
| Home → Standby | ~300ms | `ease-in-out` | ✅ Suave |
| Standby → Home | ≤260ms | `ease-out` | ✅ Rápido |
| Abertura de Modal | ~250ms | `cubic-bezier(0.32, 0.72, 0, 1)` | ✅ Elegante |
| Fechamento de Modal | ~200ms | `ease-in` | ✅ Discreto |
| Toggle Otimista | 0ms (visual) + 3.5s (trava) | Instantâneo | ✅ Responsivo |
| Shake de Erro | 400ms | `ease-in-out` (elástico) | ✅ Informativo |
| Burn-in Shift (Standby) | A cada 75s | Linear | ✅ Protegido |

---

## 4. Avaliação de Estados Especiais

### A. Carregamento (Loading)
- **Cabeçalho**: Micro-spinner SVG no botão de atualização ✅
- **Cards de Cômodos**: Opacidade estática `0.7` sem skeleton ⚠️ **DS-012**
- **Modais**: Heterogêneo (spinner vs estado anterior congelado) ⚠️ **DS-012**
- **Recomendação**: `SkeletonShimmer` translúcido universal

### B. Desabilitado (Disabled)
- **Opacidade**: Varia entre `0.4` e `0.5` (deveria ser `0.35`)
- **Cursor**: Padrão em vez de `not-allowed`
- **Hover**: Ainda ativo em elementos desabilitados ⚠️ **DS-013**
- **Recomendação**: `pointer-events: none` + sem hover + opacidade padronizada

### C. Sucesso (Confirmação)
- **Acionamento de luz**: Mudança visual imediata + háptico ✅
- **Cena executada**: Pulso visual + mudança de estado ✅
- **Item adicionado à lista**: Inserção instantânea ✅
- **Login bem-sucedido**: Transição + háptico confirmação ✅

### D. Erro / Falha
- **PIN incorreto**: Shake + dots vermelhos + texto ✅
- **Falha de API**: Shake + reversão silenciosa ❌ **STA-001**
- **Rede offline**: Banner no cabeçalho ✅
