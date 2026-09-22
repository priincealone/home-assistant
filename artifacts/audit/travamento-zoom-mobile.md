# Travamento do painel em celular — diagnóstico

- **Data**: 22/09/2026
- **Relato**: card "travado" no painel em dispositivo móvel, com captura de tela
- **Natureza**: diagnóstico.
- **Status**: ✅ **corrigido em 22/09**, a pedido do André — e com uma camada a mais do que esta
  proposta previa: o Safari do iOS **ignora** `user-scalable=no`, então a pinça só é barrada pelos
  eventos `gesturestart`. Ver `ESTADO_DASHBOARD.md`.

---

## 1. O que a captura mostra

Três sinais, lidos juntos:

1. O conteúdo está **maior** do que o layout renderiza naquela largura — os cartões de cômodo
   aparecem com cerca de 160px onde o painel desenha 146px.
2. O cartão da esquerda está **cortado na borda da tela**, com parte do corpo fora do viewport.
3. A faixa de widgets aparece cortada do mesmo jeito, no mesmo eixo.

Isso não é quebra de layout. É a assinatura de **zoom por pinça**: a página continua com a mesma
largura de layout, mas o *viewport visual* está ampliado e deslocado. O que se enxerga é uma janela
menor sobre a mesma página.

**Reprodução**: apliquei `zoom: 1.18` e rolei a página no mesmo tamanho de tela da captura
(471×385). O resultado é visualmente equivalente ao relatado — mesma proporção de cartão, mesmo
corte na borda, mesma faixa de widgets partida.

---

## 2. Causa

Três configurações se somam. Nenhuma delas é defeito isolado; o problema nasce da combinação.

### 2.1. A pinça está liberada

`app/layout.tsx` declara:

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

Medido no navegador, a meta gerada é exatamente:

```
width=device-width, initial-scale=1, viewport-fit=cover
```

**Não há `maximum-scale` nem `user-scalable=no`.** Qualquer toque com dois dedos amplia o painel.
Num painel de parede isso acontece sozinho: a mão apoia, dois dedos encostam, e o painel amplia.

### 2.2. O duplo toque também amplia

`touch-action` medido nos contêineres da página:

| Elemento | `touch-action` |
| :--- | :--- |
| `html` | **auto** |
| `body` | **auto** |
| `.dashboard` | **auto** |
| `.rooms-section` | **auto** |
| `.scenes-deck-container` | **auto** |
| `.daily-panorama-bar` | **auto** |
| `.hero-glass-enclosure` | **auto** |
| `.room-card` | `manipulation` |

Os **controles** têm `touch-action: manipulation`, que desliga o duplo toque para ampliar. As **áreas
entre eles** não têm. Um duplo toque no vão entre dois cartões, no título de seção ou na moldura do
herói amplia a página — e é justamente onde o dedo erra quando o alvo é pequeno.

### 2.3. Depois de ampliado, não há caminho de volta

- `body { overflow-x: hidden }`: o layout não rola na horizontal. O deslocamento lateral existe só
  no viewport visual, que se arrasta e volta sozinho — a sensação é de **conteúdo preso fora da
  tela**.
- `html { overscroll-behavior: none }`: elimina o efeito elástico que normalmente avisa "você chegou
  na borda". Sem esse retorno, a tela parece simplesmente travada.
- Num tablet em modo quiosque **não há barra do navegador**, nem menu, nem gesto óbvio de "voltar ao
  tamanho normal". O painel fica ampliado até alguém recarregar.

**Resumindo**: a pinça é fácil de disparar sem querer, o duplo toque também, e o painel não oferece
nenhuma saída. O card não está travado — a janela é que está.

---

## 3. Teste de 5 segundos para confirmar

Com o painel no estado "travado", **recarregue a página** (puxar para baixo, ou fechar e abrir o
atalho). Se o layout voltar ao normal na hora, era zoom — nada em CSS ou em componente se corrige
com um reload.

Se **não** voltar, o diagnóstico acima está errado e o caminho é outro: aí o alvo passa a ser o
estado do componente, e vale capturar a tela logo depois do reload para comparar.

---

## 4. Correção proposta

### 4.1. Fechar a pinça no painel (`app/layout.tsx`)

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,      // ← novo
  userScalable: false,  // ← novo
  viewportFit: "cover",
  themeColor: [ /* … inalterado … */ ],
};
```

### 4.2. Fechar o duplo toque nas áreas vazias (`app/globals.css`)

```css
html,
body {
  touch-action: manipulation;
}
```

⚠️ **Correção da proposta original, que dizia `pan-y`.** `pan-y` também mataria a pinça, mas
`touch-action` se combina **por interseção com os ancestrais** — um filho não recupera o eixo que o
pai proibiu. O painel tem três barras que rolam na horizontal (ações rápidas no celular, abas do
papel de parede, abas da central de mídia) e as três parariam de rolar. `manipulation` remove o
duplo toque e preserva os dois eixos; a pinça é barrada nas outras duas camadas.

### 4.3. Safari do iPad — a camada que a proposta original não previa

O Safari do iOS/iPadOS **ignora `user-scalable=no` desde o iOS 10**. Lá a pinça só para com os
eventos proprietários de gesto:

```js
['gesturestart', 'gesturechange', 'gestureend'].forEach(function (evt) {
  document.addEventListener(evt, function (e) { e.preventDefault(); }, { passive: false });
});
```

Em outros navegadores esses eventos nunca disparam, então o custo é zero.

### 4.4. Se houver app de quiosque

Fully Kiosk e similares têm uma opção própria de desabilitar zoom. Vale ligar também: é a única
camada que sobrevive a uma atualização do painel que desfaça o item 4.1 sem querer.

---

## 5. O que se perde, dito com todas as letras

Desligar o zoom **remove um recurso legítimo de acessibilidade**. Quem depende de ampliar para ler
perde essa saída, e em um site comum isso seria inaceitável.

Aqui é defensável por três motivos, nesta ordem:

1. O aparelho é **fixo na parede**, de uso conhecido, não é um site aberto ao público.
2. A legibilidade foi tratada na origem: nas correções de 22/09 os alvos foram para 44px, o anel de
   foco para 3px, e a escala de parede (§4 da curadoria) trata o tamanho do texto. **Ampliar deixa
   de ser a forma de enxergar.**
3. Ampliar sem querer, num painel sem barra de navegador, **custa mais do que rende**: o painel para
   de funcionar como controle da casa até alguém recarregar.

Se um dia o painel for usado na mão por alguém que precise ampliar, o certo é reverter o 4.1 e
resolver a legibilidade pelo token de escala, não pela pinça.

---

## 6. Não verificado

| Item | Por quê |
| :--- | :--- |
| A pinça no aparelho real | O navegador aqui não faz gesto de dois dedos; reproduzi por `zoom` em CSS, que produz o mesmo efeito visual, não o mesmo gesto |
| Se o zoom persiste após recarregar no aparelho do André | Depende do navegador e do app de quiosque. É o que o teste da §3 responde |
| Se houve, além do zoom, alguma falha de toque | Medi os pontos de toque da tela inicial e todos chegam ao controle correto. Se o painel estava **sem responder**, e não apenas ampliado, o diagnóstico muda — me diga e investigo por esse lado |
