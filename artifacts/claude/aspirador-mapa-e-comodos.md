# Aspirador: o que a integração entrega sobre mapa e cômodos

Data: 13/10/2026 · Só leitura: registro do HA, banco do recorder em `mode=ro`, código da integração, spec pública MIoT e
páginas públicas dos projetos citados. Nada foi acionado, nenhum token foi lido ou usado.

## Resumo

| Pergunta | Resposta |
| :--- | :--- |
| O aspirador tem mapa no HA hoje? | **Não.** Nenhuma entidade de mapa (`camera.*`, imagem) existe. |
| E cômodos (segmentos)? | **Não** pela integração atual (`xiaomi_home`): não há propriedade nem serviço de cômodo. |
| O app nativo tem mapa? | Sim: o mapa vive **na nuvem Xiaomi**, num arquivo apontado pela propriedade `object-name`. O que o app mostra de cômodos **não foi verificado** (não abri o app). |
| Dá para trazer o mapa e os cômodos para o HA? | **Sim, por um complemento de terceiros**, mas exige a conta Xiaomi e o token do robô: é **alçada 3** (só o André). |
| Qual complemento? | `Xiaomi Cloud Map Extractor` (HACS). Lista `dreame.vacuum.mc1808` como suportado. |
| E o `dreame-vacuum` do Tasshack? | **Não serve:** o modelo está na lista de **não suportados** dele. |

## O aparelho

- Entidades: 64 no registro (`vacuum.dreame_us_415783444_mc1808` + botões, eventos, sensores, textos), todas da plataforma
  `xiaomi_home` (a integração oficial da Xiaomi, `cloud_polling`). Dispositivo "Aspirador", área `closet`, firmware `4.3.3_1122`,
  modelo `dreame.vacuum.mc1808`.
- Pela lista do `Xiaomi Cloud Map Extractor`, esse código é o "Xiaomi Mi Mop / Xiaomi Mijia 1C".
- A integração `xiaomi_home` só implementa para o aspirador **estado e nível de sucção** (`vacuum.py`): nada de mapa, zona ou cômodo.

## O que o MIoT do modelo expõe (spec pública)

- Serviço **clean (18)**: `work-mode`, `time-duration`, `size`, **`area`** (texto, leitura e escrita, sem formato documentado),
  **`timer`**, `mode` (sucção: 0 silencioso, 1 padrão, 2 médio, 3 forte), `object-name` ("nome do arquivo do mapa da limpeza"),
  `task-done`, ações `start-clean` e `stop-clean`.
- Serviço **map (23)**: `map-view` (texto), `frame-info` (escrita), `object-name` e a ação `map-req`.
- **Não há** propriedade nem ação de cômodo, zona, segmento ou partição na spec. `area` é o único gancho de "o que limpar" e
  seu formato não é público.

## O que o `map-view` carrega de verdade (decodificado do banco, 400 amostras)

`map-view` é base64 (alfabeto URL-seguro) de um fluxo zlib. Decodificado: **104 a 121 bytes**, sempre um quadro **"P"** (parcial) do
protocolo de mapa da Dreame: cabeçalho de 27 bytes (id do mapa, número do quadro, tipo, posição do robô, posição da base, largura e altura
da grade = 0) mais um JSON `{"timestamp_ms", "mtid", "cs", "mra", "tr"}`.

- Ou seja: **posição do robô e trilha, sem imagem do mapa** (largura e altura da grade são zero).
- O mapa em imagem **não cabe** nessa propriedade e o HA limita o estado a 255 caracteres. Quem monta o desenho é o app, baixando o
  arquivo da nuvem.
- Custo: ~4.100 registros dessa entidade no banco em 9 dias (~450 por dia, textos de ~170 caracteres). Pequeno; se incomodar, dá para
  excluí-la do recorder.

## Onde está o mapa e como chegar nele

- `object-name` tem o formato `<id da conta>/<id do aparelho>/<n>` com `n` = 0, 1 ou 2 (as três variações vistas): é o **caminho do
  arquivo do mapa na nuvem Xiaomi**. O app baixa esse arquivo; os cômodos (se houver) vêm dele.
- O `Xiaomi Cloud Map Extractor` faz o mesmo caminho: entra na nuvem com a conta Xiaomi, baixa o arquivo, desenha e expõe uma
  **câmera** com a imagem e atributos `rooms`, `room_numbers`, `vacuum_room`, `vacuum_room_name` (conteúdo exato não documentado na
  página). Pede IP do robô, **token do robô**, usuário e senha da conta Xiaomi.
- **Por que não é comigo** (CLAUDE.md §10 e alçadas): token e senha são do André; criar integração com conta é nível 3.
- **Rede**: o aspirador fala por IP local (unicast passa pelo Docker em NAT, ao contrário de multicast). O IP é DHCP: reservar no
  roteador (mesmo item do K-06).
- **Cômodos a partir do HA**: nada indica que o `mc1808` aceite "limpar o cômodo X" pela integração. O Map Extractor **só lê** o
  mapa; limpar por zona exigiria escrever na propriedade `area` num formato que não é público.

## Achado lateral: por que "Última duração" e "Área" ficam "Sem leitura"

`time-duration`, `size` e `start-time` são propriedades **só de notificação** (`notify`, sem leitura): o robô as publica durante e ao
fim de uma limpeza e o HA guarda o último valor **até reiniciar ou recarregar a integração**, quando voltam a `unknown`.

- Última limpeza registrada hoje: **49 min e 37 m²** (13/10, 15:26); total: **11.346 m² em 318 limpezas**.
- Os reinícios de hoje (18:26 e 20:09) zeraram as duas leituras. Não é sensor com defeito.
- O painel mostra "Sem leitura", o que é honesto, mas **perde um dado que existe no histórico**. Dá para o painel mostrar "última
  limpeza: 49 min, 37 m² (13/10)" lendo o histórico (a rota `/api/historico` e `getHistoricoEntidades` já existem).
- Limpezas vistas no banco desde 03/10: 06/10 13:38, 09/10 13:58 e 13/10 09:53 (cerca de 36 a 50 minutos cada). Em todos os outros
  dias o robô só alterna `docked` e `idle` de madrugada (carga).

## Caminhos possíveis (decisão do André)

1. **Mapa e cômodos no painel**: instalar o `Xiaomi Cloud Map Extractor` (André faz a configuração com conta e token) → câmera do
   mapa no HA → o painel mostra a imagem e os nomes de cômodos. Eu faria a rota e o cartão depois, sem tocar em credenciais.
2. **Só o dado que falta**: mostrar a "última limpeza" a partir do histórico (sem credencial, risco zero).
3. **Nada**: o robô já liga, desliga e muda a sucção pelo painel; mapa é conveniência.

## Fontes

- Spec MIoT pública: `miot-spec.org/miot-spec-v2/instance?type=urn:miot-spec-v2:device:vacuum:0000A006:dreame-mc1808:1`
- `dreame-vacuum` (Tasshack), lista de dispositivos: `dv.tasshack.com/guide/more/supported-devices` (modelo em "não suportados")
- `Home-Assistant-custom-components-Xiaomi-Cloud-Map-Extractor` (PiotrMachowski), README
- Código local: `config/custom_components/xiaomi_home/vacuum.py`; banco `home-assistant_v2.db` (`mode=ro`)
