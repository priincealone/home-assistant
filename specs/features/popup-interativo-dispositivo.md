# Popup interativo do dispositivo (toque no card)

**Status:** aprovado pelo André em 29/10/2026 (mudança de hábito aceita). Painel Principal (`dashboard-lab/`).
**Inspiração:** o app HomeView (painel de Apple Home): tocar no card abre um popup do aparelho com um dial circular. Só o
comportamento visível foi observado; nada foi copiado do app (código fechado).

## Comportamento

1. **Toque simples** num card de aparelho com ajustes (luz/LED com brilho ou temperatura de cor, ventilador, TV) **abre o popup**.
   O que liga/desliga passa a ser o **interruptor do próprio card** (o `.sw`, com área de toque ampliada).
2. Aparelhos sem ajustes de verdade (tomadas, interruptor de luz sem dimmer, PS5, sensores) **continuam alternando com o toque**.
   Tomadas continuam com a confirmação ao desligar.
3. O popup é a **folha de ajustes que já existe** (toque longo, Shift+Enter, F10 e botão direito continuam abrindo a mesma folha),
   agora com um **dial** no topo:
   - anel de 270° (abertura embaixo) que se preenche; arrastar com dedo, mouse ou caneta ajusta o valor principal
     (luz: brilho; ventilador real: velocidade; TV: volume);
   - no centro, o **botão grande de liga/desliga** (`data-sw="on"`), o valor em número e o estado;
   - o controle nativo `input[type=range]` continua no DOM, **escondido só visualmente** (teclado, leitor de tela e testes);
     o dial só o move e dispara os mesmos eventos `input`/`change`. Toda a lógica de comando, debounce, trava otimista e
     reversão em erro é a de antes.
4. Demais controles (temperatura da cor, oscilar, entrada, mudo, controle remoto, favorito) ficam abaixo do dial como hoje.
5. Sem comandos (kill-switch, offline, carregando): o popup abre, o dial fica desabilitado e o aviso existente aparece.

## Segurança e regras mantidas

- Nenhum comando novo: o dial usa as ações `ajustar`/`velocidade`/`volume` já permitidas em `comandos-regras.json`.
- Desligar tomada, TV e PS5 mantém as confirmações atuais. O dial nunca liga/desliga sozinho: o valor 0 do brilho vira 1.
- Qualidade visual: `docs/UI-QUALITY-POLICY.md` (sem corte, sem rolagem horizontal, texto grande, 320 a 1920 px).

## Se a HA reiniciar no meio

Nada muda: o popup só lê o estado e manda comandos pelo mesmo caminho de antes; sem estado, abre desabilitado.

## Verificação

`node --test dashboard-lab/tests/*.test.mjs`; auditoria no navegador em 320, 390, 768, 1024 e 1440 px; arraste do dial por ponteiro.

## Adendo (29/10/2026): ventilador

O popup do ventilador (toque no corpo do card) tem um **dial de 3 velocidades**: anel de 270° com 3 marcas (níveis 1, 2 e 3) em volta de um **ventilador
que gira** (mais rápido a cada nível; parado quando desligado; sem giro com "reduzir movimento"). Arrastar ou tocar no anel escolhe o nível, que só é
enviado **ao soltar**; no modo simulado, escolher uma velocidade liga o ventilador (como o brilho liga a luz). O centro liga/desliga. Os botões de
velocidade (`data-seg="vel"`) seguem no DOM, escondidos só visualmente, e o dial os aciona: nenhum comando novo. Oscilar e Modo (direção, modo real)
continuam abaixo do dial. Sem velocidade disponível (regra ou atributo ausente), o popup abre sem dial.
