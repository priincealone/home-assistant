# Medidor de energia — casa toda e chuveiro

- **Data**: 26/09/2026
- **Status**: **integração pendente** — falta a chave local do dispositivo (só o André). Ver `planning/BLOCKED.md` K-16.
- **Território**: HA (`config/`), Claude Code. O painel só entra depois, com plano aprovado (nível 2).

## O que é

Dispositivo Tuya "WIFI dual meter" (produto `wifech3utowiyknu`, ID `eb9090af658a3fb9b2i562`, nome no HA
"Medidor energia"), de **dois canais**, informado pelo André:

| Canal | Mede |
| :--- | :--- |
| 1 | a **casa toda** (quadro geral) |
| 2 | o **chuveiro**, individualmente (só consumo; não controla o chuveiro) |

## Por que não tem entidades hoje

A integração oficial Tuya recebe da nuvem `function`, `status_range` e `status` **vazios** para esse produto
(diagnóstico do dispositivo, 26/09). Sem pontos de dados, ela não cria entidade e o dispositivo fica
"(unsupported)". O dispositivo está online e aceita conexão local.

## Como integrar

Pelo **`localtuya`** (já instalado, v5.2.3, com 4 dispositivos configurados), que lê os pontos de dados
direto do dispositivo, sem depender do modelo da nuvem.

1. `Configurações → Dispositivos e serviços → LocalTuya → Configurar → Adicionar um novo dispositivo`.
2. Se a conta da nuvem já estiver configurada no LocalTuya, escolher "Medidor energia" na lista: ele
   preenche ID, versão e chave local sozinho. Se a lista vier vazia (a descoberta usa broadcast UDP, que o
   Docker Desktop em NAT não entrega ao container), preencher à mão:
   - **ID**: `eb9090af658a3fb9b2i562`
   - **Endereço**: um dos dois candidatos abaixo
   - **Versão do protocolo**: `3.4` (a de todos os dispositivos Tuya desta rede, exceto um `3.3`)
   - **Chave local**: **só o André** (credencial da conta Tuya IoT)
3. O LocalTuya consulta o dispositivo e lista os **pontos de dados (DPs)** que ele reporta. **Anotar a lista**
   (número do DP e valor); ela não é segredo e é o que falta para saber o que cada canal expõe.

### Onde está na rede (26/09, `192.168.31.0/24`)

O dispositivo não apareceu nos anúncios UDP (50 s de escuta nas portas 6666 e 6667; 11 dispositivos Tuya
anunciaram, nenhum é ele). Varrendo a porta local do protocolo (6668) sobrou **dois** endereços abertos que não
anunciaram, e um deles deve ser o medidor:

- `192.168.31.37` (MAC `c4:4f:33:f5:19:ee`)
- `192.168.31.169` (MAC `d0:82:eb:ae:76:63`)

Confirmar qual é no app Smart Life (Informações do dispositivo) ou no roteador. **IP é DHCP**: reservar o
endereço no roteador depois de confirmado (nível 3, só o André).

## Entidades esperadas (nomes finais, depois de descobrir os DPs)

Por canal, o que o dispositivo expuser entre: potência (W), corrente (A), tensão (V), energia acumulada (kWh).

| Grandeza | Casa toda | Chuveiro |
| :--- | :--- | :--- |
| Potência | `sensor.casa_potencia` | `sensor.chuveiro_potencia` |
| Corrente | `sensor.casa_corrente` | `sensor.chuveiro_corrente` |
| Tensão | `sensor.casa_tensao` | `sensor.chuveiro_tensao` |
| Energia acumulada | `sensor.casa_energia_total` | `sensor.chuveiro_energia_total` |

- Energia acumulada com `device_class: energy` e `state_class: total_increasing`, para o painel de Energia do
  HA aceitar. **Casa toda** = consumo da rede; **Chuveiro** = dispositivo individual.
- **"Resto da casa"** = casa − chuveiro. Só vale se o canal 1 realmente inclui o chuveiro (medida no
  quadro geral, antes do disjuntor do chuveiro). Confirmar com o André antes de criar esse sensor derivado.
- Conferir a **escala** de cada DP (o Tuya costuma mandar inteiro: potência em décimos de W, tensão em
  décimos de V, corrente em mA). Um fator errado produz um valor plausível e errado: validar contra uma carga
  conhecida (ver "Verificação").

## Regras

- **Só medição, confirmado pelo André (26/09): o medidor do chuveiro é apenas para consumo de energia e não
  controla nada.** O chuveiro é carga de aquecimento e `CLAUDE.md §11.4` proíbe automatizá-lo sem autorização
  explícita, então: **nenhuma entidade de liga/desliga**. Se o LocalTuya listar algum ponto de dados de
  comando (`switch`, relé), ele **não vira entidade** ao configurar o dispositivo.
- **Um atuador, um dono**: não há atuador aqui; nenhuma automação nova escreve neste dispositivo.
- `unavailable` e `unknown` são estados próprios; o painel não os mostra como zero.
- A chave local fica **só** no LocalTuya (`core.config_entries`, proibido para agentes). Nunca em log,
  commit, documento ou conversa.

## Verificação

1. Entidades criadas e com valor (não `unavailable`).
2. **Chuveiro**: ligar o chuveiro (o André, no banheiro) e ver a potência do canal 2 subir para a faixa do
   equipamento (kW) e a do canal 1 subir junto pelo mesmo valor. Desligar e ver ambas caírem. Isso confere
   também a escala e que o canal 1 inclui o chuveiro.
3. **Energia acumulada** só cresce (nunca decresce) e aparece no painel de Energia do HA.
4. `check_config` antes de recarregar qualquer YAML; nada de `docker restart` para editar `.storage`.

## Painel (depois, com plano aprovado)

O widget de energia lê hoje as tomadas medidoras (`docs/PRODUCT.md`). Casa toda e chuveiro são candidatos a
novos itens (potência ao vivo e histórico de 24 h); mudar isso mexe em `lib/rooms.ts` e no widget, e exige
plano prévio.

## Não verificado

- Quais DPs e escalas o dispositivo expõe (depende da chave local).
- Qual dos dois endereços é o medidor.
