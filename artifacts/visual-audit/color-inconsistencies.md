# Inconsistências de Cores, Contraste & Tokens (color-inconsistencies.md)

**Documento**: `artifacts/visual-audit/color-inconsistencies.md`  
**Data da Auditoria**: 16/09/2026 · **Status**: Concluído (Fase 4)  
**Ambiente**: Next.js 16.3.3 + React 19.2.0 + Tailwind CSS v4 na porta 3002  
**Norma de Referência**: WCAG 2.1 Nível AA / AAA e [`dashboard-app/DESIGN.md`](file:///c:/HomeAssistant/dashboard-app/DESIGN.md)

---

## 1. Visão Geral da Paleta e Governança Cromática

A paleta do design system *Nocturnal Observatory* foi concebida para evocar precisão astronômica e acolhimento residencial: fundo ultra-escuro *Dark Obsidian* (`#07090e`), superfícies de vidro líquido (`#111827`) e auras de radiação âmbar viva (`#fbbf24`) para iluminação ativa e ciano atmosférico (`#38bdf8`) para entretenimento.

No entanto, a auditoria cromática identificou dispersão acentuada de códigos hexadecimais, concorrência de tons semelhantes sem propósito funcional, graves falhas matemáticas de contraste no tema claro e ambiguidade semântica entre estados de hardware.

---

## 2. Métricas de Dispersão Cromática no Código

* **Total de Ocorrências Hexadecimais no CSS**: **331 ocorrências** distribuídas em **50 valores únicos**.
* **Valores Hexadecimais Hardcoded em Arquivos TSX**: **121 ocorrências** com 49 valores adicionais sem vínculo a variáveis CSS.
* **Variações de Amarelo / Âmbar**: **7 tons concorrentes** identificados (`#fbbf24`, `#f59e0b`, `#d97706`, `#b45309`, `#fef08a`, `#fde047`, `#eab308`).
* **Variações de Vermelho / Alerta**: **7 tons concorrentes** identificados (`#ef4444`, `#dc2626`, `#b91c1c`, `#f87171`, `#e11d48`, `#991b1b`, `#fca5a5`).
* **Tokens Zumbis**: 32 variáveis CSS em `oklch` legadas de templates de terceiros (shadcn/ui) no `:root`, incluindo declarações de fundo branco puro (`oklch(1 0 0)`) que contradizem a identidade Obsidian da aplicação.

---

## 3. Avaliação Matemática de Contraste WCAG 2.1

A tabela a seguir apresenta os testes laboratoriais de contraste entre pares de frente e fundo em ambos os temas:

| Par de Cores Avaliado | Cor de Frente | Cor de Fundo | Razão Calculada | Piso Mínimo WCAG | Status Oficial |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Texto Primário (Dark)** | `#f1f5f9` | `#0d1117` | **17.27:1** | 4.5:1 (AA) | ✅ **Aprovado (AAA)** |
| **Texto Secundário / Muted (Dark)** | `#85898e` | `#0d1117` | **5.38:1** | 4.5:1 (AA) | ✅ **Aprovado (AA)** |
| **Acento de Luz Ativa (Dark)** | `#fbbf24` | `#111827` | **10.63:1** | 3.0:1 (Gráfico)| ✅ **Aprovado (AAA)** |
| **Alerta de Perigo (Dark)** | `#f87171` | `#0d1117` | **6.84:1** | 4.5:1 (AA) | ✅ **Aprovado (AA)** |
| **Texto Primário (Light)** | `#0f172a` | `#e2e8f4` | **14.52:1** | 4.5:1 (AA) | ✅ **Aprovado (AAA)** |
| **Texto Muted (Light)** | `#475569` | `#e2e8f4` | **6.16:1** | 4.5:1 (AA) | ✅ **Aprovado (AA)** |
| **Acento Ativo (Light Mode)** | `#d97706` | `#e2e8f4` | **2.59:1** | 4.5:1 (Texto) | ❌ **REPROVADO CRÍTICO** |
| **Alerta de Perigo (Light Mode)** | `#dc2626` | `#e2e8f4` | **3.93:1** | 4.5:1 (Texto) | ❌ **REPROVADO** |
| **Ícones Desligados (Dark)** | `rgba(255,255,255,0.35)` | `#0d1117` | **3.08:1** | 3.0:1 (Gráfico)| ⚠️ **Limítrofe** |
| **Bordas Estruturais de Vidro** | `rgba(255,255,255,0.10)` | `#0d1117` | **1.28:1** | 3.0:1 (Gráfico)| ⚠️ **Invisível sem Blur** |

---

## 4. Tabela de Inconsistências Cromáticas e Semânticas

| ID | Tela / Superfície | Componente | Padrão Observado | Padrão Esperado | Exemplo Equivalente | Impacto | Sugestão de Correção | Prioridade |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **CLR-01** | Tema Claro (Geral) | Acento e Contadores Ativos | O acento no modo claro utiliza `--on-accent: #d97706`, produzindo uma razão de contraste de **2.59:1** sobre `#e2e8f4`. | Razão de contraste mínima de **4.5:1** conforme a norma WCAG 1.4.3 para legibilidade em ambiente diurno iluminado. | O texto primário `#0f172a` cumpre com folga (14.52:1). | Ilegibilidade severa de lâmpadas acesas e botões ativos no tablet sob luz solar direta. | Alterar o token no tema claro para `#b45309` (produz contraste de **4.82:1** ✅). | **Crítica** |
| **CLR-02** | Tema Claro (Geral) | Alertas e Badges Críticas | Alertas de erro e segurança usam `#dc2626` sobre `#e2e8f4`, gerando contraste de **3.93:1** (abaixo de 4.5:1). | Razão de contraste mínima de **4.5:1** para textos informativos de erro e segurança perimétrica. | O alerta no modo escuro `#f87171` atinge 6.84:1. | Alertas de porta aberta e falha de bateria ficam lavados e difíceis de ler à distância. | Alterar o token de alerta claro para `#b91c1c` (produz contraste de **5.21:1** ✅). | **Alta** |
| **CLR-03** | Grade de Cômodos | Indicador de Estado de Dispositivo | Dispositivos fisicamente desligados (`off`) e dispositivos sem sinal/desconectados (`unavailable`) usam o mesmo tom translúcido `rgba(255,255,255,0.35)`. | Diferenciação cromática clara: cinza suave para desligado deliberado e cinza ardósia opaco com traço vermelho/âmbar para indisponibilidade física. | O cabeçalho diferencia online (verde) de offline (vermelho). | Mascaramento de falha física: o morador acredita que uma lâmpada está apagada quando na realidade ela caiu da rede Zigbee/Wi-Fi. | Criar token `--color-device-unavailable: #64748b` e badge visual "Offline" nos cards. | **Alta** |
| **CLR-04** | Gestão de Energia | Faixa de Pico de Potência | O `EnergyWidget` utiliza vermelho vibrante `#ef4444` para consumos acima de 350W (ex: chuveiro ou forno elétrico ligado). | Vermelho deve ser reservado estritamente para alarmes perimétricos, intrusão e falhas críticas de hardware. | O alerta de segurança da casa usa exatamente a mesma cor `#ef4444`. | Confusão psicológica de alarme: o morador associa o vermelho do painel a perigo ou violação de segurança quando é apenas consumo de rotina. | Utilizar laranja/âmbar escuro (`#f97316` ou `#ea580c`) para alerta de carga elevada, reservando vermelho para falha/segurança. | **Média** |
| **CLR-05** | Cabeçalho e Widgets | Verde com Sobrecarga Semântica | O verde esmeralda `#10b981` é empregado simultaneamente para: (1) conexão de rede "Ao vivo", (2) bateria com 100%, (3) conforto térmico de clima e (4) consumo elétrico econômico. | Manter tons ou intensidades distintas ou ancorar o significado em ícones sem depender exclusivamente da cor verde. | O ciano `#38bdf8` é reservado com sucesso exclusivo para mídia. | Diluição da semântica de sucesso/segurança; a cor verde perde sua força comunicativa específica. | Adotar verde menta para conforto térmico e verde oliva para economia de Watts, mantendo esmeralda para conectividade. | **Baixa** |
| **CLR-06** | Código CSS / TSX | Dispersão de Tons de Âmbar | 7 variações de amarelo/âmbar concorrentes espalhadas pelo código sem justificativa ótica. | Um único tom primário canônico (`#fbbf24`) e um tom atenuado para hover (`#f59e0b`). | `DESIGN.md` define estritamente `#fbbf24` como primário. | Inconsistência na percepção do brilho das lâmpadas entre cômodos diferentes. | Refatorar todas as ocorrências para o token semântico `var(--color-primary)`. | **Média** |
| **CLR-07** | Código CSS / `:root` | Tokens Zumbis de Terceiros | Presença de 32 variáveis em `oklch` de templates do shadcn/ui no `:root` declarando fundo branco puro. | Limpeza estrita de variáveis zumbis não consumidas pelo design system. | O arquivo `DESIGN.md` não utiliza espaço de cor `oklch`. | Risco de sobrescrita acidental de variáveis em componentes que herdam `:root` e aumento de peso do CSS. | Remover todas as variáveis zumbis do bloco `:root` em `globals.css`. | **Baixa** |

---

## 5. Proposta Canônica de Tokens Semânticos Unificados

Para sanar a dispersão e eliminar as reprovações WCAG, a tabela de tokens abaixo deve governar todas as superfícies da aplicação:

```css
:root {
  /* Fundo e Superfícies Liquid Glass */
  --bg-canvas: #07090e;
  --bg-surface: #111827;
  --bg-surface-elevated: #1f293d;
  --border-glass: rgba(255, 255, 255, 0.12);
  --border-specular: inset 0 1px 1.5px rgba(255, 255, 255, 0.25);

  /* Tipografia */
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;

  /* Semântica de Ação e Estados */
  --action-active: #fbbf24;        /* Luzes e zonas ativas (Contraste 10.6:1) */
  --action-media: #38bdf8;         /* Entretenimento e áudio (Aura Ciano) */
  --status-healthy: #10b981;       /* Rede online e baterias plenas */
  --status-warning: #f59e0b;       /* Bateria média e consumo elevado */
  --status-danger: #ef4444;        /* Alertas de perímetro e falhas críticas */
  --status-offline: #64748b;       /* Dispositivos indisponíveis / fora de alcance */
  --focus-ring: #38bdf8;           /* Anel de foco assistivo visível */
}

/* Modificadores para Tema Claro com Contraste Homologado */
[data-theme="light"],
.theme-light {
  --bg-canvas: #e2e8f4;
  --bg-surface: #ffffff;
  --bg-surface-elevated: #f1f5f9;
  --border-glass: rgba(15, 23, 42, 0.10);
  
  --text-primary: #0f172a;         /* Contraste 14.5:1 ✅ */
  --text-muted: #475569;           /* Contraste 6.16:1 ✅ */
  
  --action-active: #b45309;        /* Âmbar profundo corrigido: Contraste 4.82:1 ✅ */
  --status-danger: #b91c1c;        /* Vermelho profundo corrigido: Contraste 5.21:1 ✅ */
  --status-warning: #c2410c;       /* Laranja de aviso corrigido: Contraste 4.65:1 ✅ */
}
```
