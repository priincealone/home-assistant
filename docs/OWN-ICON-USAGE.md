# Guia de Uso da Biblioteca de Ícones — AeroGlyphs

**Documento**: `docs/OWN-ICON-USAGE.md`  
**Autor**: Direção de Design de Produto & Engenharia Frontend  
**Biblioteca**: AeroGlyphs Home  
**Repositório Alvo**: `c:\HomeAssistant\dashboard-app`  

---

## 1. Como Importar e Usar

A biblioteca exporta um componente unificado e tipado `<Icon />`, que pode ser consumido em qualquer componente React da aplicação:

```tsx
import { Icon } from "@/app/components/icons";

// Exemplo 1: Uso decorativo simples (ao lado de texto legível)
export function CardHeader() {
  return (
    <div className="flex items-center gap-2">
      <Icon name="light" size={24} />
      <span>Iluminação Principal</span>
    </div>
  );
}

// Exemplo 2: Dispositivo ligado (Estado Ativo)
export function ActiveLamp() {
  return (
    <div className="flex items-center gap-2 text-amber-300">
      <Icon name="light" size={24} state="active" variant="filled" />
      <span>Sala de Estar • Acesa</span>
    </div>
  );
}

// Exemplo 3: Botão de ação que contém APENAS o ícone (Obrigatório ariaLabel)
export function SettingsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/10"
    >
      <Icon
        name="settings"
        size={20}
        decorative={false}
        ariaLabel="Abrir configurações da casa"
      />
    </button>
  );
}
```

---

## 2. Catálogo Canônico Inicial (13 Ícones Semânticos)

| Nome Semântico (`name`) | Domínio | Descrição Visual Autoral | Variantes Suportadas |
|:---|:---|:---|:---:|
| `"home"` | Navegação | Silhueta arquitetônica contemporânea com porta | `outline`, `filled` |
| `"room"` | Ambientes | 4 Quadrantes modulares simétricos | `outline`, `filled` |
| `"light"` | Iluminação | Plafon contemporâneo com difusor e feixe descendente | `outline`, `filled` |
| `"temperature"` | Climatização | Termômetro vertical graduado com bulbo e menisco | `outline` |
| `"humidity"` | Climatização | Gota de água fluida com nó de condensação de vapor | `outline`, `filled` |
| `"energy"` | Telemetria | Relâmpago estilizado com 3 segmentos lineares a 60° | `outline`, `filled` |
| `"scene"` | Automação | Prisma estelar de 4 pontas com micro-faísca | `outline`, `filled` |
| `"automation"` | Rotinas | Dois elos de engrenagem sinápticos interconectados | `outline` |
| `"connection"` | Conectividade | Nó pontual com 3 ondas concêntricas de 90° | `outline` |
| `"offline"` | Falha / Rede | Ondas de sinal cortadas por traço a 45° | `outline` |
| `"alert"` | Segurança | Triângulo equilátero arredondado com exclamação | `outline`, `filled` |
| `"settings"` | Sistema | Engrenagem industrial de 6 dentes com furo central | `outline` |
| `"history"` | Telemetria | Mostrador de relógio com seta orbital de histórico | `outline` |

> [!NOTE]
> **Fallback Automático**: Se for passado um nome não cadastrado (ex: `name="desconhecido"`), o componente renderiza de forma elegante o `FallbackGlyph` (um quadrado pontilhado com interrogação), sem quebrar a tela ou gerar erros no console.

---

## 3. Propriedades do Componente (`IconProps`)

| Prop | Tipo | Padrão | Descrição |
|:---|:---|:---:|:---|
| `name` | `SemanticIconName \| string` | *obrigatório* | Nome semântico do ícone cadastrado no registry. |
| `size` | `16 \| 20 \| 24 \| 32 \| 48 \| number` | `24` | Dimensão em pixels (largura e altura equivalentes). |
| `strokeWidth` | `number` | *auto* | Espessura de traço. Se omitido, é calculado oticamente conforme o `size`. |
| `variant` | `'outline' \| 'filled'` | `'outline'` | Variante morfológica (contorno padrão ou sólido quando justificado). |
| `state` | `'idle' \| 'active' \| 'disabled' \| 'offline' \| 'alert'` | `'idle'` | Estado do dispositivo/ação, controlando cor e auras luminosas. |
| `decorative` | `boolean` | `true` | Se `true`, emite `aria-hidden="true"`. Se `false`, exige `ariaLabel`. |
| `ariaLabel` | `string` | — | **Obrigatório se `decorative={false}`**. Descrição para leitores de tela. |
| `color` | `string` | `currentColor` | Cor de traço explícita (sobrescreve a cor herdada). |
| `className` | `string` | `""` | Classes CSS adicionais. |
| `title` | `string` | — | Tooltip nativo do navegador (`<title>` dentro do SVG). |

---

## 4. Diretrizes de Acessibilidade (WCAG 2.1 AA)

### Regra 1: Ícone Decorativo (Padrão)
Quando o ícone está acompanhado de um texto descritivo visível, ele deve ser **invisível** para leitores de tela:
```tsx
// ✅ Correto: O leitor lê apenas "Luz da Sala"
<div className="flex items-center gap-2">
  <Icon name="light" size={20} decorative={true} />
  <span>Luz da Sala</span>
</div>
```

### Regra 2: Ícone Informativo / Botão Somente-Ícone
Quando o botão ou elemento não possui texto visível, o ícone é a única affordance. O TypeScript **exige** o `ariaLabel`:
```tsx
// ❌ Incorreto: Botão sem nome acessível
<button><Icon name="settings" size={24} /></button>

// ✅ Correto: Botão com acessibilidade declarativa
<button type="button">
  <Icon name="settings" size={24} decorative={false} ariaLabel="Configurações do painel" />
</button>
```

---

## 5. Exemplos de Uso Correto (Do) e Incorreto (Don't)

### O Que Fazer (Do ✅)
- ✅ **DO**: Usar `state="active"` para dispositivos que estão consumindo energia ou cômodos com luzes acesas.
- ✅ **DO**: Manter a área de clique externa em **44px × 44px** mesmo quando o ícone for menor (ex: 16px ou 20px).
- ✅ **DO**: Deixar o traço ótico calcular automaticamente (`size={24}` resulta em traço de 1.75px).
- ✅ **DO**: Usar a variante `filled` apenas em estados onde a massa visual é justificável (ex: abas ativas, lâmpada acesa).

### O Que Não Fazer (Don't ❌)
- ❌ **DON'T**: Utilizar o caractere `"✕"` em botões de fechar; utilize o glifo ou botão padronizado.
- ❌ **DON'T**: Inserir tags `<svg>` com geometria manual inline nos novos componentes sem passar pela biblioteca.
- ❌ **DON'T**: Forçar cores hardcoded no SVG (como `#ffaa00`); use `currentColor` e as classes semânticas de estado.
- ❌ **DON'T**: Copiar a nomenclatura proprietária de ícones de outros ecossistemas (como SF Symbols da Apple).
