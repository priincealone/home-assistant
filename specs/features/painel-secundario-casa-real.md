# Painel Secundário × casa real (integração com a Home Assistant)

**Status:** fase A (somente leitura) autorizada pelo André em 22/10/2026 ("integre ele com a casa real"); **fase B (comandos) NÃO autorizada**: precisa de aprovação do plano abaixo (CLAUDE.md, alçada 2 + §11).
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

## 4. Fase B — comandos (PROPOSTA, depende de aprovação do André)
Só depois de a fase A rodar uns dias. Princípios: **lista de permissão no lado confiável (carregador)**, nunca no iframe; entity_id nunca vem do iframe — só o `id` do contrato; domínio/serviço por tabela fixa:
| Domínio | Serviços permitidos |
| :-- | :-- |
| `light` | `turn_on` (brightness, color_temp, rgb), `turn_off` |
| `switch` | `turn_on`, `turn_off` (**exceto** tomadas/cargas de risco: lista de exclusão a definir pelo André) |
| `fan` | `turn_on`, `turn_off`, `set_percentage`, `oscillate` |
| `media_player` (TV) | **mesmo caminho do `/api/tv`** do Painel Primário (`turn_off` é a tecla POWER e alterna: condicionar ao estado, um caminho de cada vez — CLAUDE.md §11.3); volume/entrada só se o contrato já os permite |
| `vacuum` | `start`, `pause`, `return_to_base`, `set_fan_speed` |
| cenas | `script.turn_on` apenas dos 4 scripts do contrato |
Proibidos: tranca, portão, aquecedor, qualquer carga de risco (§11.4). Travas otimistas com TTL de 5 s e reversão em falha; erro visível ao usuário; **sem reenvio automático** ao reconectar (§13). "Desfazer" só reaplica o estado anterior pelas mesmas chamadas permitidas, nunca em lote cego. **Testes**: todo teste de escrita com **dublê do HA**; nenhum teste aciona a casa (§11). Quando o André aprovar: especificar caso a caso as exclusões, a TV e o aspirador.

## 5. Riscos
- `hass` só existe dentro da HA; é a sessão do usuário (se ele sair, o painel mostra "offline").
- O módulo é cacheado por 31 dias em `/local`: mudar o carregador exige subir o `?v=` do `module_url` e reiniciar a HA (por isso o carregador deve ficar pequeno e estável; a lógica de adaptação vive nos arquivos publicados com hash).
- Divergência de contrato: regerar `contrato.json` ao mudar `lib/rooms.ts` (o teste acusa).
- Câmeras e miniaturas: fora desta fase.
