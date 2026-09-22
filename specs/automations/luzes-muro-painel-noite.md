# Automação · Muro e Painel acesos do pôr do sol à meia-noite

- **Data**: 19/09/2026
- **Pedido**: "após o pôr do sol todos os dias as luzes muro e painel irão se acender, serão apagadas
  às 00h ou quando forem apagadas manualmente"
- **Status**: aprovado pelo pedido do André; implementado em `config/automations.yaml`

## Comportamento

| Item | Definição |
| :--- | :--- |
| **Gatilho de acender** | Evento `sunset` do `sun.sun`, todo dia |
| **Gatilho de apagar** | `00:00:00` |
| **Atuadores** | `light.circulacao_switch_1` (Muro) · `light.painel` (Painel da TV) |
| **Apagar à mão** | Nada a fazer: o acender é **de borda** — a automação dispara uma vez no pôr do sol e não reacende. O que o André apagar fica apagado |
| **Condições** | Nenhuma no acender. No apagar, só envia comando para quem estiver aceso |

## Dono de cada atuador

| Atuador | Outras automações | Convivência |
| :--- | :--- | :--- |
| `light.circulacao_switch_1` | "Porta do quarto fechada à noite" apaga todas as luzes (22h–6h) | Coerente: dormir antes da meia-noite apaga o Muro também |
| `light.painel` | "Porta do quarto fechada" apaga (22h–6h); "Porta do quarto aberta" **acende** (22h–6h) | Depois da meia-noite, abrir a porta reacende o Painel como luz de guia — é o comportamento pedido naquela automação e tem precedência. Esta aqui não o apaga de novo |

## Se o Home Assistant reiniciar

- **Durante o pôr do sol**: o evento é perdido e as luzes não acendem naquela noite. Aceito de
  propósito — reacender na partida desfaria um apagar manual.
- **Na virada da meia-noite**: há gatilho de partida com janela de 00:00 a 00:30. Se o HA voltar
  nessa janela, apaga o que ficou aceso. Fora dela, não mexe — depois das 00:30 uma luz acesa pode ser
  intencional (o Painel aceso pela porta do quarto, por exemplo).

## Fora do escopo

- Horário de verão / fuso: o HA calcula o pôr do sol pela localização configurada.
- Brilho: as duas são interruptores Tuya liga/desliga; não há dimerização.
