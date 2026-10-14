# SYSTEM-MAP — entidade, cômodo, integração

Última revisão: 15/09/2026 · Fonte: `core.entity_registry`, `core.area_registry` e `core.device_registry`
lidos ao vivo, mais `dashboard-app/lib/rooms.ts`. Já reflete a correção da inversão Cozinha/Lavanderia.

**A fonte de verdade é o registro do Home Assistant.** Cache, snapshot ou documento que discorde dele
está errado até prova em contrário — foi assim que a inversão foi resolvida.

## Os 10 cômodos

| Cômodo | Entidades | Integração |
| :--- | :--- | :--- |
| **Sala de estar** | `light.luz_sala`, `fan.ventilador_sala` (um aparelho aberto em dois) · `light.painel` · `media_player.tv_un65du8000gxzd` (local) · `media_player.sala_de_estar_tv` (nuvem, oculta) · `remote.tv_un65du8000gxzd` · `media_player.sala_de_estar_ps5` · `switch.ventilacao_ps5` · temperatura e umidade | LocalTuya, SamsungTV, SmartThings, PS5, Tuya |
| **Quarto** | `light.luz_quarto`, `fan.ventilador_quarto` · `binary_sensor.porta_do_quarto_porta` | LocalTuya, Tuya |
| **Quarto Luca** | `light.quarto_luca_switch_1` · `light.yeelink_cn_581528686_bslamp2_s_2_light` · `switch.tomada_inteligente_socket_1/2` · medição de energia | switch_as_x, Xiaomi Home, Tuya |
| **Closet** | `light.closet_switch_1` · `light.led_escritorio_sonoff_1001dff472` · `switch.computador_socket_1/2` + energia · `vacuum.dreame_us_415783444_mc1808` · Roteador Closet | switch_as_x, Sonoff, Tuya, Xiaomi Home |
| **Cozinha** | `light.cozinha_copa_varanda_switch_1` | switch_as_x sobre Tuya |
| **Copa** | `light.cozinha_copa_varanda_switch_2` | switch_as_x sobre Tuya |
| **Lavanderia** | `light.cozinha_copa_varanda_switch_3` · `binary_sensor.sensor_lavanderia_movimento` | switch_as_x, Tuya |
| **Área Gourmet** | `light.luzes_externas_switch_1` Plafon · `_2` Pendente · `_3` Led · `_4` Spots · `binary_sensor.sensor_area_gourmet_movimento` | switch_as_x, Tuya |
| **Circulação** | `light.circulacao_switch_1` Muro · `light.circulacao_switch_2` Corredor | switch_as_x sobre Tuya |
| **Banheiro** | `switch.banheiro_switch_1` e `_2` | Tuya |

### O interruptor de três teclas — leia antes de mexer

`cozinha_copa_varanda` é **um** aparelho com três teclas, e já esteve invertido:

| Tecla | Entidade em uso | Cômodo |
| :--- | :--- | :--- |
| 1 | `light.cozinha_copa_varanda_switch_1` | **Cozinha** |
| 2 | `light.cozinha_copa_varanda_switch_2` | Copa |
| 3 | `light.cozinha_copa_varanda_switch_3` | **Lavanderia** |

Corrigido em 15/09/2026 em seis lugares: registro `light.*`, nomes `switch.*`, `template_sensors.yaml`,
`automations.yaml` e `lib/rooms.ts` (o `manifesto-comodos.json` é histórico desde 13/10/2026).

⚠️ **Resíduo conhecido**: os títulos das entradas `switch_as_x` em `core.config_entries` ainda trazem
os rótulos antigos e invertidos. Não afetam comportamento, mas enganam quem audita — foi o que induziu
a auditoria do Antigravity ao erro.

⚠️ **Estados iguais escondem inversões.** Para conferir, ligue uma tecla de cada vez e olhe a lâmpada.

## Sensores derivados (`config/template_sensors.yaml`)

| Sensor | O que é | Quem consome |
| :--- | :--- | :--- |
| `sensor.luzes_<cômodo>` (9) e `sensor.luzes_acesas_total` | Contagem de luzes acesas | Painel |
| `sensor.tv_fonte` | Fonte legível da TV | Painel |
| `sensor.sala_atividade` | O que está acontecendo na sala (TV, PS5 ou nada) | Painel |
| `sensor.saude_*` (6) | Passos, distância, calorias, FC de repouso, sono e atualização | Painel |

Alimentados por webhook cujo id está em `config/secrets.yaml` (`webhook_saude`).

## O contrato do painel

`lib/rooms.ts` faz duas coisas ao mesmo tempo: descreve a casa **e** é a lista de permissão das rotas
`toggle` e `control`. Entidade fora dela não é acessível pelo painel, nem para leitura.

### Entidades citadas pelo painel que não existem no HA

Levantadas em 15/09/2026, **ainda não corrigidas**:

| Entidade citada | Situação |
| :--- | :--- |
| `binary_sensor.sensor_banheiro_movimento` | Não existe |
| `binary_sensor.sensor_closet_movimento` | Não existe |
| `sensor.dreame_us_415783444_mc1808_battery_battery_level` | Id errado; o real é `..._battery_level_p_2_1` |
| `todo.tarefas` | O real é `todo.lista_de_compras` (as rotas já usam o certo) |

Não quebram o build — `entity_id` é string e o TypeScript não valida contra a casa. Chegam à interface
como estado nulo silencioso.

❓ **DESCONHECIDO** — se os sensores de movimento de Banheiro e Closet existem fisicamente e nunca
foram integrados, ou se foram planejados e não comprados.

## Automações e os atuadores que elas governam

| Automação | Atuadores sob sua responsabilidade |
| :--- | :--- |
| Ventilação do PS5 | `switch.ventilacao_ps5` |
| Porta fechada à noite | todas as luzes (por template) + TV |
| Porta aberta à noite | `light.painel` |
| Movimento na Lavanderia | `light.cozinha_copa_varanda_switch_3` |
| Movimento na Área Gourmet | `light.luzes_externas_switch_1..4` |

Ver `docs/AUTOMATION-POLICY.md` para a regra de dono único por atuador.

## Agentes externos que agem sobre a casa

| Agente | O que faz | Visível no HA? |
| :--- | :--- | :--- |
| App Smart Life (nuvem Tuya) | Rotinas de presença próprias em Lavanderia e Banheiro | Só como cenas; a execução é na nuvem |
| Interruptor de parede | Ação física direta | Sim, como mudança sem contexto |
| App do HA / painel | Ação do usuário | Sim, com contexto de usuário |

Ferramenta para distinguir: `scripts/diagnostico/quem_acendeu.py`.
