# Novos dispositivos no painel — sensores de porta e Led + tomada (26/09/2026)

**Estado**: **implementado em 26/09/2026** após aprovação do André (tecla 1 = Led, tomada com comando, portas só estado).

## O que entrou no HA

Dispositivos criados no registro desde 20/09, segundo `created_at`:

| Dispositivo | Área no HA | Entidades úteis | No painel hoje |
| :--- | :--- | :--- | :--- |
| Sensor porta lavanderia (Tuya Door Sensor) | `lavanderia` | `binary_sensor.door_sensor_2_porta`, `sensor.door_sensor_2_bateria` | não |
| Sensor porta sala (Tuya Door Sensor) | `sala_de_estar` | `binary_sensor.sensor_porta_sala_porta`, `sensor.sensor_porta_sala_bateria` | não |
| Led + tomada (Tuya 1 Gang Switch+Socket) | `quarto_luca` | `switch.led_tomada_switch_1` (também exposto como `light.led_tomada_switch_1`), `switch.led_tomada_switch_2` | não |

**Fora do escopo**: o Medidor energia (`sensor.medidor_energia_medidor_teste_dp1`) está bloqueado, ver
K-16 em `planning/BLOCKED.md`. As entidades de configuração do Led + tomada
(`light.led_tomada_luz_de_fundo`, `select.led_tomada_power_on_behavior`,
`select.led_tomada_modo_de_luz_indicadora`) ficam de fora: não se opera luz de fundo nem modo de
indicador pelo painel.

## Como entra

Segue o precedente já existente no contrato: `porta_quarto` (`binary_sensor` + `batteryEntityId`) e as
tomadas de `quarto_luca` (`categoria: "tomada"`).

1. **Sensor de porta da lavanderia** → cômodo `lavanderia`, `dominio: "binary_sensor"`,
   `categoria: "seguranca"`, `batteryEntityId: "sensor.door_sensor_2_bateria"`.
2. **Sensor de porta da sala** → cômodo `sala_de_estar`, mesmo formato,
   `batteryEntityId: "sensor.sensor_porta_sala_bateria"`.
3. **Led + tomada** → cômodo `quarto_luca`. A tecla 1 é o LED (confirmado pelo André) e entra como `light`
   (`light.led_tomada_switch_1`, nome "Led"); a tecla 2 é a tomada e entra como `switch` com
   `categoria: "tomada"` (`switch.led_tomada_switch_2`, nome "Tomada do Led").
4. Cada entidade nova entra **uma vez só**: `switch.led_tomada_switch_1` e `light.led_tomada_switch_1` são o
   mesmo ponto físico, e a lista de permissão de `toggle`/`control` não deve ter os dois.

## Decisões (respondidas pelo André em 26/09)

- A **tecla 1 é o LED**; a outra é a tomada.
- A **tomada tem comando** pelo painel.
- Os **sensores de porta** entram **só como estado** (aberta/fechada e bateria).

## Verificação (definição de pronto)

- Cada `entity_id` novo conferido contra `core.entity_registry` no momento da edição.
- `npx tsc --noEmit` em `dashboard-app/` com saída 0.
- Painel aberto: os dois sensores mostram aberta/fechada e bateria; o Led + tomada mostra o estado real e o
  comando correto age no ponto certo.
- `unavailable` e `unknown` aparecem como estados próprios, nunca como "desligado".
- Registro em `ESTADO_DASHBOARD.md`; `CASA.md` atualizado; item movido em `planning/`.
- Commit em `dashboard-app/` (repositório próprio) e, à parte, no repositório do HA.

## Não verificado

- O comando do Led e da tomada pelo painel: nada foi acionado (regra §11.1).
- Se os sensores de porta mudam para "Aberta" ao abrir a porta: só se viu "Fechada" com bateria de 100%.
