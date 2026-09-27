# Automação · Monitoramento de rede: internet, nós do mesh e dispositivos críticos

- **Data**: 25/09/2026
- **Pedido**: "quais automações referentes a minha rede mesh e internet poderiam ser adicionadas" →
  "escreve a spec dessa primeira leva" (itens 1, 4, 6 e 7 da proposta); em 26/09/2026 entrou o
  R-05 (lâmpadas) a partir das sugestões do Perplexity
- **Status**: **aprovado e implementado em 26/09/2026** (alçada 2). Desvios da spec original no
  fim do arquivo, em "Como ficou implementado".
- **Natureza**: só leitura e notificação. **Nenhum atuador físico é tocado.**

## Fatos confirmados no repositório (25/09/2026)

| Fato | Onde |
| :--- | :--- |
| `ping` já instalado, mas só com **um** alvo: o PC (`192.168.31.22`; `binary_sensor.pc_andre` + sensores de RTT, jitter e perda) | `core.entity_registry` |
| Dois roteadores Xiaomi **RD15** via `xiaomi_home`: `771718035` = **Roteador Closet** (o principal, atende os clientes) e `863726955` = **Roteador Sala** (nó do mesh) | `core.entity_registry`, nomes amigáveis no banco |
| Cada roteador expõe `sensor.*_connected_device_number_p_2_3`, `*_download_speed_p_2_1`, `*_upload_speed_p_2_2` e eventos `device_connect` / `device_disconnect` | idem |
| Notificação: `notify.iphone_de_andre` e `notify.ipad_de_andre` | idem |
| Sem `speedtest`, sem `device_tracker` de roteador, sem sensor de "internet no ar" | idem |
| IP do gateway `192.168.31.1` e do DVR `192.168.31.216` (fixo no próprio DVR; sem reserva no roteador — K-06) | `CASA.md`, `planning/BLOCKED.md` |

## Pré-requisitos

1. **André** — confirmar o IP do gateway (assumido `192.168.31.1`) e o IP de **cada nó do mesh**.
   Sem o IP do nó secundário, o item R-02 usa só a entidade `xiaomi_home` (ver abaixo).
2. **André** — decidir como criar os alvos de `ping` (ver "Decisão em aberto").
3. **Recomendado** — K-06 (reserva de DHCP). Sem ela, o item R-04 pode alarmar falso quando um IP mudar.

## Decisão em aberto: como criar os sensores de ping

O `ping` atual é entrada de configuração (criada pela interface). Duas opções:

| Opção | Prós | Contras |
| :--- | :--- | :--- |
| **A. Adicionar pela interface do HA** (Configurações → Dispositivos → Ping) | Caminho oficial da versão 2026.9; sem risco de YAML obsoleto | Entrada nova em `core.config_entries` (arquivo que não se edita); é passo manual do André |
| **B. YAML `binary_sensor: platform: ping`** | Versionável, sem passo manual | A plataforma YAML do `ping` pode estar obsoleta nesta versão — **verificar com `check_config` antes de adotar** |

Recomendação: **A**, e a spec assume alvos criados com os nomes abaixo. O que for feito em YAML são só
os `template` e as automações.

## Itens

### R-01 · Internet no ar

| Item | Definição |
| :--- | :--- |
| **Fontes** | `ping` em `1.1.1.1` e `8.8.8.8` (duas, para não culpar a operadora por queda de um só destino) |
| **Sensor derivado** | `binary_sensor.internet_no_ar` (template): `on` se **qualquer** dos dois responde; `off` se ambos falham; **`unavailable` se as fontes estiverem `unavailable`/`unknown`** — nunca apresentar estado desconhecido como internet caída |
| **Dono** | Novo. Nenhuma automação existente toca sensores de rede |
| **Nota** | O sensor depende do próprio HA/PC estar de pé; não mede a casa quando o PC está desligado |

### R-02 · Nós do mesh online

| Item | Definição |
| :--- | :--- |
| **Fontes** | `ping` no gateway `192.168.31.1` e em cada nó; complementado pela **disponibilidade** das entidades do RD15 (se virarem `unavailable`, o roteador saiu da nuvem Xiaomi). **Não** usar `connected_device_number` do Roteador Sala como sinal de saúde: ele marca `0` mesmo com o nó no ar (os clientes são reportados pelo Closet) |
| **Sensor derivado** | `binary_sensor.rede_gateway_no_ar` e um por nó |
| **Diagnóstico combinado** | Sensor de texto `sensor.rede_diagnostico`: `ok` · `sem_internet` (gateway responde, internet não → operadora) · `sem_gateway` (gateway não responde → roteador ou PC isolado) · `no_mesh_fora` (gateway ok, nó secundário fora → backhaul) · `indeterminado` (fontes `unavailable`) |
| **Regra** | O diagnóstico só é `sem_internet` quando o **gateway responde**. Se o gateway não responde, o PC pode estar sem rede e nada se conclui sobre a operadora |

### R-03 · Notificação de queda e retorno da internet

| Item | Definição |
| :--- | :--- |
| **Gatilho de queda** | `binary_sensor.internet_no_ar` para `off` **`for: 00:03:00`**, com gateway `on` (regra: decidir por estado atual) |
| **Gatilho de retorno** | `internet_no_ar` para `on` depois de uma queda notificada, com a duração da queda na mensagem |
| **Condição** | Só notifica o retorno se a queda foi notificada — guardar em `input_boolean.rede_queda_notificada` (**novo helper**) para não avisar "voltou" de uma oscilação que nunca alarmou |
| **Ação** | `notify.iphone_de_andre` (o iPad não: é painel fixo). Texto sem dado sensível |
| **Janela noturna** | Sem silêncio: queda de internet à noite não incomoda o sono se a notificação for silenciosa; usar `push.interruption-level: passive` entre 23:00 e 07:00 (`after` > `before`, atravessa a meia-noite) |
| **Justificativa** | Na `description` da automação, como exige `docs/AUTOMATION-POLICY.md` |
| **Anti-spam** | `mode: single`; um aviso por queda e um por retorno |

### R-04 · Dispositivo crítico offline

| Item | Definição |
| :--- | :--- |
| **Alvos** | DVR `192.168.31.216` (câmeras) · PC `192.168.31.22` (`binary_sensor.pc_andre`, já existe) · PS5 (IP: **TODO**, ler de `CASA.md`/integração `ps5`) |
| **Gatilho** | Alvo `off` **`for: 00:10:00`** (o PS5 e o PC desligam de propósito; o DVR não) |
| **Condição por alvo** | **DVR**: sempre notifica. **PC** e **PS5**: só notificam se o desligamento **não** foi de propósito — para o PS5, ignorar quando `media_player`/`ps5` estiver `standby`; para o PC, **não notificar** (desliga por uso normal). Na prática a leva 1 notifica **só o DVR**; PC e PS5 ficam como sensores no painel, sem alerta |
| **Justificativa do DVR** | Já derrubou as câmeras duas vezes por mudança de IP (K-06). O aviso distingue "DVR caiu" de "câmera com defeito" |
| **Condição extra** | Não notificar se `internet_no_ar`/gateway estiver `off` — sem rede local, todos os alvos caem juntos e o aviso relevante é o R-03 |

### R-05 · Indisponibilidade e sinal das lâmpadas

**Evidência (banco do HA, somente leitura, 15/09 a 26/09/2026).** Muitas luzes passam bastante tempo
`unavailable`. A linha de base de ~26 registros aparece em quase todas (reinícios e recargas do HA);
o que passa disso é queda real:

| Luz | Registros `unavailable` | Acima da base |
| :--- | :--- | :--- |
| `light.luzes_externas_switch_1..4` | 136 cada | ~110 |
| `light.luzes_externas_luz_de_fundo` | 113 | ~87 |
| `light.luz_quarto` | 90 | ~64 |
| `light.banheiro_luz_de_fundo` | 86 | ~60 |
| `light.luz_sala` | 58 | ~32 |
| `light.led_escritorio_sonoff_1001dff472` (Sonoff, LAN) | 8 | ~0 |
| `light.painel` | 3 | ~0 |

O padrão sugere que o problema está nas luzes por **nuvem Tuya**, não na rede local: o Sonoff local
quase não cai. Por isso o alerta abaixo **não** deve ser lido como "o Wi-Fi caiu" sem cruzar com o R-02.

| Item | Definição |
| :--- | :--- |
| **Escopo** | Lista **explícita** de luzes reais. Ficam de fora: `light.browser_mod_*_screen` (tela do iPad), `light.xiaomi_cn_*_rd15_s_5_indicator_light` (LED dos roteadores) e `light.yeelink_cn_581528686_bslamp2_s_2_light` (Yeelight retirado do Closet, sempre `unavailable`) |
| **Sensor** | `sensor.luzes_indisponiveis` (template): estado = quantidade da lista em `unavailable`; atributo `entidades` = nomes. `unknown` não conta como indisponível |
| **Gatilho** | Mudança de `sensor.luzes_indisponiveis` **`for: 00:10:00`**, com valor > 0 (decide por estado atual; oscilação curta não avisa) |
| **Condições** | (a) `sensor.rede_diagnostico` = `ok`: sem rede local todas caem juntas e o aviso relevante é o R-03. (b) HA no ar há mais de 5 min: nas partidas as integrações ainda estão subindo |
| **Ação** | Uma notificação em `notify.iphone_de_andre` listando as luzes. Se **5 ou mais** caírem juntas, a mensagem diz "queda em bloco: provável nuvem Tuya ou Wi-Fi", em vez de listar uma a uma |
| **Sem aviso de retorno** | Evita ruído; o painel já mostra o estado |
| **Sinal (RSSI)** | Só existe para o Sonoff: `sensor.led_escritorio_sonoff_1001dff472_rssi`, hoje **desabilitado** (`disabled_by: integration`). Habilitar **pela interface do HA** (Configurações → Entidades), sem editar `.storage`. Tuya, Xiaomi e localtuya não expõem RSSI. **Sem alerta de RSSI nesta leva**: coletar uma semana de histórico para definir o limiar (valor TODO) |
| **Dono** | Novo. Nenhuma automação existente lê ou escreve nesses sensores; a automação **não comanda** nenhuma luz |

## Dono de cada atuador

Não há atuadores. Único estado escrito: `input_boolean.rede_queda_notificada` (helper novo, dono
exclusivo da automação R-03).

Não confundir com a automação existente que apaga o `indicator_light` dos roteadores à noite
(`automations.yaml:105`): **esta leva não escreve nos roteadores**.

## Se o Home Assistant reiniciar

- **Durante uma queda**: os gatilhos `for:` se perdem e o HA volta com o estado atual. Se a internet
  estiver caída na partida, o sensor nasce `off` e o `for:` recomeça do zero — o aviso sai 3 min
  depois, sem duplicar (o helper de queda não estava marcado).
- **Queda notificada e HA reinicia antes do retorno**: o helper `input_boolean` restaura o estado
  (`restore`), então o aviso de retorno ainda sai com a duração calculada a partir do último
  `last_changed` do sensor.
- **Fontes `unavailable` na partida** (pings ainda sem primeira leitura): nenhum gatilho dispara —
  `unavailable`/`unknown` não contam como `off`.
- Nenhum comando físico é enviado ao reiniciar.

## Verificação (sem acionar a casa)

1. `check_config` antes de recarregar (§14).
2. Renderizar cada template em Ferramentas de Desenvolvedor com fontes `on`, `off` e `unavailable`
   e conferir a tabela de estados de R-02.
3. Confirmar que a automação carregou (`on`) e que **nenhuma outra** cita `internet_no_ar` ou o helper.
4. Teste de queda: **não** derrubar a rede de verdade. Simular com `input_boolean`/estado forçado
   em ambiente de desenvolvimento e ler o traço da automação.

## Fora do escopo desta leva

- Speedtest periódico, latência/perda com histórico e widget no painel (itens 2, 3 e 14 da proposta).
- Presença por Wi-Fi e alerta de dispositivo novo (itens 4 e 5 da lista do Perplexity). O payload foi
  lido em 26/09/2026 e **desaconselha** as duas coisas por MAC:
  - O evento `Device Connect`/`Device Disconnect` do Roteador Closet traz o MAC no atributo
    `Connect Device Ids` (o Roteador Sala não gera eventos de cliente).
  - **Ruído**: 1.274 conexões em ~10 dias (~120/dia), 60 MACs distintos.
  - **MAC privado**: 32 dos 60 MACs têm o bit de "administrado localmente" (endereço aleatório do
    iOS/Android) e geram **78%** dos eventos. Esse endereço pode mudar (rotação, "esquecer rede"), então
    um MAC "novo" pode ser um aparelho velho, e a presença por MAC pode quebrar sem aviso.
  - `sensor.*_connect_device_ids_p_2_20` é uma lista JSON que **estoura o limite de 255 caracteres**
    do estado do HA com ~23 aparelhos: não serve como fonte.
  - Conclusão: presença continua no `mobile_app`/FindMy; alerta de "dispositivo novo" só valeria como
    aviso de **contagem** (mudança grande em `connected_device_number` do Closet), sem identificar
    quem entrou. Fica para uma spec própria se você quiser.
- **Reinício automático do modem por tomada** (item 11): carga de risco (§11), só com autorização
  explícita e spec própria.
- Qualquer mudança nos roteadores (alçada 3).

## Como ficou implementado (26/09/2026)

Arquivos: `config/rede_ping.yaml` (novo, incluído por `command_line:` em `configuration.yaml`),
`config/template_sensors.yaml` (sensores derivados), `config/automations.yaml` (3 automações) e o
helper `input_boolean.rede_queda_notificada` em `configuration.yaml`.

Desvios em relação ao texto acima:

- **Sondas por `command_line`, não pela integração `ping`.** A plataforma YAML do `ping` não existe mais
  no HA 2026.9 (sem `PLATFORM_SCHEMA` em `binary_sensor.py`) e criar entradas exigiria a interface ou editar
  `core.config_entries` (proibido). O comando devolve `OFF` só quando o `ping` responde erro; timeout deixa
  o sensor `unavailable`, nunca `off`. Custo: 4 processos `ping` por minuto.
- **Sem IP do nó da Sala.** `binary_sensor.rede_no_sala_online` usa a disponibilidade da entidade do RD15
  (só vale com o Closet disponível). **Suposição não provada**: que a entidade do Sala fica `unavailable`
  quando o nó cai. Se um dia o IP do nó for confirmado, trocar por ping.
- **PS5 fora do R-04**, como já previsto.
- **R-05: sem condição de "HA no ar há 5 min"**: o `for: 10 min` já cobre a subida das integrações.
- **Notificação passiva de 23h às 7h** por template de hora, não por janela `after`/`before`.
- **RSSI do Sonoff continua desabilitado**: habilitar é passo do André pela interface (Configurações →
  Entidades → `sensor.led_escritorio_sonoff_1001dff472_rssi`).

Verificado: `check_config` sem erro; após reinício, os 3 alvos de ping e o DVR `on`, `internet_no_ar` `on`,
`rede_diagnostico` `ok`, `luzes_indisponiveis` `0`, helper `off`, três automações `on`. **Não verificado**: o
envio real das notificações e o disparo dos gatilhos `for:` (exigiria derrubar rede ou luz de verdade).

### Atualização do RSSI do Sonoff (26/09/2026)

`sensor.led_escritorio_sonoff_1001dff472_rssi` foi ativado em 25/09 (edição pontual de
`core.entity_registry`, com backup). **Em ~10 h de HA no ar continuou `unknown`, sem nenhuma leitura.**
Conclusão: **o alerta de sinal do R-05 é inviável pelo caminho atual e sai desta leva.**

- **Causa não provada.** No código da integração o RSSI é o parâmetro `rssi` (`core/devices.py:162`) e só
  preenche quando o aparelho manda uma mensagem que o inclua. Não foi confirmado se o Sonoff fala por LAN ou
  pela nuvem, nem se o firmware envia o campo.
- **O que falta para reabrir:** (1) descobrir o modo de conexão do aparelho (LAN × nuvem eWeLink); (2) ver
  se alguma mensagem real traz `rssi` (log de depuração da integração ou uma atualização provocada com a luz,
  que aciona a casa e só se faz com aviso e devolução do estado, §11); (3) só então coletar uma semana e
  definir o limiar.
- O sensor **fica ativado** (não custa nada). Se aparecer leitura, a coleta começa daí.
