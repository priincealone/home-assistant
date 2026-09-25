# Especificação Técnica de Funcionalidade: Biblioteca de Ícones Autorais (AeroGlyphs)

> ⚠️ **SUBSTITUÍDA em 25/09/2026** por [`icones-phosphor.md`](icones-phosphor.md). A fachada `<Icon>` e o
> contrato de acessibilidade descritos aqui continuam valendo. Os desenhos próprios e a regra "sem pacote
> externo" foram revogados: 14 glifos não cobriam as ~90 necessidades e não tinham par contorno/preenchido.

**Documento**: `specs/features/own-icon-library.md`  
**Autor**: Direção de Design de Produto & Engenharia Frontend  
**Data**: 17 de Setembro de 2026  
**Status**: Proposta Pronta para Planejamento e Execução (Não implementado ainda)  
**Repositório Alvo**: `c:\HomeAssistant\dashboard-app`  
**Documentos Relacionados**: [`docs/OWN-ICON-SYSTEM.md`](file:///c:/HomeAssistant/docs/OWN-ICON-SYSTEM.md), [`docs/OWN-DESIGN-SYSTEM.md`](file:///c:/HomeAssistant/docs/OWN-DESIGN-SYSTEM.md)  

---

## 1. Contexto e Motivação Técnica

Atualmente, o painel residencial (`dashboard-app`) possui mais de 250 ocorrências de elementos `<svg>` declarados inline diretamente nos arquivos TSX (`WeatherWidget.tsx`, `RoomCard.tsx`, `DeviceTile.tsx`, `RoomPopup.tsx`, etc.). Essa abordagem pulverizada gera quatro problemas técnicos graves:
1. **Inconsistência de Traço e Escala**: Coexistem `strokeWidth` de 1.5, 1.8, 2.0 e 2.5px com `viewBox` variando entre `0 0 24 24`, `0 0 32 32` e valores não padronizados.
2. **Duplicação de Código**: Ícones comuns (como o botão de fechar, lâmpadas ou raios de energia) são reescritos repetidamente em múltiplos componentes com pequenas variações geométricas.
3. **Fragilidade em Acessibilidade**: Dezenas de botões contendo apenas SVG não possuem `aria-label` ou deixam o SVG exposto para leitores de tela sem `aria-hidden="true"`.
4. **Acoplamento com Estilos Hardcoded**: Vários SVGs possuem valores hexadecimais fixos em vez de consumir os tokens semânticos `currentColor` do **AeroGlass Home System**.

Esta especificação define a arquitetura técnica da biblioteca de componentes **AeroGlyphs**, implementada em TypeScript estrito e React 19 nativo, sem dependência de pacotes externos pesados, garantindo árvore limpa de componentes e desempenho de carregamento instantâneo.

---

## 2. Arquitetura de Componentes React & TypeScript

A biblioteca será organizada sob a pasta `app/components/icons/`, estruturada em módulos temáticos por domínio funcional:

```
dashboard-app/app/components/icons/
├── IconBase.tsx                   # Primitiva universal com regras de grid e SVG
├── types.ts                       # Tipagem TypeScript compartilhada (IconProps, tamanhos, variantes)
├── index.ts                       # Ponto único de exportação (Barrel file para tree-shaking)
├── devices/                       # Glifos de hardware físico
│   ├── LightCeilingIcon.tsx
│   ├── LightStripIcon.tsx
│   ├── CeilingFanIcon.tsx
│   ├── AirConditionerIcon.tsx
│   ├── SmartTvIcon.tsx
│   ├── GameConsoleIcon.tsx
│   ├── PowerOutletIcon.tsx
│   ├── DoorSensorIcon.tsx
│   └── SmartLockIcon.tsx
├── actions/                       # Ações e comandos interativos
│   ├── PowerToggleIcon.tsx
│   ├── InspectSlidersIcon.tsx
│   ├── DismissCloseIcon.tsx
│   ├── RefreshSyncIcon.tsx
│   └── VolumeMuteIcon.tsx
├── status/                        # Indicadores de telemetria e estado
│   ├── ConnectivityWifiIcon.tsx
│   ├── BatteryLevelIcon.tsx
│   ├── EnergyBoltIcon.tsx
│   └── StatusDotGlyph.tsx
└── navigation/                   # Ícones de roteamento e navegação
    ├── NavHomeIcon.tsx
    ├── NavRoomsGridIcon.tsx
    ├── NavTelemetrySparklineIcon.tsx
    ├── NavMediaIcon.tsx
    └── ChevronDirectionIcon.tsx
```

---

## 3. Interfaces de Tipagem e Primitiva Base

### 3.1 Tipos Canônicos (`types.ts`)

```typescript
import React from 'react';

export type IconSize = 16 | 20 | 24 | 32 | 48;
export type IconVariant = 'outline' | 'solid' | 'duotone';

export interface IconBaseProps extends React.SVGProps<SVGSVGElement> {
  /** Tamanho em pixels (largura e altura equivalentes) */
  size?: IconSize;
  /** Variante morfológica do ícone */
  variant?: IconVariant;
  /** Espessura do traço (padrão ótico: 1.75px para 24px) */
  strokeWidth?: number;
  /** Título acessível para leitores de tela quando o ícone for semântico isolado */
  title?: string;
  /** Se true, o ícone é puramente estético e recebe aria-hidden="true" */
  decorative?: boolean;
}
```

### 3.2 Primitiva Universal (`IconBase.tsx`)

```tsx
import React from 'react';
import { IconBaseProps } from './types';

export const IconBase: React.FC<IconBaseProps> = ({
  size = 24,
  variant = 'outline',
  strokeWidth = 1.75,
  title,
  decorative = true,
  className = '',
  children,
  ...svgProps
}) => {
  // Ajuste ótico automático de espessura de traço se não fornecido explicitamente
  const calculatedStrokeWidth =
    strokeWidth ??
    (size <= 16 ? 1.5 : size <= 20 ? 1.65 : size <= 24 ? 1.75 : size <= 32 ? 2.0 : 2.5);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={variant === 'solid' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={calculatedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative ? 'true' : undefined}
      role={decorative ? undefined : 'img'}
      className={`icon-glyph icon-glyph--${variant} ${className}`}
      {...svgProps}
    >
      {title && !decorative ? <title>{title}</title> : null}
      {children}
    </svg>
  );
};
```

---

## 4. Exemplos de Implementação de Componentes Canônicos

### 4.1 Ícone de Dispositivo: Tomada NBR 14136 (`PowerOutletIcon.tsx`)

```tsx
import React from 'react';
import { IconBase } from '../IconBase';
import { IconBaseProps } from '../types';

export const PowerOutletIcon: React.FC<IconBaseProps> = (props) => (
  <IconBase {...props}>
    {/* Placa externa retangular arredondada */}
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    {/* Hexágono rebaixado oficial brasileiro NBR 14136 */}
    <polygon points="7.5,7 16.5,7 18.5,12 16.5,17 7.5,17 5.5,12" strokeWidth={1.2} />
    {/* Os 3 orifícios circulares alinhados */}
    <circle cx="8.5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="15.5" cy="12" r="1" fill="currentColor" />
  </IconBase>
);
```

### 4.2 Ícone de Dispositivo: Ventilador Concêntrico (`CeilingFanIcon.tsx`)

```tsx
import React from 'react';
import { IconBase } from '../IconBase';
import { IconBaseProps } from '../types';

export const CeilingFanIcon: React.FC<IconBaseProps> = (props) => (
  <IconBase {...props}>
    {/* Eixo central perfeitamente concêntrico */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    {/* 4 Pás aerodinâmicas tangenciais com curvatura suave */}
    <path d="M12 9.5 C12 5 14 3 17 3 C18 4 16 7 13.8 9" />
    <path d="M14.5 12 C19 12 21 14 21 17 C20 18 17 16 15 13.8" />
    <path d="M12 14.5 C12 19 10 21 7 21 C6 20 8 17 10.2 15" />
    <path d="M9.5 12 C5 12 3 10 3 7 C4 6 7 8 9 10.2" />
  </IconBase>
);
```

### 4.3 Ícone de Ação: Botão Fechar Simétrico (`DismissCloseIcon.tsx`)

```tsx
import React from 'react';
import { IconBase } from '../IconBase';
import { IconBaseProps } from '../types';

export const DismissCloseIcon: React.FC<IconBaseProps> = (props) => (
  <IconBase {...props}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </IconBase>
);
```

---

## 5. Plano de Migração e Integração no `dashboard-app`

A migração ocorrerá em 3 etapas controladas sem risco de quebra de componentes existentes:

```
ETAPA 1: Fundação
Criar a pasta app/components/icons/ com IconBase, types.ts e os primeiros 15 glifos canônicos.
       │
       ▼
ETAPA 2: Padronização de Controles Centrais
Substituir o botão de fechar ad-hoc em RoomPopup.tsx, MediaHubModal.tsx e LightDimmerModal.tsx pelo DismissCloseIcon padronizado.
       │
       ▼
ETAPA 3: Cards de Cômodos e Telemetria
Migrar RoomCard.tsx, DeviceTile.tsx e EnergyWidget.tsx para os novos glifos temáticos com stroke de 1.75px.
```

---

## 6. Exemplos Práticos: O Que Fazer (Do) e O Que Não Fazer (Don't)

### Caso 1: Botão de Fechar Modal

#### ❌ Incorreto (Don't)
```tsx
// Erro: Caractere tipográfico puro, sem acessibilidade e com hitbox imprevisível
<button onClick={onClose} className="text-white text-lg">
  ✕
</button>
```

#### ✅ Correto (Do)
```tsx
// Correto: Glifo vetorial com espessura padrão, hitbox de 44px e acessibilidade declarativa
<button
  type="button"
  onClick={onClose}
  aria-label="Fechar janela"
  className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all"
>
  <DismissCloseIcon size={20} decorative={true} />
</button>
```

---

### Caso 2: Card de Cômodo com Luz Ligada

#### ❌ Incorreto (Don't)
```tsx
// Erro: Ícone esticado via transformações não concêntricas, cores hardcoded e stroke dissonante
<div className="room-icon-box">
  <svg width="36" height="36" viewBox="0 0 32 32" stroke="#ffaa00" strokeWidth="3">
    <path d="..." />
  </svg>
</div>
```

#### ✅ Correto (Do)
```tsx
// Correto: Consumo de tokens semânticos, classe de estado e grid 24px perfeitamente dimensionado
<div className={`room-icon-box ${isActive ? 'text-[var(--state-on-accent)]' : 'text-[var(--text-secondary)]'}`}>
  <LightCeilingIcon
    size={24}
    variant={isActive ? 'duotone' : 'outline'}
    decorative={true}
  />
</div>
```

---

### Caso 3: Rotação Contínua de Ventilador

#### ❌ Incorreto (Don't)
```css
/* Erro: Girando o container retangular inteiro com borda de 15px */
.fan-card.is-spinning {
  animation: spin 2s linear infinite;
  border-radius: 15px; /* Os cantos saem da caixa durante a rotação! */
}
```

#### ✅ Correto (Do)
```css
/* Correto: A animação gira estritamente o centro do SVG circular ou o glifo concêntrico */
.fan-blades-glyph.is-spinning {
  transform-origin: center center;
  animation: fan-rotate 1.2s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .fan-blades-glyph.is-spinning {
    animation: none !important;
  }
}
```

---

## 7. Critérios de Aceitação e Testes de Qualidade

1. **Compilação e Tipagem Estrita**:
   - `npx tsc --noEmit` executado em `dashboard-app/` deve retornar **0 erros**.
2. **Performance e Tree-Shaking**:
   - Cada componente de ícone exportado deve permitir importação nomeada sem aumentar o bundle principal em mais de 0.5KB.
3. **Área de Toque Universal (WCAG 2.5.5)**:
   - Todo componente interativo que hospeda um glifo deve passar no teste de dimensão mínima de **44px × 44px**.
4. **Inspeção de Contraste**:
   - O contraste entre o glifo e o plano de fundo em repouso deve atingir no mínimo **3.0:1** (WCAG 1.4.11).
5. **Acessibilidade Assistiva (WCAG 1.1.1 e 4.1.2)**:
   - Zero alertas de botões sem nome acessível (`aria-label`) em testes automatizados via `axe-core`.
