# Feature Spec · Integração completa do PS5 à automação residencial

- **ID**: PS5-01
- **Autor**: Claude Code
- **Data**: 16/09/2026
- **Status**: Proposta — aguardando aprovação do André
- **Classificação**: Médio risco — toca atuador já governado por automação existente
- **Nota (24/09/2026)**: o "desligar" que esta spec descarta em §1.2 e §4 passa a ser tratado em `ps5-desligar-remote-play.md` (PS5-02), por decisão do André

---

## 1. Estado atual, medido hoje

Nada aqui é suposição; tudo foi lido do registro, do banco e do código da integração.

| Fato | Valor |
| :--- | :--- |
| Entidade | `media_player.sala_de_estar_ps5` |
| Integração | `ps5` (`dext0r/ha-ps5` v0.1.0), *local polling* por DDP |
| Endereço | `192.168.31.245` — **DHCP, sem reserva** |
| Atuador associado | `switch.ventilacao_ps5` (tomada Tuya do ventilador externo) |
| Automação existente | "Ventilação do PS5 acompanha o console" |
| Contexto de sala | `sensor.sala_atividade`, `sensor.tv_fonte` (HDMI 1 = PS5) |

### 1.1. O que a integração **pode** fazer

Lido de `custom_components/ps5/media_player.py`:

- `state`: `on` / `off`
- `media_title`: nome do jogo (`title_name`)
- `media_content_id`: id do título
- `turn_on`: acorda o console por DDP com credencial registrada

### 1.2. O que ela **não pode** — e nenhum plano deve prometer

`supported_features = TURN_ON` e mais nada. **Não existe `turn_off`**, nem volume, nem lançar jogo,
nem navegar. Desligar ou pôr em repouso continua sendo ação do controle físico. Qualquer automação que
prometa "desligar o PS5" está errada por construção.

### 1.3. Dois problemas que bloqueiam o resto

**P-1 · O console fica indisponível 40% do tempo.** Em 7 dias, 41 transições para `unavailable`, e o
estado atual é `unavailable` desde as 10h53 de hoje. O último `on` foi em 13/09. Com o IP em DHCP e
sem reserva, a hipótese principal é o endereço ter mudado — a integração aponta para um IP fixo no
arquivo de configuração e não redescobre sozinha.

**P-2 · O título do jogo nunca chegou.** Em 30 dias de histórico, **zero** valores em `media_title`.
A capacidade existe no código e não produz dado. Causas plausíveis, em ordem: a credencial PSN
registrada não devolve o título; ou a privacidade de "atividade de jogo" da conta está fechada; ou o
console só publica o título quando está em uso ativo e nunca foi amostrado nessa janela. **Não
diagnosticado** — ver Fase 2.

---

## 2. Princípio que rege este plano

O PS5 é o único aparelho da casa que **produz calor relevante** e cuja automação já protege hardware.
Por isso, a regra que vale acima de todas as outras: **a ventilação nunca pode ser desligada com o
console em uso**, seja por cena, por painel ou por engano.

Hoje essa regra é violável — ver Fase 3, item 3.1.

---

## 3. Fases

### Fase 0 · Fundação (bloqueia tudo o que vem depois)

| # | Ação | Executor | Porquê |
| :--- | :--- | :--- | :--- |
| 0.1 | **Reserva de DHCP** para o PS5 no roteador | **André** | Sem endereço estável, a integração cai e toda automação baseada em estado fica intermitente. É a causa provável de P-1 |
| 0.2 | Confirmar o endereço após a reserva e reconfigurar a integração se mudou | Claude Code | — |
| 0.3 | Medir a disponibilidade por 48 h e comparar com os 40% atuais | Claude Code | Sem essa medição, não se sabe se 0.1 resolveu |

**Critério de saída**: indisponibilidade abaixo de 5% em 48 h, fora dos períodos em que o console está
desligado de fato.

---

### Fase 1 · Confiabilidade do estado

O estado do PS5 tem **três** valores que importam, e confundi-los é a origem dos defeitos:

| Estado | Significado | O que NÃO significa |
| :--- | :--- | :--- |
| `on` | Console ligado e jogando | — |
| `off` | Console respondeu e está em repouso | — |
| `unavailable` | **A integração não conseguiu falar com o console** | Não significa desligado |

| # | Ação | Executor |
| :--- | :--- | :--- |
| 1.1 | Criar `binary_sensor` de template "PS5 em uso" que trata `unavailable` como *desconhecido*, nunca como desligado | Claude Code |
| 1.2 | Criar `sensor` de template "PS5 situação" com os textos que o painel exibe (`Jogando`, `Em repouso`, `Fora de alcance`) | Claude Code |

**Armadilha já paga**: a automação da ventilação aprendeu isso na marra — ela espera 2 minutos antes de
desligar porque `unavailable` entra na lista de gatilhos e uma oscilação de rede cortaria a ventilação
com o console quente. Os sensores novos devem herdar essa lógica, não reinventá-la.

---

### Fase 2 · Contexto de jogo (diagnóstico antes de construir)

| # | Ação | Executor |
| :--- | :--- | :--- |
| 2.1 | **Diagnosticar P-2**: com o console ligado e um jogo aberto, ler `media_title` e `media_content_id` ao vivo | Claude Code + André (precisa ligar o console) |
| 2.2 | Se vier vazio: verificar a privacidade de atividade de jogo na conta PSN | **André** |
| 2.3 | Se vier preenchido: criar `sensor.ps5_jogo` e incorporar ao `sensor.sala_atividade` | Claude Code |

⚠️ **Não construir widget de "jogo atual" antes de 2.1.** Hoje isso seria uma caixa permanentemente
vazia no painel — exatamente o defeito das quatro entidades fantasma que a auditoria encontrou.

---

### Fase 3 · Automações

#### 3.1. Resolver o conflito da ventilação — **primeiro, e obrigatório**

A cena "gamer" do painel (`app/api/scene/route.ts`) executa `toggle` em `switch.ventilacao_ps5`, que
pertence à automação da ventilação. Consequência medida no código:

| Situação | O que a cena faz | O que acontece depois |
| :--- | :--- | :--- |
| Console ligado, ventilação ligada | **desliga a ventilação** | A automação só corrige na próxima reconciliação — até 5 minutos com o console quente e sem ventilação |

**Ação**: a cena "gamer" deixa de tocar na tomada. Quem liga a ventilação é a automação, pelo estado do
console. A cena cuida só de luz. *(Arquivo do Antigravity — exige acordo, não edição unilateral.)*

#### 3.2. Modo Jogo — luz ao iniciar

| Item | Definição |
| :--- | :--- |
| **Gatilho** | `media_player.sala_de_estar_ps5` para `on` |
| **Condições** | Sol abaixo do horizonte · fonte da TV em HDMI 1 |
| **Ação** | `light.luz_sala` apaga · `light.painel` em brilho baixo |
| **Dono dos atuadores** | ⚠️ `light.painel` **já é governado** pela automação "porta do quarto aberta à noite". Conflito real entre 22h e 6h |
| **Resolução** | Modo Jogo só age **antes das 22h**; depois disso, a rotina noturna tem precedência |
| **Se o HA reiniciar** | Nada a reconciliar — é ação de borda, não estado contínuo |

#### 3.3. Fim de sessão — luz de volta

| Item | Definição |
| :--- | :--- |
| **Gatilho** | PS5 sai de `on` **por 5 minutos** |
| **Por que 5 min** | Menos que isso, uma oscilação de rede acende a sala no meio da partida |
| **Condição** | A luz da sala ter sido apagada pelo Modo Jogo (e não pela mão do André) |
| **Como saber** | `input_boolean` de sessão, ligado pelo 3.2 e desligado aqui |

#### 3.4. TV e console em sincronia

| Item | Definição |
| :--- | :--- |
| **Gatilho** | PS5 vai para `on` com a TV desligada |
| **Ação** | Ligar a TV e selecionar HDMI 1 |
| **Armadilha** | ⚠️ `turn_off` nesta Samsung é a tecla POWER, que **alterna**. Aqui é `turn_on`, mas a regra vale: condicionar sempre ao estado lido, nunca disparar às cegas |
| **Reverso** | **Não implementar** "PS5 desligou → desliga a TV". A TV é usada sem o console; desligar por conta própria é o tipo de automação que irrita |

#### 3.5. Proteção térmica — reforço da existente

| Item | Definição |
| :--- | :--- |
| **Ação** | Alerta no painel se o PS5 estiver `on` e `switch.ventilacao_ps5` estiver `off` por mais de 2 minutos |
| **Por quê** | A automação pode falhar: tomada sem rede, comando perdido, alguém desligou na mão |
| **Natureza** | **Aviso, não correção automática** — se a tomada não responde, insistir não resolve, e o André precisa saber |

---

### Fase 4 · Painel

| # | Widget | Depende de |
| :--- | :--- | :--- |
| 4.1 | Situação do console (`Jogando` / `Em repouso` / `Fora de alcance`) | Fase 1 |
| 4.2 | Botão "Acordar console" — o único comando que a integração aceita | — |
| 4.3 | Estado da ventilação, com alerta visual do 3.5 | Fase 3.5 |
| 4.4 | Jogo atual | **Fase 2 concluída com dado real** |

Todo `entity_id` novo precisa entrar em `lib/rooms.ts` — é o contrato e a lista de permissão das rotas.
Arquivo compartilhado: exige sincronia com o Antigravity.

---

### Fase 5 · Métricas (opcional, depois de semanas de dados)

Horas de uso por dia, horário típico e correlação com a ventilação. **Não** propor alerta de consumo:
a tomada da ventilação não mede potência, e sem histórico não há como definir o que é anômalo.

---

## 4. O que este plano deliberadamente **não** faz

| Não faz | Por quê |
| :--- | :--- |
| Desligar o PS5 | A integração não expõe `turn_off`. Prometer isso seria mentira técnica |
| Desligar a TV quando o console sai | A TV tem vida própria |
| Ligar o console por presença ou horário | Acordar hardware sem pedido é intrusivo e aquece a casa sem uso |
| Corrigir sozinho a ventilação que falhou | Alerta é honesto; insistir num atuador mudo, não |
| Widget de jogo antes do dado existir | Caixa vazia é pior que ausência |

---

## 5. Dependências e bloqueios

| ID | Bloqueio | Quem destrava |
| :--- | :--- | :--- |
| B-1 | Reserva de DHCP do PS5 | **André** (roteador — alçada 3) |
| B-2 | Privacidade de atividade de jogo na conta PSN, se P-2 for isso | **André** (conta — alçada 3) |
| B-3 | Ligar o console para o diagnóstico da Fase 2 | **André** (não aciono hardware) |
| B-4 | Mudança na cena "gamer" | **Antigravity** (arquivo dele) |
| B-5 | Entidades novas em `lib/rooms.ts` | **Antigravity** + revisão |

---

## 6. Definição de pronto

- [ ] Indisponibilidade do PS5 abaixo de 5% em 48 h corridas
- [ ] `binary_sensor` e `sensor` de situação distinguem `unavailable` de `off`
- [ ] P-2 diagnosticado — com dado real ou com a causa documentada
- [ ] Cena "gamer" não toca mais na tomada da ventilação
- [ ] Cada automação nova declara, na `description`, o dono de cada atuador que toca
- [ ] `check_config` passa e as automações carregam como `on`
- [ ] Nenhuma automação promete desligar o console
- [ ] Conflito com `light.painel` entre 22h e 6h resolvido por precedência explícita
- [ ] `CASA.md`, `ESTADO_DASHBOARD.md` e `planning/` atualizados

---

## 7. Ordem recomendada

```
Fase 0 (André)  →  Fase 1  →  3.1 conflito  →  Fase 2 diagnóstico
                                    ↓
                       3.2 · 3.3 · 3.4 · 3.5  →  Fase 4 painel  →  Fase 5
```

A Fase 0 é bloqueio duro: automação baseada em estado, com estado intermitente 40% do tempo, produz
comportamento errático — e comportamento errático em automação residencial é pior que automação
nenhuma, porque destrói a confiança de quem mora na casa.
