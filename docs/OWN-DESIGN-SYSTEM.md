# Design System Autoral — "AeroGlass Home System"

**Documento**: `docs/OWN-DESIGN-SYSTEM.md`  
**Autor**: Direção de Design de Produto & Human Interface Engineering  
**Versão**: 2.0 (Autoral & Independente)  
**Data**: 17 de Setembro de 2026  
**Repositório Alvo**: `c:\HomeAssistant\dashboard-app`

---

## 1. Identidade e Filosofia do Sistema

O **AeroGlass Home System** é um design system de alta performance projetado sob medida para painéis de automação residencial. Sua premissa estética combina a sobriedade da arquitetura moderna de interiores com a sofisticação de materiais vítreos e aeroespaciais translúcidos.

O sistema foi desenhado para atender três contextos operacionais distintos:
1. **Tablet Fixo de Parede (Wall-Mount)**: Operação em pé, a distâncias de 1 a 3 metros, sob variações drásticas de iluminação ambiente (luz solar direta a escuridão noturna completa).
2. **Smartphone Pessoal (Mobile Touch)**: Uso ergonômico com uma mão, preservando controles táteis na metade inferior da tela.
3. **Estação de Trabalho / Laptop (Desktop Mouse/Teclado)**: Interação precisa com ponteiro fino e navegação assistiva ágil via atalhos de teclado.

---

## 2. Tokens de Design (Design Tokens)

### 2.1 Paleta Cromática e Semântica

O sistema utiliza cores neutras profundas para a estrutura e reserva cores cromáticas com saturação controlada exclusivamente para estados ativos, alertas e dados semânticos.

#### Tema Escuro (Midnight Slate — Padrão do Painel de Parede)
```css
:root,
[data-theme="dark"] {
  /* Superfícies e Fundos */
  --surface-base: #0b0f19;          /* Ardósia Noite Profunda (Canvas principal) */
  --surface-card: rgba(255, 255, 255, 0.06);     /* Vidro neutro em repouso */
  --surface-card-hover: rgba(255, 255, 255, 0.10);
  --surface-active: radial-gradient(ellipse at top left, rgba(251, 191, 36, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%);
  --surface-sheet: rgba(15, 23, 42, 0.88);       /* Folhas modais e popups */
  --surface-overlay: rgba(0, 0, 0, 0.65);        /* Cortina de desfoque de fundo */

  /* Linhas e Bordas Especulares */
  --border-subtle: rgba(255, 255, 255, 0.08);   /* Borda estrutural mínima */
  --border-specular: rgba(255, 255, 255, 0.18); /* Reflexo de luz superior */
  --border-active: rgba(251, 191, 36, 0.50);    /* Borda de dispositivo aceso */

  /* Tipografia e Cores de Texto */
  --text-primary: #f8fafc;          /* Branco cristalino (Contraste 15.8:1) */
  --text-secondary: #94a3b8;        /* Ardósia clara (Contraste 7.2:1) */
  --text-tertiary: #64748b;         /* Ardósia média (Contraste 4.9:1) */
  --text-accent: #fbbf24;           /* Ouro Solar para status ligado */
  --text-accent-subtle: #fde68a;    /* Âmbar claro para telemetria ativa */

  /* Cores de Estado e Semântica */
  --state-on-accent: #fbbf24;       /* Ouro Solar (Iluminação e atuadores ativos) */
  --state-on-glow: rgba(251, 191, 36, 0.28);
  --state-energy: #f97316;          /* Laranja térmico (Alto consumo elétrico >350W) */
  --state-danger: #f87171;          /* Vermelho perimétrico (Portas abertas / Violação) */
  --state-danger-bg: rgba(239, 68, 68, 0.18);
  --state-offline: #94a3b8;         /* Cinza neutro sem sinal (sem falso alarme) */
  --state-climate: #38bdf8;         /* Azul brisa (Ventilação e refrigeração) */
}
```

#### Tema Claro (Frosted Day — Modo Diurno Sob Luz Solar)
```css
[data-theme="light"],
.theme-light {
  /* Superfícies e Fundos */
  --surface-base: #e9eef5;          /* Vidro fosco claro de alta densidade */
  --surface-card: rgba(255, 255, 255, 0.72);
  --surface-card-hover: rgba(255, 255, 255, 0.90);
  --surface-active: radial-gradient(ellipse at top left, rgba(180, 83, 9, 0.12) 0%, rgba(255, 255, 255, 0.95) 100%);
  --surface-sheet: rgba(248, 250, 252, 0.94);
  --surface-overlay: rgba(15, 23, 42, 0.35);

  /* Linhas e Bordas */
  --border-subtle: rgba(15, 23, 42, 0.08);
  --border-specular: rgba(255, 255, 255, 0.85);
  --border-active: rgba(180, 83, 9, 0.45);

  /* Tipografia */
  --text-primary: #0f172a;          /* Azul ardósia profundo (Contraste 14.1:1) */
  --text-secondary: #475569;        /* Ardósia escurecida (Contraste 6.8:1) */
  --text-tertiary: #64748b;         /* Média (Contraste 4.8:1) */
  --text-accent: #b45309;           /* Âmbar mel escurecido (Contraste 4.82:1) */
  --text-accent-subtle: #92400e;

  /* Estados */
  --state-on-accent: #b45309;
  --state-on-glow: rgba(180, 83, 9, 0.20);
  --state-energy: #ea580c;
  --state-danger: #dc2626;
  --state-danger-bg: rgba(220, 38, 38, 0.12);
  --state-offline: #64748b;
  --state-climate: #0284c7;
}
```

---

### 2.2 Escala Tipográfica Modular (HTML Nativo 1:1)

A tipografia é renderizada exclusivamente via fontes com métricas abertas (Inter, Geist ou pilha nativa de sistema neutro). Números e métricas de telemetria utilizam rigorosamente numerais tabulares para prevenir oscilação visual (*layout jitter*).

```css
:root {
  --font-family-base: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
  
  /* Escala de Tamanhos de Fonte */
  --font-display: clamp(1.85rem, 2.5vw, 2.35rem); /* Relógio / Destaque mestre */
  --font-h1: clamp(1.35rem, 1.8vw, 1.65rem);      /* Título do dashboard */
  --font-h2: clamp(1.15rem, 1.4vw, 1.35rem);      /* Títulos de cômodo e modais */
  --font-h3: 1rem;                                 /* Títulos de seção interna */
  --font-body: 0.875rem;                           /* 14px — Texto base e leitura */
  --font-caption: 0.75rem;                         /* 12px — Metadados e status */
  --font-micro: 0.6875rem;                         /* 11px — Rótulos de eixos e badges */

  /* Pesos */
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  /* Espaçamento entre Letras (Tracking) */
  --tracking-tight: -0.022em;
  --tracking-normal: 0em;
  --tracking-wide: 0.03em;
  --tracking-caps: 0.065em;

  /* Alturas de Linha (Line-Height) */
  --lh-tight: 1.15;
  --lh-snug: 1.30;
  --lh-normal: 1.50;
}
```

---

### 2.3 Escala de Espaçamento (Base 4/8pt)

Nenhum valor fracionário ou número ímpar solto é permitido na composição de layout.

| Token | Valor em Pixels | Equivalente REM | Uso Canônico |
|:---|:---:|:---:|:---|
| `--space-xxs` | 4px | 0.25rem | Gaps entre texto e badge interno |
| `--space-xs` | 8px | 0.5rem | Padding de botões pequenos e micro-pílulas |
| `--space-sm` | 12px | 0.75rem | Espaçamento interno de cards compactos |
| `--space-md` | 16px | 1.0rem | Padding padrão de cards e grids principais |
| `--space-lg` | 24px | 1.5rem | Separação entre seções lógicas da tela |
| `--space-xl` | 32px | 2.0rem | Margem periférica do dashboard no tablet |
| `--space-xxl`| 48px | 3.0rem | Respiros amplos em telas ultra-wide / TV |

---

### 2.4 Escala de Raios de Curvatura (Border Radius)

| Token | Valor | Aplicação |
|:---|:---:|:---|
| `--radius-pill` | `9999px` | Micro-pílulas de status, botões circulares e chips |
| `--radius-sm` | `10px` | Badges de telemetria e ícones em mini-cards |
| `--radius-md` | `14px` | Botões de ação, seletores de velocidade e caixas de ícone |
| `--radius-lg` | `20px` | Cards de cômodos (`RoomCard`), cards de energia e widgets |
| `--radius-xl` | `28px` | Folhas modais (`RoomPopup`, `MediaHubModal`, Sheets) |

---

### 2.5 Elevação, Sombras e Materiais Vítreos

O AeroGlass define 4 materiais de interface baseados no princípio da ótica de refração e dispersão:

```css
/* 1. Vidro Superficial Padrão (Cards e Widgets em repouso) */
.material-glass-card {
  background: var(--surface-card);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--border-subtle);
  border-top-color: var(--border-specular);
  box-shadow: 
    0 10px 24px -4px rgba(0, 0, 0, 0.30),
    0 2px 6px -1px rgba(0, 0, 0, 0.18);
}

/* 2. Vidro Ativo / Energizado (Dispositivos ou cômodos ligados) */
.material-glass-active {
  background: var(--surface-active);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--border-active);
  border-top-color: rgba(255, 255, 255, 0.35);
  box-shadow: 
    0 12px 28px -4px rgba(0, 0, 0, 0.40),
    0 0 20px var(--state-on-glow);
}

/* 3. Folha Modal Elevada (Sheets e Popups centrais) */
.material-glass-sheet {
  background: var(--surface-sheet);
  backdrop-filter: blur(36px) saturate(200%);
  -webkit-backdrop-filter: blur(36px) saturate(200%);
  border: 1px solid var(--border-specular);
  box-shadow: 
    0 28px 56px -8px rgba(0, 0, 0, 0.55),
    0 4px 16px rgba(0, 0, 0, 0.25),
    inset 0 1px 1.5px rgba(255, 255, 255, 0.25);
}

/* 4. Elemento Flutuante Rápido (Toasts e Cápsulas de Controle) */
.material-glass-floating {
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.50);
}
```

---

## 3. Matriz Canônica de Estados de Dispositivos

```
┌────────────────────────────────────────────────────────────────────────┐
│                      MATRIZ QUADRIPOLAR DE ESTADOS                     │
├──────────────────┬─────────────────────────────────────────────────────┤
│ ESTADO           │ TRATAMENTO VISUAL E SEMÂNTICA                       │
├──────────────────┼─────────────────────────────────────────────────────┤
│ 1. DESLIGADO     │ Fundo neutro (6% opacidade). Ícone branco/cinza     │
│    (Off/Standby) │ translúcido. Sem borda colorida. Silêncio visual.   │
├──────────────────┼─────────────────────────────────────────────────────┤
│ 2. LIGADO        │ Brilho interno em âmbar solar (18% opacidade).      │
│    (On/Active)   │ Borda dourada de 1px. Ícone aceso com drop-shadow.  │
│                  │ Título branco nítido, métrica dourada legível.      │
├──────────────────┼─────────────────────────────────────────────────────┤
│ 3. INDISPONÍVEL  │ Opacidade atenuada (0.45). Ícone 'sem sinal' sutil. │
│    (Unavailable) │ Sem alarme falso no cômodo. Apenas dentro do card   │
│                  │ específico do dispositivo desconectado.             │
├──────────────────┼─────────────────────────────────────────────────────┤
│ 4. ATENÇÃO       │ Reservado para segurança física (sensores de porta/ │
│    (Alert)       │ janela abertos ou intrusão). Pílula vermelha viva   │
│                  │ com pulso luminoso controlado.                      │
└──────────────────┴─────────────────────────────────────────────────────┘
```

---

## 4. Padrões de Componentes de Alta Fidelidade

### 4.1 Cabeçalho e Micro-Pílulas de Status
- **Alvo tátil unificado**: Todas as pílulas de conexão, tema, alarme e relógio respeitam a altura mínima de **44px**.
- **Data e Hora**: Renderizados com tipografia nativa e `font-variant-numeric: tabular-nums`. A data é formatada em português brasileiro nativo sem `text-transform: capitalize` forçado por CSS.
- **Micro-Pílulas de Conexão e Segurança**: Estruturadas como `<button>` interativos com ícone à esquerda, rótulo centralizado e ponto de status de 6px.

### 4.2 Card de Cômodo (`RoomCard`)
- **Proporção**: Card retangular responsivo com padding de 16px a 18px.
- **Topo**: Ícone da categoria do cômodo à esquerda (38×38px) e chips de contexto dinâmico à direita (ex: `"3 luzes"`, `"Vent"`, `"Clima"`).
- **Rodapé**: Nome do cômodo em `font-weight: 700`, contagem de dispositivos ativos e indicador pontual de luzes ativas (`status-dot`).
- **Gesto tátil**:
  - *Toque curto*: Alterna a iluminação principal do cômodo em 0ms (com trava otimista de 3.5s contra ricochete de relé).
  - *Toque longo ou ícone de expansão*: Abre o modal `RoomPopup` com preservação de contexto translúcido.

### 4.3 Subcards e Dispositivos Individuais (`Subcard` & `DeviceTile`)
- **Fim dos blocos opacos**: Nunca pintar o cartão com cor sólida saturada laranja/marrom.
- **Camada de Conteúdo**:
  - Ícone vetorial com 30×30px no topo ou lateral.
  - Título em branco cristalino de alto contraste (`#f8fafc`).
  - Rótulo de estado (ex: `"Ligada • 85W"`) em ouro solar legível (`#fde68a`).
  - Badge de localização do cômodo com fundo translúcido suave e texto claro (`#fef3c7`).

### 4.4 Modais e Folhas Suspensas (`Sheets`)
- **Geometria**: Folha arredondada com `border-radius: 28px` no desktop/tablet e ancoragem inferior (*bottom-sheet*) em smartphones.
- **Barra de Arraste**: Indicador tátil no topo de 36×4px para affordance clara de fechamento por gesto.
- **Botão Fechar Padronizado**: Componente atômico [`ModalCloseButton`](file:///c:/HomeAssistant/dashboard-app/app/components/ModalCloseButton.tsx) em SVG de 44×44px, substituindo qualquer caractere tipográfico `"✕"`.
- **Focus Trap**: Gerenciado pelo hook [`useFocusTrap`](file:///c:/HomeAssistant/dashboard-app/lib/useFocusTrap.ts) para navegação acessível sem escape de foco para a página de fundo.

### 4.5 Gráficos de Telemetria e Histórico
- **Separação Obrigatória**:
  - **Camada Gráfica**: `<svg preserveAspectRatio="none">` contendo estritamente caminhos geométricos (`<path>`), curvas splines e gradientes de preenchimento.
  - **Camada Tipográfica**: Elementos HTML nativos (`<span>`) posicionados absolutamente nos eixos X e Y. Isso elimina para sempre caracteres esticados, comprimidos ou pixelados.

---

## 5. Regras de Navegação e Arquitetura de Informação

```
[ TELA INICIAL (NÍVEL 0) ]
       │
       ├──► [ PANORAMA DIÁRIO ] ──► Modal de Telemetria (Energia, Clima, Saúde)
       │
       ├──► [ GRID DE CÔMODOS ] ──► RoomPopup (Sheet translúcido de Nível 1)
       │                                  │
       │                                  └──► Dimmer Modal (Nível 2 — Ajuste fino)
       │
       └──► [ CENTRAL DE MÍDIA ] ──► MediaHubModal (Controle de TV, Áudio, PS5)
```

1. **Nunca ultrapassar 2 níveis de profundidade**: O usuário deve retornar à raiz da casa com no máximo 2 toques ou 2 toques na tecla `Escape`.
2. **Preservação de Posição de Rolagem**: O fechamento de qualquer modal devolve a interface exatamente ao ponto de origem, sem saltos de tela.
3. **Fechamento Tríplice**: Todo modal fecha obrigatoriamente por: (1) Botão fechar em SVG, (2) Toque na cortina de fundo, (3) Tecla `Escape`.

---

## 6. Regras de Animação e Física de Movimento

1. **Duração**:
   - Micro-interações táteis (pressão de botão, clique): **80ms a 120ms**.
   - Abertura de sheets e modais: **220ms a 260ms**.
   - Cross-fades de tema e gráficos: **180ms**.
2. **Curvas de Aceleração**:
   - `cubic-bezier(0.16, 1, 0.3, 1)` (Desaceleração exponencial elástica — sensação de inércia física rápida).
   - Proibido o uso de curvas lineares em movimentos de interface (exceto rotação de pás de ventilador em velocidade constante).
3. **Respeito ao `prefers-reduced-motion`**:
   - Desativação imediata de qualquer pulso, vórtice ou translação quando o usuário tiver a opção ativada no sistema operacional.

---

## 7. Regras de Acessibilidade (WCAG 2.1 AA / AAA)

- **Contraste de Cor**: Razão mínima de **4.8:1** para texto normal e **3.1:1** para componentes gráficos interativos essenciais.
- **Foco por Teclado**: Todo elemento interativo exibe contorno claro de 2px (`#38bdf8` no tema escuro e `#0284c7` no tema claro) com afastamento de 2px via `:focus-visible`.
- **Alvo de Toque (WCAG 2.5.5)**: Dimensão física mínima de 44px × 44px para qualquer controle operacional.
- **Leitores de Tela (Screen Readers)**: Todos os botões possuem `aria-label` declarativo. Sliders contínuos anunciam porcentagem textual clara via `aria-valuetext`.

---

## 8. Regras Responsivas e de Orientação

- **Tablet Landscape 1024×768 (Regra do 1º Viewport / Zero-Scroll)**:
  - O conteúdo essencial (Cabeçalho, Widgets e todos os Cômodos) deve caber integralmente sem barra de rolagem vertical (`document.documentElement.scrollHeight <= window.innerHeight`).
  - Gaps e paddings reduzem para 10–12px nessa resolução.
- **Mobile Portrait (< 480px)**:
  - Grid de cômodos organiza-se estritamente em **2 colunas** proporcionais (`repeat(2, minmax(0, 1fr))`).
  - Modais abrem como gavetas inferiores (*bottom-sheets*) com ancoragem segura e respeito às safe-areas de entalhe (*notches*).

---

## 9. Guia Prático: O Que Fazer (Do) e O Que Não Fazer (Don't)

### O Que Fazer (Do ✅)
- ✅ **Usar fundos translúcidos e bordas especulares** para denotar elevação e foco.
- ✅ **Manter o texto branco e dourado nítido** sobre fundos escuros quando um dispositivo estiver ligado.
- ✅ **Desacoplar textos de SVG** para garantir nitidez tipográfica nativa em gráficos.
- ✅ **Reservar o vermelho** estritamente para alarmes e falhas críticas comprovadas.
- ✅ **Garantir 44px** em qualquer botão, chip ou controle físico.

### O Que Não Fazer (Don't ❌)
- ❌ **Não preencher cards inteiros com laranja ou marrom sólido opaco**, criando blocos pesados e ofuscados.
- ❌ **Não usar texto marrom escuro sobre fundo laranja escuro** (violação grave de contraste).
- ❌ **Não colocar tags `<text>` dentro de SVGs com `preserveAspectRatio="none"`**, pois distorce e estica a fonte.
- ❌ **Não rotular um cômodo inteiro como "Offline"** se apenas um console de videogame entrou em repouso.
- ❌ **Não aplicar rotação contínua em formas geométricas não-circulares** (como retângulos arredondados), pois os cantos se projetam para fora da caixa.
- ❌ **Não utilizar assets ou cópias diretas da interface proprietária da Apple**.
