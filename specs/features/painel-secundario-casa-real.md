# Painel Secundário × casa real (integração com a Home Assistant)

**Status:** fase A (somente leitura) autorizada pelo André em 22/10/2026 ("integre ele com a casa real"); **fase B (comandos) autorizada em 22/10/2026 ("todos os comandos disponíveis")**; carregador pronto e interface implementada (§7).
**Fase A: IMPLEMENTADA em 22/10/2026** (somente leitura; ver §6). Fase B continua sem implementação.
**Contexto:** o Painel Secundário (`dashboard-lab/`) roda inteiro dentro da HA (`/local/painel-secundario/`, iframe de mesma origem) com dados simulados. Esta spec o liga à casa real sem criar rota nova no Painel Primário e **sem token**.

## 1. Como o painel enxerga a HA
O painel já vive dentro da própria HA como `panel_custom`. A HA entrega ao elemento do módulo (`casa-painel-secundario.js`) o objeto `hass` (sessão do **usuário logado**, com as permissões dele): `hass.states`, `hass.connected`, `hass.callService`. Não existe token para guardar, buscar ou transportar (CLAUDE.md §10). Fluxo:
```
HA frontend ──hass──▶ módulo (carregador, lado confiável) ──postMessage (mesma origem)──▶ iframe (painel)
                       └─ contrato.json (lista de permissão)  ◀── comandos só na fase B, validados AQUI
```
- O carregador **só repassa** os estados das entidades do contrato (nada além: nem outras entidades, nem atributos fora da lista), com *diff* por `last_updated`/`state` e limite de taxa; envia também `connected`.
- O painel só aceita mensagens vindas de `window.parent` e de mesma origem.
- Fora da HA (3011 direto, ou aba isolada) o painel continua em **modo simulado**; dentro da HA usa o modo real. `?fonte=simulado` força o simulado.

## 2. Contrato
Fonte única: `dashboard-app/lib/rooms.ts` (`comodosCompletos`, o contrato canônico do Painel Primário). O Secundário **lê** esse arquivo (não o edita): `scripts/manutencao/gerar_contrato_painel_secundario.mjs` gera `dashboard-lab/contrato.json` (`node --experimental-strip-types`), com cômodos (id, nome), dispositivos (id, `entityId`, domínio, categoria, nome, `batteryEntityId`, unidade) e as cenas permitidas (as de `app/api/scene/route.ts`: `script.cena_cinema`, `script.cena_dormir`, `script.cena_chegar`, `script.cena_gamer`). Teste (`node --test`): cada entidade do `contrato.json` existe no `core.entity_registry` (`HA_STORAGE` ou `../config/.storage`), não está desativada, tem o domínio declarado; sem a pasta, **pula com código 3** (nunca passa em silêncio). Regerar o contrato sempre que `lib/rooms.ts` mudar.

## 3. Fase A — somente leitura (autorizada)
- **Dados reais**: cômodos, nomes e aparelhos vêm do contrato; estados de `hass.states`. Os nomes do protótipo Lovable (modo simulado) deixam de valer no modo real.
- **Estados honestos** (CLAUDE.md §12): `unavailable`/`unknown` = estado próprio (cartão "Indisponível", borda tracejada, fora das contagens); leitura ausente = "—", **nunca 0**; conexão `hass.connected` falso = "offline · último estado"; antes do primeiro lote = "carregando".
- **Resumo e cômodos**: luzes acesas/total, ativos, portas abertas (`binary_sensor` de porta), temperatura/umidade do cômodo quando houver sensor; sensores com "há X min" (`last_changed`).
- **Manutenção real**: baterias de `batteryEntityId` (faixas já definidas: crítica ≤ 15 %, baixa ≤ 30 %, "sem leitura" ≠ 0 %) e lista de offline = entidades do contrato em `unavailable`/`unknown`. Sem itens inventados no modo real (os extras simulados só no simulado).
- **Segurança (câmeras)**: estado das câmeras do contrato (ao vivo / sem sinal); miniatura/stream **fora da fase A** (exige `entity_picture` autenticada: especificar à parte).
- **Cenas e aparelhos NÃO comandam** na fase A: os controles aparecem desabilitados com a dica "somente leitura (comandos na fase B)"; o toque longo e a folha mostram o estado real sem botões ativos. Garantias testáveis: o módulo carregador **não contém** `callService`/`callApi`/`callWS`; o painel, no modo real, não envia mensagem de comando; teste de varredura de código.
- **Favoritos** continuam locais ao navegador (`localStorage`); **Desfazer** fica inativo (não há o que desfazer sem comandos).
- **Aceite**: dentro da HA o painel mostra a casa de verdade e acompanha as mudanças em tempo real (acender uma luz fisicamente ou por outra tela reflete em ≤ 2 s); fora da HA segue simulado; todos os testes passam; nenhum `POST`/chamada de serviço partiu do painel (verificado no log da HA e na rede do navegador); medidas de layout sem regressão (casca de tablet, rail, folha).

## 4. Fase B — comandos (PLANO PARA APROVAÇÃO, 22/10/2026; nada implementado)
**Decisão de arquitetura:** os comandos saem pelo `hass.callService` do **carregador** (sessão e permissões do usuário logado na HA), com lista de permissão **no carregador** (lado confiável), nunca no iframe. Alternativa descartada: chamar as rotas do Painel Primário (`/api/toggle`, `/api/control`, `/api/tv`) — exigiria CORS e dependeria de uma porta sem autenticação (D-011) e do PC do Node; o Secundário rodaria menos "inteiro na HA".
**Protocolo:** o painel envia `{tipo:"comando", id, dispositivo:"<id do contrato>", acao, params}`; o carregador resolve o `entity_id` **só pelo contrato**, valida domínio, ação e faixas, executa, e responde `{tipo:"resultado", id, ok, erro?}`. O painel nunca informa `entity_id`, domínio ou serviço. Sem fila e **sem reenvio ao reconectar** (§13); com `hass.connected` falso, o carregador recusa.
**Tabela fixa (dispositivos do contrato; 39 hoje):**
| Grupo | Dispositivos | Ações permitidas |
| :-- | :-- | :-- |
| Luzes (`light.*`: 15) | Luz Sala, Painel, Cozinha, Copa, Lavanderia, 4 da Área Gourmet, Luz Luca, LED Luca, Muro, Corredor, Closet, LED Escritório, Luz Quarto | `turn_on` (`brightness` 1–255, `color_temp_kelvin` 2000–6500, `rgb_color` só se o aparelho declara suporte), `turn_off` |
| Interruptor de luz | `switch.banheiro_switch_1` (categoria iluminação) | `turn_on`, `turn_off` |
| Ventiladores (`fan.*`: 2) | Sala, Quarto | `turn_on`, `turn_off`, `set_percentage` (0–100), `oscillate` se o aparelho suporta |
| Cenas (4) | `script.cena_cinema`, `cena_dormir`, `cena_chegar`, `cena_gamer` | `script.turn_on` (nada além; lista fixa) |
| "Apagar/Acender tudo" por cômodo | só luzes e interruptores de luz do cômodo | `turn_off`/`turn_on` em lote **somente nas luzes** |
**Fora da fase B (continuam somente leitura):** tomadas (`tomada_luca_1/2`, `tomada_led_luca`, `banheiro_switch_2`, `ventilacao_ps5`), **tomadas do PC (`pc_socket_1/2`: cortá-las desliga o PC que hospeda a HA — bloqueadas em definitivo)**, **bloqueio para crianças (`bloqueio_luca`)**, TV Samsung e PS5 (`turn_off` da TV é a tecla POWER e alterna — §11.3; voltam em fase B2 com o mesmo cuidado do `/api/tv`), aspirador (fora do contrato), qualquer tranca, portão ou aquecedor (§11.4).
**Comportamento:** otimista com **trava de 5 s** (estado do painel vale até o HA confirmar; se não confirmar, reverte e mostra erro visível), alvos ≥ 44 px, nunca "ligado" falso: o cartão só fica "ligado" de verdade quando `hass.states` confirma. **"Desfazer"**: só para "Apagar/Acender tudo" de luzes (reaplica o estado anterior das mesmas luzes pelas mesmas ações permitidas); **cenas não têm Desfazer** (executam scripts da HA com efeitos que o painel não conhece). Cena = confirmação antes de executar (a decidir pelo André).
**Testes (todos sem tocar a casa):** dublê do `hass` (`callService` falso que só registra chamadas) cobrindo: cada ação permitida chama o serviço certo com os parâmetros certos; tudo que está fora da tabela é recusado (tomada PC, bloqueio, TV, `entity_id` informado pelo painel, domínio inventado, faixas inválidas, desconectado); sem reenvio ao reconectar; trava de 5 s e reversão; varredura de código: o iframe não tem `callService`. **Aceite físico** (único momento que toca a casa, §11.2): o André indica **uma luz de teste**; ligar/desligar uma vez, curto, devolvendo o estado anterior, e avisar o que foi acionado.
**Entrega em etapas:** B1 luzes e interruptor de luz (+ "Apagar/Acender tudo") → B2 ventiladores → B3 cenas → B4 TV/PS5 (com plano próprio). Cada etapa: spec atualizada, testes, rodada enxuta do porteiro, registro; o carregador muda uma vez na B1 (sobe o `?v=` do `module_url`, 1 reinício da HA) e daí em diante só os arquivos publicados com hash.

## 5. Riscos
- `hass` só existe dentro da HA; é a sessão do usuário (se ele sair, o painel mostra "offline").
- O módulo é cacheado por 31 dias em `/local`: mudar o carregador exige subir o `?v=` do `module_url` e reiniciar a HA (por isso o carregador deve ficar pequeno e estável; a lógica de adaptação vive nos arquivos publicados com hash).
- Divergência de contrato: regerar `contrato.json` ao mudar `lib/rooms.ts` (o teste acusa).
- Câmeras e miniaturas: fora desta fase.

## 6. Fase A — como ficou (22/10/2026)
**Arquivos**: `dashboard-lab/casa-real.js` (adaptador puro + ponte), `app.js` (UI, sem rede), `contrato.json`, `index.html`/`styles.css` (ajustes mínimos); carregador `config/www/casa-painel-secundario.js` **não foi alterado**. Publicação: `node scripts/manutencao/publicar_painel_secundario.mjs` (novo arquivo `casa-real.js` entra em ARQUIVOS e em PUBLICOS do `serve.mjs`).

**Mapeamento domínio → tipo de cartão**
| Contrato | Tipo na UI | Observação |
| :-- | :-- | :-- |
| `light` (nome com "Led") | `led` | liga/desliga por `state`; brilho `brightness` 0–255 → %; kelvin `color_temp_kelvin` |
| `light` | `light` | slider de brilho só depois de vista ligada com `brightness` |
| `switch` categoria iluminação | `light` (sem dimmer) | ex.: Interruptor 1 do banheiro |
| `switch` demais | `plug` | |
| `fan` | `fan` | `percentage` (mostrado em %), `oscillating` |
| `media_player` "TV" / demais | `tv` / `console` | ligado = on/playing/paused/idle; off/standby = desligado; `source`, volume, mudo |
| `binary_sensor` door/opening/window ou categoria segurança | `door` | `on` = Aberta, "há X min" de `last_changed` |
| `binary_sensor` motion/occupancy | `motion` | `on` = Movimento |
| `camera` | coluna Segurança | ao vivo / sem sinal; sem miniatura (o contrato atual não tem câmeras) |
| `unavailable`/`unknown`/`""`/`null`/ausente | "Indisponível" | tracejado, fora das contagens, vai para a lista offline |

**Ficou de fora (sem cartão, de propósito)**: sensores de temperatura/umidade (entram só no cabeçalho do cômodo), energia (`Consumo Instantâneo`, `Consumo PC`), sensor de bateria avulso (entra pela bateria do aparelho dono), aspirador (não está no contrato), clima/previsão e "Ar livre" (sem fonte), miniatura/stream de câmera, cor RGB do LED, entrada/app da TV como seletor, seletor de velocidade 1–3 do ventilador (usa % real).

**Como testar**: `node --test dashboard-lab/tests/*.test.mjs` (a partir da raiz; Node 22 não aceita a pasta como argumento). `contrato-registro.test.mjs` sai com código 3 sem `config/.storage` (ou `HA_STORAGE`). No navegador: abrir `/painel-secundario` na HA (somente olhar; nada de clicar em cartões) e comparar com `hass.states`; mensagens sintéticas por `iframe.contentWindow.postMessage({tipo:"casa-estados",...}, location.origin)`.

**Em aberto**: aceite "≤ 2 s ao acender uma luz fisicamente" não verificado (exige acionar a casa); câmeras do DVR não estão na HA; decidir a fase B.

## 7. Fase B — interface (22/10/2026, autorizada: "todos os comandos disponíveis")
**Implementada no painel** (`casa-real.js`, `app.js`, `styles.css`, `index.html`); o carregador, `comandos-regras.json` e `comandos.json` não foram tocados. Protocolo conforme §4; erros do carregador viram mensagens em português (`mensagemErro`).
| Dispositivo | Toque curto | Folha (só se a ação existe em `comandos.json` e o atributo de suporte existe) |
| :-- | :-- | :-- |
| Luzes / interruptor de luz | `ligar`/`desligar` | Ligado, brilho (`ajustar{brightness}` 1-255), temperatura (kelvin entre `min/max_color_temp_kelvin`), cor RGB (5 predefinidas; só com modo de cor) |
| Tomadas, bloqueio, PC | `ligar`/`desligar` (PC e bloqueio com confirmação) | Ligado |
| Ventiladores | `ligar`/`desligar` | Velocidade 1-3 (`velocidade{percentage}` 33/66/100), oscilar (se o atributo existe); direção não exposta |
| TV | `ligar`/`desligar` (só ligada) | Ligado, volume, mudo (entidade da nuvem), entrada (`source_list` filtrada pelo padrão do carregador), 13 botões de controle remoto; desabilitados com a TV apagada |
| PS5 | `ligar` (repouso) / `repouso` (confirmação) | Ligado |
| Aspirador (cartão no Closet) | abre a folha | iniciar, pausar, voltar à base, parar, localizar, limpeza local; sucção Silencioso/Padrão/Forte/Turbo (`select`) |
| Cenas | confirmação -> `executar` | n/a |
| "Apagar/Acender tudo" | `comando-lote` só luzes/interruptor de luz do cômodo; Desfazer 5 s | n/a |
**Segurança/comportamento**: otimista com trava de 5 s; nada de fila, reenvio ou comando ao reconectar; offline/carregando/indisponível/sem regra = desabilitado; painel nunca informa entity_id/serviço. **Kill-switch**: `?leitura=1` (painel ou página hospedeira) ou `comandos.json` ausente/inválido = tudo somente leitura. Testes: `dashboard-lab/tests/comandos.test.mjs` (30) + ajustes em `real.test.mjs`.
**Não verificado / em aberto**: aceite físico do André (uma luz de teste, latência <= 2 s); celular real; leitor de tela. Trava de 5 s é curta para ligar TV/PS5 (podem confirmar depois dela; o estado real corrige a tela, mas o aviso "não confirmou" aparece). Rótulo do botão segue "Apagar/Acender tudo" com `title`/`aria-label` dizendo que são só as luzes.

- **Rodada 13 (22/10/2026)**: botão do cômodo agora "Apagar luzes"/"Acender luzes" (só luzes e interruptor de luz, como sempre); folha do ventilador ganha "Modo" (`direcao`: `forward` "Ventilador (descer ar)" / `reverse` "Exaustor (subir ar)"), só com o atributo `direction` no estado real e o ventilador ligado; ajustes visuais do porteiro (B-1 a B-4). Testes 108/108. Detalhes em `painel-paralelo-lab.md`.
