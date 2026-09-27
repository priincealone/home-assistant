# Painel · Campo "Rede & Conexão"

- **Data**: 27/09/2026
- **Pedido**: "pense em um campo funcional com principais funções relacionadas à conexão de rede
  (especifique antes de aplicar)"
- **Status**: **proposta, aguardando aprovação do André.** Nada foi implementado. Alçada 2 (rota nova e
  mudança na lista de entidades do contrato).
- **Natureza**: **só leitura.** Nenhum botão do campo muda a rede, reinicia roteador ou aciona a casa
  (isso seria nível 3).

## Por que

Hoje a rede só aparece no painel de duas formas: a pílula **"Ao vivo"** (o painel enxerga o HA) e o
aviso de push no iPhone quando a internet cai (R-03). Quando algo não responde na tela, não dá para saber
se o problema é o painel, o roteador, a operadora ou o aparelho. O HA **já tem** os sensores para
responder isso (abaixo); falta mostrá-los.

## O que já existe no HA (lido em 27/09/2026, do registro e do banco em `mode=ro`)

| O que | Entidade | Observação |
| :--- | :--- | :--- |
| Internet no ar (combinado) | `binary_sensor.internet_no_ar` | `on` se Cloudflare **ou** Google responde |
| Sondas de internet | `binary_sensor.rede_internet_cloudflare`, `binary_sensor.rede_internet_google` | ICMP a cada ciclo do HA |
| Gateway (roteador principal) | `binary_sensor.rede_gateway` | `192.168.31.1` |
| Nó do mesh (Sala) | `binary_sensor.rede_no_sala_online` | |
| DVR das câmeras | `binary_sensor.rede_dvr` | `192.168.31.216`; o último estado gravado no banco era `off` (19:21), **não conferido ao vivo** |
| Diagnóstico combinado | `sensor.rede_diagnostico` | `ok`, `sem_internet`, `sem_gateway`, `no_mesh_fora`, `indeterminado` |
| Velocidade do roteador principal | `sensor.xiaomi_cn_771718035_rd15_download_speed_p_2_1` / `_upload_speed_p_2_2` | valores brutos (3377 / 2723); **unidade não confirmada** |
| Dispositivos no roteador principal | `sensor.xiaomi_cn_771718035_rd15_connected_device_number_p_2_3` | 21 no último registro |
| Eventos de entrada e saída de aparelhos | `event.xiaomi_cn_771718035_rd15_device_connect_*` / `_disconnect_*` | com horário do último evento |
| Roteador da Sala | `sensor.xiaomi_cn_863726955_rd15_*` | **marca 0 mesmo com o nó no ar** (os clientes são do principal): não usar como saúde |
| Situação do painel × HA | estado `online`/`sincronizando`/`offline` do próprio painel | já existe (`app/page.tsx`) |

**Não existe** (e por isso fica fora): latência em ms (as sondas são liga/desliga), teste de velocidade
da operadora (`speedtest`), lista de aparelhos por nome (só MAC), telemetria de rede do PC (os
`sensor.pc_andre_*` estão `unavailable`).

## Proposta

### 1. Onde aparece

**Recomendado: transformar a pílula "Ao vivo" em pílula "Rede".** Ela já significa "conexão" e já ocupa
lugar no cabeçalho; não entra uma quarta pílula na linha do celular (Seguro · Baterias · Atenção).
Alternativa: pílula nova ao lado das três.

Rótulo pelo **pior estado**, nunca o mais otimista:

| Estado | Rótulo | Cor |
| :--- | :--- | :--- |
| Tudo respondendo | "Ao vivo" | verde |
| Nó da Sala ou DVR fora | "1 fora" | âmbar |
| Gateway responde, internet não | "Sem internet" | vermelho |
| Gateway não responde | "Sem roteador" | vermelho |
| Painel sem falar com o HA | "Offline" (já existe) | cinza |
| Fontes `unavailable` | "Sem leitura" | cinza (**nunca** "ok" nem "fora") |

Tocar abre o modal **"Rede & Conexão"**.

### 2. O que o modal mostra (de cima para baixo)

1. **Diagnóstico em uma frase**, traduzindo `sensor.rede_diagnostico`: "Tudo certo", "Internet fora: o roteador
   responde, então o problema é da operadora", "O roteador não responde", "O nó da Sala saiu do mesh".
2. **Cadeia da conexão**, uma linha com pontos: `Painel → Casa (HA) → Roteador → Internet`, com o nó da Sala e o
   DVR ao lado. Cada ponto verde, âmbar, vermelho ou cinza, com o nome.
3. **Tráfego agora** do roteador principal: descida e subida, em Mb/s (**depende de confirmar a unidade**).
4. **Aparelhos conectados**: número no roteador principal e o horário do último aparelho que entrou e do último
   que saiu. **Sem lista de MAC** (dado pessoal e sem nome).
5. **Quedas nas últimas 24 h**: quantas vezes a internet caiu e por quanto tempo, lido do histórico do HA
   (`binary_sensor.internet_no_ar`). Exige a rota nova abaixo.
6. **Rodapé**: "Atualizado há N s" e botão **"Atualizar agora"** (só refaz a leitura; não mexe na rede).

### 3. Alertas (mesma família dos existentes)

Em `lib/alertas.ts`, grupo "conexão": **crítico** se sem internet ou sem roteador por mais de 3 minutos
(o mesmo prazo do aviso no iPhone, R-03); **aviso** se o nó da Sala ou o DVR estiver fora. `unavailable`
gera "sem leitura", nunca "queda".

## Como se implementa (para a aprovação)

| Peça | Mudança | Alçada |
| :--- | :--- | :--- |
| Entidades | 12 `entity_id` novos em `ENTIDADES_EXTRAS` (`lib/rooms.ts`) e `app/api/state/route.ts`; conferir cada um contra `core.entity_registry` | 2 |
| Rota nova | `GET /api/rede`: histórico de 24 h de `internet_no_ar` (contagem e duração das quedas), com cache de 60 s, só leitura | 2 |
| Painel | componente do modal (`RedeModal`), a pílula e a regra de "pior estado" em `lib/rede.ts` (lógica pura) | frontend, com seu pedido |
| Nada muda em | automações, roteadores, HA, `.storage` | |

Regras que valem (`CLAUDE.md`): estado desconhecido nunca é apresentado como desligado (§12); falha de leitura
não limpa a tela nem dispara comando; a automação da casa **não depende** do painel (§1).

## Decisões que só o André pode tomar

1. **Pílula**: transformar "Ao vivo" em "Rede" (recomendado) ou criar uma quarta pílula?
2. **Histórico de quedas (item 5)**: incluir? É o único que exige rota nova; sem ele o modal é só leitura de
   sensores que já chegam.
3. **Lista de aparelhos**: só contagem e horários (recomendado, por privacidade) ou também MAC?
4. **Ação**: "Atualizar agora" basta, ou quer também um atalho que leve ao app do roteador? (Reiniciar
   roteador pelo painel **não** entra: é nível 3.)

## Verificação (definição de pronto)

- Cada entidade conferida contra `core.entity_registry` no momento da edição; unidade da velocidade lida do atributo.
- `npx tsc --noEmit` 0; detector do impeccable 0; alvos de 44 px e texto de 11 px ou mais.
- **Testes por estado sem derrubar a rede**: renderizar a lógica de `lib/rede.ts` com estados simulados (tudo ok,
  sem internet, sem roteador, nó fora, `unavailable`). A rede da casa **não** é derrubada para testar.
- Celular, tablet vertical e paisagem, com o texto longo rolando (`SmartTruncateText`).
- Registro em `ESTADO_DASHBOARD.md`; item em `planning/`.

## Não verificado

- Unidade das velocidades do roteador (bytes ou bits, por segundo).
- Estado ao vivo do DVR (`rede_dvr` estava `off` no último registro do banco).
- Se o histórico de 24 h do `internet_no_ar` tem retenção suficiente no recorder.
