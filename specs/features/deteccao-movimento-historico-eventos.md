# Detecção de movimento com identificação e histórico de eventos — viabilidade

> Documento de investigação/planejamento (não é implementação), conforme `CLAUDE.md` §16. Responde
> a um pedido direto do André: verificar se dá pra ter identificação do que se move nas câmeras
> (pessoa, carro) com um histórico consultável — exemplos dados por ele: "uma pessoa ficou parada no
> portão por 1 min", "um carro saiu da garagem às 12h", "um carro retornou às 14h" — pensando na
> implementação futura no dashboard-app.

## 1. Resumo executivo

**É viável, e o hardware surpreendeu para melhor** — este PC tem uma GPU dedicada (RTX 3050 Laptop,
4GB) com passthrough para Docker já confirmado funcionando nesta sessão, o que elimina a necessidade
de comprar um acelerador dedicado (Coral TPU) para rodar detecção de objeto em tempo real. A peça que
resolve isso é o **Frigate** (NVR open-source feito especificamente para o Home Assistant, com
detecção de objeto, zonas e histórico de eventos nativo) — já citado como candidato principal na
análise anterior (`specs/features/cameras-analise-completa-roadmap-dashboard.md` §5).

**Disco também deixou de ser problema**: o `C:` está apertado (19GB livres de 236GB), mas o André
confirmou um SSD à parte — **`D:`, com 906GB livres de 954GB**. Apontando o armazenamento do Frigate
pra lá, a única limitação real desta análise cai por terra. Ver §7.

**O que ainda não dá pra confirmar sem o André**: se a garagem está de fato dentro do campo de visão
de alguma das duas câmeras — ele já avisou que vai reposicionar as câmeras para captar o portão com
mais precisão, então isso deve se resolver na sequência. Ver §4.

## 2. Traduzindo os exemplos do André para conceitos técnicos

| Exemplo dado | O que isso é, tecnicamente | Quem resolve |
| :--- | :--- | :--- |
| "uma pessoa ficou parada no portão por 1 min" | Objeto classificado como `person`, dentro de uma **zona** ("portão"), com estado **parado** (stationary) e duração do evento ≥ 60s | Frigate: zonas + rastreamento de objeto com início/fim |
| "um carro saiu da garagem às 12h" | Objeto `car`, direção de saída de uma zona ("garagem"), timestamp do evento | Frigate: zonas + eventos com hora exata — **depende da câmera enxergar a garagem, ver §4** |
| "um carro retornou às 14h" | Mesmo objeto/zona, direção de entrada | Idem |
| "histórico acessível" | Consulta a uma lista de eventos passados, com filtro por câmera/objeto/data | API HTTP própria do Frigate (`/api/events`) — não precisa construir um banco de eventos do zero |

## 3. Hardware — medido nesta sessão, não estimado

| Recurso | Medido agora | Suficiente para Frigate? |
| :--- | :--- | :--- |
| CPU alocada ao Docker | 16 vCPUs | Sim, sobra — Frigate com GPU não depende de CPU para a detecção |
| RAM alocada ao Docker | 7,6GB total; **~4,7GB livres** (outros containers — `homeassistant`, `music-assistant`, e também `metabase`/`firefly-*`, que não são deste projeto — somam ~2,9GB) | Sim, confortável (Frigate + Mosquitto costuma ficar na faixa de 1–2GB para 2 câmeras) |
| GPU | **NVIDIA GeForce RTX 3050 Laptop, 4GB VRAM** — passthrough pro Docker testado e funcionando nesta sessão (`docker run --gpus all ... nvidia-smi` respondeu de dentro do container) | Sim — dá pra usar o detector `tensorrt` do Frigate, rápido e sem custo de hardware novo. A VRAM em uso agora (~2,4GB) é do próprio Windows (composição de tela, navegadores, IDE) — não há nenhum processo pesado concorrendo com o Frigate hoje |
| Disco (`C:`) | 19,1GB livres de 236,2GB — apertado | Não usar para gravação contínua, só para o binário/config do Frigate |
| **Disco (`D:`)** | **905,9GB livres de 953,9GB** (SSD à parte, confirmado pelo André) | **Sim, de sobra** — é para onde o volume de mídia do Frigate (clipes, snapshots, banco de eventos) deve apontar |

## 4. Cobertura das câmeras — o que não dá pra confirmar sem o André

Abri o vídeo ao vivo das duas câmeras durante esta investigação (visualização, sem acionar nada
físico):

- **Rua - Canal 2** — rotulada no próprio dashboard-app como "Portão de Entrada / Rua Principal"
  (`SurveillanceHubModal.tsx`). No frame que vi: calçada e rua ao longo do muro com cerca de arame
  farpado, em ângulo bem fechado — não dá pra confirmar visualmente que o portão em si (ou uma
  garagem) está dentro do quadro, só a calçada/rua na frente do muro.
- **Rua - Canal 4** — rotulada "Visão Perimétrica / Lateral". No frame que vi: visão mais aberta da
  rua, incluindo o portão de um imóvel vizinho (não o do André) e carros passando/estacionados.

**Atualização**: o André já avisou que vai reposicionar as câmeras para captar o portão com mais
precisão. Quando isso for feito, a verificação é rápida — abrir o vídeo ao vivo de novo (mesmo passo
desta investigação) confirma se o portão/garagem entrou no quadro antes de desenhar as zonas do
Frigate. Não há necessidade de esperar por isso para seguir com o resto do planejamento (§5–§8), só
as zonas específicas de portão/garagem dependem do reposicionamento.

## 5. Arquitetura recomendada

```
DVR (RTSP, 2 streams por canal: subtype=1 leve / subtype=0 HD — já existem)
        │
        ├── subtype=1 (leve) ──► Frigate: papel "detect"  (roda o modelo de IA)
        └── subtype=0 (HD)   ──► Frigate: papel "record"  (grava só o que interessa)
                    │
                    ├── Detector: tensorrt na RTX 3050 (GPU já confirmada)
                    ├── Zonas por câmera (ex.: "calçada", "portão") — desenhadas manualmente
                    │   sobre o frame de cada câmera, não são automáticas
                    ├── go2rtc embutido no próprio Frigate (não precisa recriar o que foi
                    │   removido na limpeza da TV — é outra instância, de uso interno do Frigate)
                    │
                    ├──► MQTT (Mosquitto, container leve) ──► integração `frigate` no HA
                    │         cria: binary_sensor de ocupação, sensor de contagem por objeto,
                    │         camera com bounding box, por câmera/zona
                    │
                    └──► API HTTP própria (`/api/events`) ──► fonte de dados pro histórico
                              (start_time, end_time, label, camera, zona, miniatura, clipe)
```

Essa divisão em dois streams (`detect` leve / `record` HD) já existe neste DVR desde a integração
original — é literalmente para isso que o `subtype=1`/`subtype=0` foi feito, então não precisa
reconfigurar nada no lado do DVR.

## 6. O que isso substitui (ou não) no pipeline atual

Hoje: DVR decide "teve movimento" sozinho → manda e-mail → HA grava **as duas câmeras sempre**, sem
saber o que causou (documentado em `CASA.md` §Câmeras).

Com Frigate: cada câmera é analisada por si, com rótulo (`person`, `car`, etc.) e zona — grava (e
registra no histórico) só quando há algo classificado, não a cada vibração do sensor do DVR. Reduz
clipe de galho balançando/sombra, e dá metadado de verdade pro histórico que o André quer.

**Não precisa desligar o pipeline atual para testar isso** — dá para rodar os dois em paralelo por um
tempo (o Frigate não interfere no e-mail/IMAP/rclone existente) e só decidir substituir depois de
validar. Essa é a forma mais segura de introduzir a mudança.

## 7. Disco — resolvido

Com o SSD `D:` (906GB livres) disponível, o volume de mídia do Frigate (clipes, snapshots, banco de
eventos) aponta pra lá, por exemplo `D:\frigate\media`. Isso tira a pressão de qualquer decisão de
retenção agressiva por falta de espaço — ainda vale configurar uma retenção razoável (ex.: manter só
eventos com `person`/`car`, por alguns meses) por organização, não por necessidade de espaço. O `C:`
fica só com o binário/config do Frigate, que é pequeno.

## 8. Contrato de dados sugerido para o dashboard-app (não implementado)

Seguindo o padrão de `app/api/camera/*` já existente:

- `GET /api/camera/eventos?dias=7&camera=rua_canal_2` — proxy formatado do `/api/events` do Frigate,
  devolvendo cada evento como:
  ```json
  {
    "camera": "rua_canal_2",
    "rotulo": "pessoa",
    "zona": "portao",
    "inicio": "2026-09-19T12:00:00-03:00",
    "fim": "2026-09-19T12:01:04-03:00",
    "duracaoSegundos": 64,
    "miniaturaUrl": "...",
    "clipeUrl": "...",
    "texto": "Pessoa parada no portão por 1min04s"
  }
  ```
- O campo `texto` pode ser **templatizado** (rótulo + zona + ação + duração), sem precisar de IA
  generativa — resolve os exemplos do André de forma simples e barata.
- **Opcional, fase 2**: o Frigate tem integração opcional com um modelo de linguagem para gerar
  descrição mais rica do evento (frases mais naturais, tipo as que o André deu de exemplo) — exige
  plugar um LLM (local ou externo) e tem custo/complexidade adicional. Não é necessário para o
  histórico funcionar, é um refinamento posterior.

## 9. Riscos e pendências

- **Cobertura de câmera para o exemplo da garagem** — em andamento: André vai reposicionar as
  câmeras; confirmar depois com o vídeo ao vivo antes de desenhar as zonas.
- MQTT (Mosquitto) é mais um serviço rodando 24/7 para manter — pouco custo de recurso, mas é mais
  uma peça na lista de coisas que podem quebrar.
- A versão exata do Frigate e a sintaxe atual de configuração (zonas, `tensorrt`, papéis de stream)
  devem ser conferidas na documentação oficial no momento de implementar — este documento descreve
  os conceitos, que são estáveis há várias versões, mas não travei uma versão específica.

## 10. Recomendação (opinião, não decisão)

Tecnicamente viável e o hardware é mais que suficiente — GPU dedicada e um SSD de sobra pra mídia,
nenhuma compra de equipamento necessária. A única coisa realmente pendente é o reposicionamento das
câmeras para confirmar a cobertura do portão/garagem (§4), já em andamento pelo André. Feito isso, o
resto (zonas, integração MQTT, contrato de API) é trabalho de implementação direto, sem incerteza.
