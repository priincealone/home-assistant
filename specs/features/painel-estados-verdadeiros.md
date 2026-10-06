# Painel: estados verdadeiros, régua de confirmação e Desfazer

- **Pedido do André**: "fase 2" da auditoria de 05/10/2026 (`artifacts/claude/auditoria-painel-05-10.md`):
  E-01 a E-04, M-07, M-08, M-09. Direção: refinar o painel atual, sem mudar a linguagem visual.
- **Status**: implementado e verificado em 06/10/2026 (publicado às 09:31). Detalhe e evidências em
  `ESTADO_DASHBOARD.md` (06/10). Pendente só o que está em "Fora desta entrega".
- **Alçada**: 2 (muda o contrato `lib/rooms.ts` e um sensor de template da HA). Nenhuma rota nova.

## Problema

A tela mostra estados que não existem e oferece ações que fazem o contrário do rótulo:

| # | O que a tela faz | O que é verdade |
| :--- | :--- | :--- |
| E-01 | "TV LIGADA" e botão "Desligar TV" | A nuvem SmartThings está congelada em `on` desde 01/10; a TV local diz `off`. O botão enviaria `turn_on` |
| E-02 | Selo "AO VIVO" fixo no CFTV | O DVR não responde (504 em 20 s); o vídeo fica "Conectando…" para sempre |
| E-03 | "Apagar todas" (energia) corta o PC num toque | O "Apagar tudo" das luzes, menos danoso, exige segurar |
| E-04 | Tomada `unavailable` aparece como "Desligada" | Viola CLAUDE.md §12 |

E não há como voltar atrás de uma ação em lote (M-07).

## Comportamento esperado

### E-01 · TV: uma fonte para o rótulo e para a ação (M-09)

- **HA**: `sensor.tv_sala_estado` passa a seguir a TV **local** (`media_player.tv_un65du8000gxzd`) sempre que ela
  tiver leitura (`on`/`off`/`standby`); a nuvem só decide quando a local estiver `unavailable`/`unknown`. É a mesma
  regra que a automação "Boa noite" já usa para desligar a TV. Fonte, volume e canal continuam vindo da nuvem
  (`specs/features/tv-estado-real-smartthings.md`).
- **Painel**: o botão de energia da TV (resumo e Central de Mídia) lê `sensor.tv_sala_estado` e envia o estado
  **explícito** oposto ao que mostra (`on`/`off`) para a TV local. Sem leitura → botão desabilitado ("TV sem leitura").
- **Contrato**: o dispositivo "TV Sala" em `lib/rooms.ts` passa de `media_player.sala_de_estar_tv` (nuvem) para
  `media_player.tv_un65du8000gxzd` (local) — conferido no registro: existe, plataforma `samsungtv`, ativo.
- Salvaguarda que continua valendo: `lib/ha.ts` não envia `turn_off` à TV local se ela não estiver ligada (a tecla
  POWER alterna — CLAUDE.md §11.3).

### E-02 · Câmera: o selo vem do player

- O player expõe seu estado: `conectando`, `ao vivo`, `reconectando`, `sem sinal`, `erro`.
- Sem primeiro quadro em 25 s → `sem sinal` (continua tentando em segundo plano, com a espera que já existe).
- Selos do cartão e do modal: "AO VIVO" só com vídeo andando; senão "CONECTANDO", "RECONECTANDO" ou "SEM SINAL".
- No modal: "Sem sinal do DVR" + botão "Tentar agora". O texto de carregamento deixa de dizer "Ao vivo".

### E-03 + M-08 · Régua de confirmação

| Exige segurar 800 ms | Toque simples |
| :--- | :--- |
| Apagar tudo (luzes) — já existia | Cômodo, luz, tomada que não seja a do PC |
| Dormir — já existia | Cenas aditivas (Cinema, Chegar, Gamer) |
| Apagar tomadas (energia) | Ligar qualquer coisa |
| Perfil "Modo Eco" (corta 3 tomadas) | Perfis que só ligam |
| **Desligar** a tomada "PC Principal" | |

- "Apagar tomadas" **não inclui** a tomada do PC Principal (perda de trabalho); ela só desliga pelo próprio cartão,
  segurando.
- Soltar antes do tempo não faz nada e mostra a dica "Segure para…".

### E-04 · Tomada indisponível

- Cartão esmaecido com ícone de sem-conexão e "Indisponível"; não aceita toque.
- Contagem: "N de M tomadas ligadas" sobre as que respondem, "+ K sem resposta" quando houver. O total deixa de ser
  o "5" fixo.
- Perfis e "Ligar essenciais" ignoram tomadas sem resposta.

### M-07 · Desfazer

- Depois de: Apagar tudo, Cinema, Chegar, Gamer, Apagar tomadas e Modo Eco → aviso por 8 s com o botão "Desfazer".
- Desfazer devolve **cada luz/tomada que mudou** ao estado que tinha antes (liga o que foi apagado, apaga o que foi
  acendido) e o brilho das luzes que continuaram acesas mas com brilho diferente (ex.: Painel a 20% no Cinema).
- Só `light.*` e `switch.*`. Nunca TV, console, ventilador ou aspirador.
- Compara com o estado **atual** no momento do toque: o que já voltou sozinho não recebe comando.

## Entidades envolvidas

`sensor.tv_sala_estado`, `media_player.tv_un65du8000gxzd`, `media_player.sala_de_estar_tv`,
`camera.rua_canal_2`, `camera.rua_canal_4` (via `/api/camera/*`), `switch.computador_socket_1/2`,
`switch.tomada_inteligente_socket_1/2`, `switch.banheiro_switch_2`, as luzes de `scripts.yaml` (cenas) e todos os
pontos de luz do contrato (Apagar tudo).

## Fora desta entrega

- **Desfazer depois de "Dormir"**: a tela entra em descanso logo em seguida, então o aviso não seria visto. Precisa
  de desenho próprio (talvez dentro do descanso).
- Desfazer não devolve temperatura de cor nem cor; luz religada volta com o brilho que a própria luz lembrar.
- Unificar o código de "segurar" do cabeçalho e das cenas no gancho novo (fica para a fase 3, junto com E-19).
- Visual do botão "Apagar tomadas" (continua o de destaque do modal; revisão de hierarquia na fase 3).

## Se o HA reiniciar no meio

- O sensor de template reavalia sozinho na partida; nada persiste.
- Desfazer vive só na tela (8 s); se o HA cair, o comando de desfazer falha como qualquer outro (aviso de erro e
  reversão otimista). Nada fica pendente.

## Como se verifica

- `check_config` passa; depois do reinício, `sensor.tv_sala_estado` = estado da TV local.
- `npx tsc --noEmit` passa.
- No navegador, **com `fetch` de escrita interceptado** (nenhum POST chega à casa): botão da TV pede o estado oposto
  ao que mostra; "AO VIVO" some com o DVR fora; "Apagar tomadas", "Modo Eco" e desligar o PC só disparam depois de
  800 ms e nunca incluem o PC no lote; tomada indisponível não dispara nada; "Desfazer" envia exatamente o inverso
  do que mudou.
- Nenhum dispositivo é acionado nos testes (CLAUDE.md §11).
